import { VirtualComponent, VirtualFragment, VirtualNode, VirtualTag } from "./node.ts";
import { Signal } from "./signal.ts";


declare global {
    const React: unknown;

    namespace JSX {
        type IntrinsicElements = Record<string, unknown>;

        type Element = undefined | string | number | Element[] | VirtualNode | Signal<JSX.Element>;
    }
}

export type MouseEventListener = (this: HTMLElement, event: MouseEvent) => void;
export type SubmitEventListener = (this: HTMLElement, event: SubmitEvent) => void;

export type Properties = Record<string, unknown>;
export type Component<T extends Properties = Properties> = (properties: T, children: VirtualNode[] | undefined) => JSX.Element;

const isTagArgs = (args: unknown[]): args is [string, Properties | null, ...unknown[]] =>
    typeof args[0] === "string";

const isFragmentArgs = (args: unknown[]): args is [typeof fragmentType, null, ...unknown[]] =>
    args[0] === fragmentType;

const isComponentArgs = (args: unknown[]): args is [Component, Properties | null, ...unknown[]] =>
    args[0] instanceof Function;

const throwError = (message?: string) => {
    throw new Error(message);
};

export const fragmentType = Symbol();

export const createElement = (...args: unknown[]): VirtualNode =>
    ((children) => (
        isTagArgs(args)
            ? new VirtualTag(args[0], args[1] ?? {}, children)
            : isFragmentArgs(args)
                ? new VirtualFragment(children)
                : isComponentArgs(args)
                    ? new VirtualComponent(args[0], args[1] ?? {}, children)
                    : throwError(JSON.stringify(args))
    ))(args.slice(2).map(VirtualNode.__from));
