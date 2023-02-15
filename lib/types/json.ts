export type JSONObject = { [_: string]: JSONValue };
export type JSONArray = JSONValue[];
export type JSONPrimitive = string | number | boolean | null;
export type JSONValue = JSONPrimitive | JSONObject | JSONArray;
