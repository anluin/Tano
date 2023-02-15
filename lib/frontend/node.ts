import { restoreAttributes, restoreChildren } from "./restore.ts";
import { swap, swapNodes, swapProperties } from "./render.ts";
import { Component, Properties } from "./jsx.ts";
import { Signal } from "./signal.ts";
import { Effect, useEffect } from "./effect.ts";
import { Context, useContext } from "./context.ts";


export abstract class VirtualNode {
    parent?: VirtualNode;

    static __from(value: unknown): VirtualNode {
        if (value instanceof VirtualNode) {
            return value;
        }

        if (value instanceof Array) {
            return new VirtualFragment(
                value.map(VirtualNode.__from),
            );
        }

        if (value instanceof Text) {
            return new VirtualText(
                value.nodeValue ?? "",
                value,
            );
        }

        if (value instanceof Comment) {
            return new VirtualComment(
                value.nodeValue ?? "",
                value,
            );
        }

        if (value instanceof HTMLElement) {
            return new VirtualTag(
                value.tagName.toLowerCase(),
                restoreAttributes(value),
                restoreChildren(value),
                value,
            );
        }

        if (value instanceof Signal) {
            let currentVirtualNode: VirtualNode;

            new Effect(() => {
                const virtualNode = VirtualNode.__from(value.value);

                useContext(undefined, () =>
                    useEffect(undefined, () => {
                        if (currentVirtualNode && currentVirtualNode !== virtualNode) {
                            const previousParent = currentVirtualNode.parent;

                            currentVirtualNode.__unmount?.();
                            currentVirtualNode.parent = undefined;

                            if (previousParent instanceof VirtualFragment || previousParent instanceof VirtualTag) {
                                const index = previousParent.__children.indexOf(currentVirtualNode);

                                if (index !== -1) {
                                    (previousParent.__children[index] = virtualNode)
                                        .parent = previousParent;
                                } else {
                                    throw new Error();
                                }
                            } else if (previousParent instanceof VirtualComponent) {
                                (previousParent.__initializedNode = virtualNode)
                                    .parent = previousParent;
                            } else {
                                throw new Error();
                            }

                            swap(currentVirtualNode, virtualNode);
                            virtualNode.__mount?.();
                        }
                    }),
                );

                currentVirtualNode = virtualNode;
            });

            return currentVirtualNode!;
        }

        if (["string", "number"].includes(typeof value)) {
            return new VirtualText(`${value}`);
        }

        if (["undefined", "boolean"].includes(typeof value)) {
            return (
                ssr || showHelperNodes
                    ? new VirtualComment("placeholder")
                    : new VirtualText("")
            );
        }

        csr && console.error(value);
        throw new Error();
    }

    abstract __inflate(): Node[];

    abstract __remove(): void;

    __mount?(): void;

    __unmount?(): void;
}

export class VirtualText extends VirtualNode {
    readonly __content: string;

    __node?: Text;

    constructor(content: string, node?: Text) {
        super();
        this.__content = content;
        this.__node = node;
    }

    __inflate() {
        return [this.__node = document.createTextNode(this.__content)];
    }

    __remove() {
        this.__node?.remove();
    }
}

export class VirtualComment extends VirtualNode {
    readonly __content: string;

    __node?: Comment;

    constructor(content: string, node?: Comment) {
        super();
        this.__content = content;
        this.__node = node;
    }

    __inflate() {
        return [this.__node = document.createComment(this.__content)];
    }

    __remove() {
        this.__node?.remove();
    }
}

export class VirtualTag extends VirtualNode {
    readonly __tagName: string;
    readonly __properties: Properties;
    readonly __children: VirtualNode[];

    __node?: HTMLElement;

    constructor(tagName: string, properties: Properties, children: VirtualNode[], node?: HTMLElement) {
        super();
        this.__tagName = tagName;
        this.__properties = properties;

        for (const child of (this.__children = children)) {
            child.parent = this;
        }

        this.__node = node;
    }

    __inflate() {
        const node = document.createElement(this.__tagName);

        swapProperties(node, {}, this.__properties);
        swapNodes(node, [], this.__children);

        return [this.__node = node];
    }

    __mount() {
        const effects = (
            (this.__node as unknown as {
                __effects?: Record<string, Effect>,
            })
                ?.__effects
        );

        for (const propertyName in effects) {
            effects[propertyName]?.__resume();
        }

        for (const child of this.__children) {
            child.__mount?.();
        }
    }

    __unmount() {
        for (const child of this.__children) {
            child.__unmount?.();
        }

        const effects = (
            (this.__node as unknown as {
                __effects?: Record<string, Effect>,
            })
                ?.__effects
        );

        for (const propertyName in effects) {
            effects[propertyName]?.__suspend();
        }
    }

