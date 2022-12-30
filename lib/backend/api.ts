import { JSONValue } from "../shared/types/json.ts";
import { WebSocketConnection } from "../shared/api.ts";


export class API {
    readonly request: Request;

    constructor(request: Request) {
        this.request = request;
    }
}

export function endpoint<Result extends void | JSONValue, Arg0 extends JSONValue, Arg1 extends JSONValue, Arg2 extends JSONValue, Arg3 extends JSONValue, Arg4 extends JSONValue, Arg5 extends JSONValue, Arg6 extends JSONValue, Callback extends (this: API, arg0: Arg0, arg1: Arg1, arg2: Arg2, arg3: Arg3, arg4: Arg4, arg5: Arg5, arg6: Arg6) => Promise<Result>>(_: Callback): OmitThisParameter<Callback>;
export function endpoint<Result extends void | JSONValue, Arg0 extends JSONValue, Arg1 extends JSONValue, Arg2 extends JSONValue, Arg3 extends JSONValue, Arg4 extends JSONValue, Arg5 extends JSONValue, Callback extends (this: API, arg0: Arg0, arg1: Arg1, arg2: Arg2, arg3: Arg3, arg4: Arg4, arg5: Arg5) => Promise<Result>>(_: Callback): OmitThisParameter<Callback>;
export function endpoint<Result extends void | JSONValue, Arg0 extends JSONValue, Arg1 extends JSONValue, Arg2 extends JSONValue, Arg3 extends JSONValue, Arg4 extends JSONValue, Callback extends (this: API, arg0: Arg0, arg1: Arg1, arg2: Arg2, arg3: Arg3, arg4: Arg4) => Promise<Result>>(_: Callback): OmitThisParameter<Callback>;
export function endpoint<Result extends void | JSONValue, Arg0 extends JSONValue, Arg1 extends JSONValue, Arg2 extends JSONValue, Arg3 extends JSONValue, Callback extends (this: API, arg0: Arg0, arg1: Arg1, arg2: Arg2, arg3: Arg3) => Promise<Result>>(_: Callback): OmitThisParameter<Callback>;
export function endpoint<Result extends void | JSONValue, Arg0 extends JSONValue, Arg1 extends JSONValue, Arg2 extends JSONValue, Callback extends (this: API, arg0: Arg0, arg1: Arg1, arg2: Arg2) => Promise<Result>>(_: Callback): OmitThisParameter<Callback>;
export function endpoint<Result extends void | JSONValue, Arg0 extends JSONValue, Arg1 extends JSONValue, Callback extends (this: API, arg0: Arg0, arg1: Arg1) => Promise<Result>>(_: Callback): OmitThisParameter<Callback>;
export function endpoint<Result extends void | JSONValue, Arg0 extends JSONValue, Callback extends (this: API, arg0: Arg0) => Promise<Result>>(_: Callback): OmitThisParameter<Callback>;
export function endpoint<Result extends void | JSONValue, Callback extends (this: API) => Promise<Result>>(_: Callback): OmitThisParameter<Callback>;
export function endpoint<Callback extends (...args: JSONValue[]) => JSONValue>(callback: Callback): Callback {
    return callback;
}

export const socket = <I extends JSONValue = JSONValue, O extends JSONValue = I>(callback: (this: API) => Promise<void | Response | ((this: WebSocketConnection<I, O>, request: Request) => Promise<void>)>) =>
    callback as unknown as (initializer: (this: WebSocketConnection<O, I>) => void) => Promise<void>;
