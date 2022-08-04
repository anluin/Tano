import { Component, Effect, Hooks } from "https://deno.land/x/tano@0.0.1/lib/react.ts";
import { routes } from "$build/routes.ts";


const $pathname = new Effect(location.pathname);
const listener = (event: MouseEvent) => {
    if (event.target instanceof HTMLAnchorElement) {
        const { pathname } = new URL(event.target.href);

        if (pathname.startsWith("/")) {
            event.preventDefault();
            history.replaceState(undefined, "", pathname);
            $pathname.update(() => pathname);
        }
    }
};

export const Router: Component = () => {
    const handleMount = () => document.addEventListener("click", listener);
    const handleCleanup = () => document.removeEventListener("click", listener);

    return (
        <>
            <Hooks onMount={handleMount} onCleanup={handleCleanup}/>
            {$pathname.map((pathname) => {
                const Route = routes[pathname];

                return (
                    Route !== undefined
                        ? <Route/>
                        : "404 | Not found!"
                );
            })}
        </>
    );
};
