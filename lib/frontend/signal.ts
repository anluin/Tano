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

export type Normalized<O> = {
    [K in keyof O]: O[K] extends MaybeSignal<infer T> ? T : O[K]
};

export const normalize = <T>(data: MaybeSignal<T>): T => {
    if (data instanceof Signal) {
        return data.value;
    } else {
        return data;
    }
}

export const normalizeObject = <T>(object: T) => {
    const result = { ...object };

    for (const key in object) {
        result[key] = normalize(object[key]);
    }

    return result as Normalized<T>;
}

export const normalizeArray = <T extends Array<MaybeSignal<unknown>>>(object: T) => {
    return object.map(normalize) as Normalized<T>;
}

export type Options = {
    force?: boolean,
};

export class Signal<T> {
    private readonly callbacks: Set<Callback>;
    private timeoutId = -1;
    private inner: T;

    constructor(inner: T) {
        this.inner = inner;
        this.callbacks = new Set();
    }

    get value() {
        return this.get();
    }

    set value(value: T) {
        this.set(value);
    }

    map<R>(callback: (value: T) => R): Signal<R> {
        return computed(this, callback);
    }

    effect(callback: (value: T) => void) {
        createEffect(this, callback);
        return this;
    }

    set(value: T, options: Options = {}) {
        const { force = false } = options;

        if (this.inner !== value || force) {
            this.inner = value;

            const callbacks = [ ...this.callbacks ];
            this.callbacks.clear();
            this.timeoutId = -1;

            for (const callback of callbacks) {
                callback();
                this.callbacks.add(callback);
            }

            // /* debounce */
            // {
            //     if (this.timeoutId !== -1) {
            //         clearTimeout(this.timeoutId);
            //     }
            //
            //     this.timeoutId = setTimeout(() => {
            //         const callbacks = [ ...this.callbacks ];
            //         this.callbacks.clear();
            //         this.timeoutId = -1;
            //
            //         for (const callback of callbacks) {
            //             callback();
            //             this.callbacks.add(callback);
            //         }
            //     });
            // }
        }

        return this;
    }

    get() {
        if (currentCallback) {
            this.callbacks.add(currentCallback);

            if (currentCollector) {
                currentCollector.signals.add(this);
                currentCollector.callbacks.add(currentCallback);
            }
        }

        return this.inner;
    }

    update(updater: (value: T) => T, options: Options = {}) {
        this.set(updater(this.get()), options);
        return this;
    }

    cancel(callback: Callback) {
        this.callbacks.delete(callback);
    }
}

export type MaybeSignal<T> = T | Signal<T>;

export const createSignal = <T>(value: T) => new Signal<T>(value);

export function createEffect(callback: () => void): void;
export function createEffect<T1>(s1: MaybeSignal<T1>, callback: (v1: T1) => void): void;
export function createEffect<T1, T2>(s1: MaybeSignal<T1>, s2: MaybeSignal<T2>, callback: (v1: T1, v2: T2) => void): void;
export function createEffect<T1, T2, T3>(s1: MaybeSignal<T1>, s2: MaybeSignal<T2>, s3: MaybeSignal<T3>, callback: (v1: T1, v2: T2, v3: T2) => void): void;
export function createEffect(...args: (MaybeSignal<unknown> | ((...args: unknown[]) => void))[]) {
    const callback = args.splice(-1)[0] as (...args: unknown[]) => void;
    const previousCallback = currentCallback;

    (currentCallback = () => callback(...args.map(normalize)))();
    currentCallback = previousCallback;
}

export function computed<R>(callback: () => R): Signal<R>;
export function computed<R, T1>(s1: MaybeSignal<T1>, callback: (v1: T1) => R): Signal<R>;
export function computed<R, T1, T2>(s1: MaybeSignal<T1>, s2: MaybeSignal<T2>, callback: (v1: T1, v2: T2) => R): Signal<R>;
export function computed<R, T1, T2, T3>(s1: MaybeSignal<T1>, s2: MaybeSignal<T2>, s3: MaybeSignal<T3>, callback: (v1: T1, v2: T2, v3: T3) => R): Signal<R>;
export function computed<R>(...args: (MaybeSignal<unknown> | ((...args: unknown[]) => R))[]): Signal<R> {
    let signal: Signal<R> | undefined;

    const callback = args.splice(-1)[0] as (...args: unknown[]) => R;

    createEffect(() => {
        const result = callback(...args.map(normalize));

        if (signal) {
            signal.value = result;
        } else {
            signal = new Signal(result);
        }
    });

    return signal!;
}

export const createMediaQuerySignal = (query: string, ssrDefaultValue = false) => {
    if (csr) {
        const mediaQueryList = window.matchMedia(query);
        const signal = createSignal(mediaQueryList.matches);

        mediaQueryList.addEventListener("change", (
            (event: MediaQueryListEvent) =>
                signal.set(event.matches)
        ));

        return signal;
    } else {
        return createSignal(ssrDefaultValue);
    }
};

export const normalizeToSignal = <T>(value: MaybeSignal<T>): Signal<T> => {
    if (value instanceof Signal) {
        return value;
    } else {
        return createSignal(value);
    }
};
