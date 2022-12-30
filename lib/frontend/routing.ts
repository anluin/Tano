import { Effect } from "./effect.ts";
import { VirtualComponent } from "./node.ts";
import { globalContext } from "./context.ts";
import { Component } from "./jsx.ts";
import { isInstalled } from "./utils.ts";
import { $pathname, $route } from "./store.ts";


declare global {
    const __routes: Record<string, () => Promise<{ render: Component }>>;
}


const findParameters = (
    (cache: Record<string, RegExp> = {}) =>
        (pattern: string, pathname: string): Record<string, string> | undefined => (
            cache[pattern] ??=
                new RegExp(`^${pattern.replace(/:(\w+)/g, `(?<$1>[^\\/]+)`)}$`)
        )
            .exec(pathname)
            ?.groups
)();

const findRouteAndParameters = (pathname: string) => {
    if (__routes[pathname]) {
        return {
            loadRenderFn: async () => (await __routes[pathname]()).render,
            parameters: {},
        };
    }

    for (const pattern in __routes) {
        const parameters = findParameters(pattern, pathname);

        if (parameters) {
            return {
                loadRenderFn: async () => (await __routes[pattern]()).render,
                parameters,
            };
        }
    }
};

globalContext.use(() => {
    new Effect(() => {
        const newPathname = $pathname.value;

        if (location.pathname !== newPathname) {
            history[isInstalled() ? "replaceState" : "pushState"](undefined, "", newPathname);
        }
    });

    new Effect(() => {
        const routeAndParameters = findRouteAndParameters($pathname.value);

        if (routeAndParameters) {
            const { loadRenderFn, parameters } = routeAndParameters;

            loadRenderFn()
                .then(renderFn => {
                    $route.value = new VirtualComponent(renderFn, parameters, []);
                })
                .catch(console.error);
        }
    });
});

addEventListener("popstate", () => {
    $pathname.value = location.pathname;
});
