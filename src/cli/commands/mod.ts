import { build } from "./build.ts";
import { serve } from "./serve.ts";


export const commands = {
    build,
    serve,
} as const;
