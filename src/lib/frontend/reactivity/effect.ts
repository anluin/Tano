import { useEffects } from "./utils.ts";
import { Context } from "./context.ts";
import { ReadonlySignal } from "./signal.ts";

export class Effect {
    static _current?: Effect;

    readonly _signals: Map<ReadonlySignal<unknown>, unknown>;
    readonly _children: Set<Effect>;
    readonly _context: Context;
    readonly _callback: () => void;

    constructor(callback: () => void, context?: Context) {
        context ??= Context._current;

        if (!context) throw new Error("Effect can only be created inside given Context");

        Effect._current?._children.add(this);

        this._signals = new Map();
        this._children = new Set();
        this._context = context;
        this._callback = callback;
        this._trigger();
    }

    _suspend() {
        for (const [ signal ] of this._signals) {
            signal._effects.delete(this);
        }

        for (const child of this._children) {
            child._suspend();
        }
    }

    _restore() {
        for (const child of this._children) {
            child._restore();
        }

        for (const [ signal, value ] of this._signals) {
            if (signal._value === value) {
                signal._effects.add(this);
            } else {
                this._trigger();
                break;
            }
        }
    }

    _cancel() {
        for (const [ signal ] of this._signals) {
            signal._effects.delete(this);
        }

        for (const child of this._children) {
            child._cancel();
        }

        this._context._effects.delete(this);
        this._children.clear();
        this._signals.clear();
    }

    _trigger() {
        this._cancel();
        this._context._effects.add(this);
        useEffects(this, this._callback);
    }
}
