import { VirtualComment, VirtualComponent, VirtualFragment, VirtualNode, VirtualTag, VirtualText } from "./node.ts";
import { Component, Properties } from "./jsx.ts";
import { maximalComputationTime, notifyRenderBlockingPromise, processAllRenderBlockingPromises } from "./utils.ts";
import { handleAnchorClick } from "./routing.ts";
import { Effect } from "./effect.ts";
import { Signal } from "./signal.ts";
import { globalContext, useContext } from "./context.ts";


declare global {
    const csr: boolean;
    const ssr: boolean;
    const showHelperNodes: boolean;
}

export const swapProperty = (node: HTMLElement, propertyName: string, previousValue: unknown, nextValue: unknown): void => {
    if (csr && node instanceof HTMLInputElement && propertyName === "value") {
        const listeners = (
            (node as unknown as {
                __listeners?: Record<string, () => void>,
            })
                .__listeners ??= {}
        );

        if (previousValue instanceof Signal) {
            node.removeEventListener("input", listeners.input);
            delete listeners.input;
        }

        if (nextValue instanceof Signal) {
            const listener = () => {
                nextValue.value = node.value;
            };

            node.addEventListener("input", listeners.input = listener);
        }
    }

    if (propertyName === "reference" && nextValue instanceof Signal) {
        nextValue.value = node;
        return;
    }

    if (previousValue instanceof Signal) {
        const effects = (
            (node as unknown as {
                __effects?: Record<string, Effect>,
            })
                .__effects ??= {}
        );

        effects[propertyName]?.__cancel();

        return swapProperty(node, propertyName, previousValue.__value, nextValue);
    }

    if (nextValue instanceof Signal) {
        const effects = (
            (node as unknown as {
                __effects?: Record<string, Effect>,
            })
                .__effects ??= {}
        );

        effects[propertyName]?.__cancel();
        effects[propertyName] = useContext(globalContext, () =>
            new Effect(() => {
                swapProperty(node, propertyName, previousValue, nextValue.value);
                previousValue = nextValue.__value;
            })
        );

        return;
    }

    const attributeName = (<Record<string, string>>{
        "className": "class",
    }) [propertyName] ?? propertyName;

    if (propertyName.startsWith("on") && (
        previousValue instanceof Function ||
        nextValue instanceof Function
    )) {
        const event = propertyName.slice(2).toLowerCase();

        if (previousValue) {
            node.removeEventListener(event, previousValue as () => void);
        }

        if (nextValue) {
            node.addEventListener(event, nextValue as () => void);
        }

        return;
    }

    if (nextValue === undefined) {
        node.removeAttribute(attributeName);
    } else if (["string", "number"].includes(typeof nextValue)) {
        node.setAttribute(attributeName, `${nextValue}`);
    } else if (typeof nextValue === "boolean") {
        if (ssr) {
            if (nextValue) {
                node.setAttribute(attributeName, "");
            } else {
                node.removeAttribute(attributeName);
            }
        } else {
            node.toggleAttribute(attributeName, nextValue);
        }
    } else {
        throw new Error(`can not handle typeof property: '${propertyName}' (${typeof nextValue})`);
    }
};

export const swapProperties = (node: HTMLElement, previousProperties: Properties, nextProperties: Properties) => {
    if (csr && node instanceof HTMLAnchorElement) {
        node.removeEventListener("click", handleAnchorClick);
        node.addEventListener("click", handleAnchorClick);
    }

    for (const propertyName in { ...previousProperties, ...nextProperties }) {
        const previousValue = previousProperties[propertyName];
        const nextValue = nextProperties[propertyName];

        if (previousValue !== nextValue) {
            swapProperty(node, propertyName, previousValue, nextValue);
        }
    }
};

export const swapNodes = (parentNode: HTMLElement, previousNodes: VirtualNode[], nextNodes: VirtualNode[], referenceNode: Node | null = null) => {
    const maxLength = Math.max(previousNodes.length, nextNodes.length);

    for (let index = 0; index < maxLength; ++index) {
        const previousNode = previousNodes[index];
        const nextNode = nextNodes[index];

        if (previousNode && nextNode) {
            swap(previousNode, nextNode);
        } else if (previousNode) {
            previousNode.__remove();
        } else if (nextNode) {
            for (const node of nextNode.__inflate()) {
                parentNode.insertBefore(node, referenceNode);
            }
        }
    }
};

