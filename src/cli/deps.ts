import * as flags from "https://deno.land/std@0.182.0/flags/mod.ts";
import * as path from "https://deno.land/std@0.182.0/path/mod.ts";
import * as fs from "https://deno.land/std@0.182.0/fs/mod.ts";


export * as esbuild from "https://deno.land/x/esbuild@v0.17.15/mod.js";
export * as cache from "https://deno.land/x/cache/mod.ts";

export const std = {
    flags,
    path,
    fs,
} as const;
