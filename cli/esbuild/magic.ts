import { Plugin } from "https://deno.land/x/esbuild@v0.15.14/mod.d.ts";

import { patternsForPath } from "../utils/naming.ts";
import { ts } from "../utils/formatting.ts";
import { dirname, join, normalize, relative, resolve } from "https://deno.land/std@0.153.0/path/mod.ts";


export type Properties = {
    importMapFilePath: string,
    backendDirectoryPath?: string,
    endpoints?: Record<string, string[]>,
    sockets?: Record<string, string[]>,
};


const textEncoder = new TextEncoder();
const sha1Cache: Record<string, string> = {};
const sha1 = async (data: string) =>
    sha1Cache[data] ??= (
        Array.from(new Uint8Array(await crypto.subtle.digest('SHA-1', textEncoder.encode(data))))
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('')
    );

const cacheDirectoryMapping: Record<string, string> = {};

const cache = async (url: URL): Promise<{ path: string }> => {
    const path = resolve(join(
        `.build/cache/${await sha1(url.host)}`,
        url.pathname
    ));

    await Deno.mkdir(dirname(path), { recursive: true });

    try {
        await Deno.stat(path);
    } catch (_) {
        await Deno.writeTextFile(path, await fetch(url).then(response => response.text()));
    }

    url.pathname = dirname(url.pathname);
    cacheDirectoryMapping[dirname(path)] = url.href;

    return ({
        path,
    });
};

export const magicPlugin = async ({
                                      importMapFilePath,
                                      backendDirectoryPath,
                                      endpoints,
                                      sockets,
                                  }: Properties): Promise<Plugin> => {
    const { imports } = (
        await Deno.readTextFile(importMapFilePath)
            .then(JSON.parse)
            .catch(() => ({}))
    );

    const directoryPath = dirname(importMapFilePath);

    return {
        name: 'importMap',
        setup(build) {
            build.onResolve({ filter: /.*?/ }, async (args) => {
                const { resolveDir } = args;

                if (backendDirectoryPath !== undefined) {
                    const path = resolve(resolveDir, args.path);

                    if (path.startsWith(backendDirectoryPath)) {
                        return ({
                            path,
                            namespace: 'api.ts-ns',
                            pluginData: {
                                resolveDir
                            }
                        });
                    }
                }

                if (resolveDir in cacheDirectoryMapping) {
                    if (/^https?:\/{2}/.test(args.path)) {
                        return await cache(new URL(args.path));
                    } else {
                        const url = new URL(cacheDirectoryMapping[resolveDir]);
                        url.pathname = normalize(`${url.pathname}/${args.path}`);
                        return await cache(url);
                    }
                }

                for (const pattern in imports) {
                    if (args.path.startsWith(pattern)) {
                        const path = resolve(directoryPath, args.path.replace(pattern, imports[pattern].replace("file://", "")));

                        if (backendDirectoryPath !== undefined) {
                            if (path.startsWith(backendDirectoryPath)) {
                                return ({
                                    path,
                                    namespace: 'api.ts-ns',
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

                if (/^https?:\/\//.test(args.path)) {
                    return await cache(new URL(args.path));
                }
            });

            // build.onLoad({ filter: /.*/, namespace: 'cache-ns' }, async ({ path, pluginData: { url, resolveDir } }) => {
            //     return ({
            //         contents: await Deno.readTextFile((await cache(url)).path),
            //         resolveDir,
            //         loader: 'ts',
            //     });
            // });

            if (backendDirectoryPath !== undefined) {
                build.onLoad({ filter: /.*/, namespace: 'api.ts-ns' }, async ({ path, pluginData: { resolveDir } }) => {
                    const source = await Deno.readTextFile(path);

                    const wrapper = [ ...source.matchAll(/export const (\w*)\s*=\s*(endpoint|socket)/gm) ].map(([ , match, type ]) => {
                        const pattern = patternsForPath(relative(backendDirectoryPath, path))[0];

                        switch (type) {
                            case "endpoint":
                                if (endpoints !== undefined) {
                                    (endpoints[pattern] ??= [])
                                        .push(match);
                                }

                                return `export const ${match} = __createEndpoint("${pattern}", "${match}")`;
                            case "socket":
                                if (sockets !== undefined) {
                                    (sockets[pattern] ??= [])
                                        .push(match);
                                }

                                return `export const ${match} = __createSocket("${pattern}", "${match}")`;
                        }
                    }).join("\n");

                    return ({
                        contents: ts`
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
