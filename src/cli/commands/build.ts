import { createMagicPlugin, ImportMap } from "../esbuild/plugins/magic.ts";
import { esbuild, std } from "../deps.ts";
import { js, ts, tsx } from "../utils/format.ts";


export type DenoConfig = ImportMap & {};

export interface Options {
    check: boolean,
    minify: boolean,
}

export async function build(workspaceDirectoryPath: string, options: Options) {
    const denoConfigFilePath = std.path.join(workspaceDirectoryPath, "deno.json");
    const importMapFilePath = std.path.join(workspaceDirectoryPath, "importMap.json");

    const buildDirectoryPath = std.path.join(workspaceDirectoryPath, ".build");
    const assetsCSRBuildDirectoryPath = std.path.join(buildDirectoryPath, "assets/csr");
    const assetsSSRBuildDirectoryPath = std.path.join(buildDirectoryPath, "assets/ssr");
    const injectionsBuildDirectoryPath = std.path.join(buildDirectoryPath, "injections");
    const jsxInjectionFilePath = std.path.join(injectionsBuildDirectoryPath, "jsx.ts");
    const stylesheetInjectionFilePath = std.path.join(injectionsBuildDirectoryPath, "stylesheet.js");
    const importMapInjectionFilePath = std.path.join(injectionsBuildDirectoryPath, "importMap.json");

    const ssrBundleFilePath = std.path.resolve(assetsSSRBuildDirectoryPath, "bundle.js");

    const sourceDirectoryPath = std.path.join(workspaceDirectoryPath, "src");
    const sourceAssetsDirectoryPath = std.path.join(sourceDirectoryPath, "assets");

    const backendDirectoryPath = std.path.join(sourceDirectoryPath, "backend");
    const mainBackendFilePath = std.path.join(backendDirectoryPath, "main.ts");

    const frontendDirectoryPath = std.path.join(sourceDirectoryPath, "frontend");
    const mainFrontendFilePath = std.path.join(frontendDirectoryPath, "main.tsx");

    await Deno.mkdir(injectionsBuildDirectoryPath, { recursive: true });
    await Deno.mkdir(sourceAssetsDirectoryPath, { recursive: true });
    await Deno.mkdir(frontendDirectoryPath, { recursive: true });
    await Deno.mkdir(backendDirectoryPath, { recursive: true });

    await Deno.stat(mainFrontendFilePath)
        .catch(async () => {
            await Deno.writeTextFile(mainFrontendFilePath, tsx`
                import { render } from "https://deno.land/x/tano@0.0.17/lib/frontend/mod.ts";

                await render(
                    <html lang="en">
                        <head>
                            <title>Hello, world!</title>
                        </head>
                        <body>
                            Hello, world!
                        </body>
                    </html>
                );
            `);
        })

    await Deno.stat(mainBackendFilePath)
        .catch(async () => {
            await Deno.writeTextFile(mainBackendFilePath, ts`
                import { serve } from "https://deno.land/x/tano@0.0.17/lib/backend/mod.ts";

                await serve();
            `);
        })

    const injectedImports: Record<string, string> = {};

    for await (const entry of std.fs.walk(frontendDirectoryPath, { includeDirs: false, exts: [ ".css" ] })) {
        injectedImports[entry.path] = stylesheetInjectionFilePath;
    }

    await Deno.writeTextFile(stylesheetInjectionFilePath, "");

    const denoConfig: DenoConfig = await (
        Deno.readTextFile(denoConfigFilePath)
            .then(JSON.parse)
            .catch(async () => {
                const config = {
                    "compilerOptions": {
                        "lib": [
                            "deno.ns",
                            "dom",
                            "dom.iterable"
                        ]
                    },
                };

                await Deno.writeTextFile(denoConfigFilePath, JSON.stringify(config, null, 4));

                return config;
            })
    );

    const importMap: ImportMap = await (
        Deno.readTextFile(importMapFilePath)
            .then(JSON.parse)
            .catch(() => ({}))
    );

    const imports = {
        "@ssrBundleFile": ssrBundleFilePath,
        ...Object.fromEntries(
            Object.entries({
                ...injectedImports,
                ...denoConfig?.imports,
                ...importMap?.imports,
            })
                .map(([ key, value ]) => {
                    if (!std.path.isAbsolute(value) && !/https?:\/\//.test(value)) {
                        return [ key, `${std.path.resolve(std.path.dirname(denoConfigFilePath), value)}/` ];
                    }

                    return [ key, value ];
                })
        ),
    };

    await Deno.writeTextFile(importMapInjectionFilePath, JSON.stringify({
        imports,
    }, null, 4));

    const check = async (scriptPath: string) => {
        const process = Deno.run({
            cmd: [ "deno", "check", "--config", denoConfigFilePath, "--importmap", importMapInjectionFilePath, scriptPath ],
            cwd: workspaceDirectoryPath,
        });

        const { success } = await process.status();

        if (!success) {
            throw new Error();
        }
    };

    await Deno.remove(buildDirectoryPath)
        .catch(() => undefined);

    await Deno.mkdir(assetsCSRBuildDirectoryPath, { recursive: true });

    await Deno.writeTextFile(jsxInjectionFilePath, ts`
        export {
            createElement as __createElement,
            fragmentSymbol as __fragmentSymbol,
        } from "https://deno.land/x/tano@0.0.17/lib/frontend/jsx.ts";
    `);

    await esbuild.build({
        outdir: assetsCSRBuildDirectoryPath,
        format: "esm",
        bundle: true,
        treeShaking: true,
        sourcemap: true,
        splitting: false,
        ...options.minify ? {
            minify: true,
            mangleProps: /^_/,
        } : {},
        entryNames: "bundle",
        chunkNames: "bundle/[hash]",
        jsxFactory: "__createElement",
        jsxFragment: "__fragmentSymbol",
        plugins: [
            createMagicPlugin({
                imports,
            }),
        ],
        entryPoints: [
            mainFrontendFilePath,
        ],
        inject: [
            jsxInjectionFilePath,
        ],
        define: {
            "csr": "true",
            "ssr": "false",
        },
        external: [
            "*.jpg",
            "*.webp",
        ],
    });

    await esbuild.build({
        outdir: assetsSSRBuildDirectoryPath,
        format: "esm",
        bundle: true,
        treeShaking: true,
        sourcemap: false,
        splitting: false,
        entryNames: "bundle",
        chunkNames: "bundle/[hash]",
        jsxFactory: "__createElement",
        jsxFragment: "__fragmentSymbol",
        plugins: [
            createMagicPlugin({
                imports,
            }),
        ],
        entryPoints: [
            mainFrontendFilePath,
        ],
        inject: [
            jsxInjectionFilePath,
        ],
        define: {
            "csr": "false",
            "ssr": "true",
        },
        external: [
            "*.jpg",
            "*.webp",
        ],
    });

    esbuild.stop();

    await Deno.writeTextFile(ssrBundleFilePath, js`
        export const render = async ({
            document,
            Document,
            HTMLDocument,
            Text,
            Comment,
            HTMLElement,
            SVGElement,
            DocumentFragment,
            location,
            navigator,
            fetch,
            console,
        }) => {
            ${await Deno.readTextFile(ssrBundleFilePath)}
        };
    `);

    if (options.check) {
        await Promise.all([
            check(mainBackendFilePath),
            check(mainFrontendFilePath),
        ]);
    }
}
