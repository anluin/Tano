import { Context, VirtualElementNode, VirtualFragmentNode, VirtualNode, VirtualTextNode } from "./virtual_node.ts";
import { collectEffects, createEffect, normalize, Signal } from "../signal.ts";
import { propertyName2AttributeName, propertyName2EventName } from "../utils.ts";
import { handleClickOnAnchor } from "../router.ts";


export abstract class InflatedNode<T extends Node = Node> {
    parent?: InflatedParentNode;
    context?: Context;
    node: T;
    component?: CallableFunction;

    protected constructor(node: T) {
        this.node = node;
    }

    setContext(context?: Context) {
        this.context = context;
        return this;
    }

    dispatchMount() {
        this.context?.dispatchMount();
        return this;
    }

    dispatchCleanup() {
        this.context?.dispatchCleanup();
        return this;
    }

    setParent(parent?: InflatedParentNode, ignoreChecks = false) {
        if (ignoreChecks || parent?.children.indexOf(this) !== -1) {
            this.parent = parent;
            return this;
        }

        throw new Error();
    }

    abstract patch<T extends Node>(virtualNode: VirtualNode<T>): InflatedNode;

    remove() {
        this.setParent(undefined)
            ?.node.parentNode
            ?.removeChild(this.node);

        return this;
    }

    replaceWith<T extends Node>(virtualNode: VirtualNode<T>): InflatedNode {
        const index = this.parent?.children.indexOf(this) ?? -1;
        const inflatedNode = virtualNode.inflate();

        if (index !== -1) {
            (this.parent!.children[index] = inflatedNode)
                .setParent(this.parent);
        }

        this.node.parentNode
            ?.replaceChild(inflatedNode.node, this.node);

        this.setParent(undefined);

        return inflatedNode;
    }
}

export class InflatedTextNode extends InflatedNode<Text> {
    private content: string | null;

    constructor(node: Text, content: string | null) {
        super(node);
        this.node = node;
        this.content = content;
    }

    patch<T extends Node>(virtualNode: VirtualNode<T>): InflatedNode {
        if (virtualNode instanceof VirtualTextNode) {
            if (this.content !== virtualNode.content) {
                this.node.nodeValue = this.content = virtualNode.content;
            }

            return this;
        }

        return this.replaceWith(virtualNode);
    }
}

export abstract class InflatedParentNode<T extends Node = Node> extends InflatedNode<T> {
    children: InflatedNode[] = [];

    protected constructor(node: T, children: InflatedNode[] = []) {
        super(node);
        this.children = children.map(child => child.setParent(this, true));
    }

    dispatchMount() {
        const result = super.dispatchMount();

        for (const child of this.children) {
            child.dispatchMount();
        }

        return result;
    }

    dispatchCleanup() {
        for (const child of this.children) {
            child.dispatchCleanup();
        }

        return super.dispatchCleanup();
    }

    appendChild(virtualNode: VirtualNode): InflatedNode {
        const inflatedNode = virtualNode.inflate();
        this.node.appendChild(inflatedNode.node);
        return inflatedNode;
    }

    patchChildren(children: VirtualNode[]) {
        const currentLength = this.children.length;
        const newLength = children.length;
        const minLength = Math.min(currentLength, newLength);

        for (let index = 0; index < minLength; ++index) {
            (this.children[index] = this.children[index].patch(children[index]))
                .setParent(this);
        }

        for (let index = minLength; index < newLength; ++index) {
            (this.children[index] = this.appendChild(children[index]))
                .setParent(this);
        }

        for (let index = minLength; index < currentLength; ++index) {
            this.children[index].remove();
        }

        this.children.length = newLength;

        return this;
    }
}

export class InflatedElementNode extends InflatedParentNode<HTMLElement | SVGElement> {
    private readonly tagName: string;
    private readonly properties: Record<string, unknown>;

    private cancelPropertyEffects?: () => void;

    constructor(node: HTMLElement | SVGElement, tagName: string, properties: Record<string, unknown> = {}, children: InflatedNode[] = []) {
        super(node, children);
        this.tagName = tagName;
        this.properties = properties;
    }

