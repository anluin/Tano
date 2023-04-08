import { std } from "../deps.ts";

export interface Options {
    port: number,
}

export async function serve(workspaceDirectoryPath: string, options: Options) {
    const denoConfigFilePath = std.path.join(workspaceDirectoryPath, "deno.json");
    const sourceDirectoryPath = std.path.join(workspaceDirectoryPath, "src");
    const backendDirectoryPath = std.path.join(sourceDirectoryPath, "backend");
    const backendMainFilePath = std.path.join(backendDirectoryPath, "main.ts");

    const buildDirectoryPath = std.path.join(workspaceDirectoryPath, ".build");
    const injectionsBuildDirectoryPath = std.path.join(buildDirectoryPath, "injections");
    const importMapInjectionFilePath = std.path.join(injectionsBuildDirectoryPath, "importMap.json");

    const process = Deno.run({
        cmd: [ "deno", "run", "--config", denoConfigFilePath, "--check", "--importmap", importMapInjectionFilePath, "-A", backendMainFilePath, "--port", options.port ],
        cwd: workspaceDirectoryPath,
    });

    const { success } = await process.status();

    if (!success) {
        throw new Error();
    }
}
