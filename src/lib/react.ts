declare global {
    namespace JSX {
        type Hooks = {
            onMount?: () => void,
            onCleanup?: () => void,
        };

        type WithHooks<T> = {
            [K in keyof T]: Hooks & T[K];
        };

        type ElementTagNameMap = WithHooks<{
            html: {
                lang: string,
            },
            body: {},
            head: {},
            title: {},
            main: {},
            a: {
                href: string,
            },
            section: {},
            script: {
                src?: string,
                type?: "module",
            },
            pre: {
                style?: string,
            },
            div: {
                className?: string,
            },
            span: {
                className?: string,
            },
            button: {
                onClick?: () => void,
            },
            img: {
                src: string,
                alt: string,
            },
            meta: {
                name: string,
                content: string,
            },
            link: {
                rel: "icon",
                href: string,
                type: "image/svg+xml",
            } | {
                rel: "stylesheet",
                href: string,
                media: string,
            } | {
                rel: "manifest",
                href: string,
            } | {
                rel: "apple-touch-icon",
                href: string,
            },
        }>;

        type IntrinsicElements = {
            [TagName in keyof ElementTagNameMap]: ElementTagNameMap[TagName]
        }

        type Element = any;
    }

    const h: any;
    const f: any;
    const csr: boolean;
    const ssr: boolean;

    interface Window {
        h: any,
        f: any,
        csr: boolean;
        ssr: boolean;
    }
}

export type Properties = Record<string, unknown>;

export type Component<P extends Properties = {}> =
    ((properties: P & { children?: JSX.Element[] }) => JSX.Element);


export const fragmentType = Symbol("fragment");


const inflateChildren = (node: Node, children: any[]) => {
    for (const child of children.flat()) {
        const inflatedChild = normalize(child);

        if (inflatedChild !== undefined) {
            node.appendChild(inflatedChild);
        }
    }

    return node;
};

const inflateProperties = <P extends Properties>(node: Node, properties: P | null): Node => {
    if (properties !== null) {
        for (const name in properties) {
            const value = properties[name];

            if (name === "onClick") {
                node.addEventListener("click", value as any);
            } else {
                if (node instanceof SVGElement) {
                    name !== "xmlns" && node.setAttributeNS(null, name, `${value}`);
                } else {
                    (node as any)[name] = value;
                }
            }
        }
    }

    return node;
};

export const createElement = <P extends Properties>(type: symbol | string | Component, properties: P | null, ...children: any): Node => {
    if (type instanceof Function) {
        if (type.constructor.name === "AsyncFunction") {
            throw new Error();
        } else {
            const node = (type as any)({ ...properties, children });

            if (node instanceof Promise) {
                throw new Error();
            }

            return node;
        }
    }

    if (type === fragmentType) {
        return inflateChildren(document.createDocumentFragment(), children);
    }

    if (typeof type === "string") {
        const element = (
            ["svg", "path"].indexOf(type) !== -1
                ? document.createElementNS((properties as any)["xmlns"] ?? "http://www.w3.org/2000/svg", type)
                : document.createElement(type)
        );

        return inflateChildren(inflateProperties(element, properties), children);
    }

    if (type === undefined) {
        return document.createDocumentFragment();
    }

    console.error({ type, properties, children });

    throw new Error();
};


const normalize = (child: any): Node | undefined => {
    if (typeof child === "string" || typeof child === "number") {
        return document.createTextNode(`${child}`);
    }

    if (child instanceof Node) {
        return child;
    }

    if (child instanceof Effect) {
        const effect = child;
        const anchor = document.createComment("effect");

        let lastNodes: Node[] = [];
        let fragment: DocumentFragment | undefined;

        const unmountLastNode = () => {
            const { parentNode } = anchor;

            if (parentNode) {
                for (const lastNode of lastNodes) {
                    cleanup(lastNode);
                    parentNode.removeChild(lastNode);
                }

                if (fragment !== undefined) {
                    fragment.append(...lastNodes);
                }

                lastNodes = [];
            }
        };

        const handle = effect.observe(value => {
            const { parentNode } = anchor;

            if (parentNode) {
                let nodes = [ normalize(value) ?? document.createComment("placeholder") ];

                unmountLastNode();

                if (nodes[0] instanceof DocumentFragment) {
                    fragment = nodes[0];
                    nodes = [ ...fragment.childNodes ];
                }

                for (const node of nodes) {
                    parentNode.insertBefore(node, anchor);
                    mount(node);
                }

                lastNodes.push(...nodes);
            }
        });

        Object.assign(anchor, {
            onMount: () => {
                handle.renew({ fetch: true });
            },
            onCleanup: () => {
                unmountLastNode();
                handle.cancel();
            },
        });

        return anchor;
    }

    if (child === false || child === undefined) {
        return undefined;
    }

    if (child instanceof Promise) {
        const effect = new Effect(undefined);

        child
            .then(value => effect.set(value))
            .catch(console.error);

        return normalize(effect);
    }

    console.error("normalize is not implemented for", child);
    throw new Error();
};

const cleanup = (node: Node) => {
    const { onCleanup } = (node as any);

    if (onCleanup) {
        onCleanup();
    }

    for (const childNode of [ ...node.childNodes ]) {
        cleanup(childNode);
    }
}

const mount = (node: Node) => {
    const { onMount } = (node as any);

    if (onMount) {
        onMount();
    }

    for (const childNode of [ ...node.childNodes ]) {
        mount(childNode);
    }
};

export const render = async (node: Node): Promise<Node> => {
    mount(node);

    return node;
};

export type Observer<T> = (value: T) => void;
export type Mapper<T, R> = (value: T) => R;


export type ObserveHandle = {
    renew: (options?: { fetch: boolean }) => void,
    cancel: () => void,
};

export class Effect<T> {
    private value: T;
    private observers: Set<Observer<T>> = new Set();

    constructor(value: T) {
        this.value = value;
    }

    unwrap(): T {
        return this.value;
    }

    update(updater: (value: T) => T): Effect<T> {
        return this.set(updater(this.unwrap()));
    }

    set(value: T): Effect<T> {
        const previousValue = this.value;
        this.value = value;

        if (this.value !== previousValue) {
            for (const observer of this.observers) {
                observer(this.value);
            }
        }

        return this;
    }

    observe(observer: Observer<T>): ObserveHandle {
        this.observers.add(observer);


        return {
            renew: (options = { fetch: false }) => {
                this.observers.add(observer);

                if (options.fetch) {
                    observer(this.value);
                }
            },
            cancel: () => {
                this.observers.delete(observer);
            },
        };
    }

    map<R>(mapper: Mapper<T, R>): Effect<R> {
        const cache: any = {};
        const value = this.unwrap();
        const observer = new Effect(cache[value] ??= mapper(value));

        this.observe(value => {
            observer.set(cache[value] ??= mapper(value));
        });

        return observer;
    }
}

export const Hooks: Component<{ onMount?: () => void, onCleanup?: () => void }> = (hooks) =>
    createElement(fragmentType, {}, Object.assign(document.createComment("hooks"), hooks));
