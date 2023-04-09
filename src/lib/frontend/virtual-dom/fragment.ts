import { VirtualNode } from "./node.ts";
import { VirtualParentNode } from "./parent.ts";

export type Hint = Text | Comment;

export const createHint = (content: string): Hint =>
    // TODO: Create empty TextNode within csr-context
    document.createComment(content);

export class VirtualFragmentNode extends VirtualParentNode {
    _hints?: [ Hint, Hint ];

    constructor(children: VirtualNode[], hints?: [ Hint, Hint ]) {
        super(children);
        this._hints = hints;
    }

    _inflate(): Node[] {
        this._hints ??= [
            createHint("fragment start"),
            createHint("fragment end"),
        ];

        return [
            this._hints[0],
            ...this._children.map(child => child._inflate()).flat(),
            this._hints[1],
        ];
    }

    _remove(finalize?: boolean) {
        for (const child of this._children) {
            child._remove?.(finalize);
        }

        for (const hint of this._hints ?? []) {
            hint.remove();
        }
    }
}
