import { VirtualFragment, VirtualNode } from "./node.ts";
import { Properties } from "./jsx.ts";

export const restoreAttributes = (element: HTMLElement): Properties =>
    [...element.attributes]
        .reduce((carry, { name: attributeName, value }) => {
            const propertyName = (<Record<string, string>>{
                "class": "className",
            })[attributeName] ?? attributeName;

            return {
                ...carry,
                [propertyName]: value,
            };
        }, {});

export const restoreChildren = (element: HTMLElement): VirtualNode[] => {
    const childrenStack: VirtualNode[][] = [[]];
    const fragmentHits: Comment[] = [];

    for (const childNode of element.childNodes) {
        if (childNode instanceof Comment) {
            if (childNode.nodeValue === `fragment start`) {
                childrenStack.push([]);
                fragmentHits.push(childNode);
                continue;
            }

            if (childNode.nodeValue === `fragment end`) {
                const startHint = document.createTextNode("");
                const endHint = document.createTextNode("");

                if (!showHelperNodes) {
                    fragmentHits.pop()!.replaceWith(startHint);
                    childNode.replaceWith(endHint);
                }

                const fragment = new VirtualFragment(
                    childrenStack.pop()!,
                    showHelperNodes ? fragmentHits.pop()! : startHint,
                    showHelperNodes ? childNode : endHint,
                );
                childrenStack.at(-1)!.push(fragment);
                continue;
            }
        }

        childrenStack.at(-1)!.push(VirtualNode.__from(childNode));
    }

    const children = childrenStack.pop();

    if (children) {
        return children;
    } else {
        throw new Error();
    }
};
