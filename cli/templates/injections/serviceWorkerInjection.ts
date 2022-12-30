import { ts } from "../../utils/formatting.ts";


export const renderServiceWorkerInjection = () => {
    return ts`
        export {
            createEndpoint as __createEndpoint,
            createSocket as __createSocket,
        } from "https://deno.land/x/tano@0.0.14/lib/frontend/api.ts";
    `;
}
