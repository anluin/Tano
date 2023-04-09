import { toVirtualNode, VirtualNode } from "./virtual-dom/mod.ts";
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
