import { $route, Component } from "https://deno.land/x/tano@0.0.14/lib/frontend.ts";

import { $loggedIn } from "../store.ts";

import "./Application.css";;


export const Application: Component = () => {
    return (
        <body className="Application">
            {$route}
            <pre>
                {$loggedIn.map(loggedIn => JSON.stringify({ loggedIn }))}
            </pre>
        </body>
    );
};
