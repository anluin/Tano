import { ts } from "../utils/formatting.ts";


export const injectTemplate = () => {
    return ts`
        /* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
         *  This file is generated automatically, changes will be overwritten! *
         * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

        export { createElement, fragmentType }
                from "https://deno.land/x/tano@0.0.1/lib/react.ts";
    `;
};
