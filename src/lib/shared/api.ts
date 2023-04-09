import { JSONValue, OptionalKeys, RequiredKeys } from "./utils.ts";


export type Serde<T> = {
    serialize(value: T): JSONValue;
    deserialize(value: JSONValue): T;
};

export type SerdeOf<T> = T extends Serde<infer T> ? T : never;

export const string: Serde<string> = {
    serialize(value) {
        if (typeof value === "string") {
            return value;
        }

        throw new Error();
    },
    deserialize(value) {
        if (typeof value === "string") {
            return value;
        }

        throw new Error();
    },
};

export const keyword = <T extends string = string>(keyword: T): Serde<T> => ({
    serialize(value) {
        if (value === keyword) {
            return keyword;
        }

        throw new Error();
    },
    deserialize(value) {
        if (value === keyword) {
            return keyword;
        }

        throw new Error();
    },
});

export const number: Serde<number> = {
    serialize(value) {
        if (typeof value === "number") {
            return value;
        }

        throw new Error();
    },
    deserialize(value) {
        if (typeof value === "number") {
            return value;
        }

        throw new Error();
    },
};

export const object = <T>(description: {
    [K in keyof T]: Serde<T[K]>;
}): Serde<{
    [K in RequiredKeys<T>]-?: T[K];
} & {
    [K in OptionalKeys<T>]+?: T[K];
}> => ({
    serialize(object) {
        return Object.fromEntries(
            Object
                .entries(description)
                .map(([ key, value ]) => [ key, (value as any).serialize((object as any)[key]) ]),
        );
    },
    deserialize(object) {
        return <any>Object.fromEntries(
            Object
                .entries(description)
                .map(([ key, value ]) => [ key, (value as any).deserialize((object as any)[key]) ]),
        );
    },
});

export const array = <T>(descriptor: Serde<T>): Serde<T[]> => ({
    serialize(value) {
        return value.map(element => descriptor.serialize(element));
    },
    deserialize(value) {
        if (value instanceof Array) {
            return value.map(element => descriptor.deserialize(element));
        }

        throw new Error();
    },
});

export const tupel = <T extends Serde<unknown>[]>(descriptor: [ ...T ]): Serde<{ [K in keyof T]: SerdeOf<T[K]> }> => ({
    serialize(value) {
        const result = new Array(descriptor.length);

        for (let index = 0; index < descriptor.length; index++) {
            result[index] = descriptor[index].serialize(value[index]);
        }

        return result;
    },
    deserialize(value) {
        if (value instanceof Array) {
            const result = new Array(descriptor.length) as { [K in keyof T]: SerdeOf<T[K]>; };

            for (let index = 0; index < descriptor.length; index++) {
                result[index] = descriptor[index].deserialize(value[index]);
            }

            return result;
        }

        throw new Error();
    },
});

export const or = <T extends Serde<unknown>[]>(descriptor: [ ...T ]): Serde<SerdeOf<T[keyof T]>> => ({
    serialize(value) {
        let errors: unknown[] | undefined;

        for (const { serialize } of descriptor) {
            try {
                return serialize(value);
            } catch (error) {
                (errors ??= []).push(error);
            }
        }

        throw errors ?? new Error();
    },
    deserialize(value) {
        let errors: unknown[] | undefined;

        for (const { deserialize } of descriptor) {
            try {
                return deserialize(value) as SerdeOf<T[keyof T]>;
            } catch (error) {
                (errors ??= []).push(error);
            }
        }

        throw errors ?? new Error();
    },
});

export const optional = <T>(serde: Serde<T>): Serde<T | undefined> => ({
    serialize(value) {
        if (value === undefined) {
            return undefined;
        }

        return serde.serialize(value);
    },
    deserialize(value) {
        if (value === undefined) {
            return undefined;
        }

        return serde.deserialize(value);
    },
});


export const map = <T, R>(serde: Serde<T>, mapping: {
    serialize: (value: R) => T,
    deserialize: (value: T) => R,
}): Serde<R> => ({
    serialize(value) {
        return serde.serialize(mapping.serialize(value));
    },
    deserialize(value) {
        return mapping.deserialize(serde.deserialize(value));
    },
});

export const date = map(
    object({
        "//": keyword("Date"),
        "utc": string,
    }),
    {
        serialize(value: Date) {
            return {
                "//": "Date",
                utc: value.toUTCString(),
            };
        },
        deserialize(value): Date {
            return new Date(value.utc);
        },
    },
);

export const result = Object.assign(
    <Success, Failure>(descriptor: {
        success: Serde<Success>,
        failure: Serde<Failure>,
    }) => or([
        object({
            status: keyword("success"),
            data: descriptor.success,
        }),
        object({
            status: keyword("failure"),
            data: descriptor.failure,
        }),
    ]),
    or([
        object({
            status: keyword("success"),
        }),
        object({
            status: keyword("failure"),
        }),
    ]),
);

export const unwrap = async <Success>(result: Promise<{
    status: "success",
    data: Success,
} | {
    status: "failure",
    data: unknown,
}>): Promise<Success> => {
    const awaitedResult = await result;

    if (awaitedResult.status === "success") {
        return awaitedResult.data;
    }

    throw awaitedResult.data;
};

export const endpoint = <
    Request,
    Response,
>(definition: {
    pathname: string,
    request?: Serde<Request>,
    response?: Serde<Response>,
}) =>
    Object.assign(
        (async (request: Request): Promise<Response> => {
            const response = await fetch(definition.pathname, {
                method: "CALL",
                body: JSON.stringify(definition.request?.serialize(request)),
                headers: {
                    "Content-Type": "application/json",
                },
            });

            return definition.response?.deserialize(await response.json()) as Response;
        }) as (
            unknown extends Request
                ? ((input?: Request) => Promise<Response>)
                : ((input: Request) => Promise<Response>)
            ),
        definition,
    );
