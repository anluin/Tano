import { ts } from "../utils/formatting.ts";


export type Properties = {
    splitting: boolean,
    routesDirectoryPath: string,
    routes: Record<string, string>,
};

export const renderRoutes = (properties: Properties) => {
    const { splitting, routes } = properties;

    if (splitting) {
        const exports = (
            Object.entries(routes)
                .map(([ pattern, path ], index) => {
                    return `["${pattern}"]: import("../src/frontend/routes/${path}"),`;
                })
                .join(`\n${' '.repeat(16)}`)
        );

        return ts`
            import { createSignal, createEffect, pathname, createElement, Component } from "https://deno.land/x/tano@0.0.5/lib/frontend/mod.ts";


            export const currentRoute = createSignal<JSX.Element>(undefined);

            export const routes: Record<string, Promise<{ render: Component }>> = {
                ${exports}
            };

            export const findRoute = async (pathname: string): Promise<[({ render: Component }), Record<string, string>] | undefined> => {
                for (const pattern in routes) {
                    const regex = new RegExp(\`^\${pattern.replaceAll(/:(\\w+)/gm, \`(?<$1>[^/]*)\`)}$\`);
                    const result = regex.exec(pathname);
                    
                    if (result) {
                        return [await routes[pattern], result.groups ?? {}];
                    }
                }
            };

            createEffect(pathname, async pathname => {
                const [route, parameters] = await findRoute(pathname) ?? await findRoute("/error/404");

                if (route) {
                    currentRoute.set(createElement(route.render, parameters));
                }
            });
        `;
    } else {
        const imports = (
            Object.entries(routes)
                .map(([ , path ], index) => {
                    return `import * as _${index} from "../src/frontend/routes/${path}";`;
                })
                .join("\n")
        );

        const exports = (
            Object.entries(routes)
                .map(([ pattern ], index) => {
                    return `["${pattern}"]: _${index},`;
                })
                .join(`\n${' '.repeat(16)}`)
        );

        return ts`
            import { createSignal, createEffect, pathname, createElement, Component } from "https://deno.land/x/tano@0.0.5/lib/frontend/mod.ts";

            ${imports}


            export const currentRoute = createSignal<JSX.Element>(undefined);

            export const routes: Record<string, { render: Component }> = {
                ${exports}
            };

            export const findRoute = (pathname: string): [ ({ render: Component }), Record<string, string> ] | undefined => {
                for (const pattern in routes) {
                    const regex = new RegExp(\`^\${pattern.replaceAll(/:(\\w+)/gm, \`(?<$1>[^/]*)\`)}$\`);
                    const result = regex.exec(pathname);

                    if (result) {
                        return [ routes[pattern], result.groups ?? {} ];
                    }
                }
            };

            createEffect(pathname, async pathname => {
                const [ route, parameters ] = findRoute(pathname) ?? findRoute("/error/404");

                if (route) {
                    currentRoute.set(createElement(route.render, parameters));
                }
            });
        `;
    }
}
