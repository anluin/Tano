import { impl, serve } from "https://deno.land/x/tano/lib/backend/mod.ts";

import { api } from "../shared/api.ts";


await serve([
    impl(api.random)(
        async ({ data: { shouldFail } }) => {
            if (shouldFail) {
                return {
                    status: "failure",
                    data: {
                        error: "should fail",
                    },
                };
            } else {
                return {
                    status: "success",
                    data: {
                        random: Math.random(),
                    },
                };
            }
        },
    ),
]);
