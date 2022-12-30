import { ts } from "../../utils/formatting.ts";


export type Properties = {
    routes: Record<string, string>,
};

export const renderFrontendInjection = (properties: Properties) => {
    const { routes } = properties;

    const imports = (
        Object.entries(routes)
            .map(([ pattern, path ]) => {
                return `["${pattern}"]: () => import("@frontend/routes${path}"),`;
            })
            .join(`\n${' '.repeat(12)}`)
    );

    return ts`
        import { Component } from "https://deno.land/x/tano@0.0.14/lib/frontend/jsx.ts";

        export {
            createElement as __createElement,
            fragmentType as __fragmentType,
        } from "https://deno.land/x/tano@0.0.14/lib/frontend/jsx.ts";

        export {
            createEndpoint as __createEndpoint,
            createSocket as __createSocket,
        } from "https://deno.land/x/tano@0.0.14/lib/frontend/api.ts";

        export const __routes: Record<string, () => Promise<{ render: Component }>> = {
            ${imports}
        };
    `;
}