export const directSwap = (previousNode: VirtualNode, nextNode: VirtualNode) => {
    if (previousNode === nextNode) return;

    if (nextNode instanceof VirtualComponent) {
        if (nextNode.__initializer === Skip) {
            if (previousNode instanceof VirtualComponent) {
                nextNode.__initializer = () => previousNode.__initializedNode;
            } else {
                nextNode.__initializer = () => previousNode;
            }
        }
    }

    let node: undefined | Text | Comment | HTMLElement;

    if (previousNode instanceof VirtualText) {
        if (!(node = previousNode.__node)) throw new Error();

        if (nextNode instanceof VirtualText) {
            const [node] = [nextNode.__node, previousNode.__node] = [previousNode.__node, undefined];

            if (previousNode.__content !== nextNode.__content) {
                if (csr) {
                    node.nodeValue = nextNode.__content;
                } else {
                    node.replaceWith(...nextNode.__inflate());
                }
            }

            return;
        }
    }

    if (previousNode instanceof VirtualComment) {
        if (!(node = previousNode.__node)) throw new Error();

        if (nextNode instanceof VirtualComment) {
            const [node] = [nextNode.__node, previousNode.__node] = [previousNode.__node, undefined];

            if (previousNode.__content !== nextNode.__content) {
                if (csr) {
                    node.nodeValue = nextNode.__content;
                } else {
                    node.replaceWith(...nextNode.__inflate());
                }
            }

            return;
        }
    }

    if (previousNode instanceof VirtualFragment) {
        if (!(node = previousNode.__endHint)) throw new Error();

        if (nextNode instanceof VirtualFragment) {
            const parentNode = node.parentNode;

            if (parentNode instanceof HTMLElement) {
                [nextNode.__startHint, previousNode.__startHint] = [previousNode.__startHint, undefined];
                [nextNode.__endHint, previousNode.__endHint] = [previousNode.__endHint, undefined];

                swapNodes(parentNode, previousNode.__children, nextNode.__children, node);
                return;
            } else {
                throw new Error();
            }
        }
    }

    if (previousNode instanceof VirtualTag) {
        if (!(node = previousNode.__node)) throw new Error();

        if (nextNode instanceof VirtualTag && nextNode.__tagName === previousNode.__tagName) {
            const [node] = [nextNode.__node, previousNode.__node] = [previousNode.__node, undefined];

            swapProperties(node, previousNode.__properties, nextNode.__properties);
            swapNodes(node, previousNode.__children, nextNode.__children);

            return;
        }
    }

    if (previousNode instanceof VirtualComponent) {
        if (!previousNode.__initializedNode) throw new Error();

        if (nextNode instanceof VirtualComponent) {
            if (nextNode.__initializer === previousNode.__initializer) {
                if (previousNode.__update(nextNode.__properties, nextNode.__children)) {
                    [nextNode.__initializedNode, previousNode.__initializedNode] = [previousNode.__initializedNode, undefined];
                    [nextNode.__context, previousNode.__context] = [previousNode.__context, nextNode.__context];
                    [nextNode.__listeners, previousNode.__listeners] = [previousNode.__listeners, undefined];

                    return;
                }
            }

            swap(previousNode, nextNode.__initialize());
            return;
        }

        swap(previousNode.__initializedNode, nextNode);
        return;
    }

    if (node) {
        if (nextNode instanceof VirtualComponent && nextNode.__initializer !== Skip) {
            swap(previousNode, nextNode.__initialize());
            return;
        }

        const nodes = nextNode.__inflate();
        node.replaceWith(...nodes);
        previousNode.__remove();
        return;
    }

    csr && console.error(previousNode, nextNode);
    throw new Error();
};

export const swap = (
    (
        running = false,
        queue: (Parameters<typeof directSwap>)[] = [],
    ) =>
        (previousNode: VirtualNode, nextNode: VirtualNode) => {
            queue.push([previousNode, nextNode]);

            if (!running) {
                notifyRenderBlockingPromise((async () => {
                    running = true;

                    await maximalComputationTime(100, async delay => {
                        for (let args: undefined | Parameters<typeof directSwap>; (args = queue.shift());) {
                            directSwap(...args);
                            await delay();
                        }
                    });

                    running = false;
                })());
            }
        }
)();
export const Skip: Component = () => undefined;

let currentVirtualNode: VirtualNode | undefined;


export const render = async (element: JSX.Element) => {
    const virtualNode = VirtualNode.__from(element);

    await processAllRenderBlockingPromises();

    (currentVirtualNode ??= VirtualNode.__from(document.documentElement))
        .__unmount?.();

    await processAllRenderBlockingPromises();

    swap(currentVirtualNode, virtualNode);

    await processAllRenderBlockingPromises();

    (currentVirtualNode = virtualNode)
        .__mount?.();

    await processAllRenderBlockingPromises();
};
