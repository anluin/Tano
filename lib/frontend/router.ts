import { createEffect, createSignal } from "./signal.ts";


export const pathname = createSignal(location?.pathname);

export const handleClickOnAnchor = (event: MouseEvent) => {
    let target: HTMLElement | null = event.target as HTMLElement;

    while (target !== null && !(target instanceof HTMLAnchorElement)) {
        target = target.parentElement;
    }

    if (target !== null) {
        const href = target.getAttribute("href");

        if (href?.startsWith("/")) {
            event.preventDefault();
            pathname.value = href;
        }
    }
};

if (window.csr) {
    addEventListener("popstate", () => {
        pathname.value = location?.pathname;
    });

    createEffect(() => {
        if (location?.pathname !== pathname.value) {
            history.pushState(undefined, "", pathname.value);
        }
    });
}
