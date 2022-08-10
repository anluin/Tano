export const stringify = (data: any): string => {
    switch (typeof data) {
        case "object":
            if (data instanceof Array) {
                return `[${data.map(stringify).join(",")}]`;
            }

            return `{${(
                Object.entries(data)
                    .reduce((carry, [ key, value ]) => [ ...carry, `${key}:${stringify(value)}` ], [] as string[])
                    .join(",")
            )}}`;
        default:
            return JSON.stringify(data);
    }
};
