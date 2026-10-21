/* Retired. OT Tools is now one app with one service worker at the app root (../sw.js).
   This worker replaces the old screener worker for anyone who still has it: it deletes ONLY the old
   "its-ot-screener-*" caches, unregisters itself, and reloads open screener pages once. Saved data (localStorage) is never touched. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil((async () => {
  const ks = await caches.keys(); await Promise.all(ks.filter(k => k.startsWith("its-ot-screener-")).map(k => caches.delete(k)));
  await self.clients.claim().catch(() => {});
  await self.registration.unregister();
  const cs = await self.clients.matchAll({ type: "window" });
  cs.forEach(c => { if (!/[?&]m=1/.test(c.url)) c.navigate(c.url + (c.url.includes("?") ? "&" : "?") + "m=1").catch(() => {}); });
})()));
