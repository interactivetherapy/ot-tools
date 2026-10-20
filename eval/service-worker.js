/* Offline cache for the blank app shell only. Patient data lives in localStorage and is never sent anywhere. */
const CACHE = "its-ot-eval-v1.3";
const FILES = ["./", "./index.html", "./styles.css", "./config.js", "./app.js", "./manifest.json",
  "./icons/icon-192.png", "./icons/icon-512.png", "./icons/apple-touch-icon.png", "./icons/favicon.png", "./icons/logo.png", "./icons/logo-badge.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k.startsWith(CACHE.replace(/v[\d.]+$/, ""))).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener("fetch", e => { if (e.request.method !== "GET") return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(r => r || fetch(e.request))); });
