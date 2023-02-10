import { Component, Properties } from "./jsx.ts";
import { Signal } from "./signal.ts";
import { Effect } from "./effect.ts";
import { globalContext, useContext } from "./context.ts";
import { isInstalled } from "./utils.ts";


declare global {
    const __routes: Record<string, () => Promise<{ Route: Component, properties: Properties }>>;
}

export const $pathname = new Signal(location.pathname);

export function handleAnchorClick(this: HTMLAnchorElement, event: MouseEvent) {
    const href = this.getAttribute("href");

    if (href === null) {
        event.preventDefault();
    }

    if (href?.startsWith("/")) {
        event.preventDefault();
        $pathname.value = href;
    }
}

useContext(globalContext, () => {
    csr && new Effect(() => {
        const newPathname = $pathname.value;

        if (location.pathname !== newPathname) {
            history[isInstalled ? "replaceState" : "pushState"](undefined, "", newPathname);
        }
    });
});

addEventListener("popstate", () => {
    $pathname.value = location.pathname;
});
