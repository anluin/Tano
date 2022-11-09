import { Signal } from "./signal.ts";
import { createElement, fragmentType, Primitive, VirtualNode } from "./render.ts";
import { MouseEventListener, SubmitEventListener } from "./mod.ts";


declare global {
    namespace JSX {
        type WithSignals<Elements> = {
            [TagName in keyof Elements]: {
                [PropertyName in keyof Elements[TagName]]: Elements[TagName][PropertyName] | Signal<Elements[TagName][PropertyName]>
            }
        };

        type DefaultProperties = {
            id?: string,
            className?: string,
            style?: string,
            onClick?: MouseEventListener,
            reference?: Signal<HTMLElement | undefined>,
            onDrop?: (event: DragEvent) => void,
            onDragOver?: (event: DragEvent) => void,
            onDragStart?: (event: DragEvent) => void,
            onKeyDown?: (event: KeyboardEvent) => void,
            draggable?: boolean,
        };

        type IntrinsicElements = WithSignals<{
            html: {
                lang: string,
            },
            head: DefaultProperties,
            title: DefaultProperties,
            meta: DefaultProperties & {
                name: "viewport" | "description" | "apple-mobile-web-app-status-bar-style" | "apple-mobile-web-app-capable" | "theme-color",
                content: string,
            },
            link: DefaultProperties & {
                rel: "stylesheet" | "apple-touch-icon" | "manifest" | "apple-touch-startup-image",
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
            section: DefaultProperties,
            object: DefaultProperties & {
                type: "image/svg+xml",
                data: string,
            }
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
            h6: DefaultProperties,
            style: DefaultProperties,
            a: DefaultProperties & {
                href: string,
            },
            u: DefaultProperties,
            b: DefaultProperties,
            p: DefaultProperties,
            form: DefaultProperties & {
                onSubmit?: SubmitEventListener,
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
            textarea: DefaultProperties & {
                onInput?: (event: InputEvent) => void,
                value?: string,
                placeholder?: string,
                disabled?: boolean,
                rows?: number,
                cols?: number,
            },
            button: DefaultProperties & {
                disabled?: boolean,
            },
            svg: DefaultProperties & {
                xmlns?: string,
                viewBox?: string,
                width?: number,
                height?: number,
            },
            g: DefaultProperties,
            polyline: DefaultProperties & {
                d?: string,
                fill?: string,
                stroke?: string,
                strokeWidth?: string,
                strokeDasharray?: string,
                points?: string,
            },
            defs: DefaultProperties & {
                xmlns?: string,
            },
            linearGradient: DefaultProperties & {
                x1?: number | string,
                x2?: number | string,
                y1?: number | string,
                y2?: number | string,
                gradientUnits?: string,
            },
            stop: DefaultProperties & {
                stop?: string,
                offset?: string,
            },
            path: DefaultProperties & {
                d?: string,
                fill?: string,
                stroke?: string,
                strokeWidth?: string,
                strokeDasharray?: string,
            },
            rect: DefaultProperties & {
                xmlns?: string,
                width?: string,
                height?: string,
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

    interface Window {
        ssr: boolean;
        csr: boolean;
        f: typeof f;
        h: typeof h;
    }
}
