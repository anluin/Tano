import { createMagicPlugin, ImportMap } from "../esbuild/plugins/magic.ts";
import { esbuild, std } from "../deps.ts";
import { ts } from "../utils/format.ts";


export type DenoConfig = ImportMap & {};

export interface Options {
    check: boolean,
    minify: boolean,
}

export async function build(workspaceDirectoryPath: string, options: Options) {
    const denoConfigFilePath = std.path.join(workspaceDirectoryPath, "deno.json");
    const importMapFilePath = std.path.join(workspaceDirectoryPath, "importMap.json");

    const buildDirectoryPath = std.path.join(workspaceDirectoryPath, ".build");
    const assetsBuildDirectoryPath = std.path.join(buildDirectoryPath, "assets");
    const injectionsBuildDirectoryPath = std.path.join(buildDirectoryPath, "injections");
    const jsxInjectionFilePath = std.path.join(injectionsBuildDirectoryPath, "jsx.ts");
    const stylesheetInjectionFilePath = std.path.join(injectionsBuildDirectoryPath, "stylesheet.js");
    const importMapInjectionFilePath = std.path.join(injectionsBuildDirectoryPath, "importMap.json");

    const sourceDirectoryPath = std.path.join(workspaceDirectoryPath, "src");

    const backendDirectoryPath = std.path.join(sourceDirectoryPath, "backend");
    const mainBackendFilePath = std.path.join(backendDirectoryPath, "main.ts");

    const frontendDirectoryPath = std.path.join(sourceDirectoryPath, "frontend");
    const mainFrontendFilePath = std.path.join(frontendDirectoryPath, "main.tsx");

    await Deno.mkdir(injectionsBuildDirectoryPath, { recursive: true });

    const injectedImports: Record<string, string> = {};

    for await (const entry of std.fs.walk(frontendDirectoryPath, { includeDirs: false, exts: [ ".css" ] })) {
        injectedImports[entry.path] = stylesheetInjectionFilePath;
    }

    await Deno.writeTextFile(stylesheetInjectionFilePath, "");

    await Deno.writeTextFile(importMapInjectionFilePath, JSON.stringify({
        imports: injectedImports,
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

    if (options.check) {
        await Promise.all([
            check(mainBackendFilePath),
            check(mainFrontendFilePath),
        ]);
    }

    const denoConfig: DenoConfig = await (
        Deno.readTextFile(denoConfigFilePath)
            .then(JSON.parse)
            .catch(() => ({}))
    );

    const importMap: ImportMap = await (
        Deno.readTextFile(importMapFilePath)
            .then(JSON.parse)
            .catch(() => ({}))
    );

    await Deno.remove(buildDirectoryPath)
        .catch(() => undefined);

    await Deno.mkdir(assetsBuildDirectoryPath, { recursive: true });

    await Deno.writeTextFile(jsxInjectionFilePath, ts`
        export {
            createElement as __createElement,
            fragmentSymbol as __fragmentSymbol,
        } from "@tano/frontend/jsx.ts";
    `);

    await esbuild.build({
        outdir: assetsBuildDirectoryPath,
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
                imports: {
                    ...denoConfig.imports,
                    ...importMap.imports,
                },
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

    esbuild.stop();
}
