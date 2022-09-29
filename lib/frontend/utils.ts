import { InflatedElementNode, InflatedNode, InflatedTextNode } from "./virtual_dom/inflated_node.ts";
import { onCleanup, onMount, Properties } from "./render.ts";
import { JSONObject, JSONValue } from "../shared/json.ts";
import { createSignal, Signal } from "./signal.ts";


export const isInstalled = () => (
    window.matchMedia
        ?.('(display-mode: standalone)')
        .matches ?? undefined
);

export const classNames = (staticClassNames: (string | undefined)[], dynamicClassNames?: Record<string, boolean | undefined>): string =>
    Object.entries(dynamicClassNames ?? {})
        .reduce(
            (carry, [ key, active ]) =>
                [ ...carry, ...(active ? [ key ] : []) ],
            staticClassNames.filter(className => !!className)
        )
        .join(" ");

export const sleep = (delay: number) =>
    new Promise(resolve => setTimeout(resolve, delay));

export const propertyName2EventName = (name: string) =>
    name.slice(2).toLowerCase();

export const propertyName2AttributeName = (name: string) =>
    (<Record<string, string>>{
        "className": "class",
    })[name] ?? name;

export const restoreProperties = (element: HTMLElement): Properties =>
    [ ...element.attributes ].reduce((carry, { name, value }) => ({ ...carry, [name]: value }), {})

export const restoreChildren = (element: HTMLElement): InflatedNode[] =>
    [ ...element.childNodes ].map(restoreTree);

export const restoreTree = (node: Node): InflatedNode => {
    if (node instanceof HTMLElement) {
        return (
            new InflatedElementNode(node, node.tagName.toLowerCase(), restoreProperties(node), restoreChildren(node))
        );
    }

    if (node instanceof Text) {
        return new InflatedTextNode(node, node.nodeValue);
    }

    throw new Error("unimplemented");
}

export const getInjectedData = <T extends JSONValue>(): T | undefined => {
    return (ssr ? injectedData : window.injectedData) as T | undefined;
};

const csrCreateInjectedDataSignal = async <T>(identifier: string, initializer: () => Promise<T>): Promise<Signal<T>> => {
    const injectedData = getInjectedData<JSONObject>() ?? {};
    const initialValue = (
        identifier in injectedData
            ? injectedData[identifier] as unknown as T
            : await initializer()
    );

    return new Signal(initialValue);
};

const ssrCreateInjectedDataSignal = async <T>(identifier: string, initializer: () => Promise<T>): Promise<Signal<T>> =>
    await csrCreateInjectedDataSignal(identifier, initializer)
        .then(signal => signal.effect(value => {
            // @ts-ignore: injected in ssr context
            ssrSignalInjection(identifier, value);
        }));

export const createInjectedDataSignal = (
    window.ssr
        ? ssrCreateInjectedDataSignal
        : csrCreateInjectedDataSignal
);

export const createSignalObject = <T extends Record<string, unknown>, >(initialData: T) =>
    Object.fromEntries(
        Object.entries(initialData)
            .map(([ key, value ]) => [ key, createSignal(value) ]),
    ) as { [K in keyof T]: Signal<T[K]> };

export const createMountStateSignal = () => {
    const signal = createSignal(false);

    onMount(() => signal.set(true));
    onCleanup(() => signal.set(false));

    return signal;
}
