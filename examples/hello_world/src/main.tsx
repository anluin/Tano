import { render } from "https://deno.land/x/tano@0.0.1/lib/client.ts";

import { ProgressiveWebApp } from "$build/components/ProgressiveWebApp.tsx";
import { AddToHomescreen } from "$components/AddToHomescreen.tsx";
import { Router } from "$components/Router.tsx";

import { isInstalled } from "$utils/pwa.ts";


await render(() => {
    return (
        <html lang="en">
            <head>
                <title>Hello, world!</title>
                <link rel="icon" href="/favicon.svg" type="image/svg+xml"/>
                <link rel="stylesheet" href="/fonts/roboto.css" media="all"/>
                <link rel="stylesheet" href="/stylesheet.css" media="all"/>
                {(
                    isInstalled
                        ? <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
                        : <meta name="viewport" content="width=device-width"/>
                )}
                <ProgressiveWebApp/>
            </head>
            <body>
                <main>
                    <section>
                        <a href="/">Dashboard</a>
                        <a href="/test">Test</a>
                        <a href="/noop">noop</a>
                    </section>
                    <Router/>
                </main>
                <AddToHomescreen/>
            </body>
        </html>
    );
});

