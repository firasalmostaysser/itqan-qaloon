/* Offline support for «الطريق إلى الإتقان». Quran data is cached once and served from the device;
   the cheikh's settings (state.json) are always fetched fresh when online. Videos are never cached. */
const VERSION = "itqan-v1";
const CORE = ["./", "index.html", "manifest.webmanifest", "data/meta.json", "data/glyphs.json", "data/site.json", "data/state.json", "icons/icon-192.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
const networkFirst = async (req) => {
  const c = await caches.open(VERSION);
  try { const res = await fetch(req); if (res.ok) c.put(req, res.clone()); return res; }
  catch (e) { const hit = await c.match(req, { ignoreSearch: true }); if (hit) return hit; throw e; }
};
const cacheFirst = async (req) => {
  const c = await caches.open(VERSION);
  const hit = await c.match(req, { ignoreSearch: true });
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) c.put(req, res.clone());
  return res;
};
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  if (/\.(mp4|webm|m4v|mov)$/i.test(url.pathname) || url.hostname.endsWith("archive.org") || url.hostname === "api.github.com") return;
  if (url.origin === location.origin) {
    if (url.pathname.endsWith("/data/state.json") || e.request.mode === "navigate" || url.pathname.endsWith("/index.html")) { e.respondWith(networkFirst(e.request)); return; }
    e.respondWith(cacheFirst(e.request));
    return;
  }
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") e.respondWith(cacheFirst(e.request));
});
