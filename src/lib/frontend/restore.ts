import { toVirtualNode, VirtualFragmentNode, VirtualNode } from "./virtual-dom/mod.ts";

export const restoreAttributes = (element: HTMLElement): Record<string, string> =>
    [ ...element.attributes ]
        .reduce((carry, { name: attributeName, value }) => {
            return {
                ...carry,
                [attributeName]: value,
            };
        }, {});

export const restoreChildren = (element: HTMLElement): VirtualNode[] => {
    const childrenStack: VirtualNode[][] = [ [] ];
    const fragmentHits: Comment[] = [];

    for (const childNode of element.childNodes) {
        if (childNode instanceof Comment) {
            if (childNode.nodeValue === `fragment start`) {
                childrenStack.push([]);
                fragmentHits.push(childNode);
                continue;
            }

            if (childNode.nodeValue === `fragment end`) {
                const fragment = new VirtualFragmentNode(
                    childrenStack.pop()!,
                    [ fragmentHits.pop()!, childNode ],
                );
                childrenStack.at(-1)!.push(fragment);
                continue;
            }
        }

        childrenStack.at(-1)!.push(toVirtualNode(childNode));
    }

    const children = childrenStack.pop();

    if (children) {
        return children;
    } else {
        throw new Error();
    }
};
