import { std } from "../deps.ts";

export interface Options {
    port: number,
}

export async function serve(workspaceDirectoryPath: string, options: Options) {
    const denoConfigFilePath = std.path.join(workspaceDirectoryPath, "deno.json");
    const sourceDirectoryPath = std.path.join(workspaceDirectoryPath, "src");
    const backendDirectoryPath = std.path.join(sourceDirectoryPath, "backend");
    const backendMainFilePath = std.path.join(backendDirectoryPath, "main.ts");

    const process = Deno.run({
        cmd: [ "deno", "run", "--config", denoConfigFilePath, "--check", "-A", backendMainFilePath, "--port", options.port ],
        cwd: workspaceDirectoryPath,
    });

    const { success } = await process.status();

    if (!success) {
        throw new Error();
    }
}
