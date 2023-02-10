import * as path from "https://deno.land/std@0.171.0/path/mod.ts";

import { ts } from "./formatting.ts";


export const buildDataInjectionFile = async (injectionFilePath: string) => {
    const injectionDirectoryPath = path.dirname(injectionFilePath);

    await Deno.mkdir(injectionDirectoryPath, { recursive: true })
        .catch(console.error);

    await Deno.writeTextFile(injectionFilePath, ts`
        export const injectedData = {
            ...((rawInjectedData) =>
                    ({ ...rawInjectedData && JSON.parse(rawInjectedData) })
            )(
                document.querySelector(\`script[src="/bundle.js"]\`)
                    ?.textContent
            )
        };
    `);
};
