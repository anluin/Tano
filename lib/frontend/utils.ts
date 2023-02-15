import "./render.ts";

import { Signal } from "./signal.ts";
import { Effect } from "./effect.ts";

export * from "../shared/utils.ts";


const renderBlockingPromises: Promise<unknown>[] = [];

export const isInstalled = (
    window.matchMedia
        ?.('(display-mode: standalone)')
        .matches ?? undefined
);

export const isCached = (
    (
        performance.getEntriesByType("navigation")
            [0] as unknown as { transferSize: number }
    )
        ?.transferSize === 0
);

export const notifyRenderBlockingPromise = <T>(promise: Promise<T>) => {
    renderBlockingPromises?.push(promise);
};

export const getRenderBlockingPromises = () => renderBlockingPromises;

export const processAllRenderBlockingPromises = async () => {
    for (let promises: Promise<unknown>[] | undefined; (promises = getRenderBlockingPromises().splice(0)).length > 0;) {
        await Promise.all(promises);
    }
};

export type SignalValue<T> =
    T extends Signal<infer Value>
        ? Value
        : T;

export const queueMicrotask = (callback: () => void) =>
    (self.queueMicrotask ?? setTimeout)(callback);
export const microtask = () =>
    new Promise<void>(queueMicrotask);
export const requestAnimationFrame = (callback: () => void) =>
    (self.requestAnimationFrame ?? setTimeout)(callback);
export const animationFrame = () =>
    new Promise<void>(requestAnimationFrame);


export const maximalComputationTime = <R>(ms: number, callback: (delay: () => Promise<void>) => Promise<R>) => {
    let time = performance.now();

    return callback(async () => {
        const now = performance.now();

        if (now - time > ms) {
            time = now;
            await microtask();
        }
    });
};

export type ReadonlySignal<T> = Omit<Signal<T>, "value" | "set"> & { readonly value: T };

export type MaybeSignal<T> = T | Signal<T>;
export type MaybeReadonlySignal<T> = T | ReadonlySignal<T>;

export type Normalize<T> = T extends MaybeReadonlySignal<infer I> ? I : T extends ReadonlySignal<infer I> ? I : T;

export type NormalizeProperties<T> = {
    [K in keyof T]: Normalize<T[K]>
};

export const normalize = <T>(data: T): Normalize<T> =>
    data instanceof Signal
        ? data.value
        : data as Normalize<T>;

export const normalizeProperties = <T extends Record<string, unknown>>(data: T): NormalizeProperties<T> =>
    Object.entries(data)
        .reduce(
            (carry, [key, value]) => ({ ...carry, [key]: normalize(value) }),
            {} as NormalizeProperties<T>,
        );

export const normalizeArray = <T extends Array<unknown>>(data: T): NormalizeProperties<T> =>
    data.map(normalize) as NormalizeProperties<T>;

export type Signalize<T> = Signal<Normalize<T>>;

export type SignalizeProperties<T> = {
    [K in keyof T]: Signalize<T[K]>
};

export const signalize = <T>(data: T): Signalize<T> =>
    <Signalize<T>>(
        data instanceof Signal
            ? data
            : new Signal(data)
    );

export const signalizeProperties = <T extends Record<string, unknown>>(data: T): SignalizeProperties<T> =>
    Object.entries(data)
        .reduce(
            (carry, [key, value]) => ({ ...carry, [key]: signalize(value) }),
            {} as SignalizeProperties<T>,
        );

export const signalizeArray = <T extends Array<unknown>>(data: T): SignalizeProperties<T> =>
    data.map(signalize) as SignalizeProperties<T>;

export function computed<Result>(callback: (...values: []) => Result, ...signals: []): ReadonlySignal<Result>;
export function computed<Result, T1>(callback: (...values: [T1]) => Result, ...signals: [ReadonlySignal<T1>]): ReadonlySignal<Result>;
export function computed<Result, T1, T2>(callback: (...values: [T1, T2]) => Result, ...signals: [ReadonlySignal<T1>, ReadonlySignal<T2>]): ReadonlySignal<Result>;
export function computed<Result, T1, T2, T3>(callback: (...values: [T1, T2, T3]) => Result, ...signals: [ReadonlySignal<T1>, ReadonlySignal<T2>, ReadonlySignal<T3>]): ReadonlySignal<Result>;
export function computed<Result>(callback: (...values: unknown[]) => Result, ...signals: ReadonlySignal<unknown>[]): ReadonlySignal<Result> {
    const signal = new Signal(undefined as Result);

    new Effect(() => signal.value = callback(
        ...signals.map(({ value }) => value)
    ));

    return signal;
}

export const classNames = (staticClassNames: MaybeReadonlySignal<string | undefined>[], dynamicClassNames?: Record<string, MaybeReadonlySignal<unknown>>): ReadonlySignal<string> =>
    computed(() =>
        (
            dynamicClassNames
                ? Object.entries(normalizeProperties(dynamicClassNames))
                : []
        )
            .reduce(
                (carry, [key, active]) =>
                    [...carry, ...(active ? [key] : [])],
                normalizeArray(staticClassNames)
                    .filter(className => !!className)
            )
            .join(" ")
    );

export const signalFromMediaQuery = (query: string, ssrDefault = false) => {
    const signal = new Signal(ssrDefault);

    if (csr) {
        const mediaQuery = matchMedia(query);

        mediaQuery.addEventListener("change", ({ matches }) => {
            signal.value = matches;
        });

        signal.value = mediaQuery.matches;
    }

    return signal;
};

export class ReferenceHolder<T extends HTMLElement = HTMLElement> extends Signal<T | undefined> {
    constructor(value?: T) {
        super(value);
    }
}
