import { Effect } from "./effect.ts";
import { computed } from "./utils.ts";

export class Signal<T> {
    readonly __effects: Set<Effect>;

    __value: T;

    constructor(value: T) {
        this.__effects = new Set();
        this.__value = value;
    }

    get value() {
        if (Effect.__current) {
            Effect.__current.__signals.set(this, this.__value);
            this.__effects.add(Effect.__current);
        }

        return this.__value;
    }

    set value(value: T) {
        const effects = [...this.__effects];

        this.__effects.clear();
        this.__value = value;

        for (const effect of effects) {
            if (effect.__signals.has(this) && effect.__signals.get(this) === this.__value) {
                this.__effects.add(effect);
            } else {
                effect.__trigger();
            }
        }
    }

    map<R>(callback: (value: T) => R): Signal<R> {
        return computed(() => callback(this.value));
    }
}
