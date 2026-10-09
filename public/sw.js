const VERSION = "v1";
const SHELL_CACHE = `shell-${VERSION}`;
const PAGES_CACHE = `pages-${VERSION}`;
const IMAGES_CACHE = `images-${VERSION}`;
const OFFLINE_URL = "/offline.html";
const MAX_ENTRIES = 60;

// Never cache these: they carry sessions, mutations or payment state.
const BYPASS = [/^\/api\//, /^\/admin/, /^\/account/, /^\/checkout/, /^\/login/, /^\/register/];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((c) => c.addAll([OFFLINE_URL, "/icons/icon-192.png"]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => ![SHELL_CACHE, PAGES_CACHE, IMAGES_CACHE].includes(k)).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

async function trim(cacheName) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > MAX_ENTRIES) await Promise.all(keys.slice(0, keys.length - MAX_ENTRIES).map((k) => cache.delete(k)));
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (request.mode === "navigate" && url.origin === location.origin) {
    if (BYPASS.some((r) => r.test(url.pathname))) return;
    // Network first so prices and stock stay fresh; fall back to a cached copy, then the offline page.
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(PAGES_CACHE).then((c) => c.put(request, copy)).then(() => trim(PAGES_CACHE));
          }
          return res;
        })
        .catch(async () => (await caches.match(request)) || (await caches.match(OFFLINE_URL))),
    );
    return;
  }

  if (url.origin === location.origin && url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((res) => {
            const copy = res.clone();
            caches.open(SHELL_CACHE).then((c) => c.put(request, copy));
            return res;
          }),
      ),
    );
    return;
  }

  if (request.destination === "image" || url.pathname.startsWith("/_next/image")) {
    event.respondWith(
      caches.match(request).then((hit) => {
        const refresh = fetch(request)
          .then((res) => {
            if (res.ok || res.type === "opaque") {
              const copy = res.clone();
              caches.open(IMAGES_CACHE).then((c) => c.put(request, copy)).then(() => trim(IMAGES_CACHE));
            }
            return res;
          })
          .catch(() => hit);
        return hit || refresh;
      }),
    );
  }
});
