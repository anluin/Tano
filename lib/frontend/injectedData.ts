import { JSONValue } from "../shared/types/json.ts";


declare global {
    const __injectedData: Record<string, JSONValue>;
}

export const getInjectedData = <T extends JSONValue>(identifier: string): T | undefined =>
    __injectedData[identifier] as T | undefined;

export const setInjectedData = <T extends JSONValue>(identifier: string, value: T): T =>
    __injectedData[identifier] = value as T;
