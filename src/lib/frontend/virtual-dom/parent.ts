import { VirtualNode } from "./node.ts";


export abstract class VirtualParentNode extends VirtualNode {
    readonly _children: VirtualNode[];

    protected constructor(children: VirtualNode[]) {
        super();

        for (const child of this._children = children) {
            child._parent = this;
        }
    }

    _inflate(): Node[] {
        return this._children.map(child => child._inflate()).flat();
    }

    _mount() {
        for (const child of this._children) {
            child._mount?.();
        }
    }

    _unmount() {
        for (const child of this._children) {
            child._unmount?.();
        }
    }

    _remove() {
        for (const child of this._children) {
            child._remove?.();
        }
    }

    _finalize() {
        for (const child of this._children) {
            child._finalize?.();
        }
    }
}
