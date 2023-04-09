import { Options } from "./mod.ts";


export const serve = async (options: Options) => {
    const {
        workspaceDirectoryPath,
        denoConfigFilePath,
        injectedImportMapFilePath,
        mainBackendSourceFilePath,
    } = options;

    const process = Deno.run({
        cmd: [ "deno", "run", "--config", denoConfigFilePath, "--check", "--importmap", injectedImportMapFilePath, "-A", mainBackendSourceFilePath, "--port", JSON.stringify(options.port) ],
        cwd: workspaceDirectoryPath,
    });

    const { success } = await process.status();

    if (!success) {
        throw new Error();
    }
};
