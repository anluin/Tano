import { std } from "./deps.ts";

import { commands, Options } from "./commands/mod.ts";
import { ImportMap } from "./esbuild/plugins/magic.ts";


const {
    _: [ command ],
    "--": passArgs,
    workspace: rawWorkspacePath,
    ...args
} = (
    std.flags.parse(Deno.args, {
        string: [
            "workspace",
            "port",
            "config",
            "importmap",
        ],
        boolean: [
            "check",
            "minify",
        ],
        default: {
            workspace: Deno.cwd(),
            check: true,
            minify: true,
            port: "4500",
            config: "deno.json",
            importmap: "importMap.json",

        },
        '--': true,
    })
);

try {
    const { check, minify, port: rawPort, config, importmap } = args;

    const port = Number.parseInt(rawPort);

    const workspaceDirectoryPath = std.path.resolve(rawWorkspacePath);
    const denoConfigFilePath = std.path.join(workspaceDirectoryPath, config);

    const denoConfig: ImportMap & {
        importMap?: string,
    } = await (
        Deno.readTextFile(denoConfigFilePath)
            .then(JSON.parse)
            .catch(() => ({}))
    );

    const importMapFilePath = std.path.join(workspaceDirectoryPath, denoConfig.importMap ?? importmap);

    const importMap: ImportMap = await (
        Deno.readTextFile(importMapFilePath)
            .then(JSON.parse)
            .catch(() => ({}))
    );

    const buildDirectoryPath = std.path.join(workspaceDirectoryPath, ".build");
    const assetsBuildDirectoryPath = std.path.join(buildDirectoryPath, "assets");
    const injectionsBuildDirectoryPath = std.path.join(buildDirectoryPath, "injections");
    const injectedImportMapFilePath = std.path.join(buildDirectoryPath, "importMap.json");
    const stylesheetInjectionFilePath = std.path.join(injectionsBuildDirectoryPath, "css.js");
    const jsxInjectionFilePath = std.path.join(injectionsBuildDirectoryPath, "jsx.ts");
    const ssrBundleFilePath = std.path.join(buildDirectoryPath, "bundle.js");

    const sourceDirectoryPath = std.path.join(workspaceDirectoryPath, "src");
    const frontendSourceDirectoryPath = std.path.join(sourceDirectoryPath, "frontend");
    const mainFrontendSourceFilePath = std.path.join(frontendSourceDirectoryPath, "main.tsx");
    const backendSourceDirectoryPath = std.path.join(sourceDirectoryPath, "backend");
    const mainBackendSourceFilePath = std.path.join(backendSourceDirectoryPath, "main.ts");
    const sharedSourceDirectoryPath = std.path.join(sourceDirectoryPath, "shared");
    const apiSharedSourceFilePath = std.path.join(sharedSourceDirectoryPath, "api.ts");

    const options: Options = {
        workspaceDirectoryPath,
        sourceDirectoryPath,
        buildDirectoryPath,
        assetsBuildDirectoryPath,
        injectionsBuildDirectoryPath,
        injectedImportMapFilePath,
        ssrBundleFilePath,
        stylesheetInjectionFilePath,
        jsxInjectionFilePath,
        frontendSourceDirectoryPath,
        mainFrontendSourceFilePath,
        backendSourceDirectoryPath,
        mainBackendSourceFilePath,
        sharedSourceDirectoryPath,
        apiSharedSourceFilePath,
        denoConfigFilePath,
        importMapFilePath,
        denoConfig,
        importMap,
        check,
        minify,
        port,
    };

    switch (command) {
        case "setup":
            await commands.setup(options);

            break;
        case "build":
            await commands.setup(options);
            await commands.build(options);

            break;
        case "serve":
            const port = Number.parseInt(rawPort);

            await commands.setup(options);
            await commands.build(options);
            await commands.serve(options);

            break;
        default:
            throw new Error(`unrecognized subcommand ${JSON.stringify(command)}\n\nUsage: tano [OPTIONS] [COMMAND]\n\nFor more information, try '--help'`);
    }
} catch (error) {
    const message = error instanceof Error ? error.message : `${error}`;

    if (message) {
        console.error("%c[ERROR]", "color: red;", message);
    }

    Deno.exit(0);
}
