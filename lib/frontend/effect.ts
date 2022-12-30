import { ReadonlySignal, Signal } from "./signal.ts";
import { Context } from "./context.ts";


export type Callback = () => void;

export class Effect {
    static __current?: Effect;

    readonly __signals: Map<Signal<unknown>, unknown>;

    private readonly __callback: Callback;
    private readonly __context: Context;

    constructor(callback: Callback) {
        if (!Context.__current) throw new Error();
        if (Effect.__current) throw new Error();

        this.__callback = callback;
        this.__signals = new Map();

        (this.__context = Context.__current)
            .__effects.add(this);

        this.__trigger();
    }

    static __prevent<T>(callback: () => T): T {
        const previous = Effect.__current;
        Effect.__current = undefined;
        const result = callback();
        Effect.__current = previous;
        return result;
    }

    __trigger() {
        const previousContext = Context.__current;
        const previousEffect = Effect.__current;
        Context.__current = this.__context;
        Effect.__current = this;
        this.__callback();
        Effect.__current = previousEffect;
        Context.__current = previousContext;
    }
}

export const computed = <T>(compute: () => T): ReadonlySignal<T> => {
    const signal = new Signal(undefined as T);

    new Effect(() => {
        signal.value = compute();
    });

    return signal;
};
