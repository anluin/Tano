type Callback<T = void> = () => T;

type Collector = {
    signals: Set<Signal<unknown>>,
    callbacks: Set<Callback>,
}

let currentCallback: Callback | undefined;
let currentCollector: Collector | undefined;

export const preventEffect = <T>(callback: Callback<T>): T => {
    const previousCallback = currentCallback;
    currentCallback = undefined;
    const result = callback();
    currentCallback = previousCallback;
    return result;
};

export const collectEffects = <T>(callback: Callback<T>): [ T, () => void ] => {
    const previousCollector = currentCollector;
    const collector = currentCollector = {
        signals: new Set(),
        callbacks: new Set(),
    };

    const result = callback();
    currentCollector = previousCollector;

    return [ result, () => {
        for (const signal of collector.signals) {
            for (const callback of collector.callbacks) {
                signal.cancel(callback);
            }
        }

        collector.signals.clear();
        collector.callbacks.clear();
    } ];
};

type Normalized<T> = T extends Signal<infer I> ? Normalized<I> : T extends object ? { [K in keyof T]: Normalized<T[K]> } : T;


export class Signal<T> {
    private readonly callbacks: Set<Callback>;
    private inner: T;

    constructor(inner: T) {
        this.inner = inner;
        this.callbacks = new Set();
    }

    get value() {
        if (currentCallback) {
            this.callbacks.add(currentCallback);

            if (currentCollector) {
                currentCollector.signals.add(this);
                currentCollector.callbacks.add(currentCallback);
            }
        }

        return this.inner;
    }

    set value(value: T) {
        if (this.inner !== value) {
            this.inner = value;

            const callbacks = [ ...this.callbacks ];
            this.callbacks.clear();

            for (const callback of callbacks) {
                createEffect(callback);
            }
        }
    }

    static normalize<T>(data: T | Signal<T>): T {
        if (data instanceof Signal) {
            return data.value;
        } else {
            return data;
        }
    }

    static normalizeObject<T>(data: Record<keyof T, Signal<T[keyof T]>>): Record<keyof T, T[keyof T]> {
        if (data && typeof data === "object") {
            return Object.fromEntries(Object.entries(data).map(([ key, value ]) => [ key, Signal.normalize(value) ])) as Record<keyof T, T[keyof T]>;
        } else {
            return data;
        }
    }

    effect(callback: (value: T) => void) {
        createEffect(this, callback);
        return this;
    }

    set(value: T) {
        this.value = value;
    }

    get() {
        return this.value;
    }

    cancel(callback: Callback) {
        this.callbacks.delete(callback);
    }
}

type MaybeSignal<T> = T | Signal<T>;

export const createSignal = <T>(value: T) => new Signal<T>(value);

export function createEffect(callback: () => void): void;
export function createEffect<T1>(s1: MaybeSignal<T1>, callback: (v1: T1) => void): void;
export function createEffect<T1, T2>(s1: MaybeSignal<T1>, s2: MaybeSignal<T2>, callback: (v1: T1, v2: T2) => void): void;
export function createEffect<T1, T2, T3>(s1: MaybeSignal<T1>, s2: MaybeSignal<T2>, s3: MaybeSignal<T3>, callback: (v1: T1, v2: T2, v3: T2) => void): void;
export function createEffect(...args: (MaybeSignal<unknown> | ((...args: unknown[]) => void))[]) {
    const callback = args.splice(-1)[0] as (...args: unknown[]) => void;
    const previousCallback = currentCallback;
    (currentCallback = () => callback(...args.map(Signal.normalize)))();
    currentCallback = previousCallback;
}

export function computed<R>(callback: () => R): Signal<R>;
export function computed<R, T1>(s1: MaybeSignal<T1>, callback: (v1: T1) => R): Signal<R>;
export function computed<R, T1, T2>(s1: MaybeSignal<T1>, s2: MaybeSignal<T2>, callback: (v1: T1, v2: T2) => R): Signal<R>;
export function computed<R, T1, T2, T3>(s1: MaybeSignal<T1>, s2: MaybeSignal<T2>, s3: MaybeSignal<T3>, callback: (v1: T1, v2: T2, v3: T2) => R): Signal<R>;
export function computed<R>(...args: (MaybeSignal<unknown> | ((...args: unknown[]) => R))[]): Signal<R> {
    let signal: Signal<R> | undefined;

    const callback = args.splice(-1)[0] as (...args: unknown[]) => R;

    createEffect(() => {
        const result = callback(...args.map(Signal.normalize));

        if (signal) {
            signal.value = result;
        } else {
            signal = new Signal(result);
        }
    });

    return signal!;
}
