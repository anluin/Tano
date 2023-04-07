import { toVirtualNode } from "./virtual-dom/utils.ts";
import { VirtualNode } from "./virtual-dom/node.ts";
import { swap } from "./swap.ts";


let currentVirtualRootNode: VirtualNode | undefined;

export const render = async (element: JSX.Element) => {
    const nextVirtualRootNode = toVirtualNode(element);

    currentVirtualRootNode ??= toVirtualNode(document.documentElement);
    currentVirtualRootNode?._unmount?.();

    swap(currentVirtualRootNode, nextVirtualRootNode);

    currentVirtualRootNode = nextVirtualRootNode;
    currentVirtualRootNode?._mount?.();
};
