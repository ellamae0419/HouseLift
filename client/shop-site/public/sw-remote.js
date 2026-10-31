// Keeps the HydroLift Bluetooth remote (/remote) working with no internet. The remote page copies
// its own files into this cache the first time it is opened online (see pages/Remote/index.jsx).
// After that, opening /remote with no connection shows the saved page.
//
// Only this website's own files are touched. The server and anything on another address are
// never intercepted, so nothing else on the shop can be broken by it.
const CACHE = 'hl-remote-v1';
const SHELL = '/index-shell';

self.addEventListener('install', () => { self.skipWaiting(); });

self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
        for (const key of await caches.keys()) {
            if (key !== CACHE) await caches.delete(key);
        }
        await self.clients.claim();
    })());
});

self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;
    const url = new URL(req.url);
    if (url.origin !== self.location.origin) return;

    // A page visit: use the network when there is one, and remember it. With no network, show the
    // saved copy. Every shop address serves the same page, so one saved copy covers /remote.
    if (req.mode === 'navigate') {
        event.respondWith((async () => {
            const cache = await caches.open(CACHE);
            try {
                const res = await fetch(req);
                if (res.ok) cache.put(SHELL, res.clone());
                return res;
            } catch {
                return (await cache.match(SHELL, { ignoreVary: true })) || Response.error();
            }
        })());
        return;
    }

    // Scripts, styles and pictures have names that change when they change, so a saved copy is safe.
    event.respondWith((async () => {
        const cache = await caches.open(CACHE);
        // ignoreVary: a server may mark files "Vary: Origin", and the browser asks for scripts slightly
        // differently from how they were saved. The names change with the content, so this is safe.
        const saved = await cache.match(req, { ignoreVary: true });
        if (saved) return saved;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
    })());
});
