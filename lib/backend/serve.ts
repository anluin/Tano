import { buildCachedResponse, preloadFiles } from "./cache.ts";
import { buildRenderedResponse } from "./render.ts";
import { tempSocketChannels } from "./api.ts";
import { Channel } from "../shared/channel.ts";


export type Endpoints = Record<string, (request: Request) => Promise<Response>>;

export type Middleware = {
    before?: (url: URL, request: Request, response?: Response) => Response | undefined | Promise<Response | undefined>,
    after?: (url: URL, request: Request, response?: Response) => Response | Promise<Response>,
};

export type Options = {
    middleware?: Middleware[],
    endpoints?: Endpoints,
};

export const buildResponse = async (url: URL, request: Request, options: Options) => {
    const endpoint = options?.endpoints?.[url.pathname];

    if (endpoint) {
        return await endpoint(request);
    }

    return (
        await processMiddleware(url, request, "after", (
            await processMiddleware(url, request, "before", undefined, options) ??
            await buildCachedResponse(url, request, options) ??
            await buildRenderedResponse(url, request, options)
        ), options)
    )!;
};

const processMiddleware = async (url: URL, request: Request, priority: "before" | "after", response: Response | undefined, options: Options) => {
    for (const middleware of (options.middleware ?? [])) {
        response = await middleware[priority]?.(url, request, response) ?? response;
    }

    return response;
};

const handleConnection = async (connection: Deno.Conn, options: Options) => {
    for await (const { request, respondWith } of Deno.serveHttp(connection)) {
        const url = new URL(request.url);

        if (request.headers.get("connection")?.trim().toLowerCase().includes("upgrade")) {
            const result = /\/socket\/(?<identifier>[a-z0-9-]{36})/.exec(url.pathname);

            if (result?.groups?.identifier) {
                const socketIdentifier = result.groups.identifier;
                const endpointChannels = tempSocketChannels[socketIdentifier];

                if (endpointChannels) {
                    const { socket, response } = Deno.upgradeWebSocket(request);

                    const forEachChannel = (callback: (channel: Channel) => void) => {
                        for (const endpoint in endpointChannels) {
                            for (const channel of endpointChannels[endpoint]) {
                                callback(channel);
                            }
                        }
                    };

                    forEachChannel(channel => {
                        channel.__send = (message) => {
                            socket?.send(JSON.stringify({
                                endpoint: url.pathname,
                                message,
                            }));
                        };
                    });

                    socket.addEventListener("open", () => {
                        forEachChannel(channel => {
                            for (const listener of channel.__connectedEventListeners ?? []) {
                                listener();
                            }
                        });
                    });

                    socket.addEventListener("close", () => {
                        forEachChannel(channel => {
                            for (const listener of channel.__disconnectedEventListeners ?? []) {
                                listener();
                            }
                        });
                    });

                    socket.addEventListener("message", (event) => {
                        const packet = JSON.parse(event.data);
                        const { endpoint, message } = packet;

                        for (const channel of endpointChannels[endpoint]) {
                            for (const listener of channel.__messageEventListeners ?? []) {
                                listener({ endpoint, message });
                            }
                        }
                    });

                    respondWith(response)
                        .catch(console.error);
                }

                delete tempSocketChannels[socketIdentifier];
            }

            break;
        }

        const response = await (
            buildResponse(url, request, options)
                .catch(error =>
                    error instanceof Response
                        ? error
                        : new Response(`${error}`, {
                            status: 500,
                        })
                )
        );

        respondWith(response!)
            .catch(console.error);
    }
};

export const serve = async (options: Options = {}) => {
    await preloadFiles();

    console.log(`[INFO] listening on http://localhost:4501`);

    for await (const connection of Deno.listen({ port: 4501 })) {
        handleConnection(connection, options)
            .catch(console.error);
    }
};
