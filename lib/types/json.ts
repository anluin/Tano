export type JSONObject = { [_: string]: JSONValue };
export type JSONArray = JSONValue[];
export type JSONPrimitive = string | number | boolean | undefined;
export type JSONValue = JSONPrimitive | JSONObject | JSONArray;
