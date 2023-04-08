import { dom, std } from "./deps.ts";
import { buildAssetResponse, preloadAssets } from "./utils/assets.ts";

import { render } from "@ssrBundleFile";


export type Middleware = (args: {
    url: URL,
    request: Request,
    middlewares: Middleware[]
}) => Response | undefined | Promise<Response | undefined>;

const buildApplicationResponse: Middleware = async ({ url, request, middlewares }) => {
    if (!request.headers.get("accept")?.includes("text/html")) return undefined;

    const document = dom.createHTMLDocument();
    const location = url;

    try {
        const promises: Promise<unknown>[] = [];

        await render({
            ...dom,
            document,
            location,
            console,
            navigator: {
                userAgent: request.headers.get("User-Agent") ?? "",
            },
            fetch: async (input: URL | RequestInfo, init?: RequestInit | undefined): Promise<Response> => {
                if (typeof input === "string" && input.startsWith("/")) {
                    const url = new URL(input, location.origin);
                    const fetchRequest = new Request(url, init);

                    fetchRequest.headers.set("Cookie", [
                        request.headers.get("Cookie"),
                        fetchRequest.headers.get("Cookie"),
                    ].filter(_ => !!_).join(";"));

                    return await handleRequest(fetchRequest, middlewares);
                }

                return await fetch(input, init);
            },
        });

        await Promise.all(promises);
    } catch (error) {
        const pre = document.createElement("pre");

        pre.appendChild(document.createTextNode(`${error}`));

        (
            document.querySelector("body") ??
            document.documentElement
        )
            ?.appendChild(pre);

        console.log(`[ERROR] failed to render page: '${url}':`, error);
    }

    const targetElement = (
        document.querySelector("body") ??
        document.documentElement
    );

    const bundleScript = document.createElement("script");
    bundleScript.setAttribute("src", "/bundle.js");
    bundleScript.setAttribute("type", "module");
    // bundleScript.appendChild(document.createTextNode(JSON.stringify(injectedData)));
    targetElement?.insertBefore(bundleScript, targetElement.firstChild);

    // https://stackoverflow.com/a/57888310
    const dummyScript = document.createElement("script");
    dummyScript.appendChild(document.createTextNode("0"));
    targetElement?.insertBefore(dummyScript, targetElement.firstChild);

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

const buildResponse = async (args: { url: URL, request: Request, middlewares: Middleware[] }) =>
    await buildAssetResponse(args) ??
    await buildApplicationResponse(args);

export const handleRequest = async (request: Request, middlewares: Middleware[]): Promise<Response> => {
    const url = new URL(request.url);
    const args = { url, request, middlewares };
    let response: Response | undefined;

    for (const middleware of middlewares) {
        response = await middleware(args);
        if (response) break;
    }

    response ??= await buildResponse(args);

    return response ?? new Response();
};

const handleConnection = async (connection: Deno.Conn, middlewares: Middleware[]) => {
    for await (const { request, respondWith } of Deno.serveHttp(connection)) {
        const response = await handleRequest(request, middlewares);

        respondWith(response)
            .catch(console.error);
    }
};

export const serve = async (middlewares: Middleware[] = []) => {
    const {
        port: rawPort,
    } = (
        std.flags.parse(Deno.args, {
            string: [
                "port",
            ],
            default: {
                port: "4500",
            },
        })
    );

    const port = Number.parseInt(rawPort);

    await preloadAssets("src/assets");
    await preloadAssets(".build/assets/csr");

    console.log(`Listening on http://localhost:${port}/`);

    for await (const connection of Deno.listen({ port })) {
        handleConnection(connection, middlewares)
            .catch(console.error);
    }
};
