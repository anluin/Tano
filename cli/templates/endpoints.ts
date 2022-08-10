import { ts } from "../utils/formatting.ts";


export type Properties = {
    endpoints: Record<string, string[]>,
};

export const renderEndpoints = (properties: Properties) => {
    const { endpoints } = properties;

    let counter = 0;

    const imports = (
        Object.entries(endpoints)
            .map(([ pattern, matches ]) => {
                return `import { ${matches.map(match => `${match} as _${counter++}`).join(", ")} } from "../src/backend${pattern}.ts";`;
            })
            .join("\n")
    );

    counter = 0;

    const exports = (
        Object.entries(endpoints)
            .map(([ pattern, matches ]) => {
                return `["${pattern}"] : { ${matches.map(match => `${match}: _${counter++}`).join(", ")} },`;
            })
            .join(`\n${' '.repeat(12)}`)
    );

    return ts`
        ${imports}


        export const endpoints: Record<string, Record<string, CallableFunction>> = {
            ${exports}
        };
    `;
}
