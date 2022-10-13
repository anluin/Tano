import { Signal } from "./signal.ts";
import { JSONValue } from "../shared/json.ts";
import { createElement, fragmentType, MouseEventListener, Primitive, VirtualNode } from "./render.ts";

export * from "./render.ts";
export * from "./signal.ts";
export * from "./utils.ts";
export * from "./endpoint.ts";
export * from "./router.ts";

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
            onDrop?: (event: DragEvent) => void,
            onDragOver?: (event: DragEvent) => void,
            onDragStart?: (event: DragEvent) => void,
            draggable?: boolean,
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
        f: typeof f;
        h: typeof h;
        injectedData: JSONValue | undefined;
    }
}
