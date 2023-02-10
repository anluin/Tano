import * as fs from "https://deno.land/std@0.170.0/fs/mod.ts";
import * as path from "https://deno.land/std@0.170.0/path/mod.ts";

import { resolveContentType } from "./content.ts";
import { Options } from "./serve.ts";


export type Cache = Record<string, Response>;

const cache: Cache = {};

export const buildCachedResponse = async (url: URL, request: Request, options: Options): Promise<Response | undefined> => {
    return cache[url.pathname]?.clone();
};

export const preloadFiles = async () => {
    const preloadCachePromises: Promise<unknown>[] = [];

    const preloadEntry = async (base: string, entry: fs.WalkEntry, headers?: Record<string, string>) => {
        const relativePath = `/${path.relative(base, entry.path)}`;
        const contentType = resolveContentType(relativePath);
        const body = await Deno.readFile(entry.path);

        cache[relativePath] = new Response(body, {
            headers: {
                ...(contentType && {
                    "Content-Type": contentType,
                }),
                ...headers,
            },
        });
    };

    for await(const entry of fs.walk(".build/frontend", { includeDirs: false })) {
        preloadCachePromises.push(preloadEntry(".build/frontend", entry));
    }

    for await(const entry of fs.walk("src/resources", { includeDirs: false })) {
        preloadCachePromises.push(preloadEntry("src/resources", entry, {
            "Cache-Control": "max-age=31536000",
        }));
    }

    await Promise.all(preloadCachePromises);

    console.log(`[INFO] ${preloadCachePromises.length} files preloaded`);
};
