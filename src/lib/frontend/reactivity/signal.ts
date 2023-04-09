import { Effect } from "./effect.ts";
import { Context, globalContext } from "./context.ts";


export class ReadonlySignal<T> {
    readonly _effects: Set<Effect>;

    _value: T;

    constructor(value: T) {
        this._value = value;
        this._effects = new Set();
    }

    get(): T {
        if (Effect._current) {
            Effect._current._signals.set(this, this._value);
            this._effects.add(Effect._current);
        }

        return this._value;
    }

    map<R>(mapper: (value: T) => R, context?: Context): ReadonlySignal<R> {
        return computed(() => mapper(this.get()), context);
    }

    protected set(value: T) {
        this._value = value;

        if (Effect._current) {
            this._effects.delete(Effect._current);
        }

        if (this._effects.size > 0) {
            const effects = [ ...this._effects ];
            this._effects.clear();

            for (const effect of effects) {
                if (effect._signals.has(this) && effect._signals.get(this) === this._value) {
                    this._effects.add(effect);
                } else {
                    effect._trigger();
                }
            }
        }
    }
}

export class Signal<T> extends ReadonlySignal<T> {
    public set(value: T) {
        super.set(value);
    }

    public update(updater: (value: T) => T): void {
        this.set(updater(this.get()));
    }
}

export class ComputedSignal<T> extends ReadonlySignal<T> {
    readonly _callback: () => T;
    readonly _context: Context;
    readonly _effect: Effect;

    constructor(callback: () => T, context?: Context) {
        super(undefined as T);
        this._callback = callback;
        this._context = context ??= globalContext;
        this._effect = new Effect(() => this.set(callback()), context);
    }
}

export const computed = <T>(callback: () => T, context?: Context): ReadonlySignal<T> =>
    new ComputedSignal(callback, context);
