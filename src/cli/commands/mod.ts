import { ImportMap } from "../esbuild/plugins/magic.ts";

import { build } from "./build.ts";
import { serve } from "./serve.ts";
import { setup } from "./setup.ts";


export interface Options {
    workspaceDirectoryPath: string,
    buildDirectoryPath: string,
    assetsBuildDirectoryPath: string,
    injectionsBuildDirectoryPath: string,
    injectedImportMapFilePath: string,
    stylesheetInjectionFilePath: string,
    jsxInjectionFilePath: string,
    sourceDirectoryPath: string,
    frontendSourceDirectoryPath: string,
    mainFrontendSourceFilePath: string,
    backendSourceDirectoryPath: string,
    mainBackendSourceFilePath: string,
    sharedSourceDirectoryPath: string,
    apiSharedSourceFilePath: string,
    denoConfigFilePath: string,
    importMapFilePath: string,
    ssrBundleFilePath: string,
    denoConfig: ImportMap & { importMap?: string },
    importMap: ImportMap,
    check: boolean,
    minify: boolean,
    port: number,
}

export const commands = {
    build,
    serve,
    setup,
} as const;
