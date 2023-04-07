import { Signal } from "./reactivity/signal.ts";
import { Effect } from "./reactivity/effect.ts";
import { $isInstalled, globalContext } from "./reactivity/utils.ts";


export const $pathname = new Signal(location.pathname);

export function handleAnchorClick(this: HTMLAnchorElement, event: MouseEvent) {
    if (this.origin === location.origin) {
        event.preventDefault();
        $pathname.set(new URL(this.pathname, location.href).pathname);
    }
}

csr && new Effect(() => {
    const pathname = $pathname.get();

    if (location.pathname !== pathname) {
        if ($isInstalled.get()) {
            history.replaceState(undefined, "", pathname);
        } else {
            history.pushState(undefined, "", pathname);
        }
    }
}, globalContext)

addEventListener("popstate", () => {
    $pathname.set(location.pathname);
});
