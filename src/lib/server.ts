import { Document, Node, HTMLElement, HTMLScriptElement, DocumentFragment, SVGElement } from "./fake/document.ts";
import { Location } from "./fake/location.ts";
import { Navigator } from "./fake/navigator.ts";

import { statics } from "$build/statics.ts";
import { endpoints } from "$build/endpoints.ts";
import { render } from "$build/ssr.js";


export type StaticFile = {
    contentType: string,
    fetch(): Promise<Uint8Array>,
};

export type Endpoint = Record<string, (...args: any) => Promise<any>>;

const buildResponse = async (request: Request, ssr: SSR): Promise<Response> => {
    const { pathname } = new URL(request.url);

    if (request.method === "CALL") {
        const endpoint = endpoints[pathname];

        if (endpoint !== undefined) {
            const { method, args } = await request.json();

            const response = await (async () => {
                try {
                    return {
                        status: "success",
                        result: await endpoint[method](...args),
                    };
                } catch (error) {
                    return {
                        status: "failure",
                        error,
                    };
                }
            })();

            return new Response(JSON.stringify(response), {
                headers: {
                    "Content-Type": "text/html;charset=utf-8"
                },
            });
        }
    }

    if (request.method === "GET") {
        const staticFile = statics[pathname];

        if (staticFile !== undefined) {
            const { fetch, contentType } = staticFile;

            return new Response(await fetch(), {
                status: 200,
                headers: {
                    "Content-Type": contentType,
                    ...(!pathname.endsWith("bundle.js")) ? {
                        "Cache-Control": "public, max-age=31536000",
                    } : {},
                },
            })
        }
    }

    const platform = (
        request.headers.get("User-Agent")
            ?.indexOf("iPhone") !== -1
            ? "iPhone"
            : "unknown"
    );

    const userAgent = request.headers.get("user-agent") ?? "unknown";
    const document = new Document();
    const location = new Location(pathname);
    const navigator = new Navigator(platform, userAgent);

    await render({
        ...ssr.patches,
        document,
        location,
        navigator,
        Node,
        HTMLElement,
        SVGElement,
        DocumentFragment,
    }, pathname);

    /* inject serviceWorker.js */
    {
        const script: HTMLScriptElement = document.createElement("script");

        script.src = "/serviceWorker.js";
        script.type = "module";

        document.querySelector("head")
            ?.appendChild(script);
    }

    /* inject bundle.js */
    {
        const script: HTMLScriptElement = document.createElement("script");

        script.src = "/bundle.js";
        script.type = "module";

        document.querySelector("body")
            ?.appendChild(script);
    }

    const html = document.querySelector("html")?.outerHTML;

    return new Response(`<!DOCTYPE html>${html}`, {
        status: 200,
        headers: {
            "Content-Type": "text/html;charset=utf-8",
        },
    });
};

const handleConnection = async (connection: Deno.Conn, ssr: SSR) => {
    for await (const { request, respondWith } of Deno.serveHttp(connection)) {
        respondWith(await buildResponse(request, ssr))
            .catch(console.error);
    }
};

export type Patches = {
    setTimeout?: (callback: () => void, delay: number) => number,
    clearTimeout?: (handle: number) => void,
    setInterval?: (callback: () => void, delay: number) => number,
    clearInterval?: (handle: number) => void,
};

export type SSR = {
    patches?: Patches,
};

export type Options = {
    port: number,
    ssr?: SSR,
};

export const serve = async (options: Options = { port: 4500 }) => {
    const {
        port,
        ssr = {
            patches: {
                setTimeout, clearTimeout,
                setInterval, clearInterval,
            },
        },
    } = options;

    for await (const connection of Deno.listen({ port })) {
        handleConnection(connection, ssr)
            .catch(console.error);
    }
};
