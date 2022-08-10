export type JSONObject = { [x: string]: JSONValue };
export type JSONValue =
    | null
    | string
    | number
    | boolean
    | JSONObject
    | Array<JSONValue>;
