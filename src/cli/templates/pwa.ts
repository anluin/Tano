import { tsx } from "../utils/formatting.ts";
import { ManifestInfo } from "../main.ts";


export type Properties = {
    manifestInfo: ManifestInfo,
};

export const pwaComponentTemplate = (properties: Properties) => {
    const { manifestInfo: {
        themeColor,
        description,
    } } = properties;


    const lines: string[] = [
        tsx`<link rel="manifest" href="/manifest.json" />`,
        tsx`<link rel="apple-touch-icon" href="/icons/icon-maskable-192x192.png" />`,
        tsx`<link rel="apple-touch-icon" href="/icons/icon-maskable-256x256.png" />`,
        tsx`<link rel="apple-touch-icon" href="/icons/icon-maskable-384x384.png" />`,
        tsx`<link rel="apple-touch-icon" href="/icons/icon-maskable-512x512.png" />`,
    ];

    if (themeColor !== undefined) {
        lines.push(tsx`<meta name="apple-mobile-web-app-status-bar" content="${themeColor}" />`);
    }

    if (themeColor !== undefined) {
        lines.push(tsx`<meta name="theme-color" content="${themeColor}" />`);
    }

    if (description !== undefined) {
        lines.push(tsx`<meta name="description" content="${description}" />`);
    }

    const source = lines.reduce((carry, line) => `${carry}${" ".repeat(20)}${line}`, '');

    return tsx`
        /* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
         *  This file is generated automatically, changes will be overwritten! *
         * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

        import { Component } from "https://deno.land/x/tano@0.0.2/src/lib/react.ts";


        export const ProgressiveWebApp: Component = () => {
            return (
                ${`<>\n${source}${" ".repeat(16)}</>`}
            );
        };
    `;
};
