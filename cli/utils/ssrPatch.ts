import { ts } from "./formatting.ts";

export const ssrPatch = async (path: string, name: string, globals: string[]) => {
    const source = await Deno.readTextFile(path);

    await Deno.writeTextFile(path, (
        ts`
            export const ${name} = async ({ ${globals.join()} }) => {
                ${source}
            };
        `
    ));
};
