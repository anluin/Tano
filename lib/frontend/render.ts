import {
    VirtualComponentNode,
    VirtualElementNode,
    VirtualFragmentNode,
    VirtualNode,
    VirtualPlaceholderNode,
    VirtualSignalNode,
    VirtualTextNode
} from "./virtual_dom/virtual_node.ts";
import { restoreTree } from "./utils.ts";
import { createSignal, Signal } from "./signal.ts";

export { VirtualNode, onMount, onCleanup } from "./virtual_dom/virtual_node.ts";

export type Primitive = string | boolean | number | undefined;
export type Fragment = typeof fragmentType;
export type Properties = Record<string, unknown>;
export type Component<P extends Properties = Record<string, never>> = (properties: P, children: never[]) => JSX.Element | Promise<JSX.Element>;
export type ParentComponent<P extends Properties = Record<string, never>> = (properties: P, children: VirtualNode[]) => JSX.Element;

export const fragmentType = Symbol();

export const normalizeChild = (child: unknown): VirtualNode => {
    if (child === undefined || typeof child === "boolean") {
        return new VirtualPlaceholderNode();
    }

    if (child instanceof Signal) {
        return new VirtualSignalNode(child);
    }

    if (child instanceof Array) {
        return new VirtualFragmentNode(child.map(normalizeChild));
    }

    if (child instanceof VirtualNode) {
        return child;
    }

    if (child instanceof Promise) {
        const placeholder = new VirtualSignalNode(createSignal(new VirtualFragmentNode([])));
        (async () => placeholder.signal.set(new VirtualFragmentNode([ normalizeChild(await child) ])))();
        return placeholder;
    }

    return new VirtualTextNode(`${child}`);
}

export const createElement = (union: string | Fragment | Component | ParentComponent, properties: Properties | null = null, ...children: JSX.Element[]): VirtualNode => {
    const normalizedChildren = children.map(normalizeChild);

    switch (typeof union) {
        case "string":
            return new VirtualElementNode(union, properties ?? {}, normalizedChildren);
        case "symbol":
            return new VirtualFragmentNode(normalizedChildren);
        default:
            return new VirtualComponentNode(union as ParentComponent, properties ?? {}, normalizedChildren);
    }
}

export const render = async (element: JSX.Element) => {
    restoreTree(document.documentElement)
        .patch(normalizeChild(element))
        .dispatchMount();
};