    __remove() {
        this.__node?.remove();
    }
}

export class VirtualFragment extends VirtualNode {
    readonly __children: VirtualNode[];

    __startHint?: Comment | Text;
    __endHint?: Comment | Text;

    constructor(children: VirtualNode[], startHint?: Comment | Text, endHint?: Comment | Text) {
        super();

        for (const child of (this.__children = children)) {
            child.parent = this;
        }

        this.__startHint = startHint;
        this.__endHint = endHint;
    }

    __inflate() {
        return [
            this.__startHint = ssr ? document.createComment("fragment start") : document.createTextNode(""),
            ...this.__children.reduce((carry, child) => [...carry, ...child.__inflate()], <Node[]>[]),
            this.__endHint = ssr ? document.createComment("fragment end") : document.createTextNode(""),
        ];
    }

    __mount() {
        for (const child of this.__children) {
            child.__mount?.();
        }
    }

    __unmount() {
        for (const child of this.__children) {
            child.__unmount?.();
        }
    }

    __remove() {
        this.__startHint?.remove();

        for (const child of this.__children) {
            child.__remove();
        }

        this.__endHint?.remove();
    }
}

export type UpdateEvent<T extends Properties = Properties> = {
    properties: T,
    children?: VirtualNode[],
    preventDefault(): void,
};

export class VirtualComponent<T extends Properties = Properties> extends VirtualNode {
    static __current?: VirtualComponent<any>;

    readonly __properties: T;
    readonly __children?: VirtualNode[];

    __context: Context;
    __initializer: Component<T>;
    __listeners?: {
        __mount?: Set<() => void>,
        __unmount?: Set<() => void>,
        __cleanup?: Set<() => void>,
        __update?: Set<(event: UpdateEvent<T>) => void>,
    };

    __mounted = false;

    __initializedNode?: VirtualNode;

    constructor(initializer: Component<T>, properties: T, children?: VirtualNode[]) {
        super();
        this.__initializer = initializer;
        this.__properties = properties;
        this.__children = children;
        this.__context = new Context();
    }

    __initialize() {
        if (!this.__initializedNode) {
            const wasMounted = this.__mounted;

            if (wasMounted) {
                this.__unmount();
            }

            const previousComponent = VirtualComponent.__current;

            VirtualComponent.__current = this;

            (this.__initializedNode ??= useContext(this.__context, useEffect(undefined, () => () =>
                VirtualNode.__from(this.__initializer(this.__properties, this.__children))
            )))
                .parent = this;

            VirtualComponent.__current = previousComponent;

            if (wasMounted) {
                this.__mount();
            }
        }

        return this.__initializedNode;
    }

    __inflate(): Node[] {
        return useContext(this.__context, useEffect(undefined, () => () =>
            this.__initialize().__inflate()
        ));
    }

    __mount() {
        if (!this.__mounted) {
            this.__mounted = true;
            this.__context.__resume();

            useContext(this.__context, () => {
                for (const listener of (this.__listeners?.__mount ?? [])) {
                    listener();
                }
            });

            this.__initializedNode?.__mount?.();
        }
    }

    __unmount() {
        if (this.__mounted) {
            this.__initializedNode?.__unmount?.();

            useContext(this.__context, () => {
                for (const listener of (this.__listeners?.__unmount ?? [])) {
                    listener();
                }
            });

            this.__context.__suspend();
            this.__mounted = false;
        }
    }

    __update(properties: Properties, children?: VirtualNode[]) {
        let preventDefault = false;

        useContext(this.__context, () => {
            for (const listener of (this.__listeners?.__update ?? [])) {
                listener({
                    // @ts-ignore: TODO: Use proper typings
                    properties,
                    children,
                    preventDefault() {
                        preventDefault ||= true
                    },
                });
            }
        });

        return preventDefault;
    }

    __remove() {
        this.__initializedNode?.__remove();
    }
}

export const onMount = (callback: () => void) =>
    (
        (VirtualComponent.__current!.__listeners ??= {})
            .__mount ??= new Set()
    )
        .add(callback);

export const onUnmount = (callback: () => void) =>
    (
        (VirtualComponent.__current!.__listeners ??= {})
            .__unmount ??= new Set()
    )
        .add(callback);

export const onUpdate = <T extends Properties = Properties>(callback: (event: UpdateEvent<T>) => void) =>
    (
        (VirtualComponent.__current!.__listeners ??= {})
            .__update ??= new Set()
    )
        .add(callback);
