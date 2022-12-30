import { Component } from "https://deno.land/x/tano@0.0.14/lib/frontend.ts";


export type Properties = {
    test?: string;
};

export const render: Component<Properties> = (properties) => {
    return (
        <main>
            {JSON.stringify(properties)}
        </main>
    );
};
