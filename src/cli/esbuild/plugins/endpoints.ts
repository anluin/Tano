import { Plugin } from "https://deno.land/x/esbuild@v0.14.50/mod.d.ts";
import { ts } from "../../utils/formatting.ts";
import { relative, resolve } from "https://deno.land/std@0.150.0/path/mod.ts";
import { identifierForPath, patternsForPath, withoutExtension } from "../../utils/helper.ts";


export type Properties = {
    routesDirectoryPath: string,
};

export const endpointsPlugin = async (properties: Properties): Promise<Plugin> => {
    const { routesDirectoryPath } = properties;

    return {
        name: "api-ns",
        setup(build) {
            build.onResolve({ filter: /\.ts$/ }, ({ path, resolveDir}) => {
                if (resolveDir.startsWith(routesDirectoryPath)) {
                    return ({
                        path,
                        namespace: 'api-ns',
                        pluginData: {
                            resolveDir
                        }
                    });
                }
            })

            build.onLoad({ filter: /.*/, namespace: 'api-ns' }, async ({ path, pluginData: { resolveDir }}) => {
                const source = await Deno.readTextFile(`${resolveDir}/${path}`);

                const wrapper = [...source.matchAll(/export const (\w*)/gm)].map(([, match]) => {
                    const pattern = patternsForPath(withoutExtension(relative(routesDirectoryPath, resolve(`${resolveDir}/${path}`))))[0];

                    return `export const ${match} = createEndpoint("${pattern}", "${match}")`;
                }).join("\n");

                return ({
                    contents: ts`
                        import { createEndpoint } from "https://deno.land/x/tano@0.0.1/lib/client.ts";

                        ${wrapper}
                    `,
                    resolveDir,
                    loader: 'ts',
                });
            });
        }
    };
};
