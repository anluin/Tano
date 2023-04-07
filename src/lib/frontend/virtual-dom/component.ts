import { ComponentInitializer, ComponentInterface } from "../jsx.ts";
import { VirtualParentNode } from "./parent.ts";
import { VirtualNode } from "./node.ts";
import { preventEffects, useContext } from "../reactivity/utils.ts";
import { Context } from "../reactivity/context.ts";
import { toVirtualNode } from "./utils.ts";


export class VirtualComponentNode extends VirtualParentNode {
    readonly _initializer: ComponentInitializer;

    _properties: Record<string, unknown> & {
        children: VirtualNode[]
    };
    _interface?: ComponentInterface<Record<string, unknown> & {
        children: VirtualNode[]
    }>;
    _context?: Context;

    constructor(initializer: ComponentInitializer, properties: Record<string, unknown>, children: VirtualNode[], node?: VirtualNode) {
        super(node ? [ node ] : []);
        this._initializer = initializer;
        this._properties = { ...properties, children };
    }

    // Two ComponentNodes are "compatible" if they have both the same initializer and does use the signalized-properties-api
    _isCompatible(other: VirtualComponentNode) {
        if (this._initializer !== other._initializer) return false;

        const newPropertyNames = new Set([
            ...Object.keys(this._interface?.properties ?? {}),
            ...Object.keys(other._properties).map(_ => `$${_}`),
        ]);

        if (other._properties.children.length === 0) {
            newPropertyNames.delete("$children");
        }

        for (const newPropertyName of newPropertyNames) {
            if (!this._interface?._usedPropertyNames.has(newPropertyName)) {
                return false;
            }
        }

        return true;
    }

    _initialize() {
        return this._children[0] ??= preventEffects(() =>
            useContext(
                this._context ??= new Context(),
                () => {
                    const virtualNode = toVirtualNode(this._initializer.call(this._interface ??= new ComponentInterface(this._properties) as any, this._properties));

                    virtualNode._parent = this;

                    return virtualNode;
                },
            ),
        );
    }

    _inflate(): Node[] {
        return [
            ...this._initialize()._inflate(),
        ];
    }

    _mount() {
        super._mount();
        this._interface?._trigger("mount", {});
        this._context?._restore();
    }

    _unmount() {
        this._interface?._trigger("unmount", {});
        super._unmount();
        this._context?._suspend();
    }

    _remove(finalize?: boolean) {
        super._remove();
        this._finalize();
    }

    _finalize() {
        this._interface?._trigger("finalize", {});
        super._finalize();

        this._context?._cancel();
        this._children.splice(0, 1);
        this._context = undefined;
        this._interface = undefined;
    }
}
