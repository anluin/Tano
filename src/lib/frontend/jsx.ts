import { VirtualNode } from "./virtual-dom/node.ts";
import { VirtualElementNode } from "./virtual-dom/element.ts";
import { VirtualComponentNode } from "./virtual-dom/component.ts";
import { VirtualFragmentNode } from "./virtual-dom/fragment.ts";
import { ReadonlySignal, Signal } from "./reactivity/signal.ts";
import { ClassList } from "./reactivity/utils.ts";
import { toVirtualNode } from "./virtual-dom/utils.ts";


export type KeysOfType<T, U> = { [K in keyof T]: T[K] extends U ? K : never }[keyof T];
export type RequiredKeys<T> = Exclude<KeysOfType<T, Exclude<T[keyof T], undefined>>, undefined>;
export type OptionalKeys<T> = Exclude<keyof T, RequiredKeys<T>>;

declare global {
    namespace JSX {
        type Properties<T> = {
            [K in RequiredKeys<T>]-?: T[K] | ReadonlySignal<T[K]>;
        } & {
            [K in OptionalKeys<T>]+?: T[K] | ReadonlySignal<T[K] | undefined>;
        };

        type WithDefaultProperties<Additional = {}> = Properties<{
            class?: string,
            classList?: ClassList,
            onClick?: MouseEventListener,
            style?: string,
        } & Additional>;

        interface IntrinsicElements {
            link: Properties<{
                rel: "stylesheet" | "manifest" | "apple-touch-startup-image" | "apple-touch-icon",
                href: string,
                media?: string,
            }>,
            meta: Properties<{
                name: "viewport" | "theme-color" | "apple-mobile-web-app-status-bar-style" | "apple-mobile-web-app-capable" | "description",
                content: string,
            }>,

            script: Properties<{
                async?: boolean,
                src?: string,
            }>,

            html: Properties<{
                class?: string,
                lang?: string,
            }>,
            head: Properties<{}>,
            title: Properties<{}>,

            body: WithDefaultProperties,
            header: WithDefaultProperties,
            main: WithDefaultProperties,
            div: WithDefaultProperties,
            nav: WithDefaultProperties,
            ul: WithDefaultProperties,
            li: WithDefaultProperties,
            span: WithDefaultProperties,
            pre: WithDefaultProperties,
            button: WithDefaultProperties,
            a: WithDefaultProperties<{
                href?: string,
            }>,
            h1: WithDefaultProperties,
            h2: WithDefaultProperties,
            h4: WithDefaultProperties,
            h5: WithDefaultProperties,
            p: WithDefaultProperties,
            hr: WithDefaultProperties,
            br: WithDefaultProperties,
            section: WithDefaultProperties,
            img: WithDefaultProperties<{
                src: string,
                alt: string,
            }>,
            form: WithDefaultProperties<{
                method?: "get" | "patch" | "post",
                onSubmit?: SubmitEventListener,
            }>,
            fieldset: WithDefaultProperties,
            label: WithDefaultProperties,
            input: WithDefaultProperties<{
                type?: "text" | "password",
                name?: string,
                autocomplete?: "username" | "current-password",
                placeholder?: string,
                value?: string | Signal<string | undefined>,
            }>,
        }

        type Element = VirtualNode | ReadonlySignal<Element> | (() => JSX.Element);
    }

    const React: undefined;
}

export type MouseEventListener = (this: HTMLElement, event: MouseEvent) => void;
export type SubmitEventListener = (this: HTMLFormElement, event: SubmitEvent) => void;

export type MountEvent = {};
export type MountEventListener<T extends Record<string, unknown>> = (this: ComponentInterface<T>, event: MountEvent) => void;

export type UnmountEvent = {};
export type UnmountEventListener<T extends Record<string, unknown>> = (this: ComponentInterface<T>, event: UnmountEvent) => void;

export type FinalizeEvent = {};
export type FinalizeEventListener<T extends Record<string, unknown>> = (this: ComponentInterface<T>, event: FinalizeEvent) => void;

export interface ComponentEventMap<T extends Record<string, unknown>> {
    mount: MountEventListener<T>,
    unmount: UnmountEventListener<T>,
    finalize: FinalizeEventListener<T>,
}

export type ComponentInitializer<T extends Record<string, unknown> = {}> = (this: ComponentInterface<T & {
    children?: VirtualNode[]
}>, properties: JSX.Properties<T & {
    children?: VirtualNode[]
}>) => JSX.Element;

export type PropertiesOf<T> = T extends (this: ComponentInterface<infer P>, ...args: any) => any ? P : never;

export class ComponentInterface<T extends Record<string, unknown>> {
    _usedPropertyNames: Set<string>;

    properties: {
        [K in RequiredKeys<T> as K extends string ? `$${K}` : never]-?: T[K] extends ReadonlySignal<infer I> ? ReadonlySignal<I> : ReadonlySignal<T[K]>;
    } & {
        [K in OptionalKeys<T> as K extends string ? `$${K}` : never]-?: T[K] extends ReadonlySignal<infer I> ? ReadonlySignal<I | undefined> : ReadonlySignal<T[K] | undefined>;
    };

    private _listeners?: {
        [K in keyof ComponentEventMap<T>]?: Set<ComponentEventMap<T>[K]>;
    };

    constructor(properties: T) {
        const usedPropertyNames = this._usedPropertyNames = new Set();
        this.properties = new Proxy(<ComponentInterface<T>["properties"]>(
            Object.entries(properties)
                .reduce((carry, [ key, value ]) => ({
                    [`$${key}`]: value instanceof ReadonlySignal ? value : new ReadonlySignal(value),
                    ...carry,
                }), {})
        ), {
            get(target: any, propertyName, ...rest) {
                if (typeof propertyName === "string") {
                    usedPropertyNames.add(propertyName);
                    return target[propertyName as any] ??= new ReadonlySignal(undefined);
                }

                return Reflect.get(target, propertyName, ...rest);
            },
        });
    }

    addEventListener<Event extends keyof ComponentEventMap<T>>(event: Event, listener: ComponentEventMap<T>[Event]) {
        ((this._listeners ??= {})[event] ??= new Set())
            .add(listener);
    }

    removeEventListener<Event extends keyof ComponentEventMap<T>>(event: Event, listener: ComponentEventMap<T>[Event]) {
        this._listeners?.[event]?.delete(listener);
    }

    _trigger<Event extends keyof ComponentEventMap<T>>(event: Event, ...args: Parameters<ComponentEventMap<T>[Event]>) {
        for (const listener of this._listeners?.[event] ?? []) {
            listener.call(this, ...args);
        }
    }
}

export const fragmentSymbol = Symbol();

export const createElement = (
    <TagName extends keyof JSX.IntrinsicElements>(
        factory: string | Symbol | Function,
        properties: Record<string, unknown> | null,
        ...rawChildren: unknown[]
    ) =>
        ((children: VirtualNode[]) => (
            factory === fragmentSymbol
                ? new VirtualFragmentNode(children)
                : new (
                    factory instanceof Function
                        ? VirtualComponentNode
                        : VirtualElementNode
                )(factory as any, properties ?? {}, children)
        ))(rawChildren.map(toVirtualNode))
);
