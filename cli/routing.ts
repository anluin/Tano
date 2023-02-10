import * as fs from "https://deno.land/std@0.171.0/fs/mod.ts";
import * as path from "https://deno.land/std@0.171.0/path/mod.ts";

import { ts } from "./formatting.ts";


export type Routes = Record<string, string>;

const resolveRoutes = async (routesDirectoryPath: string): Promise<Routes> => {
    try {
        const routes: Record<string, string> = {};

        for await(const entry of fs.walk(routesDirectoryPath, { includeDirs: false, exts: ["tsx"] })) {
            const relativePath = `/${path.relative(routesDirectoryPath, entry.path)}`;
            const isIndexFile = relativePath.endsWith("/index.tsx");
            const extensionIndex = relativePath.lastIndexOf(".tsx");

            for (const routerPath of (
                isIndexFile ? [
                    relativePath.slice(0, extensionIndex - 5),
                    relativePath.slice(0, extensionIndex - 6),
                ] : [
                    relativePath.slice(0, extensionIndex),
                ]
            )) {
                routerPath in routes || (
                    routerPath.length > 0 && (
                        routes[routerPath] = relativePath
                    )
                );
            }
        }

        return routes;
    } catch (_) {
        return {};
    }
};

export const buildRoutesInjectionFile = async (routesDirectoryPath: string, injectionFilePath: string) => {
    const injectionDirectoryPath = path.dirname(injectionFilePath);
    const routes = await resolveRoutes(routesDirectoryPath);

    const routesImports = (
        Object.entries(routes)
            .map(([pattern, path]) => {
                return `["${pattern}"]: () => import("@src/frontend/routes${path}"),`;
            })
            .join(`\n${' '.repeat(12)}`)
    );

    await Deno.mkdir(injectionDirectoryPath, { recursive: true })
        .catch(console.error);

    await Deno.writeTextFile(injectionFilePath, ts`
        import { Component } from "https://deno.land/x/tano@0.0.14/lib/frontend/jsx.ts";


        export const __routes: Record<string, () => Promise<{ Route: Component }>> = {
            ${routesImports}
        };
    `);
};
