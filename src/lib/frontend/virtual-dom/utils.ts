import { ReadonlySignal } from "../reactivity/signal.ts";
import { ComponentInitializer } from "../jsx.ts";
import { restoreAttributes, restoreChildren } from "../restore.ts";
import { VirtualCommentNode } from "./comment.ts";
import { VirtualTextNode } from "./text.ts";
import { VirtualElementNode } from "./element.ts";
import { VirtualComponentNode } from "./component.ts";
import { VirtualFragmentNode } from "./fragment.ts";
import { VirtualSignalNode } from "./signal.ts";
import { VirtualNode } from "./node.ts";


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
