import { toFileUrl } from "https://deno.land/std@0.152.0/path/mod.ts";
import { cache } from "https://deno.land/x/cache@0.2.13/cache.ts";
import { default as init } from "https://esm.sh/@swc/wasm-web@1.3.21/wasm-web.js";


export * from "https://esm.sh/@swc/wasm-web@1.3.21/wasm-web.js";

await cache("https://esm.sh/@swc/wasm-web@1.3.21/wasm-web_bg.wasm")
    .then(({ path }) => init(toFileUrl(path)));
