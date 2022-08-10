import { ts } from "./formatting.ts";


export const patchAsyncHooks = async (path: string, name: string, globals: string[]) => {
    const rendererSource = await Deno.readTextFile(path);

    const regex = /import([^;])*;/gms;
    const subst = ``;

    let m;

    const imports: string[] = [];

    while ((m = regex.exec(rendererSource)) !== null) {
        if (m.index === regex.lastIndex) {
            regex.lastIndex++;
        }

        imports.push(m[0]);
    }

    await Deno.writeTextFile(path, (
        ts`
            ${imports.join("")}
            export const ${name} = async ({ ${globals.join()} }) => {
                ${rendererSource.replace(regex, subst).trim()}
            };
        `
    ));
};
