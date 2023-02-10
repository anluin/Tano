import { buildCachedResponse, preloadFiles } from "./cache.ts";
import { buildRenderedResponse } from "./render.ts";


export type Middleware = {
    before?: (url: URL, request: Request, response?: Response) => Response | undefined | Promise<Response | undefined>,
    after?: (url: URL, request: Request, response?: Response) => Response | Promise<Response>,
};

export type Options = {
    middleware?: Middleware[],
};

export const buildResponse = async (url: URL, request: Request, options: Options) => (
    await processMiddleware(url, request, "after", (
        await processMiddleware(url, request, "before", undefined, options) ??
        await buildCachedResponse(url, request, options) ??
        await buildRenderedResponse(url, request, options)
    ), options)
)!;

const processMiddleware = async (url: URL, request: Request, priority: "before" | "after", response: Response | undefined, options: Options) => {
    for (const middleware of (options.middleware ?? [])) {
        response = await middleware[priority]?.(url, request, response) ?? response;
    }

    return response;
};

const handleConnection = async (connection: Deno.Conn, options: Options) => {
    for await (const { request, respondWith } of Deno.serveHttp(connection)) {
        const url = new URL(request.url);
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
