import { ts } from "../utils/formatting.ts";
import { Workspace } from "../main.ts";


type Properties = {
    workspace: Workspace,
    cacheName: string,
};

export const serviceWorkerTemplate = (properties: Properties) => {
    const { cacheName, workspace: { statics } } = properties;

    return ts`
        /* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
         *  This file is generated automatically, changes will be overwritten! *
         * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

        if ("serviceWorker" in navigator) {
            navigator.serviceWorker
                .register("/serviceWorker.js")
                .catch(console.error);
        } else {
            const assets = [
                "/",
            ];

            self.addEventListener("install", installEvent => {
                installEvent.waitUntil(
                    caches.open(${JSON.stringify(cacheName)})
                        .then(cache => cache.addAll(assets))
                );
            });

            self.addEventListener("fetch", fetchEvent => {
                fetchEvent.respondWith(
                    caches.match(fetchEvent.request)
                        .then(res => res || fetch(fetchEvent.request))
                );
            });
        }
    `;
};
