import { Middleware } from "../serve.ts";


export type EndpointMiddlewareEvent = {
    url: URL,
    request: Request,
};

export type EndpointMiddlewareHandler = {
    (event: EndpointMiddlewareEvent): undefined | Response | Promise<undefined | Response>;
};

export class EndpointMiddleware implements Middleware {
    private readonly pathname: string | RegExp;
    private readonly handler: EndpointMiddlewareHandler;

    constructor(pathname: string | RegExp, handler: EndpointMiddlewareHandler) {
        this.pathname = pathname;
        this.handler = handler;
    }

    before(url: URL, request: Request, response?: Response) {
        if (
            this.pathname instanceof RegExp
                ? this.pathname.test(url.pathname)
                : url.pathname === this.pathname
        ) {
            return this.handler({
                url,
                request,
            });
        }
    }
}
