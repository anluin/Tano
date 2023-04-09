import type { Options } from "./mod.ts";
import { format, ts, tsx } from "../utils/format.ts";


export const setup = async (options: Options) => {
    const {
        workspaceDirectoryPath,
        denoConfigFilePath,
        frontendSourceDirectoryPath,
        mainFrontendSourceFilePath,
        backendSourceDirectoryPath,
        mainBackendSourceFilePath,
        sharedSourceDirectoryPath,
        apiSharedSourceFilePath,
    } = options;

    await Deno.mkdir(workspaceDirectoryPath, { recursive: true });
    await Deno.stat(denoConfigFilePath)
        .catch(async () => {
            await Deno.writeTextFile(denoConfigFilePath, format`
                {
                    "compilerOptions": {
                        "lib": [
                            "deno.ns",
                            "dom",
                            "dom.iterable"
                        ]
                    },
                    "tasks": {
                        "serve": "tano serve"
                    }
                }
            `);
        });

    await Deno.mkdir(frontendSourceDirectoryPath, { recursive: true });
    await Deno.stat(mainFrontendSourceFilePath)
        .catch(async () => {
            await Deno.writeTextFile(mainFrontendSourceFilePath, tsx`
                import { render, Signal } from "https://deno.land/x/tano@0.0.21/lib/frontend/mod.ts";

                import { api } from "../shared/api.ts";
                
                
                await render(() => {
                    const $counter = new Signal(0);
                
                    api.counter.fetch()
                        .then(value => $counter.set(value));
                
                    const decrement = async () => {
                        $counter.set(await api.counter.decrement());
                    };
                
                    const increment = async () => {
                        $counter.set(await api.counter.increment());
                    };
                    return (
                        <html lang="en" style="display: flex; height: 100%; justify-content: center; align-items: center;outline:">
                            <head>
                                <title>Hello, world!</title>
                            </head>
                            <body>
                                <h1>Hello, world!</h1>
                                <div style="display: flex; align-items: center; gap: 16px;justify-content: center">
                                    <button onClick={decrement}>
                                        -1
                                    </button>
                                    <pre>
                                    {$counter}
                                </pre>
                                    <button onClick={increment}>
                                        +1
                                    </button>
                                </div>
                            </body>
                        </html>
                    );
                });
            `);
        });

    await Deno.mkdir(backendSourceDirectoryPath, { recursive: true });
    await Deno.stat(mainBackendSourceFilePath)
        .catch(async () => {
            await Deno.writeTextFile(mainBackendSourceFilePath, ts`
                import { serve, impl } from "https://deno.land/x/tano@0.0.21/lib/backend/mod.ts";

                import { api } from "../shared/api.ts";


                let counter = 0;

                await serve([
                    impl(api.counter.fetch)(
                        async () => {
                            return counter;
                        },
                    ),
                    impl(api.counter.increment)(
                        async () => {
                            return ++counter;
                        },
                    ),
                    impl(api.counter.decrement)(
                        async () => {
                            return --counter;
                        },
                    ),
                ]);
            `);
        });

    await Deno.mkdir(backendSourceDirectoryPath, { recursive: true });
    await Deno.stat(mainBackendSourceFilePath)
        .catch(async () => {
            await Deno.writeTextFile(mainBackendSourceFilePath, ts`
                import { serve, impl } from "https://deno.land/x/tano@0.0.21/lib/backend/mod.ts";

                import { api } from "../shared/api.ts";


                let counter = 0;

                await serve([
                    impl(api.counter.fetch)(
                        async () => {
                            return counter;
                        },
                    ),
                    impl(api.counter.increment)(
                        async () => {
                            return ++counter;
                        },
                    ),
                    impl(api.counter.decrement)(
                        async () => {
                            return --counter;
                        },
                    ),
                ]);
            `);
        });

    await Deno.mkdir(sharedSourceDirectoryPath, { recursive: true });
    await Deno.stat(apiSharedSourceFilePath)
        .catch(async () => {
            await Deno.writeTextFile(apiSharedSourceFilePath, ts`
                import { endpoint, number } from "https://deno.land/x/tano@0.0.21/lib/shared/api.ts";


                export const api = {
                    counter: {
                        fetch: endpoint({
                            pathname: "/api/counter",
                            response: number,
                        }),
                        increment: endpoint({
                            pathname: "/api/counter/increment",
                            response: number,
                        }),
                        decrement: endpoint({
                            pathname: "/api/counter/decrement",
                            response: number,
                        }),
                    } as const,
                } as const;
            `);
        });
};
