import { socket } from "https://deno.land/x/tano@0.0.14/lib/backend/api.ts";

export const connect = socket(async function () {
    return async function () {
        for await (const message of this.listen()) {
            console.log("message", message);
        }
    };
});
