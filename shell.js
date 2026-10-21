/* ITS OT Tools — shared shell for the single installable app.
   - registers the one service worker at the app root (/ot-tools/)
   - removes the retired per-tool service workers (/screener/, /eval/) and ONLY their caches
   - adds the Home / Screener / Evaluation switcher (saves first) and the old-icon notice
   Never reads or changes saved data (localStorage) except the tools' own save-now hook. */
(function () {
  "use strict";
  const me = document.currentScript, ROOT = new URL("./", me.src).href, TOOL = me.dataset.tool || "home";
  const NAV = "its_ot_tools_nav"; // sessionStorage: set when this window was opened at Home or via the switcher
  if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
    navigator.serviceWorker.register(ROOT + "sw.js", { scope: ROOT }).catch(() => {});
    navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => { if (/\/(screener|eval)\/$/.test(r.scope)) r.unregister(); })).catch(() => {});
    if (window.caches) caches.keys().then(ks => ks.filter(k => /^its-ot-(screener|eval)-/.test(k)).forEach(k => caches.delete(k))).catch(() => {});
  }
  const ss = { get: k => { try { return sessionStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { sessionStorage.setItem(k, v); } catch (e) { /* private mode */ } } };
  if (TOOL === "home") { ss.set(NAV, "1"); return; }
  const arrivedDirect = !ss.get(NAV) || /\/index\.html$/.test(location.pathname); // old home-screen icons open .../screener/index.html or .../eval/index.html
  ss.set(NAV, "1");
  function go(href) { // save first, then switch
    const a = document.activeElement; if (a && a.blur) a.blur();
    setTimeout(() => { try { if (window.__itsFlush) window.__itsFlush(); } catch (e) { /* keep going */ } location.href = href; }, 60);
  }
  function mount() {
    const items = [["home", "Home", ROOT], ["screener", "Screener", ROOT + "screener/"], ["eval", "Evaluation", ROOT + "eval/"]];
    const nav = document.createElement("nav"); nav.className = "ots-switch no-print"; nav.setAttribute("aria-label", "OT Tools");
    nav.innerHTML = items.map(([k, l, h]) => `<a href="${h}" data-ots="${k}"${k === TOOL ? ' aria-current="page"' : ""}>${k === "home" ? '<span aria-hidden="true">⌂</span> ' : ""}${l}</a>`).join("");
    nav.addEventListener("click", e => { const a = e.target.closest("a[data-ots]"); if (!a || e.metaKey || e.ctrlKey) return; e.preventDefault(); if (a.dataset.ots !== TOOL) go(a.href); });
    const bar = document.querySelector(".top-b") || document.querySelector("header.top"); // .top-b is the tools' sticky bar
    if (bar) bar.insertBefore(nav, bar.firstChild); else document.body.insertBefore(nav, document.body.firstChild);
    if (arrivedDirect && !ss.get("its_ot_tools_banner_closed")) {
      const b = document.createElement("div"); b.className = "ots-banner no-print"; b.setAttribute("role", "status");
      b.innerHTML = `<span>OT Tools is now one app. Add the new icon from the <a href="${ROOT}">home page</a>.</span><button type="button" aria-label="Dismiss">×</button>`;
      b.querySelector("button").onclick = () => { ss.set("its_ot_tools_banner_closed", "1"); b.remove(); };
      document.body.insertBefore(b, document.body.firstChild);
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount); else mount();
})();
