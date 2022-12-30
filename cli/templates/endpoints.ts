import { ts } from "../utils/formatting.ts";


export type Properties = {
    endpoints: Record<string, string[]>,
    sockets: Record<string, string[]>,
    buildUUID: string,
};

export const renderEndpoints = (properties: Properties) => {
    const { endpoints, sockets, buildUUID } = properties;

    let counter = 0;

    const imports = (
        Object.entries({ ...endpoints, ...sockets })
            .map(([ pattern, matches ]) => {
                return `import { ${matches.map(match => `${match} as _${counter++}`).join(", ")} } from "@backend${pattern}.ts";`;
            })
            .join("\n")
    );

    counter = 0;

    const endpointExports = (
        Object.entries(endpoints)
            .map(([ pattern, matches ]) => {
                return `["${pattern}"] : { ${matches.map(match => `${match}: _${counter++} as unknown as Endpoint`).join(", ")} },`;
            })
            .join(`\n${' '.repeat(12)}`)
    );

    const socketExports = (
        Object.entries(sockets)
            .map(([ pattern, matches ]) => {
                return `["${pattern}"] : { ${matches.map(match => `${match}: _${counter++} as unknown as Socket`).join(", ")} },`;
            })
            .join(`\n${' '.repeat(12)}`)
    );

    return ts`
        import { WebSocketConnection } from "https://deno.land/x/tano@0.0.14/lib/shared/api.ts";
        import { JSONValue } from "https://deno.land/x/tano@0.0.14/lib/shared/types/json.ts";
        import { API } from "https://deno.land/x/tano@0.0.14/lib/backend/api.ts";

        ${imports}

        export const buildUUID = ${JSON.stringify(buildUUID)};

        export type Endpoint = (this: API, ...args: JSONValue[]) => Promise<JSONValue>;
        export type Socket = (this: API) => Promise<(this: WebSocketConnection) => Promise<void>>;

        export const endpoints: Record<string, Record<string, Endpoint>> = {
            ${endpointExports}
        };

        export const sockets: Record<string, Record<string, Socket>> = {
            ${socketExports}
        };
    `;
}
