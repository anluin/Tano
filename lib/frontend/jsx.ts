import { VirtualComponent, VirtualFragment, VirtualNode, VirtualTag } from "./node.ts";
import { Signal } from "./signal.ts";


declare global {
    const React: unknown;
    const ssr: boolean;
    const csr: boolean;

    namespace JSX {
        type IntrinsicElements = Record<string, unknown>;

        type Element = undefined | string | number | VirtualNode | Signal<Element>;
    }
}

export type MouseEventListener = (event: MouseEvent) => void;

export type Properties = Record<string, unknown>;
export type Attributes = Record<string, unknown>;
export type Component<T extends Properties = Properties> = (this: VirtualComponent, properties: T, children: unknown[]) => JSX.Element;

const isTagArgs = (args: unknown[]): args is [ string, Properties | null, ...unknown[] ] =>
    typeof args[0] === "string";

const isFragmentArgs = (args: unknown[]): args is [ typeof fragmentType, null, ...unknown[] ] =>
    args[0] === fragmentType;

const isComponentArgs = (args: unknown[]): args is [ Component, Properties | null, ...unknown[] ] =>
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
