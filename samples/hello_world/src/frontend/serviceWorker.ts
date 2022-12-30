import "https://deno.land/x/tano@0.0.14/lib/frontend/types/serviceWorker.d.ts";


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
            caches.open("homepage")
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
