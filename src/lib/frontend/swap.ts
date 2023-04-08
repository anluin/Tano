import { VirtualElementNode } from "./virtual-dom/element.ts";
import { VirtualTextNode } from "./virtual-dom/text.ts";
import { VirtualCommentNode } from "./virtual-dom/comment.ts";
import { Effect } from "./reactivity/effect.ts";
import { ReadonlySignal, Signal } from "./reactivity/signal.ts";
import { globalContext, normalize, preventEffects, useContext } from "./reactivity/utils.ts";
import { VirtualComponentNode } from "./virtual-dom/component.ts";
import { VirtualFragmentNode } from "./virtual-dom/fragment.ts";
import { VirtualSignalNode } from "./virtual-dom/signal.ts";
import { VirtualNode } from "./virtual-dom/node.ts";
import { Context } from "./reactivity/context.ts";

export const swapProperty = (element: HTMLElement, propertyName: string, previousValue: unknown, nextValue: unknown) => {
    if (propertyName.startsWith("on") && (previousValue instanceof Function || nextValue instanceof Function)) {
        const eventName = propertyName.slice(2).toLowerCase();

        previousValue && element.removeEventListener(eventName, previousValue as () => void);
        nextValue && element.addEventListener(eventName, nextValue as () => void);
    } else {
        const attributeName = (
            ({
                "className": "class",
            })[propertyName]
            ?? propertyName
        );

        switch (typeof nextValue) {
            case "string":
            case "number":
                element.setAttribute(attributeName, `${nextValue}`);
                break;
            case "boolean":
                element.toggleAttribute(attributeName, nextValue);
                break;
            case "undefined":
                element.removeAttribute(attributeName);
                break;
            default:
                throw new Error(`swapProperty is not implemented for values of type ${JSON.stringify(typeof nextValue)}`);
        }
    }

    return nextValue;
}

export const swapProperties = (element: HTMLElement, previousProperties: Record<string, unknown>, nextProperties: Record<string, unknown>): void => {
    preventEffects(() => {
            useContext(Context._current ?? globalContext, () => {
                const effects = (element as { _effects?: Record<string, Effect> })._effects ??= {};
                const listeners = (element as { _listeners?: Record<string, () => void> })._listeners ??= {};

                for (const eventName in listeners) {
                    const listener = listeners[eventName];

                    element.removeEventListener(eventName, listener);
                }

                for (let propertyName in {
                    ...previousProperties,
                    ...nextProperties,
                }) {
                    effects[propertyName]?._cancel();
                    delete effects[propertyName];

                    if (csr && (
                        element instanceof HTMLInputElement ||
                        element instanceof HTMLTextAreaElement
                    ) && propertyName === "value" && nextProperties[propertyName] instanceof Signal) {
                        const $value = nextProperties[propertyName] as Signal<string | undefined>;

                        element.addEventListener("input", listeners["input"] = () => {
                            $value.set(element.value);
                        });
                    }

                    if (csr && (
                        element instanceof HTMLSelectElement
                    ) && propertyName === "selectedIndex" && nextProperties[propertyName] instanceof Signal) {
                        const $selectedIndex = nextProperties[propertyName] as Signal<number | undefined>;

                        element.addEventListener("input", listeners["input"] = () => {
                            $selectedIndex.set(element.selectedIndex);
                        });
                    }

                    const effect = new Effect(((previousValue = normalize(previousProperties[propertyName])) => () => {
                        previousValue = swapProperty(element, propertyName, previousValue, normalize(nextProperties[propertyName]));
                    })());

                    if (effect._signals.size > 0) {
                        effects[propertyName] = effect;
                    }
                }
            });
        }
    );
};

export const swapChildren = (element: HTMLElement, previousChildren: VirtualNode[], nextChildren: VirtualNode[], referenceNode: Node | null = null) => {
    const maxLength = Math.max(previousChildren.length, nextChildren.length);

    let fragment: DocumentFragment | undefined;

    for (let index = 0; index < maxLength; index++) {
        const previousChild = previousChildren[index];
        const nextChild = nextChildren[index];

        if (!previousChild && nextChild) {
            (fragment ??= document.createDocumentFragment())
                .append(...nextChild._inflate());
        } else if (previousChild && !nextChild) {
            previousChild._remove?.(true);
        } else if (previousChild && nextChild) {
            swap(previousChild, nextChild);
        } else {
            throw new Error("unimplemented");
        }
    }

    fragment && element.insertBefore(fragment, referenceNode);
}

