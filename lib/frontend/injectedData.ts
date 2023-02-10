import { JSONObject, JSONValue } from "../types/json.ts";


declare global {
    const injectedData: JSONObject;
}

export const getInjectedData = <T extends JSONValue>(identifier: string): T | undefined =>
    injectedData[identifier] as T | undefined;

export const setInjectedData = <T extends JSONValue>(identifier: string, value: T | undefined): T | undefined =>
    injectedData[identifier] = value as T;
