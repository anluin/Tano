import { fileExtension2MimeType } from "./mimeTypes.ts";
import { Middleware } from "./serve.ts";
import { std } from "../deps.ts";


const assets: Record<string, Response> = {};

export const preloadAssets = async (directoryPath: string) => {
    for await (const entry of std.fs.walk(directoryPath, { includeDirs: false })) {
        const pathname = std.path.relative(directoryPath, entry.path);
        const fileExtension = std.path.extname(pathname);
        const mimeType = fileExtension2MimeType[fileExtension];

        const file = await Deno.open(entry.path);

        assets[`/${pathname}`] = new Response(file.readable, {
            headers: {
                ...mimeType && ({
                    "Content-Type": mimeType,
                }),
            },
        });
    }
};

export const buildAssetResponse: Middleware = async ({ url }) =>
    assets[url.pathname]?.clone()
