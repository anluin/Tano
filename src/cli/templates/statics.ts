import { ts } from "../utils/formatting.ts";
import { Workspace } from "../main.ts";


export const staticsTemplate = ({ statics }: Workspace) => {
    type TransformedStaticFile = {
        relativePath: string,
        contentType: string,
        pattern: string,
    };

    const staticsDictionary = statics
        .reduce<TransformedStaticFile[]>((carry, { relativePath, contentType, patterns }) =>
            [ ...carry, ...patterns.map(pattern => ({ relativePath, contentType, pattern })) ], [])
        .map(({ relativePath, contentType, pattern }) =>
            `${"    ".repeat(3)}["${pattern}"]: { contentType: "${contentType}", fetch: fetchStaticFile("${relativePath}")},`
        ).sort().join(`\n`);

    return ts`
        /* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
         *  This file is generated automatically, changes will be overwritten! *
         * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

        import { StaticFile } from "https://deno.land/x/tano@0.0.2/src/lib/server.ts";


        const cache: Record<string, Uint8Array> = {};

        const fetchStaticFile = (path: string): () =>
            Promise<Uint8Array> =>
            async () => cache[path] ??= await Deno.readFile(path);

        export const statics: Record<string, StaticFile> = {\n${staticsDictionary}\n};
    `;
};
