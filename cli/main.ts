import * as esbuild from "https://deno.land/x/esbuild@v0.14.53/mod.js";

import { join, resolve } from "https://deno.land/std@0.152.0/path/mod.ts";

import { patchAsyncHooks } from "./utils/asyncHooks.ts";
import { ts } from "./utils/formatting.ts";
import { magicPlugin } from "./esbuild/plugins/magic.ts";
import { renderEndpoints } from "./templates/endpoints.ts";
import { findRoutes } from "./utils/routes.ts";
import { renderRoutes } from "./templates/routes.ts";


const workspaceDirectoryPath = resolve(Deno.args[0] ?? Deno.cwd());
const buildDirectoryPath = join(workspaceDirectoryPath, "/build/");
const configDirectoryPath = join(workspaceDirectoryPath, "/config/");
const backendDirectoryPath = join(workspaceDirectoryPath, "/src/backend");
const frontendDirectoryPath = join(workspaceDirectoryPath, "/src/frontend");
const routesDirectoryPath = join(frontendDirectoryPath, "/routes");
const csrBundleDirectoryPath = join(buildDirectoryPath, "/csr");
const routesFilePath = join(buildDirectoryPath, "/routes.ts");
const ssrFilePath = join(buildDirectoryPath, "/ssr.js");
const endpointsFilePath = join(buildDirectoryPath, "/endpoints.ts");
const mainBackendFilePath = join(backendDirectoryPath, "/main.ts")
const mainFrontendFilePath = join(frontendDirectoryPath, "/main.tsx")
const tanoConfigFilePath = join(configDirectoryPath, "/tano.json");
const denoConfigFilePath = join(configDirectoryPath, "/deno.json");
const importMapFilePath = join(configDirectoryPath, "/imports.json");

const injectFilePath = join(await Deno.makeTempFile({ suffix: ".ts" }));

type Config = {
    esbuild?: {
        splitting?: boolean,
    },
};

const config: Config = (
    await Deno.readTextFile(tanoConfigFilePath)
        .then(JSON.parse)
        .catch(() => ({}))
);

await Deno.mkdir(buildDirectoryPath, { recursive: true });
await Deno.remove(csrBundleDirectoryPath, { recursive: true }).catch(() => 0);

try {
    await Deno.writeTextFile(routesFilePath, renderRoutes({
        routes: await findRoutes({ routesDirectoryPath }),
        routesDirectoryPath,
        splitting: config.esbuild?.splitting ?? false,
    }));
} catch (_) {
    // nothing to do here
}

await Deno.writeTextFile(injectFilePath, ts`
    export { createElement, fragmentType } from "https://deno.land/x/tano@0.0.3/lib/frontend/mod.ts";
`);

const endpoints: Record<string, string[]> = {};

await esbuild.build({
    plugins: [
        await magicPlugin({ importMapFilePath, backendDirectoryPath, endpoints }),
    ],
    entryPoints: [ mainFrontendFilePath ],
    outdir: buildDirectoryPath,
    bundle: true,
    format: "esm",
    sourcemap: false,
    splitting: false,
    treeShaking: true,
    minify: true,
    entryNames: "ssr",
    chunkNames: "ssr/[hash]",
    jsxFactory: "createElement",
    jsxFragment: "fragmentType",
    inject: [
        injectFilePath,
    ],
    define: {
        "csr": "false",
        "ssr": "true",
    },
});

await Deno.writeTextFile(endpointsFilePath, renderEndpoints({ endpoints }));

await patchAsyncHooks(ssrFilePath, "render", [
    "injectedData",
    "ssrSignalInjection",
    "location",
    "fetch",
    "document",
    "Text",
    "HTMLElement",
    "DocumentFragment",
]);

await esbuild.build({
    plugins: [
        await magicPlugin({ importMapFilePath, backendDirectoryPath }),
    ],
    entryPoints: [ mainFrontendFilePath ],
    outdir: buildDirectoryPath,
    bundle: true,
    format: "esm",
    sourcemap: true,
    splitting: config.esbuild?.splitting ?? false,
    treeShaking: true,
    minify: true,
    entryNames: "csr",
    chunkNames: "csr/[hash]",
    jsxFactory: "createElement",
    jsxFragment: "fragmentType",
    inject: [
        injectFilePath,
    ],
    define: {
        "csr": "true",
        "ssr": "false",
    },
});

esbuild.stop();

const process = Deno.run({
    cwd: workspaceDirectoryPath,
    cmd: [ "deno", "run", "--check", "--allow-net", "--allow-read=./", "--allow-write=./", `--config=${denoConfigFilePath}`, mainBackendFilePath ],
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
});

await process.status();
