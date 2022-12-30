import { render } from "https://deno.land/x/tano@0.0.14/lib/frontend.ts";

import { Application } from "./components/Application.tsx";
import { ProgressiveWebApp } from "./components/ProgressiveWebApp.tsx";

import "./utils/reset.css";
import "./utils/theme.css";


await render(
    <html lang="de">
        <head>
            <title>Example</title>

            <link rel="preload" href="/bundle.css" as="style"/>
            <link rel="preload" href="/fonts/roboto.css" as="style"/>
            <link rel="preload" href="/fonts/material-symbols.css" as="style"/>

            <link rel="stylesheet" href="/bundle.css" media="all"/>
            <link rel="stylesheet" href="/fonts/roboto.css" media="all"/>
            <link rel="stylesheet" href="/fonts/material-symbols.css" media="all"/>

            <ProgressiveWebApp
                themeColor="#1B1B1C"
                description="Example"/>
        </head>
        <Application/>
    </html>
);
