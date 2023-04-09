import { createMagicPlugin, ImportMap } from "../esbuild/plugins/magic.ts";
import { esbuild, std } from "../deps.ts";
import { ts } from "../utils/format.ts";
import { Options } from "./mod.ts";


const normalizeImports = (importMap: ImportMap, filePath: string) =>
    Object.fromEntries(
        Object.entries({
            ...importMap?.imports,
        })
            .map(([ key, value ]) => {
                if (!std.path.isAbsolute(value) && !/https?:\/\//.test(value)) {
                    return [ key, `${std.path.resolve(std.path.dirname(filePath), value)}/` ];
                }

                return [ key, value ];
            })
    );

export const build = async (options: Options) => {
    const {
        workspaceDirectoryPath,
        assetsBuildDirectoryPath,
        injectionsBuildDirectoryPath,
        injectedImportMapFilePath,
        stylesheetInjectionFilePath,
        jsxInjectionFilePath,
        frontendSourceDirectoryPath,
        denoConfig,
        denoConfigFilePath,
        importMapFilePath,
        importMap,
        ssrBundleFilePath,
        mainFrontendSourceFilePath,
        mainBackendSourceFilePath,
        buildDirectoryPath,
    } = options;

    await Deno.mkdir(assetsBuildDirectoryPath, { recursive: true });
    await Deno.mkdir(injectionsBuildDirectoryPath, { recursive: true });

    const injectedImports: Record<string, string> = {};

    await Deno.writeTextFile(stylesheetInjectionFilePath, "");

    for await (const entry of std.fs.walk(frontendSourceDirectoryPath, { includeDirs: false, exts: [ ".css" ] })) {
        injectedImports[entry.path] = stylesheetInjectionFilePath;
    }

    const imports = {
        "@ssrBundleFile": ssrBundleFilePath,
        ...injectedImports,
        ...normalizeImports(denoConfig, denoConfigFilePath),
        ...normalizeImports(importMap, importMapFilePath),
    };

    await Deno.writeTextFile(injectedImportMapFilePath, JSON.stringify({
        imports,
    }, null, 4));

    await Deno.writeTextFile(jsxInjectionFilePath, ts`
        export {
            createElement as __createElement,
            fragmentSymbol as __fragmentSymbol,
        } from "https://deno.land/x/tano@0.0.18/lib/frontend/jsx.ts";
    `);

    await esbuild.build({
        outdir: assetsBuildDirectoryPath,
        format: "esm",
        bundle: true,
        treeShaking: true,
        sourcemap: true,
        splitting: true,
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
            mainFrontendSourceFilePath,
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
        outdir: buildDirectoryPath,
        format: "esm",
        bundle: true,
        treeShaking: true,
        sourcemap: false,
        splitting: false,
        minify: true,
        mangleProps: /^_/,
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
            mainFrontendSourceFilePath,
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

    await Deno.writeTextFile(ssrBundleFilePath, (
        `export const render=async({document,Document,HTMLDocument,Text,Comment,HTMLElement,SVGElement,DocumentFragment,location,navigator,fetch,console})=>{${(await Deno.readTextFile(ssrBundleFilePath)).trim()}};`
    ));

    if (options.check) {
        const check = async (scriptPath: string) => {
            const process = Deno.run({
                cmd: [ "deno", "check", "--config", denoConfigFilePath, "--importmap", injectedImportMapFilePath, scriptPath ],
                cwd: workspaceDirectoryPath,
            });

            const { success } = await process.status();

            if (!success) {
                throw new Error();
            }
        };

        await Promise.all([
            check(mainBackendSourceFilePath),
            check(mainFrontendSourceFilePath),
        ]);
    }
};
