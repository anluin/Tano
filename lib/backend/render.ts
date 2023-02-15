import {
    Comment,
    DocumentFragment,
    Element as SVGElement,
    Element as HTMLElement,
    HTMLDocument,
    Text
} from "https://deno.land/x/deno_dom@v0.1.36-alpha/src/api.ts";
import { Document, DOMImplementation } from "https://deno.land/x/deno_dom@v0.1.36-alpha/src/dom/document.ts";
import { CTOR_KEY } from "https://deno.land/x/deno_dom@v0.1.36-alpha/src/constructor-lock.ts";

import { JSONValue } from "../types/json.ts";
import { buildResponse, Options } from "./mod.ts";

import { render } from "@build/backend/bundle.js";


export const domImplementation = new DOMImplementation(CTOR_KEY);
export const buildRenderedResponse = async (url: URL, request: Request, options: Options) => {
    const document = domImplementation.createHTMLDocument();
    const injectedData: Record<string, JSONValue> = {};
    const location = url;

    try {
        const promises: Promise<unknown>[] = [];

        await render({
            injectedData,
            document,
            Document,
            HTMLDocument,
            Text,
            Comment,
            HTMLElement,
            SVGElement,
            DocumentFragment,
            location,
            navigator: {
                userAgent: request.headers.get("User-Agent") ?? "",
            },
            fetch: async (input: URL | RequestInfo, init?: RequestInit | undefined): Promise<Response> => {
                if (typeof input === "string" && !/https?:\/\//.test(input)) {
                    const url = new URL(input, location.origin);
                    const fetchRequest = new Request(url, init);

                    fetchRequest.headers.set("Cookie", [
                        request.headers.get("Cookie"),
                        fetchRequest.headers.get("Cookie"),
                    ].filter(_ => !!_).join(";"));

                    return await buildResponse(url, fetchRequest, options);
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
    bundleScript.appendChild(document.createTextNode(JSON.stringify(injectedData)));
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
