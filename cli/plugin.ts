import * as esbuild from "https://deno.land/x/esbuild@v0.16.16/mod.js";
import * as path from "https://deno.land/std@0.171.0/path/mod.ts";


export const Plugin = async (importMapFilePath: string, backendSrcDirectoryPath: string): Promise<esbuild.Plugin> => {
    const importMapDirectoryPath = path.dirname(importMapFilePath);
    const importMap: {
        imports?: Record<string, string>,
    } = await (
        Deno.readTextFile(importMapFilePath)
            .then(JSON.parse)
            .catch(() => ({}))
    );

    return {
        name: "tano",
        setup(build) {
            const imports = importMap.imports ?? {};

            build.onResolve({ filter: /.*?/ }, (args) => {
                const { resolveDir } = args;

                for (const pattern in imports) {
                    if (args.path.startsWith(pattern)) {
                        const absolutePath = path.resolve(
                            importMapDirectoryPath,
                            args.path.replace(
                                pattern,
                                imports[pattern]
                                    .replace("file://", ""),
                            ),
                        );

                        if (backendSrcDirectoryPath !== undefined) {
                            if (absolutePath.startsWith(backendSrcDirectoryPath)) {
                                return ({
                                    path: absolutePath,
                                    namespace: 'api.ts-ns',
                                    pluginData: {
                                        resolveDir,
                                    },
                                });
                            }
                        }

                        return {
                            path: absolutePath,
                        };
                    }
                }

                return {
                    path: decodeURI(path.resolve(resolveDir, args.path)),
                };
            });

            build.onLoad({ filter: /.*/, namespace: 'api.ts-ns' }, (args) => {
                return null;
            });
        },
    };
};
