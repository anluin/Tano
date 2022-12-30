import { VirtualNode } from "./frontend/node.ts";

export * from "./frontend/jsx.ts";
export * from "./frontend/api.ts";
export * from "./frontend/signal.ts";
export * from "./frontend/effect.ts";
export * from "./frontend/node.ts";
export * from "./frontend/routing.ts";
export * from "./frontend/store.ts";
export * from "./frontend/utils.ts";
export * from "./frontend/context.ts";


export const render = ((previousNode = VirtualNode.__from(document.documentElement)) =>
        (element: JSX.Element) => {
            const nextNode = VirtualNode.__from(element);

            previousNode.__cleanup?.();
            nextNode.__replace(previousNode);
            nextNode.__mount?.();

            previousNode = nextNode;
        }
)();
