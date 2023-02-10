import { Signal } from "./signal.ts";
import { Context, useContext } from "./context.ts";


export class Effect {
    static __current?: Effect;
    readonly __signals: Map<Signal<unknown>, unknown>;
    private readonly __children: Set<Effect>;
    private readonly __callback: () => void;
    private readonly __parent?: Effect;
    private readonly __context: Context;

    constructor(callback: () => void) {
        if (!Context.__current) {
            throw new Error("Effects can only be created inside a given context");
        }

        this.__signals = new Map();
        this.__children = new Set();
        this.__callback = callback;

        (this.__parent = Effect.__current)
            ?.__children.add(this);

        (this.__context = Context.__current)
            .__effects.add(this);

        this.__trigger();
    }

    __unsubscribeSignals() {
        for (const [signal] of this.__signals) {
            signal.__effects.delete(this);
        }

        this.__signals.clear();
    }

    __cancelChildren() {
        for (const child of this.__children) {
            child.__cancel();
        }

        this.__children.clear();
    }

    __cancel() {
        this.__parent?.__children.delete(this);
        this.__unsubscribeSignals();
        this.__cancelChildren();
    }

    __suspend() {
        for (const [signal] of this.__signals) {
            signal.__effects.delete(this);
        }
    }

    __resume() {
        let shouldTrigger = false;

        for (const [signal, value] of this.__signals) {
            if (useEffect(undefined, () => signal.value) !== value) {
                shouldTrigger = true;
                break;
            } else {
                signal.__effects.add(this);
            }
        }

        if (shouldTrigger) {
            this.__trigger();
        } else {
            for (const child of this.__children) {
                child.__resume();
            }
        }
    }

    __trigger() {
        this.__cancelChildren();
        this.__unsubscribeSignals();

        useContext(this.__context, () => {
            useEffect(this, this.__callback);
        });
    }
}

export const useEffect = <R>(effect: Effect | undefined, callback: () => R): R => {
    const previous = Effect.__current;
    Effect.__current = effect;
    const result = callback();
    Effect.__current = previous;
    return result;
};
export const preventEffect = <R>(callback: () => R) =>
    useEffect(undefined, callback);
