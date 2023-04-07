import { VirtualNode } from "./node.ts";


export class VirtualCommentNode extends VirtualNode {
    readonly _content: string;

    _node?: Comment;

    constructor(content: string, node?: Comment) {
        super();
        this._content = content;
        this._node = node;
    }

    _inflate(): Node[] {
        return [ this._node = document.createComment(this._content) ];
    }

    _remove() {
        this._node?.remove();
    }
}
