import { Effect } from "../reactivity/effect.ts";
import { ReadonlySignal } from "../reactivity/signal.ts";
import { swap } from "../swap.ts";
import { toVirtualNode, VirtualNode, VirtualParentNode } from "./mod.ts";

export class VirtualSignalNode extends VirtualParentNode {
    private _effect: Effect;

    constructor(signal: ReadonlySignal<unknown>) {
        let currentNode: VirtualNode | undefined;

        const effect = new Effect(() => {
            const nextNode = toVirtualNode(signal.get());

            if (currentNode) {
                currentNode._unmount?.();
                swap(currentNode, nextNode);
                this._children.splice(0, 1, nextNode);
                nextNode._mount?.();
            }

            currentNode = nextNode;
        });

        super([ currentNode! ]);
        this._effect = effect;
    }

    _mount() {
        super._mount();
        this._effect._restore();
    }

    _unmount() {
        this._effect._suspend();
        super._unmount();
    }

    _finalize() {
        super._finalize();
        this._effect._cancel();
    }
}
