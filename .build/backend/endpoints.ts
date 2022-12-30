import { WebSocketConnection } from "https://deno.land/x/sparky@0.0.1/lib/shared/api.ts";
import { JSONValue } from "https://deno.land/x/sparky@0.0.1/lib/shared/types/json.ts";
import { API } from "https://deno.land/x/sparky@0.0.1/lib/backend/api.ts";

export const buildUUID = "b20ad6c1-8b70-4432-ad48-8b407c2978d6";

export type Endpoint = (this: API, ...args: JSONValue[]) => Promise<JSONValue>;
export type Socket = (this: API) => Promise<(this: WebSocketConnection) => Promise<void>>;

export const endpoints: Record<string, Record<string, Endpoint>> = {};

export const sockets: Record<string, Record<string, Socket>> = {};
