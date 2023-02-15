import { JSONValue } from "../types/json.ts";
import { Channel } from "../shared/channel.ts";


export type Options = {
    request: Request,
    setCookie: (name: string, value: string) => void,
};

export type EndpointResult = Channel | JSONValue | undefined | void;
export type SwapChannel<T> = T extends Channel<infer A, infer B> ? Channel<B, A> : T;

export const tempSocketChannels: Record<string, Record<string, Set<Channel>>> = {};

export function endpoint<R extends EndpointResult>(factory: (options: Options) => () => Promise<R>): () => Promise<SwapChannel<R>>;
export function endpoint<R extends EndpointResult, T0 extends JSONValue>(factory: (options: Options) => (...args: [ T0 ]) => Promise<R>): (...args: [ T0 ]) => Promise<SwapChannel<R>>;
export function endpoint<R extends EndpointResult, T0 extends JSONValue, T1 extends JSONValue>(factory: (options: Options) => (...args: [ T0, T1 ]) => Promise<R>): (...args: [ T0, T1 ]) => Promise<SwapChannel<R>>;
export function endpoint<R extends EndpointResult, T extends JSONValue>(factory: (options: Options) => (...args: T[]) => Promise<R>): (...args: T[]) => Promise<SwapChannel<R>>;
export function endpoint<Method extends ((...args: JSONValue[]) => Promise<JSONValue | undefined | void>)>(factory: (options: Options) => Method): Method {
    return (async (request: Request): Promise<Response> => {
        const cookies: Record<string, string> = {};
        const method = factory({
            request,
            setCookie: (name: string, value: string) => {
                cookies[name] = value;
            },
        }) as (...args: unknown[]) => Promise<unknown>;

        try {
            let result = await method(...await request.json());

            if (result instanceof Channel) {
                const url = new URL(request.url);
                let uuid: string;

                do uuid = crypto.randomUUID();
                while (tempSocketChannels[uuid]);

                ((tempSocketChannels[uuid] ??= {})[url.pathname] ??= new Set())
                    .add(result);

                setTimeout(() => {
                    delete tempSocketChannels[uuid];
                }, 500);

                result = {
                    type: "channel",
                    result: uuid,
                };
            } else {
                result = {
                    type: "simple",
                    result: result,
                };
            }

            const body = JSON.stringify(result);

            const response = new Response(body, {
                status: 200,
                headers: {
                    "Content-Type": "application/json;charset=utf-8",
                    "Cache-Control": "no-store, must-revalidate",
                    "Pragma": "no-cache",
                    "Expires": "0",
                },
            });

            for (const key in cookies) {
                const value = cookies[key];

                response.headers.append(
                    "Set-Cookie",
                    `${key}=${value}; Secure; HttpOnly; SameSite=Strict; Path=/`,
                );
            }

            return response;
        } catch (error) {
            const body = JSON.stringify({
                type: "error",
                result: error,
            });

            return new Response(body, {
                status: 500,
                headers: {
                    "Content-Type": "application/json;charset=utf-8",
                    "Cache-Control": "no-store, must-revalidate",
                    "Pragma": "no-cache",
                    "Expires": "0",
                },
            });
        }
    }) as unknown as Method;
}

export const getCookies = (request: Request): Record<string, string> =>
    Object.fromEntries((
        request.headers.get("Cookie")
            ?.split(/\s*;\s*/)
            .map(part => part.split(/\s*=\s*/))

    ) ?? []);
