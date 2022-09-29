import { Plugin } from "https://deno.land/x/esbuild@v0.14.53/mod.d.ts";
import { dirname, resolve } from "https://deno.land/std@0.152.0/path/mod.ts";
import { patternsForPath } from "../../utils/naming.ts";
import { relative } from "https://deno.land/std@0.150.0/path/mod.ts";
import { ts } from "../../utils/formatting.ts";


export type Properties = {
    importMapFilePath: string,
    backendDirectoryPath?: string,
    endpoints?: Record<string, string[]>,
};

export const magicPlugin = async ({ importMapFilePath, backendDirectoryPath, endpoints }: Properties): Promise<Plugin> => {
    const { imports } = await Deno.readTextFile(importMapFilePath).then(JSON.parse);

    const directoryPath = dirname(importMapFilePath);

    return {
        name: 'importMap',
        setup(build) {
            build.onResolve({ filter: /.*?/ }, (args) => {
                const { resolveDir } = args;

                if (backendDirectoryPath !== undefined) {
                    const path = resolve(resolveDir, args.path);

                    if (path.startsWith(backendDirectoryPath)) {
                        return ({
                            path,
                            namespace: 'api-ns',
                            pluginData: {
                                resolveDir
                            }
                        });
                    }
                }

                for (const pattern in imports) {
                    if (args.path.startsWith(pattern)) {
                        const path = resolve(directoryPath, args.path.replace(pattern, imports[pattern].replace("file://", "")));

                        if (backendDirectoryPath !== undefined) {
                            if (path.startsWith(backendDirectoryPath)) {
                                return ({
                                    path,
                                    namespace: 'api-ns',
                                    pluginData: {
                                        resolveDir
                                    }
                                });
                            }
                        }

                        return {
                            path,
                        };
                    }
                }
            });

            if (backendDirectoryPath !== undefined) {
                build.onLoad({ filter: /.*/, namespace: 'api-ns' }, async ({ path, pluginData: { resolveDir } }) => {
                    const source = await Deno.readTextFile(path);

                    const wrapper = [ ...source.matchAll(/export const (\w*)/gm) ].map(([ , match ]) => {
                        const pattern = patternsForPath(relative(backendDirectoryPath, path))[0];

                        if (endpoints !== undefined) {
                            (endpoints[pattern] ??= [])
                                .push(match);
                        }

                        return `export const ${match} = createEndpoint("${pattern}", "${match}")`;
                    }).join("\n");

                    return ({
                        contents: ts`
                            import { createEndpoint } from "https://deno.land/x/tano@0.0.7/lib/frontend/mod.ts";

                            ${wrapper}
                        `,
                        resolveDir,
                        loader: 'ts',
                    });
                });
            }
        },
    };
};
