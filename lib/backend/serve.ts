import {
    Document,
    DocumentFragment,
    DOMImplementation,
    Element as HTMLElement,
    Text
} from "https://deno.land/x/deno_dom@v0.1.35-alpha/deno-dom-wasm-noinit.ts";
import { CTOR_KEY } from "https://deno.land/x/deno_dom@v0.1.35-alpha/src/constructor-lock.ts";

import { walk } from "https://deno.land/std@0.152.0/fs/walk.ts";
import { relative } from "https://deno.land/std@0.152.0/path/mod.ts";

import { JSONObject, JSONValue } from "../shared/json.ts";
import { deserialize, serialize, stringify } from "../shared/utils.ts";

import { PatchResponse, setCurrentEndpointAccess } from "./endpoint.ts";


export type RenderOptions = {
    injectedData: JSONObject | undefined,
    ssrSignalInjection: <T extends JSONValue>(name: string, data: T) => void,
    location: URL,
    fetch: typeof fetch,
    document: Document,
    Text: typeof Text,
    HTMLElement: typeof HTMLElement,
    DocumentFragment: typeof DocumentFragment,
};

export type ServeOptions = {
    port: number,
    render: (renderOptions: RenderOptions) => void,
    endpoints: Record<string, Record<string, CallableFunction>>,
    middleware?: (event: { request: Request, kind: "route" | "endpoint" | "ressource", url: URL }) => Response | Headers | InjectData | void,
};

const domImplementation = new DOMImplementation(CTOR_KEY);
const fileExtension2ContentType = (fileExtension: string): string | undefined =>
    (<Record<string, string>>{
        ".txt": "plain/text;charset=utf-8",
        ".json": "application/json;charset=utf-8",
        ".js": "application/javascript;charset=utf-8",
        ".js.map": "application/json;charset=utf-8",
        ".css": "text/css;charset=utf-8",
        ".css.map": "application/json;charset=utf-8",
        ".woff2": "font/woff2",
    })[fileExtension];

const getFileExtension = (pathname: string) => {
    const index = pathname.indexOf(".");

    return (
        index !== -1
            ? pathname.slice(index)
            : undefined
    );
}

const cache: Record<string, Uint8Array> = {};
const prepareCachePromises: Promise<unknown>[] = [];

for await(const { path } of walk("src/resources", { includeDirs: false })) {
    prepareCachePromises.push(
        Deno.readFile(path)
            .then(bytes => cache[`/${relative("src/resources", path)}`] = bytes)
            .catch(console.error),
    );
}

const resourcesToPreload: string[] = [];

for await(const { path } of walk("build", { includeDirs: false })) {
    const fileExtension = getFileExtension(path);

    if (fileExtension) {
        const relativePath = relative("build", path);

        if (!relativePath.startsWith("ssr") && [ ".js", ".js.map", ".css", ".css.map" ].indexOf(fileExtension) !== -1) {
            if (relativePath.startsWith("csr/") && relativePath.endsWith(".js")) {
                resourcesToPreload.push(`/${relativePath}`);
            }

            prepareCachePromises.push(
                Deno.readFile(path)
                    .then(bytes => cache[`/${relativePath}`] = bytes)
                    .catch(console.error),
            );
        }
    }
}

await Promise.all(prepareCachePromises);
console.debug(`[DEBUG] ${prepareCachePromises.length} items pre-cached`);

export class InjectData {
    readonly content: JSONObject;

    constructor(content: JSONObject) {
        this.content = content;
    }
}