export const swap = (previousNode: VirtualNode, nextNode: VirtualNode) => {
    if (previousNode._parent && !nextNode._parent) {
        const parent = ([ nextNode._parent, previousNode._parent ] = [ previousNode._parent, undefined ])[0];
        const index = parent._children.indexOf(previousNode);

        if (index !== -1) {
            parent._children.splice(index, 1, nextNode);
        } else {
            throw new Error(`${previousNode.constructor?.name} is not a child of ${parent.constructor?.name}`);
        }
    }

    if (previousNode instanceof VirtualTextNode) {
        if (!previousNode._node) throw new Error(`${previousNode.constructor?.name} is not inflated`);

        if (nextNode instanceof VirtualTextNode) {
            if (nextNode._node) throw new Error(`${previousNode.constructor?.name} is already inflated`);

            const node = ([ nextNode._node, previousNode._node ] = [ previousNode._node, undefined ])[0];

            if (csr) {
                node.textContent = nextNode._content;
            } else {
                node.replaceWith(nextNode._node = document.createTextNode(nextNode._content));
            }

            return;
        }
    }

    if (previousNode instanceof VirtualCommentNode) {
        if (!previousNode._node) throw new Error(`${previousNode.constructor?.name} is not inflated`);

        if (nextNode instanceof VirtualCommentNode) {
            if (nextNode._node) throw new Error(`${previousNode.constructor?.name} is already inflated`);

            const node = ([ nextNode._node, previousNode._node ] = [ previousNode._node, undefined ])[0];

            node.textContent = nextNode._content;

            return;
        }
    }

    if (previousNode instanceof VirtualSignalNode) {
        if (!previousNode._children[0]) throw new Error(`${previousNode.constructor?.name} is not inflated`);

        if (nextNode instanceof VirtualSignalNode) {
            swap(previousNode._children[0], nextNode._children[0]);
            previousNode._finalize();
        } else {
            swap(previousNode._children[0], nextNode);
            previousNode._finalize();
        }

        return
    }

    if (previousNode instanceof VirtualElementNode) {
        if (!previousNode._node) throw new Error(`${previousNode.constructor?.name} is not inflated`);

        if (nextNode instanceof VirtualElementNode) {
            if (nextNode._node) throw new Error(`${previousNode.constructor?.name} is already inflated`);

            if (nextNode._tagName === previousNode._tagName) {
                const node = ([ nextNode._node, previousNode._node ] = [ previousNode._node, undefined ])[0];

                swapProperties(node, previousNode._properties, nextNode._properties);
                swapChildren(node, previousNode._children, nextNode._children);

                return;
            }
        }
    }

    if (previousNode instanceof VirtualFragmentNode) {
        if (!previousNode._hints) throw new Error(`${previousNode.constructor?.name} is not inflated`);

        if (nextNode instanceof VirtualFragmentNode) {
            if (nextNode._hints) throw new Error(`${previousNode.constructor?.name} is already inflated`);

            const hints = ([ nextNode._hints, previousNode._hints ] = [ previousNode._hints, undefined ])[0];
            const referenceNode = hints[1], parentNode = referenceNode.parentNode;

            if (parentNode instanceof HTMLElement) {
                swapChildren(parentNode, previousNode._children, nextNode._children, referenceNode);
            } else {
                throw new Error();
            }
        } else if (nextNode instanceof VirtualComponentNode) {
            if (nextNode._children[0]) throw new Error(`${previousNode.constructor?.name} is already inflated`);

            swap(previousNode, nextNode._initialize());
        } else {
            const referenceNode = previousNode._hints[1], parentNode = referenceNode.parentNode;

            if (parentNode instanceof HTMLElement) {
                const fragment = document.createDocumentFragment();
                fragment.append(...nextNode._inflate());
                parentNode.insertBefore(fragment, referenceNode.nextSibling);
                previousNode._remove?.(true);
            } else {
                throw new Error();
            }
        }

        return;
    }

    if (previousNode instanceof VirtualComponentNode) {
        if (!previousNode._children[0]) throw new Error(`${previousNode.constructor?.name} is not inflated`);

        if (nextNode instanceof VirtualComponentNode) {
            if (nextNode._children[0]) throw new Error(`${previousNode.constructor?.name} is already inflated`);

            if (previousNode._isCompatible(nextNode)) {
                const node = previousNode._children.splice(0, 1)[0];

                nextNode._children.splice(0, 1, node);

                for (const propertiesKey in { ...previousNode._properties, ...nextNode._properties }) {
                    const $value = (previousNode._interface!.properties[`$${propertiesKey}` as any] as Signal<unknown>);
                    const nextValue = nextNode._properties[propertiesKey as any];

                    // TODO: Not well tested.. observe!
                    if (nextValue instanceof ReadonlySignal) {
                        new Effect(() => {
                            $value?.set(normalize(nextValue));
                        });
                    } else {
                        $value?.set(nextValue);
                    }
                }

                ([ nextNode._context, previousNode._context ] = [ previousNode._context, undefined ]);
                ([ nextNode._interface, previousNode._interface ] = [ previousNode._interface, undefined ]);

                node._parent = nextNode;
            } else {
                swap(previousNode._children[0], nextNode._initialize());
                previousNode._finalize();
            }
        } else {
            if (!nextNode._parent) throw new Error();
            swap(previousNode._children[0], nextNode);
            previousNode._finalize();
        }

        return;
    }

    if (
        previousNode instanceof VirtualTextNode ||
        previousNode instanceof VirtualCommentNode ||
        previousNode instanceof VirtualElementNode
    ) {
        if (!previousNode._node) throw new Error(`${previousNode.constructor?.name} is not inflated`);

        previousNode._node.replaceWith(...nextNode._inflate());
        previousNode._node = undefined;
        previousNode._finalize?.();

        return;
    }

    throw new Error(`swap is not implemented for ${previousNode.constructor?.name} -> ${nextNode.constructor?.name}`);
};
