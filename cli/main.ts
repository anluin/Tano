import * as esbuild from "https://deno.land/x/esbuild@v0.15.16/mod.js";
import { join, relative, resolve } from "https://deno.land/std@0.153.0/path/mod.ts";
import { walk } from "https://deno.land/std@0.153.0/fs/walk.ts";

import { renderFrontendInjection } from "./templates/injections/frontendInjection.ts";
import { renderServiceWorkerInjection } from "./templates/injections/serviceWorkerInjection.ts";
import { renderEndpoints } from "./templates/endpoints.ts";
import { ssrPatch } from "./utils/ssrPatch.ts";
import { magicPlugin } from "./esbuild/magic.ts";


const workspaceDirectoryPath = resolve(Deno.args[0] ?? Deno.cwd());
const buildDirectoryPath = join(workspaceDirectoryPath, ".build");
const dataDirectoryPath = join(workspaceDirectoryPath, ".data");
const backendBuildDirectoryPath = join(buildDirectoryPath, "backend");
const frontendBuildDirectoryPath = join(buildDirectoryPath, "frontend");
const injectionBuildDirectoryPath = join(buildDirectoryPath, "injection");
const configDirectoryPath = join(workspaceDirectoryPath, "config");
const sourceDirectoryPath = join(workspaceDirectoryPath, "src");
const resourcesDirectoryPath = join(sourceDirectoryPath, "resources");
const frontendDirectoryPath = join(sourceDirectoryPath, "frontend");
const backendDirectoryPath = join(sourceDirectoryPath, "backend");
const backendBundleFilePath = join(backendBuildDirectoryPath, "bundle.js");
const frontendInjectionFilePath = join(injectionBuildDirectoryPath, "frontend.ts");
const serviceWorkerInjectionFilePath = join(injectionBuildDirectoryPath, "serviceWorker.ts");
const endpointsFilePath = join(backendBuildDirectoryPath, "endpoints.ts");
const backendMainPath = join(backendDirectoryPath, "main.ts");
const frontendMainPath = join(frontendDirectoryPath, "main.tsx");
const frontendServiceWorkerPath = join(frontendDirectoryPath, "serviceWorker.ts");
const frontendRoutesPath = join(frontendDirectoryPath, "routes");
const denoConfigFilePath = join(configDirectoryPath, "deno.json");
const tanoConfigFilePath = join(configDirectoryPath, "tano.json");


const denoConfig: {
    importMap?: string,
} = await Deno.readTextFile(denoConfigFilePath)
    .then(JSON.parse)
    .catch(() => ({}));

const tanoConfig: {
    port?: number,
    splitting?: boolean,
    minify?: boolean,
} = await Deno.readTextFile(tanoConfigFilePath)
    .then(JSON.parse)
    .catch(() => ({}));

const importMapFilePath = resolve(configDirectoryPath, denoConfig.importMap ?? "imports.json");

const routes: Record<string, string> = {};

await Deno.remove(buildDirectoryPath, { recursive: true }).catch(() => undefined);

await Deno.mkdir(buildDirectoryPath, { recursive: true });
await Deno.mkdir(injectionBuildDirectoryPath, { recursive: true }).catch();
await Deno.mkdir(frontendBuildDirectoryPath, { recursive: true }).catch();
await Deno.mkdir(backendBuildDirectoryPath, { recursive: true }).catch();


const buildUUID = crypto.randomUUID();

for await(const { path } of walk(frontendRoutesPath, { includeDirs: false, exts: [ "tsx" ] })) {
    const relativePath = `/${relative(frontendRoutesPath, path)}`;
    const isIndexFile = relativePath.endsWith("/index.tsx");
    const extensionIndex = relativePath.lastIndexOf(".tsx");

    for (const routerPath of (
        isIndexFile ? [
            relativePath.slice(0, extensionIndex - 5),
            relativePath.slice(0, extensionIndex - 6),
        ] : [
            relativePath.slice(0, extensionIndex),
        ]
    )) {
        routerPath in routes || (
            routerPath.length > 0 && (
                routes[routerPath] = relativePath
            )
        );
    }
}

