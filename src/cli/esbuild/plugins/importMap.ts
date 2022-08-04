import { Plugin } from "https://deno.land/x/esbuild@v0.14.53/mod.d.ts";
import { resolve, dirname } from "https://deno.land/std@0.150.0/path/mod.ts";


export type Properties = {
    importMapFilePath: string,
};

export const importMapPlugin = async ({importMapFilePath}: Properties): Promise<Plugin> => {
    const { imports } = await Deno.readTextFile(importMapFilePath).then(JSON.parse);

    const directoryPath = dirname(importMapFilePath);

    return {
        name: 'importMap',
        setup(build) {
            build.onResolve({ filter: /.*?/ }, (args) => {
                for (const pattern in imports) {
                    if (args.path.startsWith(pattern)) {
                        const x = imports[pattern].replace("file://", "");

                        return {
                            path: resolve(directoryPath, args.path.replace(pattern, x)),
                        };
                    }
                }
            });
        },
    };
};
