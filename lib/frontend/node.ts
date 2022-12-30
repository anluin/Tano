import { Attributes, Component, Properties } from "./jsx.ts";
import { Signal } from "./signal.ts";
import { Effect } from "./effect.ts";
import { Context } from "./context.ts";
import { $pathname } from "./store.ts";
import { Skip } from "./utils.ts";


const restoreAttributes = (element: HTMLElement): Properties =>
    [ ...element.attributes ]
        .reduce((carry, { name, value }) => ({ ...carry, [name]: value }), {});

const restoreChildren = (element: HTMLElement): VirtualNode[] => {
    const childrenStack: VirtualNode[][] = [ [] ];
    const fragmentHits: Comment[] = [];

    for (const childNode of element.childNodes) {
        if (childNode instanceof Comment) {
            if (childNode.nodeValue === `fragment start`) {
                childrenStack.push([]);
                fragmentHits.push(childNode);
                continue;
            }

            if (childNode.nodeValue === `fragment end`) {
                const fragmentStartHint = document.createComment("fragment start");
                const fragmentEndHint = document.createComment("fragment end");

                fragmentHits.pop()!.replaceWith(fragmentStartHint);
                childNode.replaceWith(fragmentEndHint);

                const fragment = new VirtualFragment(
                    childrenStack.pop()!,
                    fragmentStartHint,
                    fragmentEndHint,
                );
                childrenStack.at(-1)!.push(fragment);
                continue;
            }
        }

        childrenStack.at(-1)!.push(VirtualNode.__from(childNode));
    }

    const children = childrenStack.pop();

    if (children) {
        return children;
    } else {
        throw new Error();
    }
};

const replaceAttribute = (node: HTMLElement, propertyName: string, previousValue: unknown, nextValue: unknown) => {
    const attributeName = (<Record<string, string>>{
        "className": "class",
    })[propertyName] ?? propertyName;

    if (previousValue !== nextValue) {
        if (propertyName.startsWith("on") && (previousValue instanceof Function || nextValue instanceof Function)) {
            const event = propertyName.slice(2).toLowerCase();

            if (previousValue instanceof Function) {
                node.removeEventListener(event, previousValue as EventListener);
            }

            if (nextValue instanceof Function) {
                node.addEventListener(event, nextValue as EventListener);
            }

            return;
        }

        if (nextValue) {
            if (typeof nextValue === "string") {
                node.setAttribute(attributeName, nextValue);
            } else if (typeof nextValue === "boolean") {
                if (ssr) {
                    if (nextValue) {
                        node.setAttribute(attributeName, "");
                    } else {
                        node.removeAttribute(attributeName);
                    }
                } else {
                    node.toggleAttribute(attributeName, nextValue);
                }
            } else {
                throw new Error();
            }
        } else {
            node.removeAttribute(attributeName);
        }
    }
};

function handleAnchorClick(this: HTMLAnchorElement, event: MouseEvent) {
    const href = this.getAttribute("href");

    if (href?.startsWith("/")) {
        event.preventDefault();
        $pathname.value = href;
    }
}

const replaceAttributes = (node: HTMLElement, previousAttributes: Attributes, nextAttributes: Attributes) => {
    if (csr && node instanceof HTMLAnchorElement) {
        node.removeEventListener("click", handleAnchorClick);
        node.addEventListener("click", handleAnchorClick);
    }

    for (const name in { ...previousAttributes, ...nextAttributes }) {
        replaceAttribute(node, name, previousAttributes[name], nextAttributes[name]);
    }
};

const replaceChildren = (parentNode: Node, previousChildren: VirtualNode[], nextChildren: VirtualNode[], referenceNode: Node | null = null) => {
    const maxLength = Math.max(previousChildren.length, nextChildren.length);

    for (let index = 0; index < maxLength; ++index) {
        const previousChild = previousChildren[index];
        const nextChild = nextChildren[index];

        if (previousChild && nextChild) {
            nextChild.__replace(previousChild);
        } else if (previousChild) {
            previousChild.__remove();
        } else {
            parentNode.insertBefore(nextChild.__inflate(), referenceNode);
        }
    }
};

export abstract class VirtualNode {
    __parent?: VirtualNode;

