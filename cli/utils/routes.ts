import { walk } from "https://deno.land/std@0.152.0/fs/walk.ts";
import { relative } from "https://deno.land/std@0.152.0/path/mod.ts";

import { patternsForPath } from "./naming.ts";


type Properties = {
    routesDirectoryPath: string,
};

export const findRoutes = async (properties: Properties) => {
    const { routesDirectoryPath } = properties;
    const routes: Record<string, string> = {};

    for await(const { path } of walk(routesDirectoryPath, { includeDirs: false, exts: [ "tsx" ] })) {
        const relativePath = relative(routesDirectoryPath, path);
        const patterns = patternsForPath(relativePath);

        for (const pattern of patterns) {
            if (!(pattern in routes)) {
                routes[pattern] = relativePath;
            }
        }
    }

    return routes;
};