    patchProperties(properties: Record<string, unknown>) {
        this.cancelPropertyEffects?.();

        if ("reference" in properties && properties["reference"] instanceof Signal) {
            properties["reference"].set(this.node);
            delete properties["reference"];
        }

        if (csr && this.node instanceof HTMLAnchorElement) {
            if ((this.properties as { href?: string }).href?.startsWith("/")) {
                this.node.removeEventListener("click", handleClickOnAnchor);
            }

            if ((properties as { href?: string }).href?.startsWith("/")) {
                this.node.addEventListener("click", handleClickOnAnchor);
            }
        }

        for (const name in this.properties) {
            const value = this.properties[name];

            if (normalize(properties[name]) !== value) {
                if (name.startsWith("on") && value instanceof Function) {
                    this.node.removeEventListener(propertyName2EventName(name), value as EventListener);
                } else if (typeof value === "string" && ssr || this.node instanceof SVGElement || name.startsWith("data-")) {
                    this.node.removeAttribute(propertyName2AttributeName(name));
                } else if (csr) {
                    delete (this.node as any)[name];
                }
            }
        }

        const [ _, cancelEffects ] = collectEffects(() => {
            for (const name in properties) {
                createEffect(() => {
                    const value = properties[name];

                    if (value instanceof Signal) {
                        if (csr) {
                            const element = this.node;

                            if (element instanceof HTMLInputElement) {
                                if (name === "checked") {
                                    element.addEventListener("input", () => value.set(element.checked));
                                }
                            }

                            if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
                                if (name === "value") {
                                    element.addEventListener("input", () => value.set(element.value));
                                }
                            }
                        }
                    }

                    const normalizedValue = normalize(value);

                    if (this.properties[name] !== normalizedValue) {
                        if (name.startsWith("on") && normalizedValue instanceof Function) {
                            this.node.addEventListener(propertyName2EventName(name), normalizedValue as EventListener);
                        } else if (typeof normalizedValue === "string" && ssr || this.node instanceof SVGElement || name.startsWith("data-")) {
                            this.node.setAttribute(propertyName2AttributeName(name), `${normalizedValue}`);
                        } else if (csr) {
                            (this.node as any)[name] = normalizedValue;
                        }
                    }

                    this.properties[name] = normalizedValue;
                });
            }
        });

        this.cancelPropertyEffects = cancelEffects;

        return this;
    }

    patch<T extends Node>(virtualNode: VirtualNode<T>): InflatedNode {
        if (virtualNode instanceof VirtualElementNode && virtualNode.tagName === this.tagName) {
            return (
                this.patchProperties(virtualNode.properties)
                    .patchChildren(virtualNode.children)
            );
        }

        return this.replaceWith(virtualNode);
    }
}

export class InflatedFragmentNode extends InflatedParentNode<DocumentFragment> {
    constructor(node: DocumentFragment) {
        super(node);
    }

    get parentNode(): Node | null {
        if (this.parent instanceof InflatedFragmentNode) {
            return this.parent.parentNode;
        }

        return this.parent?.node ?? null;
    }

    get firstChildNode(): Node | null {
        for (let index = 0; index < this.children.length; ++index) {
            const child = this.children[index];

            if (child instanceof InflatedFragmentNode) {
                const node = child.lastChildNode;

                if (node) {
                    return node;
                } else {
                    continue;
                }
            }

            return child.node;
        }

        return null;
    }

    get lastChildNode(): Node | null {
        for (let index = this.children.length; (index--) > 0;) {
            const child = this.children[index];

            if (child instanceof InflatedFragmentNode) {
                const node = child.firstChildNode;

                if (node) {
                    return node;
                } else {
                    continue;
                }
            }

            return child.node;
        }

        return null;
    }

    get nextSibling(): Node | null {
        if (this.parent) {
            const ownIndex = this.parent.children.indexOf(this);

            for (let index = ownIndex + 1; index < this.parent.children.length; ++index) {
                const child = this.parent.children[index];

                if (child instanceof InflatedFragmentNode) {
                    const node = child.firstChildNode;

                    if (node) {
                        return node;
                    } else {
                        continue;
                    }
                }

                return child.node;
            }

            if (this.parent instanceof InflatedFragmentNode) {
                return this.parent.nextSibling;
            }
        }

        return null;
    }

    appendChild(virtualNode: VirtualNode): InflatedNode {
        const inflatedNode = virtualNode.inflate();
        const referenceNode = this.lastChildNode?.nextSibling ?? this.nextSibling ?? null;

        (referenceNode?.parentNode ?? this.parentNode ?? this.node)
            ?.insertBefore(inflatedNode.node, referenceNode);

        return inflatedNode;
    }

    replaceWith<T extends Node>(virtualNode: VirtualNode<T>): InflatedNode {
        const index = this.parent?.children.indexOf(this) ?? -1;
        const inflatedNode = this.appendChild(virtualNode);

        if (index !== -1) {

            (this.parent!.children[index] = inflatedNode)
                .setParent(this.parent);

            this.remove();
        }

        return inflatedNode;
    }

    remove() {
        for (const child of this.children) {
            if (child instanceof InflatedFragmentNode) {
                child.remove();
            } else {
                this.node.appendChild(child.node);
            }
        }

        this.setParent(undefined);

        return this;
    }

    patch<T extends Node>(virtualNode: VirtualNode<T>): InflatedNode {
        if (virtualNode instanceof VirtualFragmentNode) {
            return this
                .patchChildren(virtualNode.children);
        }

        return this.replaceWith(virtualNode);
    }
}
