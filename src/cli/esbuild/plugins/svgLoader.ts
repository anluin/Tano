import { Plugin } from "https://deno.land/x/esbuild@v0.14.50/mod.d.ts";
import { tsx } from "../../utils/formatting.ts";


export const svgLoaderPlugin = async (): Promise<Plugin> => {
    return {
        name: 'svg-ns',
        setup(build) {
            build.onResolve({ filter: /\.svg$/ }, ({ path, resolveDir}) => {
                return ({
                    path,
                    namespace: 'svg-ns',
                    pluginData: {
                        resolveDir
                    }
                });
            })

            build.onLoad({ filter: /.*/, namespace: 'svg-ns' }, async ({ path, pluginData: { resolveDir }}) => {
                const source = await Deno.readTextFile(`${resolveDir}/${path}`);

                return ({
                    contents: tsx`
                        import { Component } from "https://deno.land/x/tano@0.0.1/lib/react.ts";

                        const render: Component = () => {
                            return (
                                ${source}
                            );
                        };
                        
                        export default render;
                    `,
                    resolveDir,
                    loader: 'tsx',
                });
            });
        },
    };
};
