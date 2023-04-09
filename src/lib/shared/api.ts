export type Validate<T> = (value: unknown, diagnostics?: string[], path?: string) => value is T;

export type Validator<T> = {
    validate: Validate<T>,
};

export type Validated<T> = T extends Validator<infer X> ? X : never;

export const object = <T>(properties: {
    [K in keyof T]: Validator<T[K]>
}) => ({
    validate: (value: unknown, diagnostics?: string[], path?: string): value is T => {
        if (typeof value !== "object") {
            diagnostics?.push(`${path ? `${path}: ` : ''}'${(typeof value === "object" ? value?.constructor.name : undefined) ?? typeof value}' is not assignable to type 'object'`);

            return false;
        }

        if (value === null) {
            diagnostics?.push(`${path ? `${path}: ` : ''}object is null`);

            return false;
        }

        for (const propertiesKey in properties) {
            if (
                properties[propertiesKey]
                    .validate(
                        (value as Record<string, unknown>)[propertiesKey],
                        diagnostics,
                        diagnostics && (path ? `${path}.${propertiesKey}` : propertiesKey),
                    )
            ) {
                continue;
            }

            return false;
        }

        return true;
    },
    get optional() {
        return ({
            validate: (value: unknown, diagnostics?: string[], path?: string): value is undefined | T =>
                value === undefined || this.validate(value, diagnostics, path),
        });
    },
});

export const string = ({
    validate: (value: unknown, diagnostics?: string[], path?: string): value is string => {
        if (typeof value === "string") {
            return true;
        }

        diagnostics?.push(`${path ? `${path}: ` : ''}'${(typeof value === "object" ? value?.constructor.name : undefined) ?? typeof value}' is not assignable to type 'string'`);

        return false;
    },
    get optional() {
        return ({
            validate: (value: unknown, diagnostics?: string[], path?: string): value is undefined | string =>
                value === undefined || this.validate(value, diagnostics, path),
        });
    },
});

export const keyword = <T extends string>(keyword: T) => ({
    validate: (value: unknown, diagnostics?: string[], path?: string): value is T => {
        if (value === keyword) {
            return true;
        }

        diagnostics?.push(`${path ? `${path}: ` : ''}'${(typeof value === "object" ? value?.constructor.name : undefined) ?? typeof value}' is not assignable to type 'keyword' (${keyword})`);

        return false;
    },
    get optional() {
        return ({
            validate: (value: unknown, diagnostics?: string[], path?: string): value is undefined | T =>
                value === undefined || this.validate(value, diagnostics, path),
        });
    },
});

export const boolean = ({
    validate: (value: unknown, diagnostics?: string[], path?: string): value is boolean => {
        if (typeof value === "boolean") {
            return true;
        }

        diagnostics?.push(`${path ? `${path}: ` : ''}'${(typeof value === "object" ? value?.constructor.name : undefined) ?? typeof value}' is not assignable to type 'boolean'`);

        return false;
    },
    get optional() {
        return ({
            validate: (value: unknown, diagnostics?: string[], path?: string): value is undefined | boolean =>
                value === undefined || this.validate(value, diagnostics, path),
        });
    },
});

export const number = ({
    validate: (value: unknown, diagnostics?: string[], path?: string): value is number => {
        if (typeof value === "number") {
            return true;
        }

        diagnostics?.push(`${path ? `${path}: ` : ''}'${(typeof value === "object" ? value?.constructor.name : undefined) ?? typeof value}' is not assignable to type 'number'`);

        return false;
    },
    get optional() {
        return ({
            validate: (value: unknown, diagnostics?: string[], path?: string): value is undefined | number =>
                value === undefined || this.validate(value, diagnostics, path),
        });
    },
});

