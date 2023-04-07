import { esbuild, std } from "../../deps.ts";


export type ImportMap = {
    imports?: Record<string, string>,
};

export const createMagicPlugin = (importMap?: ImportMap): esbuild.Plugin => ({
    name: "MagicPlugin",
    setup(build: esbuild.PluginBuild) {
        const imports = importMap?.imports ?? {};

        build.onResolve({ filter: /.*?/ }, async (args) => {
            for (const alias in imports) {
                if (args.path.startsWith(alias)) {
                    const relativePath = imports[alias] + args.path.slice(alias.length);

                    return {
                        path: std.path.resolve(relativePath),
                    };
                }
            }

            return undefined;
        });
    },
} as const);
