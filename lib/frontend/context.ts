import { Effect } from "./effect.ts";


export class Context {
    static __current?: Context;

    readonly __effects: Set<Effect>;

    constructor() {
        this.__effects = new Set();
    }

    __suspend() {
        for (const effect of this.__effects) {
            effect.__suspend();
        }
    }

    __resume() {
        for (const effect of this.__effects) {
            effect.__resume();
        }
    }
}

export const globalContext = new Context();

export const useContext = <R>(context: Context | undefined, callback: () => R): R => {
    const previous = Context.__current;
    Context.__current = context;
    const result = callback();
    Context.__current = previous;
    return result;
};
