import * as esbuild from "https://deno.land/x/esbuild@v0.16.16/mod.js";
import * as path from "https://deno.land/std@0.171.0/path/mod.ts";

import { sha1 } from "./utils.ts";

const resolve = async (fileName: string, directoryPath: string, imports: Record<string, string>, importMapDirectoryPath: string, cacheDirectoryPath: string): Promise<string> => {
    for (const pattern in imports) {
        if (fileName.startsWith(pattern)) {
            fileName = path.resolve(
                importMapDirectoryPath,
                fileName.replace(
                    pattern,
                    imports[pattern]
                        .replace("file://", "")
                ),
            );
            break;
        }
    }

    if (/^https?:\/\//.test(fileName)) {
        const hash = await sha1(fileName);
        const cachedFileName = path.resolve(cacheDirectoryPath, `${hash}${path.extname(fileName)}`);

        await Deno.readTextFile(cachedFileName)
            .catch(() => (
                fetch(fileName)
                    .then(response => response.body!)
                    .then(async stream => {
                        await Deno.mkdir(cacheDirectoryPath, { recursive: true });
                        await Deno.writeFile(cachedFileName, stream);
                    })
            ));

        return cachedFileName;
    }

    return path.resolve(directoryPath, fileName);
}


export type Endpoints = Record<string, {
    absolutePath: string,
    methodName: string,
}>;

export const Plugin = async (importMapFilePath: string, backendSrcDirectoryPath: string, cacheDirectoryPath: string, endpoints: Endpoints): Promise<esbuild.Plugin> => {
    const mapping: Record<string, string> = {};
    const cache: Record<string, string> = {};

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

            build.onResolve(
                { filter: /.*?/ },
                async ({ path: relativePath, resolveDir: directory, importer }) => {
                    if (importer.startsWith(cacheDirectoryPath)) {
                        const hash = path.relative(cacheDirectoryPath, importer);

                        if (mapping[hash]) {
                            directory = mapping[hash];

                            if (/^https?:\/\//.test(directory)) {
                                const url = new URL(directory);

                                relativePath = new URL(path.join(url.pathname, relativePath), url).href;
                            } else {
                                throw new Error("Something went wrong");
                            }
                        } else {
                            throw new Error();
                        }
                    }

                    const absolutePath = decodeURI(
                        await resolve(
                            relativePath,
                            directory,
                            imports,
                            importMapDirectoryPath,
                            cacheDirectoryPath,
                        ),
                    );

                    if (absolutePath.startsWith(backendSrcDirectoryPath)) {
                        return ({
                            path: relativePath,
                            namespace: 'api.ts-ns',
                            pluginData: {
                                absolutePath,
                                directory,
                            },
                        });
                    }

                    if (absolutePath.startsWith(cacheDirectoryPath)) {
                        const hash = path.relative(cacheDirectoryPath, absolutePath);

                        if (/^https?:\/\//.test(relativePath)) {
                            const url = new URL(relativePath);

                            mapping[hash] = new URL(path.dirname(url.pathname), url).href;
                        } else {
                            throw new Error("Something went wrong");
                        }
                    }

                    return {
                        path: absolutePath,
                    };
                },
            );

            build.onLoad(
                { filter: /.*/, namespace: 'api.ts-ns' },
                async ({ pluginData: { absolutePath, directory } }) => {
                    const contents = cache[absolutePath] ??= await (
                        Deno.readTextFile(absolutePath)
                            .then(sourceCode => {
                                const endpointBase = (
                                    path
                                        .relative(backendSrcDirectoryPath, absolutePath)
                                        .slice(0, -path.extname(absolutePath).length)
                                );

                                const methodNames = (
                                    [ ...sourceCode.matchAll(/export const (\w+)\s*=\s*(async)?\s*(endpoint)\w*\(/gm) ]
                                        .map(([ , methodName ]) => methodName)
                                );

                                return [
                                    `import { call } from "https://deno.land/x/tano@0.0.14/lib/frontend/api.ts";\n`,
                                    ...
                                        methodNames
                                            .map(methodName => {
                                                const endpoint = `/${endpointBase}@${methodName}`;

                                                endpoints[endpoint] = {
                                                    absolutePath,
                                                    methodName,
                                                };

                                                return (
                                                    `export const ${methodName} = (...args: unknown[]): Promise<unknown> => call(${JSON.stringify(endpoint)}, args);`
                                                );
                                            }),
                                ].join("\n");
                            })
                    );

                    return ({
                        contents,
                        resolveDir: directory,
                        loader: 'ts',
                    });
                },
            );
        },
    };
};