    static __from(value: unknown): VirtualNode {
        if (value instanceof VirtualNode) {
            return value;
        }

        if (value instanceof Signal) {
            let currentNode: VirtualNode;

            new Effect(() => {
                const nextNode = VirtualNode.__from(value.value);

                if (nextNode instanceof VirtualComponent && nextNode.__initializer === Skip) {
                    return;
                }

                if (nextNode !== currentNode) {
                    if (currentNode) {
                        currentNode.__cleanup?.();

                        if (currentNode.__parent instanceof VirtualTag || currentNode.__parent instanceof VirtualFragment) {
                            const index = currentNode.__parent.__children.indexOf(currentNode);

                            if (index !== -1) {
                                currentNode.__parent.__children[index] = nextNode;
                            } else {
                                throw new Error();
                            }
                        }

                        if (currentNode.__parent instanceof VirtualComponent) {
                            if (currentNode.__parent.__initializedNode) {
                                currentNode.__parent.__initializedNode = nextNode;
                            } else {
                                throw new Error();
                            }
                        }

                        nextNode.__replace(currentNode);
                        nextNode.__parent = currentNode.__parent;
                        currentNode.__parent = undefined;
                        nextNode.__mount?.();
                    }
                }

                currentNode = nextNode;
            });

            return currentNode!;
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

        if (typeof value === "string" || typeof value === "number") {
            return new VirtualText(`${value}`);
        }

        if (typeof value === "undefined") {
            return new VirtualComment("placeholder");
        }

        console.error("VirtualNode::from", value);
        throw new Error();
    }

    __mount?(): void;

    __cleanup?(): void;

    abstract __remove(): void;

    abstract __inflate(): Node;

    abstract __replace(previousNode: VirtualNode): void;
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
        return this.__node = document.createTextNode(this.__content);
    }

    __remove() {
        this.__node?.remove();
    }

    __replace(previousNode: VirtualNode) {
        if (previousNode instanceof VirtualText) {
            if (!previousNode.__node) throw new Error();

            const node = this.__node = previousNode.__node;

            if (previousNode.__content !== this.__content) {
                node.nodeValue = this.__content;
            }

            return;
        }

        if (previousNode instanceof VirtualText || previousNode instanceof VirtualTag) {
            if (!previousNode.__node) throw new Error();
            previousNode.__node.replaceWith(this.__inflate());
            return;
        }

        if (previousNode instanceof VirtualFragment) {
            const referenceNode = previousNode.__startHint ?? previousNode.__endHint;
            const parentNode = referenceNode?.parentNode;

            if (!referenceNode || !parentNode) throw new Error();

            const node = this.__inflate();
            parentNode.insertBefore(node, referenceNode);
            previousNode.__remove();
            return;
        }

        console.log(this, previousNode);
        throw new Error();
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
        return this.__node = document.createComment(this.__content);
    }

    __remove() {
        this.__node?.remove();
    }

    __replace(previousNode: VirtualNode) {
        if (previousNode instanceof VirtualComment) {
            if (!previousNode.__node) throw new Error();

            const node = this.__node = previousNode.__node;

            if (previousNode.__content !== this.__content) {
                node.nodeValue = this.__content;
            }

            return;
        }

        if (previousNode instanceof VirtualText || previousNode instanceof VirtualTag) {
            if (!previousNode.__node) throw new Error();
            previousNode.__node.replaceWith(this.__inflate());
            return;
        }

        if (previousNode instanceof VirtualFragment) {
            const referenceNode = previousNode.__startHint ?? previousNode.__endHint;
            const parentNode = referenceNode?.parentNode;

            if (!referenceNode || !parentNode) throw new Error();

            const node = this.__inflate();
            parentNode.insertBefore(node, referenceNode);
            previousNode.__remove();
            return;
        }

        console.log(this, previousNode);
        throw new Error();
    }
}

export class VirtualTag extends VirtualNode {
    readonly __tagName: string;
    readonly __attributes: Attributes;
    readonly __children: VirtualNode[];

    __node?: HTMLElement;

    constructor(tagName: string, attributes: Attributes, children: VirtualNode[], node?: HTMLElement) {
        super();
        this.__tagName = tagName;
        this.__attributes = attributes;
        this.__node = node;

        for (const child of (this.__children = children)) {
            child.__parent = this;
        }
    }

    __mount() {
        for (const child of this.__children) {
            child.__mount?.();
        }
    }

    __cleanup() {
        for (const child of this.__children) {
            child.__cleanup?.();
        }
    }

    __inflate() {
        const node = this.__node = document.createElement(this.__tagName);

        replaceAttributes(node, {}, this.__attributes);
        replaceChildren(node, [], this.__children);

        return node;
    }

    __remove() {
        this.__node?.remove();
    }

