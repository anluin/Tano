import { serve } from "https://deno.land/x/tano@0.0.2/src/lib/server.ts";


await serve({
    port: 4500,
    ssr: {
        // setTimeout and setInterval are critical functions in the ssr context.
        // Here you have the possibility to overwrite the default behavior, e.g. to reduce or completely ban delays.
        patches: {
            setTimeout(callback: () => void, _delay: number): number {
                return setTimeout(callback, 0);
            },
            clearTimeout(handle: number): void {
                clearTimeout(handle);
            },
            setInterval(callback: () => void, _delay: number): number {
                return setTimeout(callback, 0);
            },
            clearInterval(handle: number): void {
                clearTimeout(handle);
            },
        },
    },
});
