import { std } from "./deps.ts";
import { buildAssetResponse, preloadAssets } from "./utils/assets.ts";


export type Middleware = (args: { url: URL, request: Request }) => Response | undefined | Promise<Response | undefined>;

const buildApplicationResponse: Middleware = async ({ request }) => {
    return new Response(`
<!DOCTYPE html>
<html lang="en">
    <head>
        <title>
            Loading...
        </title>
    </head>
    <body>
        <script type="module" src="/bundle.js"></script>
    </body>
</html>
        `.trimStart(), {
        headers: {
            "Content-Type": "text/html;charset=utf-8",
        },
    });
};

const buildResponse = async (args: { url: URL, request: Request }) =>
    await buildAssetResponse(args) ??
    await buildApplicationResponse(args);

const handleConnection = async (connection: Deno.Conn, middlewares: Middleware[]) => {
    for await (const { request, respondWith } of Deno.serveHttp(connection)) {
        const url = new URL(request.url);
        const args = { url, request };
        let response: Response | undefined;

        for (const middleware of middlewares) {
            response = await middleware(args);
            if (response) break;
        }

        response ??= await buildResponse(args);

        respondWith(response ?? new Response())
            .catch(console.error);
    }
};

export const serve = async (middlewares: Middleware[] = []) => {
    const {
        port: rawPort,
    } = (
        std.flags.parse(Deno.args, {
            string: [
                "port",
            ],
            default: {
                port: "4500",
            },
        })
    );

    const port = Number.parseInt(rawPort);

    await preloadAssets("src/assets");
    await preloadAssets(".build/assets");

    console.log(`Listening on http://localhost:${port}/`);

    for await (const connection of Deno.listen({ port })) {
        handleConnection(connection, middlewares)
            .catch(console.error);
    }
};
