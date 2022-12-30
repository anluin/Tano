import { Effect } from "./effect.ts";


export class Context {
    static __current?: Context = new Context();

    readonly __effects: Set<Effect>;

    constructor() {
        this.__effects = new Set();
    }

    __suspend() {
        Effect.__prevent(() => {
            for (const effect of this.__effects) {
                for (const [ signal ] of effect.__signals) {
                    signal.__effects.delete(effect);
                }
            }
        });
    }

    __resume() {
        Effect.__prevent(() => {
            for (const effect of this.__effects) {
                for (const [ signal, value ] of effect.__signals) {
                    if (signal.value === value) {
                        signal.__effects.add(effect);
                    } else {
                        effect.__trigger();
                        break;
                    }
                }
            }
        });
    }

    use<T>(callback: () => T): T {
        const previous = Context.__current;
        Context.__current = this;
        const result = callback();
        Context.__current = previous;
        return result;
    }
}

export const globalContext = Context.__current;
