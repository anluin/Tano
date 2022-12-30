import { Comment, Document, DocumentFragment, DOMImplementation, Element as HTMLElement, Element as SVGElement, HTMLDocument, Text } from "https://deno.land/x/deno_dom@v0.1.35-alpha/deno-dom-wasm-noinit.ts";
import { CTOR_KEY } from "https://deno.land/x/deno_dom@v0.1.35-alpha/src/constructor-lock.ts";

export const domImplementation = new DOMImplementation(CTOR_KEY);


export const createHTMLDocument = () => domImplementation.createHTMLDocument();


export type InjectScriptOptions = ({ url: string } | { source: string }) & { type?: "module" };
export const injectScript = (document: HTMLDocument, options: InjectScriptOptions) => {
    const element = document.createElement("script");

    if ("url" in options) {
        element.setAttribute("src", options.url);
    }

    if ("source" in options) {
        element.textContent = options.source;
    }

    if (options.type) {
        element.setAttribute("type", options.type);
    }

    const target = (
        document.querySelector("body") ??
        document.querySelector("head") ??
        document.documentElement
    );

    if (target) {
        target.appendChild(element);
    } else {
        throw new Error();
    }
};

export type RenderGlobals = {
    __promises: Promise<unknown>[],
    __injectedData: Record<string, unknown>,
    location: URL,
    fetch: typeof fetch,
    navigator: {
        userAgent: string,
    },
};

export type RenderFn = (globals: RenderGlobals & {
    document: Document,
    Document: typeof Document,
    Text: typeof Text,
    SVGElement: typeof SVGElement,
    HTMLElement: typeof HTMLElement,
    DocumentFragment: typeof DocumentFragment,
    Comment: typeof Comment,
}) => Promise<void>;


export const renderInto = async (document: HTMLDocument, render: RenderFn, globals: RenderGlobals) => {
    await render({
        ...globals,
        document,
        Document,
        Text,
        SVGElement,
        HTMLElement,
        DocumentFragment,
        Comment,
    });
};
