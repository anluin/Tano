import { Effect } from "./effect.ts";

export class Context {
    static _current?: Context;

    readonly _effects: Set<Effect>;

    constructor() {
        this._effects = new Set();
    }

    _suspend() {
        for (const effect of this._effects) {
            effect._suspend();
        }
    }

    _restore() {
        for (const effect of this._effects) {
            effect._restore();
        }
    }

    _cancel() {
        for (const effect of this._effects) {
            effect._cancel();
        }
    }
}
