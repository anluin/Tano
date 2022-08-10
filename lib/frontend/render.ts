import { VirtualComponentNode, VirtualElementNode, VirtualFragmentNode, VirtualNode, VirtualPlaceholderNode, VirtualSignalNode, VirtualTextNode } from "./virtual_dom/virtual_node.ts";
import { restoreTree } from "./utils.ts";
import { createSignal, Signal } from "./signal.ts";

import { JSONValue } from "../shared/json.ts";

export { VirtualNode, onMount, onCleanup } from "./virtual_dom/virtual_node.ts";

export type MouseEventListener = (event: MouseEvent) => void;

declare global {
    namespace JSX {
        type WithSignals<Elements> = {
            [TagName in keyof Elements]: {
                [PropertyName in keyof Elements[TagName]]: Elements[TagName][PropertyName] | Signal<Elements[TagName][PropertyName]>
            }
        };

        type DefaultProperties = {
            className?: string,
            style?: string,
            onClick?: MouseEventListener,
            reference?: Signal<HTMLElement | undefined>,
        };

        type IntrinsicElements = WithSignals<{
            html: {
                lang: string,
            },
            head: DefaultProperties,
            title: DefaultProperties,
            meta: DefaultProperties & {
                name: "viewport" | "description" | "apple-mobile-web-app-status-bar" | "theme-color",
                content: string,
            },
            link: DefaultProperties & {
                rel: "stylesheet" | "apple-touch-icon" | "manifest",
                href: string,
                media?: "all" | string,
            },
            body: DefaultProperties,
            header: DefaultProperties,
            main: DefaultProperties,
            nav: DefaultProperties,
            pre: DefaultProperties,
            div: DefaultProperties,
            span: DefaultProperties,
            script: DefaultProperties & {
                src?: string,
                defer?: boolean,
            },
            br: DefaultProperties,
            ul: DefaultProperties,
            li: DefaultProperties
            h1: DefaultProperties,
            h2: DefaultProperties,
            h3: DefaultProperties,
            h4: DefaultProperties,
            h5: DefaultProperties,
            a: DefaultProperties & {
                href: string,
            },
            u: DefaultProperties,
            b: DefaultProperties,
            p: DefaultProperties,
            form: DefaultProperties & {
                onSubmit?: (event: SubmitEvent) => void,
            },
            label: DefaultProperties,
            input: DefaultProperties & {
                type: "text" | "password" | "checkbox",
                onInput?: (event: InputEvent) => void,
                value?: string,
                placeholder?: string,
                disabled?: boolean,
                checked?: boolean,
            },
            button: DefaultProperties & {
                disabled?: boolean,
            },
            svg: DefaultProperties & {
                viewBox?: string,
                width?: number,
                height?: number,
            },
            path: DefaultProperties & {
                d?: string,
                fill?: string,
                stroke?: string,
                strokeWidth?: string,
                strokeDasharray?: string,
            },
            circle: DefaultProperties & {
                cx?: string,
                cy?: string,
                r?: string,
                fill?: string,
                stroke?: string,
                strokeWidth?: string,
                strokeDasharray?: string,
                strokeLocation?: string,
            },
            table: DefaultProperties,
            thead: DefaultProperties,
            tbody: DefaultProperties,
            tr: DefaultProperties,
            td: DefaultProperties,
            fieldset: DefaultProperties,
        }>;

        type Element = Primitive | VirtualNode | Signal<Element> | Promise<unknown>;
    }

    const ssr: boolean;
    const csr: boolean;
    const f: typeof fragmentType;
    const h: typeof createElement;
    const injectedData: JSONValue | undefined;

    interface Window {
        ssr: boolean;
        csr: boolean;
        f: typeof fragmentType;
        h: typeof createElement;
        injectedData: JSONValue | undefined;
    }
}

export type Primitive = string | boolean | number | undefined;
export type Fragment = typeof fragmentType;
export type Properties = Record<string, unknown>;
export type Component<P extends Properties = Record<string, never>> = (properties: P, children: never[]) => JSX.Element | Promise<JSX.Element>;
export type ParentComponent<P extends Properties = Record<string, never>> = (properties: P, children: VirtualNode[]) => JSX.Element;

export const fragmentType = Symbol();

export const normalize = (child: unknown): VirtualNode => {
    if (child === undefined || child === false) {
        return new VirtualPlaceholderNode();
    }

    if (child instanceof Signal) {
        return new VirtualSignalNode(child);
    }

    if (child instanceof Array) {
        return new VirtualFragmentNode(child.map(normalize));
    }

    if (child instanceof VirtualNode) {
        return child;
    }

    if (child instanceof Promise) {
        const placeholder = new VirtualSignalNode(createSignal(new VirtualFragmentNode([])));
        (async() => placeholder.signal.set(new VirtualFragmentNode([normalize(await child)])))();
        return placeholder;
    }

    return new VirtualTextNode(`${child}`);
}

export const createElement = (union: string | Fragment | Component | ParentComponent, properties: Properties | null = null, ...children: JSX.Element[]): VirtualNode => {
    const normalizedChildren = children.map(normalize);

    switch (typeof union) {
        case "string":
            return new VirtualElementNode(union, properties ?? {}, normalizedChildren);
        case "symbol":
            return new VirtualFragmentNode(normalizedChildren);
        default:
            return new VirtualComponentNode(union as ParentComponent, properties ?? {}, normalizedChildren);
    }
}

export const render = (element: JSX.Element) =>
    restoreTree(document.documentElement)
        .patch(normalize(element))
        .dispatchMount();
