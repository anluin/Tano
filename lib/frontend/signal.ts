import { computed, Effect } from "./effect.ts";
import { ssrRenderBlocking } from "./utils.ts";
import { getInjectedData, setInjectedData } from "./injectedData.ts";
import { JSONValue } from "../shared/types/json.ts";


export class Signal<T> {
    readonly __effects: Set<Effect>;

    private __value: T;

    constructor(value: T) {
        this.__effects = new Set();
        this.__value = value;
    }

    get value() {
        if (Effect.__current) {
            this.__effects.add(Effect.__current);
            Effect.__current.__signals.set(this, this.__value);
        }

        return this.__value;
    }

    set value(value: T) {
        this.__value = value;

        const effects = [ ...this.__effects ]
        this.__effects.clear();

        for (const effect of effects) {
            if (effect.__signals.has(this) && effect.__signals.get(this) === this.__value) {
                this.__effects.add(effect);
            } else {
                effect.__trigger();
            }
        }
    }

    map<R>(mapping: (value: T) => R) {
        return computed(() => mapping(this.value));
    }

    static async fromInjectedData<T extends JSONValue>(identifier: string, initializer: () => T | Promise<T>): Promise<Signal<T>> {
        const signal = new Signal(getInjectedData<T>(identifier) ?? await ssrRenderBlocking(async () => await initializer()));
        ssr && new Effect(() => setInjectedData<T>(identifier, signal.value));
        // csr && (async () => signal.value = await initializer())().catch(console.error);
        return signal;
    }
}

export type ReadonlySignal<T> = Omit<Signal<T>, "value"> & { readonly value: T };
