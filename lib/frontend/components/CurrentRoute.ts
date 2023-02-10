import { Component, createElement } from "../jsx.ts";
import { Signal } from "../signal.ts";
import { Skip } from "../render.ts";
import { onUpdate, VirtualComponent } from "../node.ts";
import { Effect } from "../effect.ts";
import { notifyRenderBlockingPromise } from "../utils.ts";
import { $pathname } from "../routing.ts";


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
            __loadRenderFn: async () => (await __routes[pathname]()),
            __parameters: {},
        };
    }

    for (const pattern in __routes) {
        const __parameters = findParameters(pattern, pathname);

        if (__parameters) {
            return {
                __loadRenderFn: () => __routes[pattern](),
                __parameters,
            };
        }
    }
};

export type FallbackComponent = Component<{ pathname: string }>;

export type Properties = {
    fallback?: JSX.Element | FallbackComponent,
};

export const CurrentRoute: Component<Properties> = ({ fallback }, children) => {
    const $route = new Signal<JSX.Element>(createElement(Skip, null));

    onUpdate((event) => {
        event.preventDefault();
    });

    new Effect(() => {
        const pathname = $pathname.value;
        const routeAndParameters = findRouteAndParameters(pathname);

        if (routeAndParameters) {
            const { __loadRenderFn, __parameters } = routeAndParameters;

            notifyRenderBlockingPromise(
                __loadRenderFn()
                    .then(({ Route, properties }) => {
                        $route.value = new VirtualComponent(Route, {
                            ...properties,
                            ...__parameters,
                        }, children);
                    })
                    .catch(console.error)
            );
        } else {
            $route.value = (
                fallback instanceof Function
                    ? new VirtualComponent(fallback, { pathname }, children)
                    : fallback
            );
        }
    });

    return $route;
};