const buildResponse = async (request: Request, options: ServeOptions): Promise<Response> => {
    const url = new URL(request.url);
    const fileExtension = getFileExtension(url.pathname);
    const isEndpoint = request.method === "CALL";
    const isRessource = fileExtension && cache[url.pathname];
    const kind = isEndpoint ? "endpoint" : isRessource ? "ressource" : "route";

    const middlewareResult = options.middleware?.({ request, kind, url });
    const middlewareHeaders = (
        middlewareResult instanceof Headers
            ? Object.fromEntries(middlewareResult.entries())
            : undefined
    );

    let dataToInject: JSONObject | undefined = (
        middlewareResult instanceof InjectData
            ? middlewareResult.content
            : undefined
    )

    if (middlewareResult instanceof Response) {
        return middlewareResult;
    }

    if (isEndpoint) {
        const endpoint = options.endpoints[url.pathname];

        if (endpoint !== undefined) {
            const { method, args } = await request.json();

            let patchResponse: PatchResponse | undefined;

            setCurrentEndpointAccess({
                request,
                patchResponse: patch => {
                    patchResponse = patch;
                },
            });


            const result = (
                await endpoint[method](...args.map(deserialize))
                    .then((result: any) => ({
                        status: "success",
                        result: serialize(result),
                    }))
                    .catch((error: any) => ({
                        status: "failure",
                        error: (
                            error instanceof Error
                                ? error.message
                                : error
                        ),
                    }))
            );

            const response = new Response(JSON.stringify(result, null, 4), {
                headers: {
                    "Content-Type": "application/json;charset=utf-8",
                    ...middlewareHeaders,
                },
            });

            return patchResponse?.(response) ?? response;
        }
    }

    if (isRessource) {
        const contentType = fileExtension2ContentType(fileExtension);

        return new Response(cache[url.pathname], {
            headers: {
                ...(
                    contentType !== undefined
                        ? { "Content-Type": contentType }
                        : undefined
                ),
                ...middlewareHeaders,
            },
        });
    }

    const document = domImplementation.createHTMLDocument();
    const { render } = options;

    await render({
        injectedData: dataToInject,
        ssrSignalInjection: (name, data) => {
            dataToInject = {
                ...(dataToInject),
                [name]: data,
            };
        },
        location: url,
        document,
        Text,
        HTMLElement,
        DocumentFragment,
        fetch: async (ressource, requestInit) => {
            const fetchRequest = new Request((
                typeof ressource === "string" && ressource.startsWith("/")
                    ? new URL(ressource, `http://localhost:${options.port}`)
                    : ressource
            ), requestInit);

            fetchRequest.headers.set("Cookie", [
                request.headers.get("Cookie"),
                fetchRequest.headers.get("Cookie"),
            ].filter(_ => !!_).join(";"));

            const url = new URL(fetchRequest.url);

            if (url.hostname === "localhost" && url.port === `${options.port}`) {
                return buildResponse(fetchRequest, options);
            }

            return await fetch(fetchRequest);
        },
    });

    if (dataToInject) {
        const script = document.createElement("script");

        script.textContent = `window.injectedData=${stringify(dataToInject)};`;

        document
            .querySelector("body")
            ?.appendChild(script);
    }

    for (const resourcePath of resourcesToPreload) {
        const link = document.createElement("link");

        link.setAttribute("rel", "preload");
        link.setAttribute("href", resourcePath);
        link.setAttribute("as", "script");
        link.setAttribute("crossOrigin", "anonymous");

        document
            .querySelector("head")
            ?.appendChild(link);
    }

    const script = document.createElement("script");

    script.setAttribute("src", "/csr.js");
    script.setAttribute("type", "module");

    document
        .querySelector("body")
        ?.appendChild(script);

    const body = `<!DOCTYPE html>${document.documentElement?.outerHTML}`;

    return new Response(body, {
        headers: {
            "Content-Type": "text/html;charset=utf-8",
            ...middlewareHeaders,
        },
    });
};

const handleConnection = async (connection: Deno.Conn, options: ServeOptions) => {
    for await (const { request, respondWith } of Deno.serveHttp(connection)) {
        buildResponse(request, options)
            .then(respondWith)
            .catch(console.error);
    }
};

export const serve = async (options: ServeOptions) => {
    const { port } = options;

    console.debug(`[DEBUG] listening on http://localhost:${port}`)

    for await (const connection of Deno.listen({ port })) {
        handleConnection(connection, options)
            .catch(console.error);
    }
};
