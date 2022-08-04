import { ts } from "../utils/formatting.ts";
import { Workspace } from "../main.ts";


export const routesTemplate = (workspace: Workspace, lazyImport: boolean = true): string => {
    if (lazyImport) {
        type TransformedRoute = {
            relativePath: string,
            pattern: string,
        };

        const routes = (
            workspace.routes
                .reduce<TransformedRoute[]>((carry, {  relativePath, patterns }) =>
                    [ ...carry, ...patterns.map(pattern => ({ relativePath, pattern })) ], [])
                .map(({ relativePath, pattern }) =>
                    `${" ".repeat(16)}"${pattern}": (properties) => lazy(import("../src/routes/${relativePath}"), properties),`)
                .sort()
                .join("\n")
        );

        return ts`
            import { Component, Effect } from "https://deno.land/x/tano@0.0.1/lib/react.ts";


            const lazy = (promise: Promise<{ render: Component<any> }>, properties: any) => {
                const effect = new Effect(undefined);

                promise.then(({ render }) => effect.set(render(properties)));

                return effect;
            };
            
            export const routes: Record<string, Component> = {\n${routes}\n};
        `;
    } else {
        const imports = (
            workspace.routes
                .map(({ relativePath, identifier }) =>
                    ts`import { render as ${identifier} } from "../src/routes/${relativePath}"`)
                .join("")
        );

        type TransformedRoute = {
            identifier: string,
            pattern: string,
        };

        const routes = (
            workspace.routes
                .reduce<TransformedRoute[]>((carry, {  identifier, patterns }) =>
                    [ ...carry, ...patterns.map(pattern => ({ identifier, pattern })) ], [])
                .map(({ identifier, pattern }) =>
                    `${" ".repeat(16)}"${pattern}": ${identifier},`)
                .sort()
                .join("\n")
        );

        return ts`
            /* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
             *  This file is generated automatically, changes will be overwritten! *
             * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

            import { Component } from "https://deno.land/x/tano@0.0.1/lib/react.ts";
            ${imports}
            
            export const routes: Record<string, Component> = {\n${routes}\n};
        `;
    }
};