    __replace(previousNode: VirtualNode) {
        if (previousNode instanceof VirtualText || previousNode instanceof VirtualComment || previousNode instanceof VirtualTag) {
            if (!previousNode.__node) throw new Error();

            if (previousNode instanceof VirtualTag) {
                if (previousNode.__tagName === this.__tagName) {
                    const node = this.__node = previousNode.__node;

                    replaceAttributes(node, previousNode.__attributes, this.__attributes);
                    replaceChildren(node, previousNode.__children, this.__children);

                    return;
                }
            }

            const node = this.__inflate();
            previousNode.__node.replaceWith(node);
            return;
        }

        if (previousNode instanceof VirtualFragment) {
            const referenceNode = previousNode.__startHint ?? previousNode.__endHint;
            const parentNode = referenceNode?.parentNode;

            if (!referenceNode || !parentNode) throw new Error();

            const node = this.__inflate();

            parentNode.insertBefore(node, referenceNode);

            previousNode.__remove();
            return;
        }

        if (previousNode instanceof VirtualComponent) {
            if (!previousNode.__initializedNode) throw new Error();
            this.__replace(previousNode.__initializedNode);
            return
        }

        console.error(this, previousNode);
        throw new Error();
    }
}

export class VirtualFragment extends VirtualNode {
    readonly __children: VirtualNode[];

    __startHint?: Comment;
    __endHint?: Comment;

    constructor(nodes: VirtualNode[], startHint?: Comment, endHint?: Comment) {
        super();
        this.__startHint = startHint;
        this.__endHint = endHint;

        for (const node of (this.__children = nodes)) {
            node.__parent = this;
        }
    }

    __mount() {
        for (const child of this.__children) {
            child.__mount?.();
        }
    }

    __cleanup() {
        for (const child of this.__children) {
            child.__cleanup?.();
        }
    }

    __inflate() {
        const node = document.createDocumentFragment();
        node.appendChild(this.__startHint ??= document.createComment("fragment start"));
        replaceChildren(node, [], this.__children);
        node.appendChild(this.__endHint ??= document.createComment("fragment end"));
        return node;
    }

    __remove() {
        this.__startHint?.remove();
        this.__endHint?.remove();

        for (const node of this.__children) {
            node.__remove();
        }
    }

    __replace(previousNode: VirtualNode) {
        if (previousNode instanceof VirtualFragment) {
            if (!previousNode.__startHint || !previousNode.__endHint) throw new Error();

            [ this.__startHint, previousNode.__startHint ] = [ previousNode.__startHint, undefined ];
            [ this.__endHint, previousNode.__endHint ] = [ previousNode.__endHint, undefined ];

            const referenceNode = this.__startHint;
            const parentNode = referenceNode?.parentNode;

            if (referenceNode && parentNode) {
                replaceChildren(parentNode, previousNode.__children, this.__children, referenceNode);
            } else {
                throw new Error();
            }

            return;
        }

        console.error(previousNode);
        throw new Error();
    }
}

export type Listener = (this: VirtualComponent) => void | void;

export class VirtualComponent extends VirtualNode {
    readonly __initializer: Component;
    readonly __properties: Properties;
    readonly __children: unknown[];
    readonly __context: Context;

    __listeners?: {
        mount?: Set<Listener>,
        cleanup?: Set<Listener>,
    };
    __initializedNode?: VirtualNode;

    constructor(initializer: Component, properties: Properties, children: unknown[]) {
        super();
        this.__initializer = initializer;
        this.__properties = properties;
        this.__children = children;
        this.__context = new Context();
    }

    addEventListener(event: "mount", listener: Listener): void;
    addEventListener(event: "cleanup", listener: Listener): void;
    addEventListener(event: "mount" | "cleanup", listener: Listener) {
        ((this.__listeners ??= {})[event] ??= new Set()).add(listener);
    }

    __mount() {
        this.__context.__resume();
        this.__context.use(() => {
            for (const listener of this.__listeners?.mount ?? []) {
                listener.call(this);
            }

            this.__initializedNode?.__mount?.();
        });
    }

    __cleanup() {
        this.__context.use(() => {
            this.__initializedNode?.__cleanup?.();

            for (const listener of this.__listeners?.cleanup ?? []) {
                listener.call(this);
            }
        });
        this.__context.__suspend();
    }

    __initialize() {
        if (this.__initializer === Skip) throw new Error();

        if (!this.__initializedNode) {
            (
                this.__initializedNode = (
                    this.__context.use(() =>
                        Effect.__prevent(() =>
                            VirtualNode.__from(
                                this.__initializer.call(this, this.__properties, this.__children),
                            ),
                        ),
                    )
                )
            ).__parent = this;
        }

        return this.__initializedNode;
    }

    __inflate() {
        return this.__initialize().__inflate();
    }

    __remove() {
        this.__initializedNode?.__remove();
    }

    __replace(previousNode: VirtualNode) {
        if (this.__initializer === Skip) return;

        if (previousNode instanceof VirtualComponent) {
            if (!previousNode.__initializedNode) throw new Error();
            this.__replace(previousNode.__initializedNode);
            return;
        }

        this.__initialize().__replace(previousNode);
    }
}
