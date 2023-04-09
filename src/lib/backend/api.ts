import { Validator } from "../shared/api.ts";
import { Middleware } from "./serve.ts";


export type Cookies = Partial<Record<string, string>>;

export type ImplEvent<T> = {
    data: T,
    request: Request,
    patchResponse: (callback: (response: Response) => Response) => void,
    readonly cookies: Cookies,
};


export const impl = <Input, Output>(definition: ((input: Input) => Promise<Output>) & {
    pathname: string,
    request?: Validator<Input>,
    response?: Validator<Output>,
}) =>
    (handler: ((event: ImplEvent<Input>) => Output) | ((event: ImplEvent<Input>) => Promise<Output>)): Middleware => {
        return async ({ url, request }) => {
            if (url.pathname === definition.pathname) {
                const diagnostics: string[] = [];
                const input = definition.request ? await request.json() : undefined;

                if (definition.request === undefined || definition.request.validate(input, diagnostics, `[[${definition.pathname}]].request`)) {
                    let responsePatcher: ((response: Response) => Response) | undefined;

                    const patchResponse = (callback: (response: Response) => Response) => {
                        const previousResponsePatcher = responsePatcher;

                        responsePatcher = (
                            previousResponsePatcher
                                ? (response) => previousResponsePatcher(callback(response))
                                : callback
                        );
                    };

                    let requestCookies: Cookies | undefined;
                    let responseCookies: Cookies | undefined;

                    const output = await handler({
                        data: input,
                        request,
                        patchResponse,
                        get cookies() {
                            return responseCookies ??= {
                                ...requestCookies ??= Object.fromEntries((
                                    request.headers.get("Cookie")
                                        ?.split(/\s*;\s*/)
                                        .map(part => part.split(/\s*=\s*/))

                                ) ?? []),
                            };
                        },
                    });

                    const headers: [ string, string ][] = [
                        [ "Content-Type", "application/json" ],
                    ];

                    const expires = new Date();
                    const secure = url.protocol.endsWith("s:");

                    expires.setDate(expires.getDate() + 1);

                    for (const name in { ...requestCookies, ...responseCookies }) {
                        if (requestCookies?.[name] !== responseCookies?.[name]) {
                            if (responseCookies?.[name] === undefined) {
                                headers.push([ "Set-Cookie", `${name}=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=-1; HttpOnly;${secure ? "Secure; ": ""} SameSite=Strict; Path=/` ]);
                            } else {
                                headers.push([ "Set-Cookie", `${name}=${responseCookies?.[name] ?? ""}; Expires=${expires.toUTCString()}; HttpOnly;${secure ? "Secure; ": ""} SameSite=Strict; Path=/` ]);
                            }
                        }
                    }

                    if (definition.response === undefined || definition.response.validate(output, diagnostics, `[[${definition.pathname}]].response`)) {
                        let response = new Response(JSON.stringify(output), {
                            headers: headers,
                        });

                        return responsePatcher?.(response) ?? response;
                    }
                }

                throw new Error(diagnostics.join());
            }

            return undefined;
        };
    };