export const tuple = <T extends Array<Validator<any>>>(validators: [ ...T ]) => ({
    validate: (value: unknown, diagnostics?: string[], path?: string): value is {
        [K in keyof T]: Validated<T[K]>;
    } => {
        if (!(value instanceof Array)) {
            diagnostics?.push(`${path ? `${path}: ` : ''}'${(typeof value === "object" ? value?.constructor.name : undefined) ?? typeof value}' is not assignable to type 'tuple'`);

            return false;
        }

        for (let index = 0; index < validators.length; index++) {
            if (!validators[index].validate(value[index], diagnostics, `${path}[${index}]`)) {
                return false;
            }
        }

        return true;
    },
    get optional() {
        return ({
            validate: (value: unknown, diagnostics?: string[], path?: string): value is undefined | {
                [K in keyof T]: Validated<T[K]>;
            } =>
                value === undefined || this.validate(value, diagnostics, path),
        });
    },
});

export const array = <T extends Validator<any>>(validator: T) => ({
    validate: (value: unknown, diagnostics?: string[], path?: string): value is Validated<T>[] => {
        if (!(value instanceof Array)) {
            diagnostics?.push(`${path ? `${path}: ` : ''}'${(typeof value === "object" ? value?.constructor.name : undefined) ?? typeof value}' is not assignable to type 'array'`);

            return false;
        }

        for (let index = 0; index < value.length; index++) {
            if (!validator.validate(value[index], diagnostics, `${path}[${index}]`)) {
                return false;
            }
        }

        return true;
    },
    get optional() {
        return ({
            validate: (value: unknown, diagnostics?: string[], path?: string): value is undefined | Validated<T>[] =>
                value === undefined || this.validate(value, diagnostics, path),
        });
    },
});

export const or = <T extends Array<Validator<any>>>(validators: T) => ({
    validate: (value: unknown, diagnostics?: string[], path?: string): value is Validated<T[number]> => {
        for (const validator of validators) {
            if (validator.validate(value, diagnostics, path)) {
                return true;
            }
        }

        return false;
    },
    get optional() {
        return ({
            validate: (value: unknown, diagnostics?: string[], path?: string): value is undefined | Validated<T[number]> =>
                value === undefined || this.validate(value, diagnostics, path),
        });
    },
});

export const result: {
    <Ok, Error>(data: { success: Validator<Ok>, failure: Validator<Error> }): {
        validate: (value: unknown, diagnostics?: string[], path?: string) => value is ({
            status: "success",
            data: Ok,
        } | {
            status: "failure",
            data: Error,
        }),
    },
    validate: (value: unknown, diagnostics?: string[], path?: string) => value is ({
        status: "success",
    } | {
        status: "failure",
    }),
} = Object.assign(
    <Ok, Error>(data: {
        success: Validator<Ok>,
        failure: Validator<Error>,
    }) => or([
        object({
            status: keyword("success"),
            data: data.success,
        }),
        object({
            status: keyword("failure"),
            data: data.failure,
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

export const endpoint = <
    Input,
    Output,
>(definition: {
    pathname: string,
    request?: Validator<Input>,
    response?: Validator<Output>,
}) =>
    Object.assign(
        (async (input: Input): Promise<Output> => {
            const diagnostics: string[] = [];

            if (definition.request === undefined || definition.request.validate(input, diagnostics, `[[${definition.pathname}]].request`)) {
                const url = new URL(definition.pathname, location.href);
                const rawResponse = await fetch(url, {
                    method: "CALL",
                    body: JSON.stringify(input),
                    headers: {
                        "Content-Type": "application/json",
                    },
                })
                const jsonResponse = await rawResponse.json();

                if (definition.response === undefined || definition.response.validate(jsonResponse, diagnostics, `[[${definition.pathname}]].response`)) {
                    return jsonResponse;
                }
            }

            throw new Error(diagnostics.join());
        }) as (
            unknown extends Input
                ? ((input?: Input) => Promise<Output>)
                : ((input: Input) => Promise<Output>)
            ),
        definition,
    );

export const unwrap = async <Success>(result: Promise<
    { status: "success", data: Success } |
    { status: "failure", data: any } |
    { status: "success" } |
    { status: "failure" }
>): Promise<unknown extends Success ? undefined : Success> => {
    const awaitedResult = await result;

    if (awaitedResult.status === "success") {
        return (
            "data" in awaitedResult
                ? awaitedResult.data
                : undefined
        ) as unknown extends Success
            ? undefined
            : Success;
    } else {
        throw (
            "data" in awaitedResult
                ? awaitedResult.data
                : "failure"
        );
    }
};