await Deno.writeTextFile(serviceWorkerInjectionFilePath, renderServiceWorkerInjection());
await Deno.writeTextFile(frontendInjectionFilePath, renderFrontendInjection({
    routes,
}));

const endpoints: Record<string, string[]> = {};
const sockets: Record<string, string[]> = {};

await esbuild.build({
    outdir: frontendBuildDirectoryPath,
    format: "esm",
    bundle: true,
    sourcemap: true,
    splitting: false,
    treeShaking: true,
    ...tanoConfig.minify && {
        minify: true,
        mangleProps: /^__/,
    },
    entryNames: "serviceWorker",
    chunkNames: "serviceWorker/[hash]",
    plugins: [
        await magicPlugin({
            importMapFilePath,
            backendDirectoryPath,
            endpoints,
        }),
    ],
    entryPoints: [
        frontendServiceWorkerPath,
    ],
    inject: [
        serviceWorkerInjectionFilePath,
    ],
    define: {
        "csr": "false",
        "ssr": "false",
        "buildUUID": JSON.stringify(buildUUID),
    },
    external: [],
});

await esbuild.build({
    outdir: frontendBuildDirectoryPath,
    format: "esm",
    bundle: true,
    sourcemap: true,
    splitting: tanoConfig.splitting,
    treeShaking: true,
    ...tanoConfig.minify && {
        minify: true,
        mangleProps: /^__/,
    },
    entryNames: "bundle",
    chunkNames: "bundle/[hash]",
    jsxFactory: "__createElement",
    jsxFragment: "__fragmentType",
    plugins: [
        await magicPlugin({
            importMapFilePath,
            backendDirectoryPath,
            endpoints,
            sockets,
        }),
    ],
    entryPoints: [
        frontendMainPath,
    ],
    inject: [
        frontendInjectionFilePath,
    ],
    define: {
        "csr": "true",
        "ssr": "false",
        "buildUUID": JSON.stringify(buildUUID),
    },
    external: [],
});

await Deno.writeTextFile(endpointsFilePath, renderEndpoints({ endpoints, sockets, buildUUID }));

await esbuild.build({
    outdir: backendBuildDirectoryPath,
    format: "esm",
    bundle: true,
    sourcemap: false,
    splitting: false,
    treeShaking: true,
    ...tanoConfig.minify && {
        minify: true,
        mangleProps: /^__/,
    },
    entryNames: "bundle",
    chunkNames: "bundle/[hash]",
    jsxFactory: "__createElement",
    jsxFragment: "__fragmentType",
    plugins: [
        await magicPlugin({
            importMapFilePath,
            backendDirectoryPath,
            endpoints,
            sockets,
        }),
    ],
    entryPoints: [
        frontendMainPath,
    ],
    inject: [
        frontendInjectionFilePath,
    ],
    define: {
        "csr": "false",
        "ssr": "true",
        "buildUUID": JSON.stringify(buildUUID),
    },
    external: [],
});

await ssrPatch(backendBundleFilePath, "render", [
    "location",
    "document",
    "Document",
    "Text",
    "SVGElement",
    "HTMLElement",
    "DocumentFragment",
    "Comment",
    "fetch",
    "navigator",
    "__injectedData",
    "__promises",
]);

esbuild.stop();

const process = Deno.run({
    cwd: workspaceDirectoryPath,
    cmd: [
        `deno`,
        `run`,
        `--check`,
        `--unstable`,
        `--allow-ffi`,
        `--config=${denoConfigFilePath}`,
        `--allow-read=.,${dataDirectoryPath},${resourcesDirectoryPath},${frontendBuildDirectoryPath}`,
        `--allow-write=${dataDirectoryPath}`,
        `--allow-net=0.0.0.0:${tanoConfig.port ?? 4500},deno.land`,
        `--allow-env=tano_PORT,DENO_SQLITE_PATH`,
        backendMainPath,
    ],
    env: {
        "tano_PORT": `${tanoConfig.port ?? 4500}`,
        "DENO_SQLITE_PATH": resolve(Deno.env.get("DENO_SQLITE_PATH") ?? ""),
    },
});

await process.status();
await process.close();
