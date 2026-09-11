/* JolSetu service worker — app shell cache-first, tiles stale-while-revalidate. */
const SHELL = "jolsetu-shell-v3";
const TILE = "jolsetu-tiles-v1";
const SHELL_FILES = [
  "./", "./index.html", "./manifest.webmanifest", "./icon.svg",
  "./css/styles.css", "./vendor/leaflet.css", "./vendor/leaflet.js",
  "./js/app.js", "./js/core.js", "./js/i18n.js",
  "./js/wells_data.js", "./js/model_data.js", "./js/kit_table.js",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(SHELL_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== SHELL && k !== TILE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (url.hostname.includes("tile.openstreetmap.org")) {
    e.respondWith(
      caches.open(TILE).then(async (c) => {
        const hit = await c.match(e.request);
        const net = fetch(e.request).then((r) => {
          if (r.ok) c.put(e.request, r.clone());
          return r;
        }).catch(() => hit);
        return hit || net;
      })
    );
    return;
  }
  if (e.request.mode === "navigate") {
    e.respondWith(fetch(e.request).catch(() => caches.match("./index.html")));
    return;
  }
  e.respondWith(
    caches.match(e.request).then((hit) => hit || fetch(e.request))
  );
});
