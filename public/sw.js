// Minimal, dependency-free service worker for offline support.
//  - Navigations: network-first, falling back to the cached /offline page.
//  - Immutable hashed build assets (/_next/static): cache-first (content-addressed,
//    so a hit is always the right version and never goes stale across deploys).
// Everything else passes straight through to the network. Bump VERSION to force
// old caches to be dropped on the next activate.
const VERSION = "v1";
const STATIC_CACHE = `hd-static-${VERSION}`;
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
	event.waitUntil(
		caches.open(STATIC_CACHE).then((cache) => cache.add(OFFLINE_URL)),
	);
	self.skipWaiting();
});

self.addEventListener("activate", (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(
					keys.filter((k) => k !== STATIC_CACHE).map((k) => caches.delete(k)),
				),
			)
			.then(() => self.clients.claim()),
	);
});

self.addEventListener("fetch", (event) => {
	const req = event.request;
	if (req.method !== "GET") return;
	const url = new URL(req.url);
	if (url.origin !== self.location.origin) return;

	if (req.mode === "navigate") {
		event.respondWith(fetch(req).catch(() => caches.match(OFFLINE_URL)));
		return;
	}

	if (url.pathname.startsWith("/_next/static/")) {
		event.respondWith(
			caches.open(STATIC_CACHE).then(async (cache) => {
				const hit = await cache.match(req);
				if (hit) return hit;
				const res = await fetch(req);
				if (res.ok) cache.put(req, res.clone());
				return res;
			}),
		);
	}
});
