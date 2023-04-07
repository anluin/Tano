import { VirtualParentNode } from "./parent.ts";
import { swapChildren, swapProperties } from "../swap.ts";
import { handleAnchorClick } from "../router.ts";
import { ClassList, computed, normalize, processClassList } from "../reactivity/utils.ts";
import { ReadonlySignal } from "../reactivity/signal.ts";
import { VirtualNode } from "./node.ts";


export class VirtualElementNode extends VirtualParentNode {
    readonly _tagName: string;
    readonly _properties: Record<string, unknown>;

    _node?: HTMLElement;

    constructor(tagName: string, properties: Record<string, unknown>, children: VirtualNode[], node?: HTMLElement) {
        super(children);

        if ("classList" in properties) {
            const classList = properties["classList"] as ReadonlySignal<ClassList> | ClassList | undefined;
            const className = properties["class"] as ReadonlySignal<string | undefined> | string | undefined;

            delete properties["classList"];

            properties["class"] = computed(() =>
                processClassList([ className, ...normalize(classList) ?? [] ])
                    .join(" ")
            );
        }

        this._tagName = tagName;
        this._properties = properties;
        this._node = node;
    }

    _inflate(): Node[] {
        const element = document.createElement(this._tagName);

        if (csr && element instanceof HTMLAnchorElement) {
            element.addEventListener("click", handleAnchorClick);
        }

        swapProperties(element, {}, this._properties);
        swapChildren(element, [], this._children);

        return [ this._node = element ];
    }

    _remove() {
        this._node?.remove();
    }
}
