import { extname } from "https://deno.land/std@0.150.0/path/mod.ts";


export const mimeTypes: Record<string, string> = {
    ".ico": "image/x-icon",
    ".css": "text/css;charset=utf-8",
    ".js": "application/javascript;charset=utf-8",
    ".js.map": "application/json;charset=utf-8",
    ".json": "application/json;charset=utf-8",
    ".txt": "text/plain;charset=utf-8",
    ".ttf": "application/x-font-ttf",
    ".png": "image/png",
    ".svg": "image/svg+xml",
};

export const getMimeType = (path: string): string =>
    mimeTypes[extname(path)] ?? "application/octet-stream";
