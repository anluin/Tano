export type KeysOfType<T, U> = { [K in keyof T]: T[K] extends U ? K : never }[keyof T];
export type RequiredKeys<T> = Exclude<KeysOfType<T, Exclude<T[keyof T], undefined>>, undefined>;
export type OptionalKeys<T> = Exclude<keyof T, RequiredKeys<T>>;

export type JSONValue =
    | string
    | number
    | boolean
    | undefined
    | { [_: string]: JSONValue }
    | JSONValue[];

export type OptionalProperties<T> = {
    [K in RequiredKeys<T>]-?: T[K];
} & {
    [K in OptionalKeys<T>]+?: T[K];
};
