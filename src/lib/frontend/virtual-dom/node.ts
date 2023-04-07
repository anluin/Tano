import { VirtualParentNode } from "./parent.ts";

export abstract class VirtualNode {
    _parent?: VirtualParentNode;

    _mount?(): void;

    _unmount?(): void;

    _remove?(finalize?: boolean): void;

    _finalize?(): void;

    abstract _inflate(): Node[];
}
