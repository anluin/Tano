import { impl, serve } from "../../../../src/lib/backend/mod.ts";

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
