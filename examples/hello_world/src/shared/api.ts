import { boolean, endpoint, number, object, result, string } from "https://deno.land/x/tano/lib/shared/api.ts";


export const api = {
    random: endpoint({
        pathname: "/random",
        request: object({
            shouldFail: boolean,
        }),
        response: result({
            success: object({
                random: number,
            }),
            failure: object({
                error: string,
            }),
        }),
    }),
};
