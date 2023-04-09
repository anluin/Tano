import { cache, esbuild, std } from "../../deps.ts";


export type ImportMap = {
    imports?: Record<string, string>,
};

export const createMagicPlugin = (importMap?: ImportMap): esbuild.Plugin => ({
    name: "MagicPlugin",
    setup(build: esbuild.PluginBuild) {
        const imports = importMap?.imports ?? {};

        const dirname = (fileName: string) => {
            if (/https?:\/\//.test(fileName)) {
                const url = new URL(fileName);
                url.pathname = std.path.dirname(url.pathname);
                return url.href;
            }

            return std.path.dirname(fileName);
        };

        const resolve = (fileName: string, directoryName: string) => {
            for (const key in imports) {
                const alias = imports[key];

                if (fileName.startsWith(key)) {
                    fileName = fileName.replace(key, alias);
                    break;
                }
            }

            if (/https?:\/\//.test(directoryName)) {
                const url = new URL(directoryName);
                url.pathname = std.path.join(url.pathname, fileName);
                return url.href;
            }

            if (/https?:\/\//.test(fileName)) {
                return fileName;
            }

            if (std.path.isAbsolute(fileName)) {
                return fileName;
            } else {
                return std.path.resolve(directoryName, fileName);
            }
        };

        build.onResolve({ filter: /.*?/ }, async (args) => {
            if (args.path.endsWith(".webp")) return undefined;

            const resolveDir = args.resolveDir || dirname(args.importer);
            const resolvedPath = resolve(args.path, resolveDir);

            if (/https?:\/\//.test(resolvedPath)) {
                return {
                    path: resolvedPath,
                    namespace: "magic",
                };
            }

            return {
                path: resolvedPath,
            };
        });

        build.onLoad({ filter: /.*/, namespace: 'magic' }, async (args) => {
            const file = await cache.cache(args.path, undefined, 'deps');
            const contents = await Deno.readTextFile(file.path);
            const ext = file.meta.url.split('.').pop()!;
            const loader = (ext?.match(/"j|tsx?$/) ? ext : 'js') as esbuild.Loader;

            return { contents, loader };
        });
    },
});
