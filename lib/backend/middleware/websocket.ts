import { WebSocketConnection } from "../../shared/utils.ts";
import { Middleware } from "../serve.ts";
import { JSONValue } from "../../types/json.ts";


export type WebSocketMiddlewareEvent<I extends JSONValue = JSONValue, O extends JSONValue = JSONValue> = {
    url: URL,
    request: Request,
    upgrade(): Promise<WebSocketConnection<I, O>>,
};

export type WebSocketMiddlewareHandler<I extends JSONValue = JSONValue, O extends JSONValue = JSONValue> = {
    (event: WebSocketMiddlewareEvent<I, O>): void | Promise<void>;
};

export class WebSocketMiddleware<I extends JSONValue = JSONValue, O extends JSONValue = JSONValue> implements Middleware {
    private readonly pathname: string | RegExp;
    private readonly handler: WebSocketMiddlewareHandler<I, O>;
    private readonly options?: Deno.UpgradeWebSocketOptions;

    constructor(pathname: string | RegExp, handler: WebSocketMiddlewareHandler<I, O>, options?: Deno.UpgradeWebSocketOptions) {
        this.pathname = pathname;
        this.handler = handler;
        this.options = options;
    }

    before(url: URL, request: Request, response?: Response) {
        if (
            this.pathname instanceof RegExp
                ? this.pathname.test(url.pathname)
                : url.pathname === this.pathname
        ) {
            if (request.headers.get("upgrade") != "websocket") {
                return new Response(null, { status: 501 });
            }

            (async () => {
                const upgrade = async () => {
                    const { socket, response: upgradeResponse } = Deno.upgradeWebSocket(request, this.options);

                    response = upgradeResponse;

                    await new Promise<Event>((resolve, reject) => {
                        socket.addEventListener("open", resolve);
                        socket.addEventListener("error", reject);
                    });

                    return new WebSocketConnection<I, O>(url.pathname, socket);
                };

                await this.handler({
                    url,
                    request,
                    upgrade,
                });
            })()
                .catch(error => {
                    console.error(error);
                    response = new Response(`${error}`, {
                        status: 501,
                    });
                });

            return response;
        }
    }
}
