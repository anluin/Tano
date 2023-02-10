import * as path from "https://deno.land/std@0.171.0/path/mod.ts";

import * as esbuild from "https://deno.land/x/esbuild@v0.16.16/mod.js";

import { buildRoutesInjectionFile } from "./routing.ts";
import { patchBundle } from "./patch.ts";
import { Plugin } from "./plugin.ts";
import { buildDataInjectionFile } from "./data.ts";


const workspaceDirectoryPath = path.resolve(Deno.args[0] ?? Deno.cwd());

const buildDirectoryPath = path.join(workspaceDirectoryPath, ".build");

const backendBuildDirectoryPath = path.join(buildDirectoryPath, "backend");
const frontendBuildDirectoryPath = path.join(buildDirectoryPath, "frontend");
const injectionBuildDirectoryPath = path.join(buildDirectoryPath, "injection");
const routesInjectionBuildFilePath = path.join(injectionBuildDirectoryPath, "routes.ts");
const dataInjectionBuildFilePath = path.join(injectionBuildDirectoryPath, "data.ts");

const srcDirectoryPath = path.join(workspaceDirectoryPath, "src");

const backendSrcDirectoryPath = path.join(srcDirectoryPath, "backend");
const frontendSrcDirectoryPath = path.join(srcDirectoryPath, "frontend");

const backendBundleFilePath = path.join(backendBuildDirectoryPath, "bundle.js");
const frontendMainSrcFilePath = path.join(frontendSrcDirectoryPath, "main.tsx");
const serviceWorkerMainSrcFilePath = path.join(frontendSrcDirectoryPath, "serviceWorker.ts");
const frontendRoutesSrcDirectoryPath = path.join(frontendSrcDirectoryPath, "routes");

const frontendInjectionFilePath = path.resolve(new URL('.', import.meta.url).pathname, "../lib/frontend/injection.ts");

const denoConfigFilePath = path.join(workspaceDirectoryPath, "deno.json");

const denoConfig: {
    importMap?: string,
    bundlerOptions?: {
        splitting?: boolean,
        minify?: boolean,
        showHelperNodes?: boolean,
    },
} = await (
    Deno.readTextFile(denoConfigFilePath)
        .then(JSON.parse)
        .catch(() => ({}))
);

const importMapFilePath = path.resolve(
    path.dirname(denoConfigFilePath),
    denoConfig.importMap ?? "deno.json",
);

await Deno.remove(buildDirectoryPath, { recursive: true })
    .catch(() => {
    });

await Deno.mkdir(buildDirectoryPath, { recursive: true })
    .catch(() => {
    });

await buildRoutesInjectionFile(
    frontendRoutesSrcDirectoryPath,
    routesInjectionBuildFilePath,
);

await buildDataInjectionFile(
    dataInjectionBuildFilePath
);

const showHelperNodes = (
    denoConfig.bundlerOptions?.showHelperNodes
        ? "true"
        : "false"
);

await esbuild.build({
    outdir: frontendBuildDirectoryPath,
    format: "esm",
    bundle: true,
    sourcemap: true,
    treeShaking: true,
    splitting: !!denoConfig.bundlerOptions?.splitting,
    ...denoConfig.bundlerOptions?.minify ? {
        minify: true,
        mangleProps: /^__/,
    } : {},
    entryNames: "bundle",
    chunkNames: "bundle/[hash]",
    jsxFactory: "__createElement",
    jsxFragment: "__fragmentType",
    plugins: [
        await Plugin(importMapFilePath, backendSrcDirectoryPath),
    ],
    entryPoints: [
        frontendMainSrcFilePath,
    ],
    inject: [
        frontendInjectionFilePath,
        dataInjectionBuildFilePath,
        routesInjectionBuildFilePath,
    ],
    define: {
        "csr": "true",
        "ssr": "false",
        showHelperNodes,
    },
    external: [],
});

await esbuild.build({
    outdir: frontendBuildDirectoryPath,
    format: "esm",
    bundle: true,
    sourcemap: true,
    treeShaking: true,
    splitting: !!denoConfig.bundlerOptions?.splitting,
    ...denoConfig.bundlerOptions?.minify ? {
        minify: true,
        mangleProps: /^__/,
    } : {},
    entryNames: "serviceWorker",
    chunkNames: "serviceWorker/[hash]",
    jsxFactory: "__createElement",
    jsxFragment: "__fragmentType",
    plugins: [
        await Plugin(importMapFilePath, backendSrcDirectoryPath),
    ],
    entryPoints: [
        serviceWorkerMainSrcFilePath,
    ],
    inject: [],
    define: {
        "csr": "true",
        "ssr": "false",
        showHelperNodes,
    },
    external: [],
});

await esbuild.build({
    outdir: backendBuildDirectoryPath,
    format: "esm",
    bundle: true,
    sourcemap: false,
    treeShaking: true,
    splitting: false,
    ...denoConfig.bundlerOptions?.minify ? {
        minify: true,
        mangleProps: /^__/,
    } : {},
    entryNames: "bundle",
    chunkNames: "bundle/[hash]",
    jsxFactory: "__createElement",
    jsxFragment: "__fragmentType",
    plugins: [
        await Plugin(importMapFilePath, backendSrcDirectoryPath),
    ],
    entryPoints: [
        frontendMainSrcFilePath,
    ],
    inject: [
        frontendInjectionFilePath,
        routesInjectionBuildFilePath,
    ],
    define: {
        "csr": "false",
        "ssr": "true",
        showHelperNodes,
    },
    external: [],
});

await patchBundle(backendBundleFilePath, [
    "injectedData",
    "document",
    "Document",
    "HTMLDocument",
    "Text",
    "Comment",
    "HTMLElement",
    "SVGElement",
    "DocumentFragment",
    "location",
    "navigator",
    "fetch",
]);

await esbuild.stop();
