import { VirtualNode } from "./node.ts";
import { ReadonlySignal } from "../reactivity/signal.ts";
import { VirtualSignalNode } from "./signal.ts";
import { VirtualFragmentNode } from "./fragment.ts";
import { VirtualTextNode } from "./text.ts";
import { VirtualCommentNode } from "./comment.ts";
import { VirtualComponentNode } from "./component.ts";
import { ComponentInitializer } from "../jsx.ts";
import { restoreAttributes, restoreChildren } from "../restore.ts";
import { VirtualElementNode } from "./element.ts";


export const toVirtualNode = (value: unknown): VirtualNode => {
    if (value instanceof VirtualNode) {
        return value;
    }

    if (value instanceof ReadonlySignal) {
        return new VirtualSignalNode(value);
    }

    if (value instanceof Array) {
        return new VirtualFragmentNode(value.map(toVirtualNode));
    }

    if (value instanceof Function) {
        return new VirtualComponentNode(value as ComponentInitializer, {}, []);
    }

    if (value instanceof Text) {
        return new VirtualTextNode(
            value.nodeValue ?? "",
            value,
        );
    }

    if (value instanceof Comment) {
        return new VirtualCommentNode(
            value.nodeValue ?? "",
            value,
        );
    }

    if (value instanceof HTMLElement) {
        return new VirtualElementNode(
            value.tagName.toLowerCase(),
            restoreAttributes(value),
            restoreChildren(value),
            value,
        );
    }

    if (typeof value === "string" || typeof value === "number") {
        return new VirtualTextNode(`${value}`);
    }

    if (typeof value === "undefined" || typeof value === "boolean") {
        return new VirtualCommentNode("placeholder");
    }

    throw new Error(`toVirtualNode is not implemented for ${value?.constructor.name ?? typeof value}`);
};
