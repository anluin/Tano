import { InflatedElementNode, InflatedFragmentNode, InflatedNode, InflatedTextNode } from "./inflated_node.ts";
import { collectEffects, createEffect, createSignal, preventEffect, Signal } from "../signal.ts";
import { normalize, ParentComponent } from "../render.ts";


export type Context = {
    children: Set<Context>,
    hooks: {
        onMount: Set<() => void>,
        onCleanup: Set<() => void>,
    },
    dispatchMount(): void,
    dispatchCleanup(): void,
};

export let currentContext: Context | undefined;

export const createContext = <T>(callback: () => T): T => {
    const previousContext = currentContext;

    currentContext = {
        children: new Set(),
        hooks: {
            onMount: new Set(),
            onCleanup: new Set(),
        },
        dispatchMount() {
            this.hooks.onMount.forEach(callback => callback());

            for (const child of this.children) {
                child.dispatchMount();
            }
        },
        dispatchCleanup() {
            for (const child of this.children) {
                child.dispatchCleanup();
            }

            this.hooks.onCleanup.forEach(callback => callback());
        },
    };

    const [ result, cancelSignals ] = collectEffects(callback);

    previousContext?.children.add(currentContext);
    currentContext.hooks.onCleanup.add(cancelSignals);
    currentContext = previousContext;

    return result;
};

export const onMount = (callback: () => void) =>
    currentContext?.hooks.onMount.add(callback);

export const onCleanup = (callback: () => void) =>
    currentContext?.hooks.onCleanup.add(callback);

export abstract class VirtualNode<T extends Node = Node> {
    abstract inflate(): InflatedNode<T>;
}

export abstract class VirtualParentNode<T extends Node = Node> extends VirtualNode<T> {
    readonly children: VirtualNode[];

    protected constructor(children: VirtualNode[]) {
        super();
        this.children = children;
    }
}

export class VirtualTextNode extends VirtualNode<Text> {
    readonly content: string;

    constructor(content: string) {
        super();
        this.content = content;
    }

    inflate(): InflatedNode<Text> {
        return new InflatedTextNode(document.createTextNode(this.content), this.content);
    }
}

export class VirtualSignalNode extends VirtualNode {
    readonly signal: Signal<JSX.Element>;

    constructor(signal: Signal<JSX.Element>) {
        super();
        this.signal = signal;
    }

    inflate(): InflatedNode {
        let inflatedNode: InflatedNode | undefined;

        createEffect(() => {
            const virtualNode = normalize(this.signal.value);

            if (inflatedNode) {
                const parent = inflatedNode.parent;
                const index = parent?.children.indexOf(inflatedNode) ?? -1;

                inflatedNode = (
                    inflatedNode
                        .dispatchCleanup()
                        .setContext(undefined)
                        .patch(virtualNode)
                        .dispatchMount()
                );

                if (index !== -1) {
                    (parent!.children[index] = inflatedNode)
                        .setParent(parent);
                } else {
                    throw new Error();
                }
            } else {
                inflatedNode = virtualNode.inflate();
            }
        });

        return inflatedNode!;
    }
}

export class VirtualElementNode extends VirtualParentNode<HTMLElement> {
    readonly tagName: string;
    readonly properties: Record<string, unknown>;

    constructor(tagName: string, properties: Record<string, unknown>, children: VirtualNode[]) {
        super(children);
        this.tagName = tagName;
        this.properties = properties;
    }

    inflate(): InflatedNode<HTMLElement> {
        return (
            new InflatedElementNode(document.createElement(this.tagName), this.tagName)
                .patchProperties(this.properties)
                .patchChildren(this.children)
        );
    }
}

export class VirtualFragmentNode extends VirtualParentNode<DocumentFragment> {
    constructor(children: VirtualNode[]) {
        super(children);
    }

    inflate(): InflatedNode<DocumentFragment> {
        return (
            new InflatedFragmentNode(document.createDocumentFragment())
                .patchChildren(this.children)
        );
    }
}

export class VirtualPlaceholderNode extends VirtualFragmentNode {
    constructor() {
        super([]);
    }
}

export class VirtualComponentNode extends VirtualParentNode {
    readonly component: ParentComponent;
    readonly properties: Record<string, unknown>;

    constructor(component: ParentComponent, properties: Record<string, unknown>, children: VirtualNode[]) {
        super(children);
        this.component = component;
        this.properties = properties;
    }

    inflate(): InflatedNode {
        return createContext(() =>
            normalize(preventEffect(() => new VirtualFragmentNode([
                normalize(this.component(this.properties as Record<string, never>, this.children)),
            ])))
                .inflate()
                .setContext(currentContext)
        );
    }
}
