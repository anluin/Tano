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

export const deserialize = <T>(value: T): T => {
    if (typeof value === "string") {
        const temp = /^new Date\((\d+)\)$/.exec(value)?.[1];

        if (temp) {
            return <T>new Date(Number.parseInt(temp));
        }
    }

    if (value instanceof Array) {
        return <T>value.map(deserialize);
    }

    if (typeof value === "object" && value !== null) {
        return <T>Object.fromEntries(
            Object.entries(value)
                .map(([ key, value ]) =>
                    [ key, deserialize(value) ],
                )
        );
    }

    return value;
};

export const serialize = <T>(value: T): T => {
    if (value instanceof Date) {
        return <T>`new Date(${value.getTime()})`;
    }

    if (value instanceof Array) {
        return <T>value.map(serialize);
    }

    if (typeof value === "object" && value !== null) {
        return <T>Object.fromEntries(
            Object.entries(value)
                .map(([ key, value ]) =>
                    [ key, serialize(value) ],
                )
        );
    }

    return value;
};
