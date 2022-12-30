import { relative } from "https://deno.land/std@0.153.0/path/mod.ts";
import { walk, WalkEntry } from "https://deno.land/std@0.153.0/fs/walk.ts";

import { API } from "./backend/api.ts";
import { WebSocketConnection } from "./shared/api.ts";
import { createHTMLDocument, injectScript, renderInto } from "./backend/dom.ts";

import { buildUUID, endpoints, sockets } from "@build/backend/endpoints.ts";
import { render } from "@build/backend/bundle.js";


const fileExtension2ContentTypeMap = {
    ".txt": "plain/text",
    ".svg": "image/svg+xml",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".ico": "image/x-icon",
    ".png": "image/png",
    ".css": "text/css;charset=utf-8",
    ".js": "application/javascript;charset=utf-8",
    ".json": "application/json;charset=utf-8",
    ".css.map": "application/json;charset=utf-8",
    ".js.map": "application/json;charset=utf-8",
    ".wasm": "application/wasm",
} as const;

export type FileExtension = keyof typeof fileExtension2ContentTypeMap;
export type ContentType = typeof fileExtension2ContentTypeMap[FileExtension];

const cache: Record<string, Response> = {};
const preloadCachePromises: Promise<unknown>[] = [];

export const resolveContentType = (path: string): ContentType | undefined => {
    for (let index = 0; (index = path.indexOf(".", index)) != -1;) {
        const contentType = (fileExtension2ContentTypeMap as Record<string, ContentType>)[path.substring(index++)];

        if (contentType) {
            return contentType
        }
    }
};

const preloadEntry = async (base: string, entry: WalkEntry, headers?: Record<string, string>) => {
    const relativePath = `/${relative(base, entry.path)}`;
    const contentType = resolveContentType(relativePath);
    const body = await Deno.readFile(entry.path);

    cache[relativePath] = new Response(body, {
        headers: {
            ...(contentType && {
                "Content-Type": contentType,
            }),
            ...headers,
        },
    });
};

for await(const entry of walk(".build/frontend", { includeDirs: false })) {
    preloadCachePromises.push(preloadEntry(".build/frontend", entry));
}

for await(const entry of walk("src/resources", { includeDirs: false })) {
    preloadCachePromises.push(preloadEntry("src/resources", entry, {
        "Cache-Control": "max-age=31536000",
    }));
}

await Promise.all(preloadCachePromises);

console.debug(`${Object.keys(cache).length} resources preloaded`);

export const handleWebSocket = async (url: URL, request: Request) => {
    if (request.headers.get("connection")?.toLowerCase() === "upgrade") {
        const [ endpointName, methodName ] = url.pathname.split("@");

        const methods = sockets[endpointName];
        const method = methods[methodName];

        if (method !== undefined) {
            const api = new API(request);
            const result = await method.call(api);

            if (result instanceof Function) {
                const { socket, response } = Deno.upgradeWebSocket(request);

                const handleMessage = (event: MessageEvent) => {
                    socket.removeEventListener("message", handleMessage);

                    const { buildUUID: clientBuildUUID } = JSON.parse(event.data);

                    if (clientBuildUUID === buildUUID) {
                        result
                            .call(new WebSocketConnection(socket))
                            .catch(console.error);
                    } else {
                        socket.close();
                    }
                };

                socket.addEventListener("message", handleMessage);

                socket.addEventListener("open", () => {
                    socket.send(JSON.stringify({ buildUUID }));
                });

                return response;
            }

            return result;
        }
    }
};

export const handleEndpoint = async (url: URL, request: Request) => {
    if (request.method === "CALL") {
        const [ endpointName, methodName ] = url.pathname.split("@");
        const methods = endpoints[endpointName];

        if (methods) {
            const args = await request.json();
            const handler = methods[methodName];
            const api = new API(request);

            const body = JSON.stringify(
                await handler.call(api, ...args)
                    .then((result: unknown) => {
                        return ({
                            status: "success",
                            result,
                        });
                    })
                    .catch((error: unknown) => ({
                        status: "failure",
                        error: (
                            error instanceof Error
                                ? error.message
                                : error
                        ),
                    }))
            );

            return new Response(body, {
                headers: {
                    "Content-Type": "application/json;charset=utf-8",
                    "Cache-Control": "no-store, must-revalidate",
                    "Pragma": "no-cache",
                    "Expires": "0",
                    "X-Build-UUID": buildUUID,
                },
            });
        }
    }
};

export const handleSSR = async (url: URL, request: Request) => {
    const document = createHTMLDocument();

    try {
        const promises: Promise<unknown>[] = [];
        const injectedData: Record<string, unknown> = {};

        await renderInto(document, render, {
            __promises: promises,
            __injectedData: injectedData,
            location: url,
            navigator: {
                userAgent: request.headers.get("User-Agent") ?? "",
            },
            fetch: (input: URL | RequestInfo, init?: RequestInit | undefined): Promise<Response> => {
                if (typeof input === "string" && input.startsWith("/")) {
                    const fetchRequest = new Request(new URL(input, "http://localhost"), init);

                    fetchRequest.headers.set("Cookie", [
                        request.headers.get("Cookie"),
                        fetchRequest.headers.get("Cookie"),
                    ].filter(_ => !!_).join(";"));

                    return buildResponse(fetchRequest);
                }

                return fetch(input, init);
            },
        });

        await Promise.all(promises);
        await injectScript(document, { source: `__injectedData=${JSON.stringify(injectedData)}` });
        await injectScript(document, { url: "/bundle.js", type: "module" });
    } catch (error) {
        console.error(error);
    }

    const body = `<!DOCTYPE html>${document.documentElement?.outerHTML}`;

    return new Response(body, {
        headers: {
            "Content-Type": "text/html;charset=utf-8",
            "Cache-Control": "no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
        },
    });
};

const buildResponse = async (request: Request) => {
    const url = new URL(request.url);

    return (
        cache[url.pathname]?.clone() ??
        await handleWebSocket(url, request) ??
        await handleEndpoint(url, request) ??
        await handleSSR(url, request)
    );
};

const handleConnection = async (connection: Deno.Conn) => {
    for await (const { request, respondWith } of Deno.serveHttp(connection)) {
        const response = buildResponse(request);

        respondWith(response);
    }
};

export const serve = async () => {
    const port = Number.parseInt(Deno.env.get("tano_PORT") ?? "4500");

    console.log(`http://localhost:${port}`);

    for await (const connection of Deno.listen({ port })) {
        handleConnection(connection)
            .catch(console.error);
    }
};
