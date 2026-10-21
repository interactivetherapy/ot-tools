/* ITS OT Tools — the single offline cache for the whole app (Home, Screener, Evaluation).
   Caches the blank app files only. Saved data lives in localStorage and is never sent anywhere or touched here. */
const CACHE = "its-ot-tools-v1.0"; // build 8139971075
const FILES = [
"./",
"./screener/",
"./eval/",
"./eval/app.js",
"./eval/config.js",
"./eval/icons/apple-touch-icon.png",
"./eval/icons/favicon.png",
"./eval/icons/icon-192.png",
"./eval/icons/icon-512.png",
"./eval/icons/logo-badge.png",
"./eval/icons/logo.png",
"./eval/index.html",
"./eval/styles.css",
"./icons/apple-touch-icon.png",
"./icons/favicon.png",
"./icons/icon-192.png",
"./icons/icon-512.png",
"./icons/logo-badge.png",
"./icons/logo.png",
"./index.html",
"./manifest.webmanifest",
"./screener/app.js",
"./screener/config.js",
"./screener/icons/apple-touch-icon.png",
"./screener/icons/favicon.png",
"./screener/icons/icon-192.png",
"./screener/icons/icon-512.png",
"./screener/icons/logo-badge.png",
"./screener/icons/logo.png",
"./screener/index.html",
"./screener/styles.css",
"./shell.css",
"./shell.js"
];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(u => new Request(u, { cache: "reload" }))))); self.skipWaiting(); });
self.addEventListener("activate", e => { e.waitUntil((async () => {
  // delete only this app's caches: older OT Tools versions and the retired per-tool caches
  const ks = await caches.keys(); await Promise.all(ks.filter(k => k !== CACHE && /^its-ot-(tools|screener|eval)-/.test(k)).map(k => caches.delete(k)));
  await self.clients.claim();
})()); });
self.addEventListener("fetch", e => {
  const r = e.request; if (r.method !== "GET" || !r.url.startsWith(self.registration.scope)) return;
  e.respondWith(caches.match(r, { ignoreSearch: true }).then(hit => hit || fetch(r).catch(() => r.mode === "navigate" ? caches.match("./") : Response.error())));
});
