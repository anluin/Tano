import { ts } from "../utils/formatting.ts";
import { Workspace } from "../main.ts";


export const endpointsTemplate = (workspace: Workspace) => {
    const imports = (
        workspace.endpoints
            .map(({ relativePath, identifier }) =>
                ts`import * as ${identifier} from "../src/routes/${relativePath}"`)
            .join("")
    );

    type TransformedEndpoint = {
        identifier: string,
        pattern: string,
    };

    const endpoints = (
        workspace.endpoints
            .reduce<TransformedEndpoint[]>((carry, {  identifier, patterns }) =>
                [ ...carry, ...patterns.map(pattern => ({ identifier, pattern })) ], [])
            .map(({ identifier, pattern }) =>
                `${" ".repeat(16)}"${pattern}": ${identifier},`)
            .sort()
            .join("\n")
    );

    return ts`
        /* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
         *  This file is generated automatically, changes will be overwritten! *
         * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

        import { Endpoint } from "https://deno.land/x/tano@0.0.1/lib/server.ts";
        ${imports}

        export const endpoints: Record<string, Endpoint> = {\n${endpoints}\n};
    `;
};
