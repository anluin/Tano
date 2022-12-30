import { endpoint } from "https://deno.land/x/tano@0.0.14/lib/backend/api.ts";


export type Session = {
    user: {
        name: string,
    },
};

export const getCurrentSession = endpoint(async function (): Promise<Session | undefined> {
    return {
        user: {
            name: "Anluin",
        },
    };
});
