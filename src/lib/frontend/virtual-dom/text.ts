import { VirtualNode } from "./node.ts";


export class VirtualTextNode extends VirtualNode {
    readonly _content: string;

    _node?: Text;

    constructor(content: string, node?: Text) {
        super();
        this._content = content;
        this._node = node;
    }

    _inflate(): Node[] {
        return [ this._node = document.createTextNode(this._content) ];
    }

    _remove() {
        this._node?.remove();
    }
}
