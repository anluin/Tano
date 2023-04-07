import { std } from "./deps.ts";

import { commands } from "./commands/mod.ts";


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
        ],
        boolean: [
            "check",
            "minify",
        ],
        default: {
            workspace: Deno.cwd(),
            check: false,
            minify: true,
            port: "4500",
        },
        '--': true,
    })
);

try {
    const workspacePath = std.path.resolve(rawWorkspacePath);
    const { check, minify, port: rawPort } = args;

    switch (command) {
        case "build":
            await commands.build(workspacePath, { check, minify });

            break;
        case "serve":
            const port = Number.parseInt(rawPort);

            await commands.build(workspacePath, { check, minify });
            await commands.serve(workspacePath, { port });

            break;
        default:
            throw new Error(`unknown command: ${JSON.stringify(command)}`);
    }
} catch (error) {
    const message = error instanceof Error ? error.message : `${error}`;

    if (message) {
        console.error("%c[ERROR]", "color: red;", message);
    }

    Deno.exit(0);
}
