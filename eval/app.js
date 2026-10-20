/* ITS OT Evaluation — app logic. Local only: no network calls; autosaves to localStorage. */
(function () {
"use strict";
const C = CONFIG, KEY = "its-ot-eval-v1", IKEY = "its-ot-eval-home-ideas-v1";
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const optL = o => typeof o === "string" ? o : o.l;
const todayISO = () => { const d = new Date(); return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
/* ---------- Clinician profiles & signatures (this device only; localStorage; never auto-applied) ---------- */
const PKEY = "its_clinician_profiles_v1";
function profStore() { try { const j = JSON.parse(localStorage.getItem(PKEY)); if (j && Array.isArray(j.profiles)) return j; } catch (e) { /* ignore */ } return { profiles: [], inJson: false }; }
function profSave(st) { localStorage.setItem(PKEY, JSON.stringify(st)); }
const profGet = id => profStore().profiles.find(p => p.id === id) || null;
const profLine = p => p ? (p.name || "") + (p.cred ? ", " + p.cred : "") : "";
// PIN is a convenience lock against accidental use on a shared tablet, not strong security.
function pinHash(pin, salt) { let h = 0x811c9dc5; const s = salt + "|" + pin; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16); }
const sigFmt = d => { const m = /^(\d{4})-(\d\d)-(\d\d)$/.exec(d || ""); return m ? `${m[2]}/${m[3]}/${m[1]}` : (d || ""); };
const sigBy = doc => (S.signBy = S.signBy || {})[doc] || null;
function sigBlock(doc, label) {
  const b = sigBy(doc), st = profStore(), p = b && b.pid ? st.profiles.find(x => x.id === b.pid) : null, man = b && b.manual != null;
  const signed = !!(p || (man && b.manual.trim())), dt = (S.signDate = S.signDate || {})[doc] || todayISO();
  const val = p ? p.id : man ? "__manual" : "";
  const pick = `<div class="sigctl no-print"><label><span class="lbl">Signed by</span><select data-sigpick="${doc}" aria-label="Signed by"><option value="">Select clinician</option>${st.profiles.map(x => `<option value="${esc(x.id)}"${x.id === val ? " selected" : ""}>${esc(profLine(x))}${x.pin ? " (PIN)" : ""}</option>`).join("")}<option value="__manual"${val === "__manual" ? " selected" : ""}>Type name by hand (not saved)</option><option value="__add">+ Add clinician</option></select></label>
    ${man ? `<label><span class="lbl">Name and credentials</span><input type="text" maxlength="90" data-sigman="${doc}" value="${esc(b.manual)}" placeholder="Name, credentials"></label>` : ""}
    ${signed ? `<label><span class="lbl">Date</span><input type="date" data-sigdate="${doc}" value="${esc(dt)}"></label>` : ""}<button type="button" class="link" data-act="sigmanage">Manage clinicians</button></div>`;
  if (!signed) return pick + `<div class="sigblk unsigned"><div><span class="sline"></span>${esc(label)}</div><div><span class="sline"></span>Date</div></div>`;
  const who = p ? profLine(p) : b.manual.trim();
  return pick + `<div class="sigblk signed" data-doc="${doc}"><div>${p && p.img ? `<img class="sigimg" src="${esc(p.img)}" alt="Signature of ${esc(p.name)}">` : `<span class="sigsp"></span>`}<span class="sline"></span><span class="sname">${esc(who)}</span>${p && p.lic ? `<span class="slic"> · License # ${esc(p.lic)}</span>` : ""}</div><div><span class="sdate">${esc(sigFmt(dt))}</span><span class="sline"></span>Date</div></div>`;
}
function sigModal(html) { const d = document.createElement("div"); d.className = "modal sigmodal"; d.innerHTML = `<div class="mbox">${html}</div>`; document.body.appendChild(d); d.addEventListener("keydown", e => { if (e.key === "Escape") d.remove(); }); return d; }
function askPin(p, ok, no) {
  const d = sigModal(`<h2>Enter PIN</h2><p class="muted">${esc(profLine(p))} protected this signature with a 4-digit PIN.</p><input type="password" inputmode="numeric" maxlength="4" pattern="[0-9]*" id="pinIn" autocomplete="off"><p class="err muted" id="pinErr"></p><div class="actions"><button type="button" class="btn" id="pinOk">Sign</button><button type="button" class="btn ghost" id="pinNo">Cancel</button></div>`);
  const inp = d.querySelector("#pinIn"); inp.focus();
  const go = () => { if (pinHash(inp.value, p.id) === p.pin) { d.remove(); ok(); } else { d.querySelector("#pinErr").textContent = "PIN does not match."; inp.value = ""; inp.focus(); } };
  d.querySelector("#pinOk").onclick = go; inp.addEventListener("keydown", e => { if (e.key === "Enter") go(); });
  d.querySelector("#pinNo").onclick = () => { d.remove(); no(); };
}
function sigApply(doc, v) {
  const set = x => { S.signBy = S.signBy || {}; if (x) S.signBy[doc] = x; else delete S.signBy[doc]; save(); sigRedraw(); };
  if (!v) return set(null);
  if (v === "__manual") return set({ manual: "" });
  if (v === "__add") { sigRedraw(); return editProfile(null, id => { const p = profGet(id); if (p && !p.pin) set({ pid: id }); else if (p) askPin(p, () => set({ pid: id }), sigRedraw); }); }
  const p = profGet(v); if (!p) return set(null);
  if (p.pin) askPin(p, () => set({ pid: v }), sigRedraw); else set({ pid: v });
}
function trimSig(src) { // crop to the ink, make near-white transparent, scale down
  const w = src.width, h = src.height, g = src.getContext("2d"), im = g.getImageData(0, 0, w, h), a = im.data; let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = (y * w + x) * 4; const ink = a[i + 3] > 24 && (a[i] < 225 || a[i + 1] < 225 || a[i + 2] < 225); if (!ink) a[i + 3] = 0; else { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } }
  if (x1 < 0) return null; g.putImageData(im, 0, 0);
  const pad = 4, cw = x1 - x0 + 1 + pad * 2, ch = y1 - y0 + 1 + pad * 2, k = Math.min(1, 480 / cw, 150 / ch), o = document.createElement("canvas");
  o.width = Math.max(1, Math.round(cw * k)); o.height = Math.max(1, Math.round(ch * k)); o.getContext("2d").drawImage(src, x0 - pad, y0 - pad, cw, ch, 0, 0, o.width, o.height);
  return o.toDataURL("image/png");
}
function editProfile(id, done) {
  const st = profStore(), p = id ? st.profiles.find(x => x.id === id) : null;
  const d = sigModal(`<h2>${p ? "Edit clinician" : "Add clinician"}</h2><p class="muted">Saved on this device only. Never added to the shared apps or to exports unless you choose.</p>
  <div class="grid2"><label><span class="lbl">Clinician name</span><input type="text" id="spName" maxlength="60" value="${esc(p ? p.name : "")}"></label><label><span class="lbl">Credentials</span><input type="text" id="spCred" maxlength="60" placeholder="e.g. OTR/L, BCBA" value="${esc(p ? p.cred : "")}"></label>
  <label><span class="lbl">License # (optional)</span><input type="text" id="spLic" maxlength="30" value="${esc(p ? p.lic : "")}"></label><label><span class="lbl">4-digit PIN to apply signature (optional)</span><input type="password" id="spPin" inputmode="numeric" maxlength="4" autocomplete="new-password" placeholder="${p && p.pin ? "PIN set; type to change" : "Off"}"></label></div>
  ${p && p.pin ? `<label class="chk"><input type="checkbox" id="spPinOff"> Remove PIN</label>` : ""}
  <div class="lbl">Signature: draw below (finger, stylus or mouse) or upload an image</div>
  <canvas id="spCan" width="900" height="260" class="sigcan" aria-label="Signature drawing area"></canvas>
  <div class="actions"><button type="button" class="btn sm ghost" id="spUndo">Undo stroke</button><button type="button" class="btn sm ghost" id="spClear">Clear</button><label class="btn sm ghost">Upload PNG/JPG<input type="file" id="spFile" accept="image/png,image/jpeg" hidden></label></div>
  <p class="err muted" id="spErr"></p>
  <div class="actions"><button type="button" class="btn" id="spSave">Save clinician</button><button type="button" class="btn ghost" id="spCancel">Cancel</button></div>`);
  const cv = d.querySelector("#spCan"), g = cv.getContext("2d"); let strokes = [], bg = null, cur = null;
  const draw = () => { g.clearRect(0, 0, cv.width, cv.height); if (bg) { const k = Math.min(cv.width / bg.width, cv.height / bg.height); g.drawImage(bg, (cv.width - bg.width * k) / 2, (cv.height - bg.height * k) / 2, bg.width * k, bg.height * k); }
    g.lineWidth = 4; g.lineCap = "round"; g.lineJoin = "round"; g.strokeStyle = "#1a2a4a"; strokes.forEach(s => { g.beginPath(); s.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); if (s.length === 1) g.lineTo(s[0][0] + .1, s[0][1]); g.stroke(); }); };
  const loadImg = (src, cb) => { const im = new Image(); im.onload = () => cb(im); im.src = src; };
  if (p && p.img) loadImg(p.img, im => { bg = im; draw(); });
  const pt = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * cv.width / r.width, (e.clientY - r.top) * cv.height / r.height]; };
  cv.addEventListener("pointerdown", e => { e.preventDefault(); cv.setPointerCapture(e.pointerId); cur = [pt(e)]; strokes.push(cur); draw(); });
  cv.addEventListener("pointermove", e => { if (cur) { cur.push(pt(e)); draw(); } });
  const end = () => { cur = null; }; cv.addEventListener("pointerup", end); cv.addEventListener("pointercancel", end);
  d.querySelector("#spUndo").onclick = () => { if (strokes.length) strokes.pop(); else bg = null; draw(); };
  d.querySelector("#spClear").onclick = () => { strokes = []; bg = null; draw(); };
  d.querySelector("#spFile").onchange = e => { const f = e.target.files[0]; if (!f) return; if (!/^image\/(png|jpeg)$/.test(f.type)) { d.querySelector("#spErr").textContent = "Please choose a PNG or JPG image."; return; }
    const r = new FileReader(); r.onload = () => loadImg(r.result, im => { const t = document.createElement("canvas"); t.width = im.width; t.height = im.height; t.getContext("2d").drawImage(im, 0, 0); const u = trimSig(t); if (!u) { d.querySelector("#spErr").textContent = "No signature found in that image."; return; } loadImg(u, im2 => { bg = im2; strokes = []; draw(); }); }); r.readAsDataURL(f); };
  d.querySelector("#spCancel").onclick = () => d.remove();
  d.querySelector("#spSave").onclick = () => {
    const name = d.querySelector("#spName").value.trim(), pin = d.querySelector("#spPin").value.trim(), err = d.querySelector("#spErr");
    if (!name) { err.textContent = "Enter the clinician name."; return; } if (pin && !/^\d{4}$/.test(pin)) { err.textContent = "PIN must be exactly 4 digits."; return; }
    const t = document.createElement("canvas"); t.width = cv.width; t.height = cv.height; t.getContext("2d").drawImage(cv, 0, 0);
    const s2 = profStore(), pid = p ? p.id : "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const np = { id: pid, name, cred: d.querySelector("#spCred").value.trim(), lic: d.querySelector("#spLic").value.trim(), img: trimSig(t), pin: p && p.pin && !(d.querySelector("#spPinOff") || {}).checked ? p.pin : "" };
    if (pin) np.pin = pinHash(pin, pid);
    const i = s2.profiles.findIndex(x => x.id === pid); if (i >= 0) s2.profiles[i] = np; else s2.profiles.push(np);
    profSave(s2); d.remove(); sigRedraw(); if (done) done(pid); else sigManage();
  };
  d.querySelector("#spName").focus();
}
function sigManage() {
  document.querySelectorAll(".sigmodal").forEach(m => m.remove());
  const st = profStore();
  const d = sigModal(`<h2>Clinician signatures</h2><p class="muted">Saved on this device only. A signature is applied only when someone picks a clinician in a document's “Signed by” box.</p>
  ${st.profiles.length ? `<ul class="proflist">${st.profiles.map(p => `<li>${p.img ? `<img class="sigimg" src="${esc(p.img)}" alt="">` : `<span class="muted">(no signature image)</span>`}<span><b>${esc(profLine(p))}</b>${p.lic ? " · License # " + esc(p.lic) : ""}${p.pin ? " · PIN on" : ""}</span><button type="button" class="btn sm ghost" data-pedit="${esc(p.id)}">Edit</button><button type="button" class="btn sm ghost" data-pdel="${esc(p.id)}">Delete</button></li>`).join("")}</ul>` : `<p>No clinicians saved yet.</p>`}
  <label class="chk"><input type="checkbox" id="spJson"${st.inJson ? " checked" : ""}> Include the signing clinician's saved signature in JSON exports (off by default)</label>
  <div class="actions"><button type="button" class="btn" id="spAdd">+ Add clinician</button><button type="button" class="btn ghost" id="spClose">Done</button></div>`);
  d.querySelector("#spAdd").onclick = () => { d.remove(); editProfile(null); };
  d.querySelector("#spClose").onclick = () => d.remove();
  d.querySelector("#spJson").onchange = e => { const s2 = profStore(); s2.inJson = e.target.checked; profSave(s2); };
  d.querySelectorAll("[data-pedit]").forEach(b => b.onclick = () => { const id = b.dataset.pedit, p = profGet(id); d.remove(); if (p.pin) askPin(p, () => editProfile(id), sigManage); else editProfile(id); });
  d.querySelectorAll("[data-pdel]").forEach(b => b.onclick = () => { const id = b.dataset.pdel, p = profGet(id);
    const del = () => { if (!confirm(`Delete ${profLine(p)} from this device?`)) return sigManage(); const s2 = profStore(); s2.profiles = s2.profiles.filter(x => x.id !== id); profSave(s2); sigRedraw(); sigManage(); };
    d.remove(); if (p.pin) askPin(p, del, sigManage); else del(); });
}
function sigExport(o) { // adds the signing clinicians' profiles only when the option is ticked
  const st = profStore(); if (!st.inJson) return o;
  const ids = Object.values(o.signBy || {}).map(b => b && b.pid).filter(Boolean), ps = st.profiles.filter(p => ids.includes(p.id));
  return ps.length ? Object.assign({}, o, { clinicianProfiles: ps }) : o;
}
function sigImport(j) { const ps = j && j.clinicianProfiles; if (j) delete j.clinicianProfiles; if (!Array.isArray(ps) || !ps.length) return;
  const st = profStore(), add = ps.filter(p => p && p.id && p.name && !st.profiles.some(x => x.id === p.id)); if (!add.length) return;
  if (confirm(`This file includes saved signature(s) for ${add.map(profLine).join("; ")}. Save to this device?`)) { st.profiles = st.profiles.concat(add.map(p => ({ id: String(p.id), name: String(p.name), cred: String(p.cred || ""), lic: String(p.lic || ""), img: /^data:image\/png;base64,/.test(p.img || "") ? p.img : null, pin: String(p.pin || "") }))); profSave(st); } }
document.addEventListener("change", e => { const t = e.target, D = t.dataset || {};
  if (D.sigpick) { sigApply(D.sigpick, t.value); e.stopImmediatePropagation(); }
  else if (D.sigdate) { (S.signDate = S.signDate || {})[D.sigdate] = t.value || todayISO(); save(); sigRedraw(); e.stopImmediatePropagation(); }
  else if (D.sigman) { S.signBy[D.sigman] = { manual: t.value }; save(); sigRedraw(); e.stopImmediatePropagation(); } }, true);
document.addEventListener("click", e => { const b = e.target.closest && e.target.closest("[data-act=sigmanage]"); if (b) { e.stopImmediatePropagation(); sigManage(); } }, true);
function sigRedraw() { setTimeout(render, 0); }
const RANK = { Typical: 0, Monitor: 1, Concern: 2 }, STS = ["Typical", "Monitor", "Concern"];
const SEC = Object.fromEntries(C.sections.map(s => [s.id, s]));
const listJoin = l => l.length < 2 ? l.join("") : l.slice(0, -1).join(", ") + (l.length > 2 ? "," : "") + " and " + l[l.length - 1];
const ord = n => { n = Math.round(+n); const s = ["th", "st", "nd", "rd"], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
function blank() {
  return { v: 1, meta: { initials: "", dob: "", date: todayISO(), clinician: "", setting: [], informants: [], reason: [], reasonText: "", dx: [], dxText: "", refSource: "", svcNow: [], svcPast: [] },
    bandOv: "auto", olderAll: false, secBand: {}, secAuto: {}, older: {}, younger: {}, ans: {}, prompt: {}, pcount: {}, trials: {}, val: {}, src: {}, opts: {}, sel: {}, tr: {},
    behav: { none: false, f: {}, long: {} }, wcOn: false, scores: {}, domOv: {}, screener: null, refs: {},
    rep: { sec: {}, gen: null }, rec: { svc: "Recommended", freq: "1–2x/week", len: "45-minute", dur: "6 months", setting: "clinic", home: true, cg: true, reeval: "6 months", prog: "Good", factors: ["consistent attendance", "caregiver carryover of the home program"] },
    goals: {}, parent: { home: [], shared: [], text: null, addl: "" }, guide: {}, notes: "", sign: "", fromScreener: null, scrNotes: "", gfbOn: true, inote: {}, edits: {}, restore: {}, tab: "form", updated: null };
}
function merge(a, b) { for (const k in b) { if (b[k] && typeof b[k] === "object" && !Array.isArray(b[k]) && a[k] && typeof a[k] === "object" && !Array.isArray(a[k])) merge(a[k], b[k]); else a[k] = b[k]; } return a; }
let S = (() => { try { const j = JSON.parse(localStorage.getItem(KEY)); if (j && j.v === 1) return merge(blank(), j); } catch (e) {} return blank(); })();
let saveT; function save() { S.updated = new Date().toISOString(); clearTimeout(saveT); saveT = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(S)); flash("Saved on this device"); } catch (e) { flash("Could not save — export JSON"); } }, 150); }
function flash(t) { const el = $("#savestate"); if (el) { el.textContent = t; el.classList.add("on"); clearTimeout(flash.t); flash.t = setTimeout(() => el.classList.remove("on"), 1300); } }
/* ---------- age / bands ---------- */
function age() { const m = S.meta; if (!m.dob) return null; const a = new Date(m.dob + "T00:00"), b = new Date((m.date || todayISO()) + "T00:00");
  let mo = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()); if (b.getDate() < a.getDate()) mo--; if (mo < 0 || isNaN(mo)) return null;
  const y = Math.floor(mo / 12); return { mo, y, m: mo % 12, yrs: mo / 12, txt: y + ";" + (mo % 12), band: y < 3 ? 0 : y < 6 ? 1 : y < 13 ? 2 : 3 }; }
function childBand() { if (S.bandOv !== "auto") return +S.bandOv; const a = age(); return a ? a.band : 1; }
function bandLabel(b) { const a = age(); return C.bands[b].label + (b === 0 && a && a.y === 2 && S.bandOv === "auto" ? " (early preschool)" : ""); }
function range(r) { return ({ "0–3": [0, 0], "3–5": [1, 1], "3–12": [1, 2], "3–18": [1, 3], "6–18": [2, 3], "6–12": [2, 2], "0–12": [0, 2], "0–5": [0, 1], "13–18": [3, 3] })[r] || [0, 3]; }
const workBand = id => S.secBand[id] != null ? S.secBand[id] : childBand();
const perfBlocks = id => SEC[id].blocks.filter(b => b.t === "perf"), perfItems = id => perfBlocks(id).flatMap(b => b.items);
const freqItems = id => SEC[id].blocks.filter(b => b.t === "freq").flatMap(b => b.items);
const atAge = (i, b = childBand()) => { const [lo, hi] = range(i.r); return b >= lo && b <= hi; };
const has = (id, v) => (S.opts[id] || []).includes(v);
const srcOf = id => S.src[id] || "O";
const heavy = id => C.heavyPrompts.includes(S.prompt[id]);
const isNS = id => S.ans[id] === "NS" || (heavy(id) && S.ans[id] && !["NA", "NO"].includes(S.ans[id]));
const fFlag = i => i.pos ? ["N", "R"].includes(S.ans[i.id]) : ["O", "A"].includes(S.ans[i.id]);
const activeSecs = () => C.sections.filter(s => (!s.optional || S.wcOn) && (s.id !== "GFB" || S.gfbOn !== false));
/* ---------- scores ---------- */
function testApplies(t) { const a = age(); return !a || (a.yrs >= t.age[0] && a.yrs <= t.age[1]); }
const sc = t => S.scores[t] || (S.scores[t] = { adm: "", r: {}, s: {} });
function autoDesc(t, ss) { if (ss === "" || ss == null || isNaN(+ss)) return ""; const d = t.desc.find(x => +ss >= x[0]); return d ? d[1] : ""; }
const rowDesc = (t, rid) => { const r = sc(t.id).r[rid] || {}; return r.d || autoDesc(t, r.ss); };
const descBand = d => C.belowDesc.includes(d) ? "below" : C.aboveDesc.includes(d) ? "above" : d ? "avg" : "";
function testRows(secId) { // entered composite/standard rows mapped to a section (or all when secId null)
  const out = [];
  C.tests.forEach(t => { if (!testApplies(t) || sc(t.id).adm === "no") return;
    t.rows.forEach(([rid, l, sec]) => { const r = sc(t.id).r[rid]; if (r && r.ss !== "" && r.ss != null && (secId == null || sec === secId)) out.push({ t, rid, l, sec, ss: +r.ss, pr: r.pr, d: rowDesc(t, rid), kind: "ss" }); });
    (t.sub || []).forEach(([rid, l, sec]) => { const v = sc(t.id).s[rid]; if (v !== "" && v != null && (secId == null || sec === secId)) out.push({ t, rid, l, sec, ss: +v, kind: "scale" }); }); });
  return out;
}
/* ---------- section status ---------- */
function autoStatus(sec) {
  const why = []; let st = 0; const bump = (n, w) => { if (w) why.push(w); st = Math.max(st, n); };
  if (sec.id === "WC") {
    const fl = ["Posterior tilt", "Anterior tilt", "Obliquity", "Rotation"].filter(v => has("wcPelvis", v)).length + ["Lateral trunk lean", "Forward trunk lean / kyphosis", "Head needs support", "Feet unsupported", "Hip / knee contractures"].filter(v => has("wcTrunk", v)).length
      + (has("wcSit", "Needs support to sit") ? 1 : 0) + (has("wcSkin", "Current pressure area") ? 2 : 0) + (has("wcFit", "Outgrown / too small") ? 1 : 0) + (has("wcCare", "Lifting is getting difficult") ? 1 : 0)
      + C.transferTypes.filter(t => ["Mod assist", "Max assist", "Dependent"].includes((S.tr[t] || {}).a)).length + ["Home: stairs / doorway barriers", "Bathroom not accessible", "School: access barriers"].filter(v => has("wcAccess", v)).length;
    if (fl >= 3) bump(2, fl + " seating / mobility flags"); else if (fl) bump(1, fl + " seating / mobility flag(s)");
  } else {
    const items = perfItems(sec.id).filter(i => atAge(i)); let ns = 0, e = 0; items.forEach(i => { if (isNS(i.id)) ns++; else if (S.ans[i.id] === "E") e++; });
    if (ns >= 2) bump(2, ns + " age-expected items need support"); else if (ns) bump(1, "1 age-expected item needs support"); if (e >= 2) bump(1, e + " age-expected items emerging");
    const fi = freqItems(sec.id), fl = fi.filter(fFlag).length, mi = fi.filter(i => S.ans[i.id] === "S").length;
    if (fl >= 2) bump(2, fl + " responses often/always (or rarely for expected responses)"); else if (fl) bump(1, "1 response often/always"); if (mi >= 2) bump(1, mi + " responses sometimes");
    if (sec.id === "GFB") { const fr = (S.opts.gfFrus || []).filter(v => v !== "None observed"), n = S.sel.gfFrusN || "";
      if (n === "6+ per session") bump(2, "frustration behaviors 6+ per session"); else if (n === "3–5 per session" || fr.length >= 2) bump(1, "frustration behaviors observed");
      if (["3–5", "6+"].includes(S.sel.gfOos)) bump(1, "out-of-seat episodes " + S.sel.gfOos); }
    if (sec.id === "GM" && (S.opts.gmSeen || []).length >= 2) bump(1, (S.opts.gmSeen || []).length + " postural / movement observations");
    if (sec.id === "SOC" && !S.behav.none) { const f = Object.values(S.behav.f), hi = f.filter(v => ["3–5 per session", "6+ per session"].includes(v)).length;
      if (hi >= 2 || f.includes("6+ per session")) bump(2, "regulation behaviors 3+ per session"); else if (hi || f.length >= 2) bump(1, "regulation behaviors observed"); }
    testRows(sec.id).forEach(r => { if (r.kind === "ss") { if (C.severeDesc.includes(r.d)) bump(2, r.t.l + " " + r.l + ": " + r.d); else if (C.belowDesc.includes(r.d)) bump(1, r.t.l + " " + r.l + ": " + r.d); } else if (r.ss <= 10) bump(1, r.t.l + " " + r.l + " scale score " + r.ss); });
  }
  return { st: STS[st], why };
}
function status(sec) { const a = autoStatus(sec), ov = S.domOv[sec.id] || ""; return { auto: a.st, why: a.why, ov, st: ov || a.st }; }
/* ---------- prefill import (from screener) ---------- */
function importPrefill(j) {
  const d = j.demographics || {}, m = S.meta;
  m.initials = d.initials || m.initials; m.dob = d.dob || m.dob; m.clinician = d.clinician || m.clinician;
  if (d.setting && !m.setting.includes(d.setting)) m.setting.push(d.setting);
  (d.informants || []).forEach(l => { const k = { Parent: "P", Teacher: "T", Other: "X" }[l]; if (k && !m.informants.includes(k)) m.informants.push(k); });
  if (j.referralConcern) m.reasonText = j.referralConcern; if (!m.reason.includes("Screener recommended full evaluation")) m.reason.push("Screener recommended full evaluation");
  if (!m.refSource) m.refSource = "ITS screener";
  const h = j.history || {}; (h.diagnoses || []).forEach(x => { const k = C.diagnoses.find(v => v === x || v.startsWith(x)); if (k && !m.dx.includes(k)) m.dx.push(k); });
  ["svcNow", "svcPast"].forEach(k => { const src = h[k === "svcNow" ? "servicesNow" : "servicesPast"]; if (src) m[k] = src.filter(v => C.services.includes(v)); });
  const sd = {}; (j.domains || []).forEach(x => { const sid = C.screenerMap[x.id]; if (sid) (sd[sid] = sd[sid] || []).push({ name: x.name, status: x.status, basis: x.basis || [] }); });
  S.screener = { date: d.screeningDate, outcome: j.outcome, domains: sd, concerns: j.concerns || [], priorities: j.priorities || [] };
  (j.referrals || []).forEach(r => { const id = C.screenerRefMap[r.referral || r]; if (id) S.refs[id] = true; });
  if ((h.mobility || []).some(v => v && v !== "No")) S.wcOn = true;
}
/* ---------- screener handoff (same device / same site) ---------- */
function readHandoffs() { try { const j = JSON.parse(localStorage.getItem(C.handoffKey)); if (j && j.items) return Object.values(j.items).sort((a, b) => (b.saved || "").localeCompare(a.saved || "")); } catch (e) {} return []; }
function isDirty() { const m = S.meta; return !!(m.initials.trim() || m.dob || Object.keys(S.ans).length || Object.keys(S.opts).length || testRows(null).length || Object.keys(S.edits || {}).length || S.fromScreener); }
let showPicker = false;
function applyScreenerItems(j) {
  const date = (j.demographics || {}).screeningDate || "", done = [], unmatched = [];
  (j.items || []).forEach(it => { const m = C.screenerItemMap[it.id];
    const v = m ? (m.conv === "posFreq" ? C.posFreqToPerf[it.rating] : it.rating) : null;
    if (!m || !v || S.ans[m.to]) { unmatched.push(`${it.label}: ${it.ratingLabel.toLowerCase()} (${(C.srcShort[it.source] || "Observed").toLowerCase()})${it.note ? "; note: " + it.note : ""}`); return; }
    S.ans[m.to] = v; if (C.itemSources.includes(it.source)) S.src[m.to] = it.source; const pr = C.screenerPromptMap[it.prompt]; if (pr) S.prompt[m.to] = pr; done.push(m.to);
    if (it.note) unmatched.push(`${it.label} (note): ${it.note}`); });
  const L = [`From screener (${date || "date not recorded"}). Review before finalizing.`];
  if ((j.priorities || []).length) L.push("Caregiver priorities: " + j.priorities.map(p => [((j.domains || []).find(d => d.id === p.dom) || {}).name || p.dom, p.routine, p.note].filter(Boolean).join(" — ")).filter(Boolean).join("; ") + ".");
  const b = j.behaviors || {}; if (b.none) L.push("Regulation behaviors on screener: none observed."); else if ((b.list || []).length) L.push("Regulation behaviors on screener: " + b.list.map(x => `${x.label.toLowerCase()} (${x.freq.toLowerCase()})`).join("; ") + ".");
  if ((j.referrals || []).length) L.push("Referral triggers noted on screener: " + j.referrals.map(r => `${r.referral}: ${r.reason}`).join("; ") + ".");
  if (unmatched.length) L.push("Screener items without a matching evaluation item: " + unmatched.join("; ") + ".");
  if ((j.nextSteps || []).length) L.push("Next steps selected on screener: " + j.nextSteps.join("; ") + ".");
  if (j.notes) L.push("Screener notes: " + j.notes);
  S.scrNotes = L.join("\n"); S.fromScreener = { date, items: done };
}
function loadScreener(j) {
  if (!j || j.type !== "ITS-OT-FullEval-Prefill") throw new Error("not a screener file");
  if (isDirty() && !confirm("An evaluation is already in progress on this device. Replace it with this screener's information? Export the current evaluation first if you need to keep it.")) return false;
  S = blank(); importPrefill(j); applyScreenerItems(j); showPicker = false; save(); render(); window.scrollTo(0, 0); flash("Loaded from screener — review marked items"); return true;
}
function pickerHtml() { const hs = readHandoffs(); if (!hs.length) return "";
  if (isDirty() && !showPicker) return `<div class="actions"><button type="button" class="btn ghost" data-act="showPicker">Load from screener (${hs.length})</button></div>`;
  return `<div class="picker"><div class="lbl">Load from screener</div><div class="muted small">Screeners marked "Evaluation" on this device. Choose one to pre-fill this evaluation, or just start entering to begin blank.</div>
  ${hs.map(h => `<button type="button" class="pick" data-act="loadHandoff" data-k="${esc(h.key)}"><b>${esc(h.name || "(no initials)")}</b><span>DOB ${esc(h.dob || "—")}</span><span>Screened ${esc(h.date || "—")}</span></button>`).join("")}</div>`; }
const fromMark = id => S.fromScreener && S.fromScreener.items.includes(id) ? `<span class="fromscr">From screener (${esc(S.fromScreener.date || "")})</span>` : "";

/* ---------- render helpers ---------- */
const chip = (act, attrs, label, on, tone) => `<button type="button" class="chip${on ? " on" : ""}${tone ? " t-" + tone : ""}" data-act="${act}" ${attrs} aria-pressed="${!!on}">${esc(label)}</button>`;
const sel = (bind, opts, cur, ph) => `<select data-bind="${bind}">${opts.map(o => { const k = typeof o === "string" ? o : o.k, l = typeof o === "string" ? (o || ph || "Select…") : o.l; return `<option value="${esc(k)}"${(cur || "") === k ? " selected" : ""}>${esc(l)}</option>`; }).join("")}</select>`;
function trialOpts() { const o = [{ k: "", l: "Trials…" }]; C.trialDen.forEach(y => { for (let x = 0; x <= y; x++) o.push({ k: x + "/" + y, l: x + " of " + y }); }); return o; }
const TRIALS = trialOpts();
const PCOUNT = [{ k: "", l: "Prompt count…" }].concat(C.promptCounts.map(n => ({ k: String(n), l: "Prompts ×" + n })));
function srcTag(id) { const s = srcOf(id); return `<button type="button" class="src s-${s}" data-act="src" data-id="${id}" data-src="${s}" aria-label="Source: ${esc(C.srcShort[s])}. Tap to change." title="Tap: Observed → Parent/Caregiver → Teacher">${esc(C.srcShort[s])}</button>`; }
function optsBlock(b) { const cur = S.opts[b.id] || [];
  return `<div class="row-opts"><div class="lbl">${esc(b.label)}</div><div class="chips">${b.opts.map(o => chip("opt", `data-g="${b.id}" data-v="${esc(optL(o))}" data-m="${b.multi ? 1 : 0}"`, optL(o), cur.includes(optL(o)))).join("")}</div></div>`; }
function selBlock(b) { return `<label class="row-sel"><span class="lbl">${esc(b.label)}</span>${sel("sel." + b.id, b.assist ? C.assist : b.opts, S.sel[b.id])}</label>`; }
function perfRow(i, b) { const v = S.ans[i.id];
  return `<div class="item${v ? " done" : ""}"><div class="ilbl">${esc(i.l)} <span class="band">${i.r === "All" ? "All ages" : i.r}</span>${fromMark(i.id)}${srcTag(i.id)}</div>
  <div class="chips rate">${C.perf.map(o => chip("rate", `data-id="${i.id}" data-v="${o.k}"`, o.l, v === o.k, o.tone)).join("")}</div>
  <div class="ictl">${sel("prompt." + i.id, C.prompts, S.prompt[i.id])}${sel("pcount." + i.id, PCOUNT, (S.pcount || {})[i.id])}${sel("trials." + i.id, TRIALS, S.trials[i.id])}${i.unit ? `<label class="val"><input type="text" inputmode="decimal" maxlength="12" placeholder="Count" data-bind="val.${i.id}" value="${esc(S.val[i.id] || "")}"><span>${esc(i.unit)}</span></label>` : ""}</div>${i.note ? `<input type="text" class="inote" maxlength="160" placeholder="Note (what was observed)" data-bind="inote.${i.id}" value="${esc(S.inote[i.id] || "")}">` : ""}</div>`; }
function perfBlock(b, sid) {
  const cb = childBand(), wb = workBand(sid), g = { at: [], yv: [], yh: [], old: [] };
  b.items.forEach(i => { const [lo, hi] = range(i.r); if (wb >= lo && wb <= hi) g.at.push(i); else if (hi < wb) (hi >= wb - 1 ? g.yv : g.yh).push(i); else g.old.push(i); });
  let h = typeof S.secAuto[sid] === "number" ? `<div class="banner">2+ misses in a row: working band moved to ${C.bands[wb].label}. <button type="button" class="link" data-act="undoband" data-sec="${sid}">Undo</button></div>` : "";
  h += `<div class="grp-h">Working band: ${C.bands[wb].label}${wb !== cb ? ` <span class="muted">(child's band ${C.bands[cb].label})</span>` : ""}<span class="bandpick">${C.bands.map(x => chip("sband", `data-sec="${sid}" data-b="${x.id}"`, x.label, x.id === wb, "sm")).join("")}</span></div>`;
  h += g.at.map(i => perfRow(i, b)).join("") || `<div class="muted pad">No items at this band.</div>`;
  const allPass = g.at.length && g.at.every(i => S.ans[i.id] === "I");
  if (g.yv.length) h += `<div class="grp-h">Younger skills — score if working below age</div>` + g.yv.map(i => perfRow(i, b)).join("");
  if (g.yh.length) h += (S.younger[sid] || g.yh.some(i => S.ans[i.id])) ? `<div class="grp-h">Earlier skills</div>` + g.yh.map(i => perfRow(i, b)).join("") : `<button type="button" class="more" data-act="younger" data-sec="${sid}">Show earlier items (${g.yh.length})</button>`;
  if (g.old.length) h += (S.older[sid] || S.olderAll || g.old.some(i => S.ans[i.id])) ? `<div class="grp-h">Older items</div>` + g.old.map(i => perfRow(i, b)).join("") : `<button type="button" class="more${allPass ? " offer" : ""}" data-act="older" data-sec="${sid}">${allPass ? "All passed — show older items" : "Show older items"} (${g.old.length})</button>`;
  return h;
}
function freqBlock(b) { return b.items.map(i => { const v = S.ans[i.id];
  return `<div class="item${v ? " done" : ""}${fFlag(i) ? " flagged" : ""}"><div class="ilbl">${esc(i.l)} <span class="band">${esc(i.sys)}</span>${fromMark(i.id)}${srcTag(i.id)}</div><div class="chips rate">${C.freq.map(o => { const bad = i.pos ? ["N", "R"].includes(o.k) : ["O", "A"].includes(o.k); return chip("rate", `data-id="${i.id}" data-v="${o.k}"`, o.l, v === o.k, bad ? "flag" : o.k === "S" ? "mid" : "ok"); }).join("")}</div></div>`; }).join(""); }
function behavBlock() { const B = S.behav;
  return `<div class="row-opts"><div class="lbl">Regulation behaviors observed (select, then count and longest episode)</div><div class="chips">${chip("behnone", "", "None observed", B.none, "ok")}${C.behaviors.map(b => chip("beh", `data-id="${b.id}"`, b.l, B.f[b.id] != null)).join("")}</div>
  ${C.behaviors.filter(b => B.f[b.id] != null).map(b => `<div class="item sub"><div class="ilbl">${esc(b.l)}</div><div class="ictl">${sel("behav.f." + b.id, C.behCount, B.f[b.id], "Count…")}${sel("behav.long." + b.id, C.behLong, B.long[b.id], "Longest…")}</div></div>`).join("")}</div>`; }
function transfersBlock() { return `<div class="row-opts"><div class="lbl">Transfers (assist level · equipment)</div>${C.transferTypes.map(t => `<div class="item sub"><div class="ilbl">${esc(t)}</div><div class="ictl">${sel("tr." + t + ".a", C.assist, (S.tr[t] || {}).a, "Assist level…")}${sel("tr." + t + ".e", C.transferEquip, (S.tr[t] || {}).e, "Equipment…")}</div></div>`).join("")}</div>`; }
function wcShow(b) { const t = (S.opts.wcType || [])[0] || "", chair = /wheelchair|stroller/i.test(t);
  if (b.id === "wcType") return true; if (!t) return false; if (b.chair && !chair) return false; if (b.manual && t !== "Manual wheelchair") return false; if (b.power && t !== "Power wheelchair") return false; if (b.t === "transfers") return t !== "Ambulatory (no device)"; return true; }
function headerBody() { const m = S.meta, a = age();
  return `<div class="grid4"><label><span class="lbl">Child initials / ID</span><input type="text" maxlength="20" autocomplete="off" data-bind="meta.initials" value="${esc(m.initials)}"></label>
    <label><span class="lbl">Date of birth</span><input type="date" data-bind="meta.dob" value="${esc(m.dob)}"></label><label><span class="lbl">Evaluation date</span><input type="date" data-bind="meta.date" value="${esc(m.date)}"></label>
    <div class="agebox"><span class="lbl">Age</span><div class="agev">${a ? a.txt + " <small>y;m</small>" : "—"}</div><div class="muted">${a ? "Band " + esc(bandLabel(childBand())) : "Enter DOB"}</div></div></div>
  ${pickerHtml()}<div class="actions"><button type="button" class="btn ghost" data-act="importPrefill">Import screener file</button>${S.screener ? `<span class="muted">Screener ${esc(S.screener.date || "")} imported · ${esc(S.screener.outcome || "")}</span>` : ""}</div>
  ${S.fromScreener ? `<div class="banner">From screener (${esc(S.fromScreener.date || "")}): ${S.fromScreener.items.length} item(s) pre-filled and marked. Please review each marked item and the notes below.</div>` : ""}
  ${S.fromScreener || S.scrNotes ? `<label class="row-text"><span class="lbl">Notes from screener (clinician only; not printed)</span><textarea rows="4" data-bind="scrNotes">${esc(S.scrNotes)}</textarea></label>` : ""}
  ${multiChips("Setting", "setting", C.settings)}${multiChips("Informants", "informants", C.informants)}
  ${multiChips("Reason for referral", "reason", C.reasons.map(r => ({ k: r, l: r })))}<label class="row-text"><span class="lbl">Referral details (optional)</span><input type="text" maxlength="200" data-bind="meta.reasonText" value="${esc(m.reasonText)}"></label>
  ${multiChips("Diagnosis", "dx", C.diagnoses.map(r => ({ k: r, l: r })))}<label class="row-text"><span class="lbl">Diagnosis details / precautions (optional)</span><input type="text" maxlength="160" data-bind="meta.dxText" value="${esc(m.dxText)}"></label>
  <div class="grid2"><label><span class="lbl">Referral source</span>${sel("meta.refSource", [""].concat(C.refSources), m.refSource)}</label><label><span class="lbl">Evaluator / credentials</span><input type="text" maxlength="60" data-bind="meta.clinician" value="${esc(m.clinician)}"></label></div>
  ${multiChips("Services now", "svcNow", C.services.map(r => ({ k: r, l: r })))}${multiChips("Services past", "svcPast", C.services.map(r => ({ k: r, l: r })))}
  <div class="grid2"><label><span class="lbl">Age band</span>${sel("bandOv", [{ k: "auto", l: "Auto from DOB" + (a ? " (" + C.bands[a.band].label + ")" : "") }].concat(C.bands.map(b => ({ k: String(b.id), l: "Override: " + b.label }))), S.bandOv)}</label><div></div></div>
  <div class="chips">${chip("olderAll", "", S.olderAll ? "Showing older items (all sections)" : "Show older items (all sections)", S.olderAll)}${chip("gfb", "", S.gfbOn !== false ? "General Functional Behavior section: ON" : "General Functional Behavior section: OFF", S.gfbOn !== false)}${chip("wc", "", S.wcOn ? "Wheelchair / Mobility section: ON" : "Add Wheelchair / Mobility & Equipment section", S.wcOn)}</div>`; }
function multiChips(label, key, opts) { const cur = S.meta[key]; return `<div class="row-opts"><div class="lbl">${esc(label)}</div><div class="chips">${opts.map(o => chip("meta", `data-k="${key}" data-v="${esc(o.k)}"`, o.l, cur.includes(o.k))).join("")}</div></div>`; }
function secBody(sec) {
  let h = "";
  if (S.screener && S.screener.domains[sec.id]) h += `<div class="screen-note"><b>From screener:</b> ${S.screener.domains[sec.id].map(x => esc(x.name + ": " + x.status)).join(" · ")}${(() => { const cs = S.screener.concerns.filter(c => (S.screener.domains[sec.id] || []).some(x => c.section && c.section.toLowerCase().includes(x.name.split(/[ &/]/)[0].toLowerCase()))); return cs.length ? `<ul>${cs.slice(0, 5).map(c => `<li>${esc(c.item)} — ${esc(c.rating)} (${esc(c.source)})</li>`).join("")}</ul>` : ""; })()}</div>`;
  h += sec.blocks.map(b => { if (sec.id === "WC" && !wcShow(b)) return "";
    return b.t === "opts" ? optsBlock(b) : b.t === "sel" ? selBlock(b) : b.t === "perf" ? perfBlock(b, sec.id) : b.t === "freq" ? freqBlock(b) : b.t === "behav" ? behavBlock() : b.t === "transfers" ? transfersBlock() : b.t === "text" ? `<label class="row-text"><span class="lbl">${esc(b.label)}</span><input type="text" maxlength="200" data-bind="sel.${b.id}" value="${esc(S.sel[b.id] || "")}"></label>` : ""; }).join("");
  const s = status(sec);
  h += `<div class="secstat"><span class="lbl">Section status</span><div class="chips">${STS.map(v => chip("domov", `data-d="${sec.id}" data-v="${v}"`, v + (s.auto === v ? " (auto)" : ""), s.st === v, v === "Concern" ? "flag" : v === "Monitor" ? "mid" : "ok")).join("")}</div><div class="why">${s.ov ? "<b>Override.</b> " : ""}${esc(s.why.join(" · ") || "No flags")}</div></div>
  <label class="row-text"><span class="lbl">Section note (optional)</span><input type="text" maxlength="200" data-bind="notesSec.${sec.id}" value="${esc((S.notesSec || {})[sec.id] || "")}"></label>`;
  return h;
}
function renderSection(id) {
  const el = document.getElementById("sec-" + id); if (!el) return;
  if (id === "HDR") { el.innerHTML = `<div class="sec-h"><span class="num">●</span><h2>Client &amp; Referral</h2></div><div class="sec-b">${headerBody()}</div>`; return; }
  const sec = SEC[id], st = status(sec).st, sc0 = S.screener && S.screener.domains[id];
  el.innerHTML = `<div class="sec-h"><span class="num">${sec.n}</span><h2>${esc(sec.title)}</h2>${sc0 ? `<span class="pill scr">Screener: ${esc(sc0.map(x => x.status).join("/"))}</span>` : ""}<span class="pill st-${st}">${st}</span></div><div class="sec-b">${secBody(sec)}</div>`;
}
function renderForm() {
  $("#form").innerHTML = `<section id="sec-HDR" class="sec"></section>` + activeSecs().map(s => `<section id="sec-${s.id}" class="sec"></section>`).join("");
  renderSection("HDR"); activeSecs().forEach(s => renderSection(s.id)); renderBar();
}
function renderBar() {
  const a = age();
  $("#childbar").innerHTML = `<span><b>${esc(S.meta.initials || "Child")}</b> · ${a ? a.txt : "age —"} · band ${esc(bandLabel(childBand()))} <span id="savestate" class="savestate"></span></span><span class="pills">${activeSecs().map(s => `<span class="pill sm st-${status(s).st}" title="${esc(s.title)}">${s.id}</span>`).join("")}</span>`;
  $("#nav").innerHTML = `<a href="#sec-HDR">Client</a>` + activeSecs().map(s => `<a href="#sec-${s.id}">${s.n}. ${esc(s.title.split(/[&(/]/)[0].trim())}</a>`).join("");
}
/* ---------- scores tab ---------- */
function renderScores() {
  const a = age();
  $("#scores").innerHTML = `<div class="sec"><div class="sec-h"><span class="num">#</span><h2>Standardized Scores</h2></div><div class="sec-b"><p class="note">Enter scores from the publisher's manual or scoring software. Descriptive categories fill in from each test's published ranges; tap a category to override. Only tests that fit the child's age are shown${a ? "" : " (enter DOB to filter by age)"}.</p>
  ${C.tests.map(t => { const s = sc(t.id); if (!testApplies(t)) return `<div class="test off"><b>${esc(t.l)}</b> <span class="muted">— not age-applicable</span></div>`;
    const rows = t.rows.map(([rid, l]) => { const r = s.r[rid] || {}, ad = autoDesc(t, r.ss); return `<tr><td>${esc(l)}</td><td><input type="text" inputmode="numeric" maxlength="3" data-bind="scores.${t.id}.r.${rid}.ss" value="${esc(r.ss || "")}" aria-label="${esc(l)} standard score"></td><td><input type="text" inputmode="numeric" maxlength="4" data-bind="scores.${t.id}.r.${rid}.pr" value="${esc(r.pr || "")}" aria-label="${esc(l)} percentile"></td><td>${sel(`scores.${t.id}.r.${rid}.d`, [{ k: "", l: ad ? "Auto: " + ad : "—" }].concat(t.desc.map(d => ({ k: d[1], l: d[1] }))), r.d)}</td></tr>`; }).join("");
    const subs = (t.sub || []).map(([rid, l]) => `<tr><td>${esc(l)}</td><td><input type="text" inputmode="numeric" maxlength="2" data-bind="scores.${t.id}.s.${rid}" value="${esc(s.s[rid] || "")}" aria-label="${esc(l)} scale score"></td><td colspan="2" class="muted">scale score (mean 15)</td></tr>`).join("");
    return `<div class="test"><div class="test-h"><b>${esc(t.l)}</b><span class="chips">${chip("adm", `data-t="${t.id}" data-v="yes"`, "Administered", s.adm === "yes", "ok")}${chip("adm", `data-t="${t.id}" data-v="no"`, "Not administered", s.adm === "no", "neu")}</span></div>
    ${s.adm === "no" ? "" : `<div class="tscroll"><table class="scoret"><thead><tr><th>${t.kind === "bot" ? "Composite" : "Domain / score"}</th><th>Std. score</th><th>%ile</th><th>Descriptive category</th></tr></thead><tbody>${rows}</tbody>${subs ? `<thead><tr><th>Subtest</th><th>Scale</th><th colspan="2"></th></tr></thead><tbody>${subs}</tbody>` : ""}</table></div>`}</div>`; }).join("")}
  <label class="row-text"><span class="lbl">Testing conditions / validity notes (optional)</span><input type="text" maxlength="240" data-bind="notes" value="${esc(S.notes)}"></label></div></div>`;
}
/* ---------- text generation ---------- */
const Nm = () => S.meta.initials.trim() || "The child";
const nmMid = () => S.meta.initials.trim() || "the child";
const pcnt = id => { const n = (S.pcount || {})[id]; return n && S.prompt[id] && S.prompt[id] !== "I" ? " (x" + n + ")" : ""; };
const supOf = id => (C.support[S.prompt[id] || ""] || "support") + pcnt(id);
const supParent = id => (C.supportParent[S.prompt[id]] || C.support[S.prompt[id] || ""] || "support").replace("physical assistance", "hands-on help");
const FW = { O: "often", A: "consistently", S: "sometimes", R: "rarely", N: "rarely" };
function dataOf(i) { const d = []; const t = S.trials[i.id]; if (t) { const [x, y] = t.split("/"); d.push(x + " of " + y + " trials"); } if (i.unit && S.val[i.id]) d.push(S.val[i.id] + " " + i.unit); return d.length ? " (" + d.join("; ") + ")" : ""; }
function clause(i, past) {
  if (i.sys) return (past ? "was observed to " : "can ") + FW[S.ans[i.id]] + " " + i.obs;
  const p = S.prompt[i.id], sup = supOf(i.id);
  if (isNS(i.id)) return (past ? "required " : "needs ") + sup + " to " + i.do + dataOf(i);
  return (past ? "was beginning to " : "is beginning to ") + i.do + (p && p !== "I" ? " with " + sup : "") + dataOf(i);
}
const FWS = { O: "often see", A: "consistently see", S: "sometimes see", R: "rarely see", N: "rarely see" };
function repClause(i, who) { const n = nmMid(); return i.sys ? `${who} ${FWS[S.ans[i.id]]} ${n} ${i.obs}` : `${n} ${clause(i, false)}`; }
function flagged(id) { // ordered list of items that are flagged (perf NS/E, freq flags or 'sometimes')
  if (id === "WC") return [];
  const p = perfItems(id).filter(i => isNS(i.id) || S.ans[i.id] === "E").sort((a, b) => (isNS(b.id) ? 1 : 0) - (isNS(a.id) ? 1 : 0));
  const f = freqItems(id).filter(i => fFlag(i) || (!i.pos && S.ans[i.id] === "S"));
  return p.concat(f);
}
const strengthsOf = id => id === "WC" ? [] : perfItems(id).filter(i => S.ans[i.id] === "I" && !heavy(i.id));
function extrasObs(id) { // observation-only extras (grasp, shapes, posture, behaviors)
  const o = [];
  if (id === "FM") { const g = (SEC.FM.blocks.find(b => b.id === "grasp").opts).find(x => has("grasp", x.l)); if (g && g.desc && g.lvl != null && g.lvl < childBand()) o.push("used " + g.desc + " on writing tools");
    const sh = SEC.FM.blocks.find(b => b.id === "shapes").opts.filter(x => has("shapes", x.l)); if (sh.length) o.push("copied " + listJoin(sh.map(x => x.l.replace(/\s*[|—+/]$/, "").toLowerCase().replace(/^x$/, "an X"))) + " from a model"); }
  if (id === "GFB") {
    const FV = { "Task refusal (says no or pushes materials away)": "say \u201cno\u201d or push materials away", "Crying": "cry", "Leaving the work area": "leave the work area", "Throwing materials": "throw materials", "Dropping to the floor": "drop to the floor", "Hitting or kicking": "hit or kick" };
    const fr = (S.opts.gfFrus || []).filter(v => FV[v]); if (fr.length) o.push("was observed to " + listJoin(fr.map(v => FV[v])) + (S.sel.gfFrusN ? " (" + S.sel.gfFrusN.replace(" per session", " times per session") + ")" : ""));
    const tb = (S.opts.gfTransBeh || []).filter(v => v !== "None observed" && !/timer/.test(v)); if (tb.length) o.push("showed " + listJoin(tb.map(v => v.toLowerCase())) + " during transitions");
    if (has("gfTransBeh", "Needed a visual timer or first–then")) o.push("used a visual timer or first–then board during transitions");
    if (S.sel.gfOos) o.push(S.sel.gfOos === "None" ? "remained in the seat with no out-of-seat episodes" : "left the seat " + S.sel.gfOos + " times during tabletop work");
    const bt = (S.opts.gfBreak || []); if (bt.length) o.push("took breaks (" + bt.map(v => v.toLowerCase()).join(", ") + ")");
    if (S.sel.gfCg) o.push("participated with the caregiver " + S.sel.gfCg.toLowerCase().replace("present for part", "present for part"));
    if (S.sel.gfCgDiff && !/Not compared/.test(S.sel.gfCgDiff)) o.push(S.sel.gfCgDiff === "Similar either way" ? "participated similarly with the caregiver present or absent" : "showed " + S.sel.gfCgDiff.toLowerCase());
  }
  if (id === "GM" && (S.opts.gmSeen || []).length) o.push("presented with " + listJoin(S.opts.gmSeen.map(v => v.toLowerCase())));
  if (id === "SOC" && !S.behav.none) C.behaviors.forEach(b => { if (S.behav.f[b.id] != null) o.push("was observed to " + b.obs + (S.behav.f[b.id] ? " " + S.behav.f[b.id].replace(" per session", " times per session") : "") + (S.behav.long[b.id] ? " (longest episode " + S.behav.long[b.id].toLowerCase() + ")" : "")); });
  return o;
}
function wcText() {
  const t = (S.opts.wcType || [])[0], L = k => (S.opts[k] || []).map(v => v.toLowerCase());
  const obs = [], rep = [], str = [], lim = [];
  if (t) obs.push("used " + (/^ambulatory/i.test(t) ? "no mobility device" : /assistive/i.test(t) ? "an assistive device (" + t.split("(")[1].replace(")", "") + ")" : "a " + t.toLowerCase()));
  const pel = L("wcPelvis").filter(v => v !== "neutral"); if (pel.length) obs.push("presented with " + listJoin(pel) + " of the pelvis in sitting");
  const tr = L("wcTrunk").filter(v => !["trunk upright", "head in midline", "feet supported"].includes(v)); if (tr.length) obs.push("presented with " + listJoin(tr));
  if ((S.opts.wcSit || [])[0]) obs.push("was a " + S.opts.wcSit[0].toLowerCase().replace("needs support to sit", "supported sitter"));
  if (S.sel.wcShift) obs.push(S.sel.wcShift === "Unable" ? "did not yet complete weight shifts" : "completed weight shifts " + S.sel.wcShift.toLowerCase().replace("independent", "independently"));
  const tone = L("wcTone").filter(v => !/within functional/.test(v)); if (tone.length) obs.push("showed " + listJoin(tone));
  if (wcShow({ chair: true })) { const su = L("wcSetup"); if (su.length) obs.push("used a chair setup with " + listJoin(su)); const fit = L("wcFit").filter(v => v !== "fits well"); if (fit.length) obs.push("had a chair that was noted as " + listJoin(fit)); }
  if (S.sel.wcProp && wcShow({ manual: true })) obs.push(S.sel.wcProp === "Not yet" ? "did not yet self-propel" : "self-propelled " + S.sel.wcProp.toLowerCase());
  if (S.sel.wcRamp && wcShow({ manual: true })) obs.push("managed ramps and uneven ground with " + S.sel.wcRamp.toLowerCase());
  if (wcShow({ power: true })) { const d = L("wcDrive"); if (d.length) obs.push("drove using " + listJoin(d)); if (S.sel.wcDriveLvl) obs.push("power-drove at the level of " + S.sel.wcDriveLvl.toLowerCase()); }
  const fn = L("wcFunc"); if (fn.length) obs.push("from the chair: " + listJoin(fn));
  C.transferTypes.forEach(k => { const x = S.tr[k] || {}; if (x.a) obs.push("completed " + k.toLowerCase() + " transfers with " + x.a.toLowerCase().replace("independent", "independence") + (x.e && x.e !== "No equipment" ? " using " + x.e.toLowerCase() : "")); });
  const sk = L("wcSkin"); if (sk.some(v => !/^no skin/.test(v))) rep.push("a " + listJoin(sk.filter(v => !/^no skin/.test(v))));
  const cg = L("wcCare"); if (cg.length) rep.push("caregiver handling: " + listJoin(cg));
  const ac = L("wcAccess"); if (ac.length) rep.push("access: " + listJoin(ac));
  if (has("wcSit", "Hands-free sitter")) str.push("hands-free sitting"); if (has("wcFit", "Fits well")) str.push("a current chair that fits well"); if (has("wcSkin", "No skin issues reported")) str.push("no reported skin issues");
  if (has("wcTone", "ROM within functional limits")) str.push("range of motion within functional limits"); if (S.sel.wcProp === "Over 150 ft") str.push("functional self-propulsion over 150 ft");
  C.transferTypes.forEach(k => { if ((S.tr[k] || {}).a === "Independent") str.push("independent " + k.toLowerCase() + " transfers"); });
  return { obs, rep, str, needs: L("wcNeeds") };
}
function validityText() {
  const n = Nm(), poss = n === "The child" ? "the child\u2019s" : n + "\u2019s", R = [];
  const fr = (S.opts.gfFrus || []).filter(v => v !== "None observed"); if (fr.length) R.push(listJoin(fr.map(v => v.replace(/ \(.*\)/, "").toLowerCase())) + " observed during testing");
  if (["3–5", "6+"].includes(S.sel.gfOos)) R.push(S.sel.gfOos + " out-of-seat episodes");
  ["gf1", "gf10"].forEach(k => { if (isNS(k)) R.push(k === "gf1" ? "brief time on task before redirection" : "brief seated tolerance"); });
  const why = (S.sel.gfValidWhy || "").trim() || listJoin(R), ch = S.sel.gfValid || (R.length ? "under" : "valid");
  if (ch === "valid") return `Results are considered a valid estimate of ${poss} current performance.`;
  if (ch === "caution") return `Results should be interpreted with caution${why ? " due to " + why : ""}.`;
  return `Results may underestimate ${poss} current skills${why ? " due to " + why : " due to behaviors observed during testing"}.`;
}
function impactsOf(sec) { const fl = flagged(sec.id), seen = []; fl.forEach(i => { if (i.impact && !seen.includes(i.impact)) seen.push(i.impact); }); if (!seen.length) seen.push(sec.impact); return seen.slice(0, 4); }
function impactSentence(sec, lead) { const im = listJoin(impactsOf(sec)); return (lead || "These findings") + (sec.iv === "make" ? " may make " + im + " more difficult." : " may affect " + im + "."); }
function sum6(id) {
  const sec = SEC[id], st = status(sec).st, n = Nm(), parts = [];
  parts.push(st === "Concern" ? `${n} demonstrates deficits in ${sec.name} skills compared with age expectations.` : st === "Monitor" ? `${n} demonstrates emerging or inconsistent ${sec.name} skills compared with age expectations.` : `${n} demonstrates ${sec.name} skills within age expectations for the items assessed.`);
  const rows = testRows(id);
  if (id === "GFB") parts.push("Testing validity: " + validityText());
  else if (id === "WC") parts.push("Standardized testing was not completed for this area; findings are based on clinical observation and caregiver report.");
  else if (!rows.length) parts.push("No standardized scores were reported for this area; findings are based on clinical observation and caregiver/teacher report.");
  else { const by = {}; rows.forEach(r => (by[r.t.l] = by[r.t.l] || []).push(r)); parts.push(Object.keys(by).map(t => `On the ${t}, ${nmMid()} obtained ` + listJoin(by[t].map(r => r.kind === "ss" ? `a ${r.l} standard score of ${r.ss}${r.pr ? " (" + ord(r.pr) + " percentile)" : ""}${r.d ? ", in the " + r.d + " range" : ""}` : `a ${r.l} scale score of ${r.ss}`)) + ".").join(" ")); }
  let obs, rep = [];
  if (id === "WC") { const w = wcText(); obs = w.obs; if (w.rep.length) rep.push(`Caregiver reports the following: ${w.rep.join("; ")}.`); }
  else { const fl = flagged(id); obs = fl.filter(i => srcOf(i.id) === "O").map(i => clause(i, true)).concat(extrasObs(id));
    ["P", "T"].forEach(s => { const r = fl.filter(i => srcOf(i.id) === s); if (r.length) rep.push(`${s === "P" ? "Caregiver" : "Teacher"} reports that ${listJoin(r.map(i => repClause(i, "they")))}.`); }); }
  const obsRated = id === "WC" ? obs.length : perfItems(id).concat(freqItems(id)).filter(i => S.ans[i.id] && srcOf(i.id) === "O").length + extrasObs(id).length;
  parts.push(obs.length ? `During the evaluation, ${nmMid()} ${listJoin(obs)}.` : obsRated ? "During the evaluation, observed performance was consistent with age expectations for the items assessed." : "Items in this area were not directly observed during the evaluation; findings are based on report.");
  parts.push(rep.length ? rep.join(" ") : "No additional concerns in this area were reported by caregivers or teachers.");
  parts.push(st === "Typical" ? `Current skills appear to support age-expected ${/^participation\b/.test(sec.impact) ? "" : "participation in "}${sec.impact}.` : impactSentence(sec));
  const strg = id === "WC" ? wcText().str : strengthsOf(id).map(i => i.do), good = rows.filter(r => r.kind === "ss" && ["avg", "above"].includes(descBand(r.d)));
  let s = strg.length ? `Strengths include the ability to ${listJoin(strg.slice(0, 4))}${id === "WC" ? "" : " independently"}` : "";
  if (id === "WC" && strg.length) s = `Strengths include ${listJoin(strg.slice(0, 4))}`;
  if (good.length) s += (s ? ", as well as " : "Strengths include ") + listJoin(good.map(r => `${r.d.toLowerCase()}-range performance on the ${r.t.l} ${r.l}`));
  parts.push(s ? s + "." : `${n} participated in the presented tasks with the supports described.`);
  return parts;
}
function fusionAuto(id) {
  const sec = SEC[id], st = status(sec).st, p = sum6(id), imp = [];
  if (id === "WC") { const w = wcText(); w.obs.concat(w.rep).forEach(x => imp.push("• " + x.charAt(0).toUpperCase() + x.slice(1))); }
  else { flagged(id).forEach(i => { const r = (i.sys ? C.freq : C.perf).find(o => o.k === S.ans[i.id]); const pr = C.prompts.find(o => o.k === S.prompt[i.id]); imp.push(`• ${i.l}: ${r.l.toLowerCase()}${pr && pr.k ? ", " + pr.l.toLowerCase() + pcnt(i.id) : ""}${dataOf(i).replace(/^ \(|\)$/g, m => m === ")" ? "" : ", ")} (${C.srcShort[srcOf(i.id)].toLowerCase()})`); });
    extrasObs(id).forEach(x => imp.push("• " + x.charAt(0).toUpperCase() + x.slice(1) + " (observed)"));
    perfItems(id).forEach(i => { const nt = (S.inote[i.id] || "").trim(); if (nt) imp.push(`• ${i.l} — note: ${nt}`); }); }
  testRows(id).filter(r => r.kind === "ss" ? C.belowDesc.includes(r.d) : r.ss <= 10).forEach(r => imp.push(`• ${r.t.l} ${r.l}: ${r.kind === "ss" ? "standard score " + r.ss + (r.pr ? ", " + ord(r.pr) + " percentile" : "") + ", " + r.d : "scale score " + r.ss}`));
  return { str: p[5], imp: imp.join("\n") || "No performance impairments identified in this area for the items assessed.", lim: st === "Typical" ? "No functional limitations were identified in this area for the items assessed." : impactSentence(sec, "Findings"), sum: p.join(" ") };
}
/* Edited text: edits are kept paragraph by paragraph; a paragraph whose underlying answers change
   (for example, a source tag) is regenerated right away and the replaced edit can be restored. */
function paraKey(p, i) { const m = p.match(/^(?:\u2022 )?([^:\n]{2,70}):\s/); return m ? "k:" + m[1] : "i:" + i; }
function mergeEdits(edited, base, auto) {
  const B = {}, E = {}; base.split("\n").forEach((p, i) => { B[paraKey(p, i)] = p; }); edited.split("\n").forEach((p, i) => { E[paraKey(p, i)] = p; });
  let lost = false; const used = {};
  const out = auto.split("\n").map((p, i) => { const k = paraKey(p, i); used[k] = 1; if (k in E && B[k] === p) return E[k]; if (k in E && E[k] !== B[k]) lost = true; return p; });
  Object.keys(E).forEach(k => { if (!used[k] && !(k in B) && E[k].trim()) out.push(E[k]); });
  return { text: out.join("\n"), lost };
}
function autoFor(key) { const k = key.split("."); return k[0] === "sec" ? fusionAuto(k[1])[k[2]] : k[0] === "gen" ? genAuto() : k[0] === "rec" ? recAuto() : parentAuto(); }
function fieldVal(key) { const e = S.edits[key], auto = autoFor(key); if (!e) return auto;
  if (e.b == null || e.b === auto) return e.t;
  const m = mergeEdits(e.t, e.b, auto); if (m.lost) S.restore[key] = e.t;
  if (m.text === auto) delete S.edits[key]; else S.edits[key] = { t: m.text, b: auto };
  save(); return m.text; }
function setEdit(key, v) { const e = S.edits[key]; S.edits[key] = { t: v, b: e ? e.b : autoFor(key) }; }
function fieldNote(key) { const e = S.edits[key];
  if (S.restore[key] != null) return `<div class="banner no-print">Updated to match changed answers (for example, a source tag). <button type="button" class="link" data-act="erestore" data-k="${key}">Restore my edited text</button> <button type="button" class="link" data-act="edismiss" data-k="${key}">OK</button></div>`;
  if (e && e.b == null) return `<div class="banner no-print">Edited in an earlier version; this text does not update when answers change. <button type="button" class="link" data-act="reset" data-k="${key}">Update from answers</button></div>`;
  return e ? `<div class="muted small no-print">Edited · paragraphs update when their answers change.</div>` : ""; }
function migrateEdits() { const R = S.rep || {}; S.edits = S.edits || {}; S.restore = S.restore || {};
  Object.entries(R.sec || {}).forEach(([id, o]) => Object.entries(o || {}).forEach(([f, v]) => { if (v != null && !S.edits["sec." + id + "." + f]) S.edits["sec." + id + "." + f] = { t: v, b: null }; }));
  if (R.gen != null && !S.edits.gen) S.edits.gen = { t: R.gen, b: null }; if (R.rec != null && !S.edits.rec) S.edits.rec = { t: R.rec, b: null };
  if (S.parent && S.parent.text != null && !S.edits.parent) S.edits.parent = { t: S.parent.text, b: null };
  S.rep.sec = {}; S.rep.gen = null; S.rep.rec = null; if (S.parent) S.parent.text = null; }
const FIELDS = [["str", "Strengths"], ["imp", "Performance Impairments"], ["lim", "Functional Limitations"], ["sum", "Section Summary"]];
const repSec = id => S.rep.sec[id] || (S.rep.sec[id] = {});
const fusionVal = (id, f) => fieldVal("sec." + id + "." + f);
const selfHarm = () => has("mh", "Self-harm statements reported");
const refOn = r => !!S.refs[r.id] || (r.id === "psych" && selfHarm());
const freqWord = f => f === "Every other week" ? "every other week" : f.replace("x/week", f.startsWith("1x") ? " time per week" : " times per week").replace(/^1 time/, "once").replace(/^1x/, "once");
function genAuto() {
  const m = S.meta, a = age(), n = Nm(), out = [], secs = activeSecs().map(s => ({ s, st: status(s).st }));
  const dx = m.dx.concat(m.dxText ? [m.dxText] : []), rs = m.reason.map(r => r.toLowerCase());
  out.push(`${n} is ${a ? `a ${a.y}-year, ${a.m}-month-old child` : "a child"}${dx.length ? ` with a reported diagnosis of ${listJoin(dx)}` : ""}, referred ${m.refSource ? "by " + m.refSource.toLowerCase().replace(/^its /, "the ITS ") : "by the family"} for an occupational therapy evaluation due to ${rs.length ? listJoin(rs) : "concerns about development and daily participation"}.${m.reasonText ? " Referral concern: " + m.reasonText.replace(/\.$/, "") + "." : ""}`);
  const meth = []; if (C.tests.some(t => testRows(null).some(r => r.t === t))) meth.push("standardized assessment (" + listJoin(C.tests.filter(t => testRows(null).some(r => r.t === t)).map(t => t.l)) + ")"); meth.push("clinical observation");
  if (m.informants.some(k => ["P", "C"].includes(k))) meth.push("caregiver interview"); if (m.informants.includes("T")) meth.push("teacher report"); if (S.screener) meth.push("the ITS developmental screener");
  out.push(`Information was gathered through ${listJoin(meth)}.`);
  const all = testRows(null).filter(r => r.kind === "ss"), lo = all.filter(r => C.belowDesc.includes(r.d)), ok = all.filter(r => ["avg", "above"].includes(descBand(r.d)));
  const fmt = r => `${r.t.l} ${r.l} (SS ${r.ss}${r.pr ? ", " + ord(r.pr) + " percentile" : ""})`;
  if (lo.length) out.push(`Standardized testing showed scores below the average range on the ${listJoin(lo.map(fmt))}${ok.length ? `, with scores in the average range or higher on the ${listJoin(ok.map(fmt))}` : ""}.`);
  else if (ok.length) out.push(`Standardized testing showed scores in the average range or higher on the ${listJoin(ok.map(fmt))}.`);
  const con = secs.filter(x => x.st === "Concern").map(x => x.s), mon = secs.filter(x => x.st === "Monitor").map(x => x.s);
  if (con.length || mon.length) out.push(`${con.length ? `Primary areas of deficit include ${listJoin(con.map(s => s.name))} skills` : ""}${con.length && mon.length ? "; e" : "E"}${mon.length ? `merging or inconsistent skills were noted in ${listJoin(mon.map(s => s.name))}` : ""}.`.replace(/^E\./, ""));
  else out.push(`${n} demonstrated skills within age expectations across the areas assessed.`);
  const ims = []; con.concat(mon).forEach(s => impactsOf(s).forEach(x => { if (!ims.includes(x) && ims.length < 5) ims.push(x); }));
  if (ims.length) out.push(`These findings may make ${listJoin(ims)} more difficult at home, at school, and in the community.`);
  const st = []; activeSecs().forEach(s => strengthsOf(s.id).slice(0, 1).forEach(i => st.push(i.do))); if (st.length) out.push(`Strengths include the ability to ${listJoin(st.slice(0, 4))} independently.`);
  const fx = S.rec.factors; out.push(`Prognosis for progress toward occupational therapy goals is ${S.rec.prog.toLowerCase()}${fx.length ? `, given ${listJoin(fx)}` : ""}.`);
  if (S.rec.svc !== "Not recommended at this time" && (con.length || mon.length)) out.push(`Skilled occupational therapy is medically necessary to address ${listJoin(con.concat(mon).map(s => s.name))} skills through ${listJoin(methodsAuto(con.concat(mon)))}. These interventions require the clinical reasoning of a licensed occupational therapist to analyze performance, grade activities, adjust supports as skills change, and train caregivers for carryover.`);
  return out.join(" ");
}
function methodsAuto(secs) { const map = { FM: 0, ADL: 1, SENS: 2, PLAY: 2, EF: 2, SOC: 2, GFB: 2, GM: 3, WC: 5 }, o = []; secs.forEach(s => { const k = C.skilledMethods[map[s.id]]; if (!o.includes(k)) o.push(k); }); o.push(C.skilledMethods[4]); return o; }
function recAuto() {
  const R = S.rec, secs = activeSecs().filter(s => status(s).st !== "Typical"), o = [];
  if (R.svc === "Recommended") o.push(`Occupational therapy is recommended ${freqWord(R.freq)} for ${R.len} sessions over ${R.dur} in the ${R.setting} setting${secs.length ? `, to address ${listJoin(secs.map(s => s.name))} skills` : ""}.`);
  else if (R.svc === "Consult / monitor") o.push(`Occupational therapy consultation and monitoring are recommended${secs.length ? ` for ${listJoin(secs.map(s => s.name))} skills` : ""}.`);
  else o.push("Occupational therapy services are not recommended at this time; re-screening is recommended if new concerns arise.");
  if (R.svc !== "Not recommended at this time" && (R.home || R.cg)) o.push(`${R.home && R.cg ? "A home program and caregiver training are" : R.home ? "A home program is" : "Caregiver training is"} recommended to support carryover of skills.`);
  if (R.svc !== "Not recommended at this time") o.push(`Re-evaluation is recommended in ${R.reeval}.`);
  const rf = C.referrals.filter(refOn); if (rf.length) o.push(`Referrals recommended: ${rf.map(r => r.parent.charAt(0).toLowerCase() + r.parent.slice(1)).join("; ")}.`);
  if (rf.some(r => r.id === "psych") && selfHarm()) o.push(C.referrals.find(r => r.id === "psych").trig + ".");
  if (S.wcOn && (S.opts.wcNeeds || []).length) o.push(`Equipment and seating: ${listJoin(S.opts.wcNeeds.map(v => v.replace("Letter of medical necessity (LMN)", "letter of medical necessity").toLowerCase().replace("pt", "PT")))}.`);
  return o.join(" ");
}
const genVal = () => fieldVal("gen");
const recVal = () => fieldVal("rec");
function fusionAll() {
  const L = [C.titles.report, `${Nm()} · DOB ${S.meta.dob || "—"} · Evaluation ${S.meta.date || "—"}`, ""];
  activeSecs().forEach(s => { L.push("=== " + s.title + " ==="); FIELDS.forEach(([f, l]) => { L.push(l + ":"); L.push(fusionVal(s.id, f)); L.push(""); }); });
  L.push("=== General Summary ==="); L.push(genVal()); L.push(""); L.push("=== Recommendations ==="); L.push(recVal());
  return L.join("\n");
}
/* ---------- report view ---------- */
const ta = (id, key, val, rows) => `<textarea id="${id}" data-ekey="${key}" rows="${rows || 3}" spellcheck="true">${esc(val)}</textarea>${fieldNote(key)}`;
const tools = (id, reset) => `<div class="ftools no-print"><button type="button" class="btn xs" data-act="copy" data-src="${id}">Copy</button><button type="button" class="btn xs ghost" data-act="reset" data-k="${reset}">Reset</button></div>`;
const contactLine = () => { const k = C.contact; return `${k.address} · Phone ${k.phone} · Fax ${k.fax} · ${k.email}`; };
function footLine() { const k = C.contact, a = S.meta; return `${k.address} · Ph ${k.phone} · Fax ${k.fax} · ${k.email}`; }
function setFoot() { let st = document.getElementById("pagefoot"); if (!st) { st = document.createElement("style"); st.id = "pagefoot"; document.head.appendChild(st); }
  const q = JSON.stringify(footLine()); st.textContent = `@page{@bottom-left{content:${q};width:82%;font:7pt -apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:#6b7686;vertical-align:top;padding-top:3mm}@bottom-right{content:"Page " counter(page) " of " counter(pages);width:16%;white-space:nowrap;font:7pt -apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:#6b7686;vertical-align:top;padding-top:3mm}}`; }
function headBlock(title) { const m = S.meta, a = age();
  return `<div class="dochead"><img src="${esc(C.logo)}" alt="${esc(C.practice)} logo" class="doclogo"><div class="dht"><div class="prac">${esc(C.practice)}</div><h1>${esc(title)}</h1></div></div>
  <table class="meta"><tr><td><b>Child</b> ${esc(m.initials || "—")}</td><td><b>DOB</b> ${esc(m.dob || "—")}</td><td><b>Age</b> ${a ? a.y + " yr " + a.m + " mo" : "—"}</td><td><b>Evaluation date</b> ${esc(m.date || "—")}</td></tr>
  <tr><td colspan="2"><b>Setting</b> ${esc(m.setting.map(k => (C.settings.find(o => o.k === k) || {}).l).join(", ") || "—")}</td><td colspan="2"><b>Evaluator</b> ${esc(m.clinician || "—")}</td></tr></table>`; }
function scoreTable() { const rows = testRows(null); if (!rows.length) return `<p class="muted">No standardized tests entered.${C.tests.filter(t => sc(t.id).adm === "no").length ? " Not administered: " + esc(C.tests.filter(t => sc(t.id).adm === "no").map(t => t.l).join(", ")) + "." : ""}</p>`;
  return `<table class="scoret rep"><thead><tr><th>Test</th><th>Score</th><th>Std / scale</th><th>%ile</th><th>Descriptive category</th></tr></thead><tbody>${rows.map(r => `<tr><td>${esc(r.t.l)}</td><td>${esc(r.l)}</td><td>${r.ss}${r.kind === "scale" ? " <small>(scale)</small>" : ""}</td><td>${esc(r.pr || "")}</td><td>${esc(r.d || "")}${r.d && (sc(r.t.id).r[r.rid] || {}).d ? " <small>(override)</small>" : ""}</td></tr>`).join("")}</tbody></table>
  <p class="fine">Descriptive categories: DAYC-2 and Vineland-3 use publisher ranges; BOT-2 and Beery VMI categories follow common manual conventions and should be confirmed against the current manual (overrides marked).${S.notes ? " Testing notes: " + esc(S.notes) : ""}</p>`; }
function renderReport() {
  const R = S.rec, m = S.meta;
  const secHtml = activeSecs().map(s => { const st = status(s).st;
    return `<section class="sec repsec"><div class="sec-h"><span class="num">${s.n}</span><h2>${esc(s.title)}</h2><span class="pill st-${st}">${st}</span></div><div class="sec-b">
    ${FIELDS.map(([f, l]) => `<div class="field"><div class="fhead"><span class="lbl">${l}</span>${tools("f-" + s.id + "-" + f, "sec." + s.id + "." + f)}</div>${ta("f-" + s.id + "-" + f, "sec." + s.id + "." + f, fusionVal(s.id, f), f === "sum" ? 6 : 3)}</div>`).join("")}</div></section>`; }).join("");
  const svc = m.svcNow.length || m.svcPast.length ? `<p><b>Services now:</b> ${esc(m.svcNow.join(", ") || "none reported")} · <b>Past:</b> ${esc(m.svcPast.join(", ") || "none reported")}</p>` : "";
  $("#report").innerHTML = `<div class="doc">${headBlock(C.titles.report)}
  <div class="no-print actions"><button type="button" class="btn" data-act="fusionAll">Copy all for Fusion</button><span class="muted">Text is editable; Reset restores the auto text. Goal areas are not included.</span></div>
  <h3>Referral &amp; Background</h3><p><b>Reason for referral:</b> ${esc(m.reason.concat(m.reasonText ? [m.reasonText] : []).join("; ") || "—")} · <b>Referral source:</b> ${esc(m.refSource || "—")} · <b>Diagnosis:</b> ${esc(m.dx.concat(m.dxText ? [m.dxText] : []).join("; ") || "—")} · <b>Informants:</b> ${esc(m.informants.map(k => (C.informants.find(o => o.k === k) || {}).l).join(", ") || "—")}</p>${svc}
  ${S.screener ? `<p><b>Screener (${esc(S.screener.date || "")}):</b> ${esc(S.screener.outcome || "")}</p>` : ""}
  <h3>Standardized Assessment</h3><div class="tscroll">${scoreTable()}</div>${S.gfbOn !== false ? `<p><b>Testing validity:</b> ${esc(validityText())}</p>` : ""}
  <h3>Section Findings</h3>${secHtml}
  <section class="sec"><div class="sec-h"><span class="num">Σ</span><h2>General Summary</h2></div><div class="sec-b">
  <div class="grid2 no-print"><label><span class="lbl">Prognosis</span>${sel("rec.prog", C.prognosis, R.prog)}</label><div></div></div>
  <div class="row-opts no-print"><div class="lbl">Prognosis factors</div><div class="chips">${C.progFactors.map(f => chip("factor", `data-v="${esc(f)}"`, f, R.factors.includes(f))).join("")}</div></div>
  <div class="field"><div class="fhead"><span class="lbl">General Summary</span>${tools("f-gen", "gen")}</div>${ta("f-gen", "gen", genVal(), 9)}</div></div></section>
  <section class="sec"><div class="sec-h"><span class="num">✓</span><h2>Recommendations</h2></div><div class="sec-b">
  <div class="grid4 no-print"><label><span class="lbl">OT services</span>${sel("rec.svc", C.rec.services, R.svc)}</label><label><span class="lbl">Frequency</span>${sel("rec.freq", C.rec.freq, R.freq)}</label><label><span class="lbl">Session length</span>${sel("rec.len", C.rec.len, R.len)}</label><label><span class="lbl">Duration</span>${sel("rec.dur", C.rec.dur, R.dur)}</label>
  <label><span class="lbl">Setting</span>${sel("rec.setting", C.rec.setting, R.setting)}</label><label><span class="lbl">Re-evaluation</span>${sel("rec.reeval", C.rec.reeval, R.reeval)}</label><div class="chips">${chip("rflag", 'data-k="home"', "Home program", R.home)}${chip("rflag", 'data-k="cg"', "Caregiver training", R.cg)}</div></div>
  <div class="row-opts no-print"><div class="lbl">Referrals</div><div class="chips">${C.referrals.map(r => chip("ref", `data-id="${r.id}"`, r.l, refOn(r))).join("")}</div>${selfHarm() ? `<div class="banner warn">${esc(C.referrals.find(r => r.id === "psych").trig)}</div>` : ""}</div>
  <div class="field"><div class="fhead"><span class="lbl">Recommendations</span>${tools("f-rec", "rec")}</div>${ta("f-rec", "rec", recVal(), 5)}</div></div></section>
  ${sigBlock("report", "Evaluator signature / credentials")}</div>`;
  document.querySelectorAll("#report textarea").forEach(grow);
}
/* ---------- parent summary ---------- */
const PFW = { O: "often", A: "usually", S: "sometimes", R: "rarely", N: "rarely" };
const PWITH = i => S.prompt[i.id] && S.prompt[i.id] !== "I" ? " with " + supParent(i.id) : "";
// Observed: past tense ("we often saw"); reported: present tense with an explicit reporter ("you often see", "they often see").
const pNm = () => S.meta.initials.trim() || "your child";
function pClause(i, src) { const n = pNm();
  if (src === "O") return i.sys ? `we ${PFW[S.ans[i.id]]} saw ${n} ${i.obs}` : isNS(i.id) ? `${n} needed ${supParent(i.id)} to ${i.do}` : `${n} was beginning to ${i.do}${PWITH(i)}`;
  if (i.sys) return `${src === "P" ? "you" : "they"} ${PFW[S.ans[i.id]]} see ${n} ${i.obs}`;
  return isNS(i.id) ? `${n} needs ${supParent(i.id)} to ${i.do}` : `${n} is beginning to ${i.do}${PWITH(i)}`; }
function parentAuto() {
  const n = S.meta.initials.trim() || "Your child", L = [];
  activeSecs().filter(s => status(s).st !== "Typical").forEach(s => {
    const sen = [];
    if (s.id === "WC") { const w = wcText(), c = w.obs.slice(0, 3).map(x => x.replace(/^was a /, "is a ").replace(/^used /, "uses ").replace(/^presented with /, "sits with ").replace(/^completed /, "completes ").replace(/^had /, "has ")); if (c.length) sen.push(`${n} ${listJoin(c)}.`); }
    else { const fl = flagged(s.id), ns = fl.filter(i => isNS(i.id) || fFlag(i)), pick = (ns.length ? ns : fl).slice(0, 3);
      // one sentence per source, always in the order: observed, caregiver-reported, teacher-reported
      [["O", "During the evaluation, "], ["P", "You shared that "], ["T", `${S.meta.initials.trim() ? S.meta.initials.trim() + "’s" : "Your child’s"} teacher shared that `]].forEach(([k, lead]) => { const c = pick.filter(i => srcOf(i.id) === k).map(i => pClause(i, k)); if (c.length) sen.push(lead + listJoin(c) + "."); }); }
    const im = listJoin(impactsOf(s).slice(0, 3));
    sen.push(s.iv === "make" ? `This may make ${im} more difficult.` : `This may affect ${im}.`);
    L.push(`${s.parent}: ${sen.join(" ")}`);
  });
  const ty = activeSecs().filter(s => status(s).st === "Typical"); if (ty.length) L.push(`Skills in the typical range for age: ${listJoin(ty.map(s => s.parent.toLowerCase()))}.`);
  return L.join("\n\n");
}
const savedIdeas = () => { try { return JSON.parse(localStorage.getItem(IKEY)) || []; } catch (e) { return []; } };
const allIdeas = () => C.homeIdeas.concat(savedIdeas().filter(x => !C.homeIdeas.includes(x)));
function parentRec() { const R = S.rec, secs = activeSecs().filter(s => status(s).st !== "Typical");
  if (R.svc === "Recommended") return `We recommend occupational therapy ${freqWord(R.freq)} (${R.len} sessions) for ${R.dur}, in the ${R.setting} setting${R.home ? ", with a home program" : ""}${R.cg ? " and caregiver coaching" : ""}.`;
  if (R.svc === "Consult / monitor") return "We recommend occupational therapy check-ins to monitor progress" + (secs.length ? " in " + listJoin(secs.map(s => s.parent.toLowerCase())) : "") + ".";
  return "Occupational therapy services are not recommended at this time. Please contact us if new concerns come up."; }
function renderParent() {
  const P = S.parent, rows = testRows(null).filter(r => r.kind === "ss" && r.d), secs = activeSecs().filter(s => status(s).st !== "Typical");
  const str = []; activeSecs().forEach(s => (s.id === "WC" ? wcText().str : strengthsOf(s.id).map(i => i.do)).slice(0, 2).forEach(x => str.push(x)));
  const plain = r => r.t.l + (r.t.id === "VINE" ? " (daily skills questionnaire)" : r.t.id === "BOT2" ? " (motor skills)" : r.t.id === "VMI" ? " (copying shapes)" : " (development)") + " — " + r.l.replace(/ \((sub|if administered)\)/, "").replace(/ \(VMI\)| \(VP\)| \(MC\)/, "");
  const ideas = allIdeas(), rf = C.referrals.filter(refOn);
  $("#parent").innerHTML = `<div class="doc parentdoc">${headBlock(C.titles.parent)}<p class="disc">${esc(C.parentDisclaimer)}</p>
  <h3>Why we met</h3><p>${esc(S.meta.reason.join("; ") || "To look at your child's development and everyday skills")}${S.meta.reasonText ? ": " + esc(S.meta.reasonText) : ""}.</p>
  ${rows.length ? `<h3>Test results</h3><table class="bands"><thead><tr><th>Area tested</th>${C.scoreBands.map(b => `<th>${b.l}</th>`).join("")}</tr></thead><tbody>${rows.map(r => `<tr><td>${esc(plain(r))}</td>${C.scoreBands.map(b => `<td class="${descBand(r.d) === b.k ? "hit b-" + b.k : ""}">${descBand(r.d) === b.k ? "●" : ""}</td>`).join("")}</tr>`).join("")}</tbody></table>` : ""}
  <h3>What we found</h3><div class="fhead no-print"><span class="muted">Editable</span>${tools("p-text", "parent")}</div>${ta("p-text", "parent", fieldVal("parent"), 8)}<div class="print-only ptext">${esc(fieldVal("parent")).replace(/\n\n/g, "</p><p>").replace(/^/, "<p>") + "</p>"}</div>
  ${str.length ? `<h3>Strengths</h3><ul class="cols">${str.slice(0, 6).map(x => `<li>Can ${esc(x)} independently</li>`).join("")}</ul>` : ""}
  <h3>Our recommendation</h3><p>${esc(parentRec())}</p>
  ${secs.length && S.rec.svc !== "Not recommended at this time" ? `<h3>Areas OT will address</h3><ul class="cols">${secs.map(s => `<li>${esc(s.address)}</li>`).join("")}</ul>` : ""}
  ${rf.length ? `<h3>Other referrals</h3><ul>${rf.map(r => `<li>${esc(r.parent)}</li>`).join("")}</ul>` : ""}
  <h3>Ideas to try at home</h3><div class="chips no-print">${ideas.map(x => chip("idea", `data-v="${esc(x)}"`, x, P.home.includes(x))).join("")}</div>
  <div class="addidea no-print"><input type="text" id="newidea" maxlength="120" placeholder="Add your own idea"><button type="button" class="btn sm" data-act="addidea">Add</button></div>
  <ul class="print-only cols">${P.home.map(x => `<li>${esc(x)}</li>`).join("")}</ul>
  <label class="row-text no-print"><span class="lbl">Additional notes for family (optional)</span><input type="text" maxlength="240" data-bind="parent.addl" value="${esc(P.addl)}"></label>${P.addl ? `<p class="print-only">${esc(P.addl)}</p>` : ""}
  <div class="shared"><b>Shared with:</b> ${["Parent", "School"].map(k => `<button type="button" class="box${P.shared.includes(k) ? " on" : ""}" data-act="shared" data-v="${k}" aria-pressed="${P.shared.includes(k)}">${P.shared.includes(k) ? "☒" : "☐"} ${k}</button>`).join(" ")}</div>
  ${sigBlock("parent", "Therapist signature" + (S.meta.clinician ? " — " + S.meta.clinician : ""))}</div>`;
  document.querySelectorAll("#parent textarea").forEach(grow);
}
/* ---------- goal areas (clinician only) ---------- */
const GPRE = { gf: "GFB", fm: "FM", gm: "GM", se: "SENS", adl: "ADL", pl: "PLAY", ef: "EF", so: "SOC", wc: "WC" };
function suggestedGoals(id) { const g = []; flagged(id).forEach(i => { if (i.goal && !g.includes(i.goal)) g.push(i.goal); }); if (!g.length && status(SEC[id]).st !== "Typical") { const f = Object.keys(C.goals).find(k => GPRE[k.split("_")[0]] === id); if (f) g.push(f); } return g; }
const goalOn = (gid, sid) => S.goals[gid] != null ? S.goals[gid] : suggestedGoals(sid).includes(gid);
function renderGoals() {
  $("#goals").innerHTML = `<div class="doc"><h1>${esc(C.titles.goals)}</h1><div class="banner warn">Clinician only. Goal areas are never included in the report, parent summary, print-outs of those pages, or Fusion text.</div>
  ${activeSecs().map(s => { const gs = Object.keys(C.goals).filter(k => GPRE[k.split("_")[0]] === s.id), sug = suggestedGoals(s.id), st = status(s).st, base = fusionAuto(s.id).imp;
    return `<section class="sec"><div class="sec-h"><span class="num">${s.n}</span><h2>${esc(s.title)}</h2><span class="pill st-${st}">${st}</span></div><div class="sec-b"><div class="chips">${gs.map(g => chip("goal", `data-g="${g}" data-s="${s.id}"`, C.goals[g].replace(/^GA · /, "") + (sug.includes(g) ? " ★" : ""), goalOn(g, s.id))).join("")}</div>
    ${st !== "Typical" ? `<div class="baseline"><span class="lbl">Baseline data for goal writing</span><pre>${esc(base)}</pre></div>` : ""}</div></section>`; }).join("")}<p class="fine">★ suggested from flagged items.</p></div>`;
}
/* ---------- intervention guide ---------- */
const gst = gid => S.guide[gid] || (S.guide[gid] = { acts: [], up: [], down: [], mat: [], tip: [], p: "", fade: "", note: "" });
const chosenGoals = () => activeSecs().flatMap(s => Object.keys(C.goals).filter(k => GPRE[k.split("_")[0]] === s.id && goalOn(k, s.id)).map(k => ({ gid: k, sid: s.id })));
function renderGuide() {
  const cg = chosenGoals(), K = [["acts", "Activities"], ["up", "Make it harder"], ["down", "Make it easier"], ["mat", "Materials"], ["tip", "Home carryover"]];
  $("#guide").innerHTML = `<div class="doc">${headBlock(C.titles.guide)}<p class="muted no-print">Built from the goal areas selected on the Goal Areas tab. Tap to choose; the print-out shows your choices (or the first suggestions when none are chosen).</p>
  ${cg.length ? cg.map(({ gid, sid }) => { const b = C.guide[sid] || {}, g = gst(gid);
    return `<section class="sec gcard"><div class="sec-h"><h2>${esc(C.goals[gid].replace(/^GA · /, ""))}</h2><span class="muted">${esc(SEC[sid].title)}</span></div><div class="sec-b">
    <div class="grid2"><label><span class="lbl">Starting prompt level</span>${sel("guide." + gid + ".p", C.prompts, g.p)}</label><label><span class="lbl">Fading plan</span>${sel("guide." + gid + ".fade", [""].concat(C.guide.fade), g.fade, "Choose a fading plan…")}</label></div>
    ${K.map(([k, l]) => `<div class="row-opts"><div class="lbl">${l}</div><div class="chips no-print">${(b[k] || []).map(x => chip("gpick", `data-g="${gid}" data-k="${k}" data-v="${esc(x)}"`, x, g[k].includes(x))).join("")}</div><ul class="print-only">${(g[k].length ? g[k] : (b[k] || []).slice(0, 3)).map(x => `<li>${esc(x)}</li>`).join("")}</ul></div>`).join("")}
    <label class="row-text"><span class="lbl">Notes</span><input type="text" maxlength="200" data-bind="guide.${gid}.note" value="${esc(g.note)}"></label></div></section>`; }).join("") : `<p>No goal areas selected yet. Choose them on the Goal Areas tab.</p>`}</div>`;
}
/* ---------- events / init ---------- */
function grow(t) { t.style.height = "auto"; t.style.height = (t.scrollHeight + 2) + "px"; }
function setPath(path, v) { const k = path.split("."); let o = S; for (let i = 0; i < k.length - 1; i++) o = o[k[i]] == null || typeof o[k[i]] !== "object" ? (o[k[i]] = {}) : o[k[i]]; o[k[k.length - 1]] = v; }
function render() { document.body.dataset.tab = S.tab; document.querySelectorAll(".tabs button").forEach(b => b.classList.toggle("on", b.dataset.v === S.tab));
  renderBar(); setFoot(); ({ form: renderForm, scores: renderScores, report: renderReport, parent: renderParent, goals: renderGoals, guide: renderGuide })[S.tab](); }
function rerender(el) { const y = window.scrollY; if (S.tab === "form") { const s = el && el.closest(".sec"); const id = s && s.id.slice(4); if (id && id !== "HDR") { renderSection(id); renderBar(); } else renderForm(); } else render(); window.scrollTo(0, y); }
function copyText(t) { let done = false; const x = document.createElement("textarea"); x.value = t; x.setAttribute("readonly", ""); x.style.position = "fixed"; x.style.opacity = "0"; document.body.appendChild(x); x.select();
  try { done = document.execCommand("copy"); } catch (e) {} x.remove();
  if (!done && navigator.clipboard) navigator.clipboard.writeText(t).then(() => flash("Copied"), () => flash("Select and copy manually")); else flash(done ? "Copied" : "Select and copy manually"); }
function download(name, text, type) { const b = new Blob([text], { type: type || "application/json" }), u = URL.createObjectURL(b), a = document.createElement("a"); a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 1000); }
const fname = ext => `OT-eval-${(S.meta.initials || "child").replace(/[^A-Za-z0-9]+/g, "")}-${S.meta.date || todayISO()}.${ext}`;
function toggle(arr, v, multi) { const i = arr.indexOf(v); if (i >= 0) arr.splice(i, 1); else { if (!multi) arr.length = 0; arr.push(v); } }
function checkDrop(sid) { if (S.secAuto[sid] === "undone" || S.secAuto[sid] === "manual") return; const wb = workBand(sid); if (wb <= 0) return;
  let run = 0, max = 0; perfBlocks(sid).forEach(b => b.items.forEach(i => { const [lo, hi] = range(i.r); if (wb >= lo && wb <= hi) { if (isNS(i.id)) { run++; max = Math.max(max, run); } else if (S.ans[i.id]) run = 0; } }));
  if (max >= 2) { S.secAuto[sid] = wb; S.secBand[sid] = wb - 1; } }
function openFusion() { const t = fusionAll(); const d = document.createElement("div"); d.className = "modal"; d.innerHTML = `<div class="mbox"><h2>Copy all for Fusion</h2><p class="muted">Paste each section into the matching Ensora Fusion fields. Goal areas are not included.</p><textarea id="fusion-all" readonly rows="16">${esc(t)}</textarea><div class="actions"><button type="button" class="btn" data-act="copy" data-src="fusion-all">Copy all</button><button type="button" class="btn ghost" data-act="fusionTxt">Download .txt</button><button type="button" class="btn ghost" data-act="closeModal">Close</button></div></div>`; document.body.appendChild(d); }
document.addEventListener("click", e => {
  const b = e.target.closest("[data-act]"); if (!b) return; const a = b.dataset.act, D = b.dataset;
  const done = () => { save(); rerender(b); };
  switch (a) {
    case "tab": S.tab = D.v; save(); render(); window.scrollTo(0, 0); return;
    case "rate": if (S.fromScreener) S.fromScreener.items = S.fromScreener.items.filter(x => x !== D.id); S.ans[D.id] = S.ans[D.id] === D.v ? undefined : D.v; if (!S.ans[D.id]) delete S.ans[D.id]; { const sid = b.closest(".sec").id.slice(4); if (S.ans[D.id] === "NS") checkDrop(sid); } return done();
    case "src": { const o = C.itemSources, s = srcOf(D.id); S.src[D.id] = o[(o.indexOf(s) + 1) % o.length]; return done(); }
    case "opt": toggle(S.opts[D.g] = S.opts[D.g] || [], D.v, D.m === "1"); if (D.g === "mh" && selfHarm()) S.refs.psych = true; return done();
    case "meta": toggle(S.meta[D.k], D.v, true); return done();
    case "sband": S.secBand[D.sec] = +D.b; S.secAuto[D.sec] = "manual"; return done();
    case "undoband": delete S.secBand[D.sec]; S.secAuto[D.sec] = "undone"; return done();
    case "older": S.older[D.sec] = true; return done();
    case "younger": S.younger[D.sec] = true; return done();
    case "olderAll": S.olderAll = !S.olderAll; save(); return renderForm();
    case "gfb": S.gfbOn = S.gfbOn === false; save(); return renderForm();
    case "wc": S.wcOn = !S.wcOn; save(); renderForm(); if (S.wcOn) setTimeout(() => { const el = document.getElementById("sec-WC"); el && el.scrollIntoView(); }, 0); return;
    case "domov": S.domOv[D.d] = S.domOv[D.d] === D.v || status(SEC[D.d]).auto === D.v ? "" : D.v; return done();
    case "behnone": S.behav.none = !S.behav.none; if (S.behav.none) { S.behav.f = {}; S.behav.long = {}; } return done();
    case "beh": if (S.behav.f[D.id] != null) { delete S.behav.f[D.id]; delete S.behav.long[D.id]; } else { S.behav.f[D.id] = ""; S.behav.none = false; } return done();
    case "adm": sc(D.t).adm = sc(D.t).adm === D.v ? "" : D.v; return done();
    case "factor": toggle(S.rec.factors, D.v, true); return done();
    case "rflag": S.rec[D.k] = !S.rec[D.k]; return done();
    case "ref": { const r = C.referrals.find(x => x.id === D.id); S.refs[D.id] = !refOn(r); return done(); }
    case "copy": { const el = document.getElementById(D.src); if (el) copyText(el.value); return; }
    case "reset": delete S.edits[D.k]; delete S.restore[D.k]; return done();
    case "erestore": S.edits[D.k] = { t: S.restore[D.k], b: autoFor(D.k) }; delete S.restore[D.k]; return done();
    case "edismiss": delete S.restore[D.k]; return done();
    case "fusionAll": return openFusion();
    case "fusionTxt": return download(fname("txt"), fusionAll(), "text/plain");
    case "closeModal": b.closest(".modal").remove(); return;
    case "idea": toggle(S.parent.home, D.v, true); return done();
    case "addidea": { const el = $("#newidea"), v = el.value.trim(); if (!v) return; const s = savedIdeas(); if (!s.includes(v) && !C.homeIdeas.includes(v)) { s.push(v); localStorage.setItem(IKEY, JSON.stringify(s)); } if (!S.parent.home.includes(v)) S.parent.home.push(v); return done(); }
    case "shared": toggle(S.parent.shared, D.v, true); return done();
    case "goal": S.goals[D.g] = !goalOn(D.g, D.s); return done();
    case "gpick": toggle(gst(D.g)[D.k], D.v, true); return done();
    case "print": if (S.tab === "form" || S.tab === "scores") { S.tab = "report"; render(); } setTimeout(() => window.print(), 50); return;
    case "export": return download(fname("json"), JSON.stringify(sigExport(S), null, 1));
    case "import": return $("#importFile").click();
    case "importPrefill": return $("#prefillFile").click();
    case "showPicker": showPicker = true; return renderSection("HDR");
    case "loadHandoff": { const h = readHandoffs().find(x => x.key === D.k); if (h) loadScreener(h.data); return; }
    case "new": if (confirm("Start a new evaluation? Export first if you need this one.")) { S = blank(); try { localStorage.removeItem(KEY); } catch (e) {} render(); window.scrollTo(0, 0); } return;
  }
});
function onBind(e, commit) { const el = e.target, k = el.dataset && el.dataset.bind; if (!k) return; let v = el.value;
  if (k.startsWith("notesSec.")) { S.notesSec = S.notesSec || {}; S.notesSec[k.slice(9)] = v; save(); return; }
  setPath(k, v); if (el.tagName === "TEXTAREA") grow(el); save();
  if (commit && (el.tagName === "SELECT" || /^scores\.|^meta\.(dob|date)$/.test(k))) { if (/^meta\.(dob|date)$|^bandOv$/.test(k)) { S.secBand = {}; S.secAuto = {}; } if (/\.prompt\.|^prompt\./.test(k) && heavy(k.split(".")[1])) { const s = el.closest(".sec"); s && checkDrop(s.id.slice(4)); } setTimeout(() => rerender(el), 0); } else if (commit && k.startsWith("meta.")) setTimeout(renderBar, 0); }
document.addEventListener("input", e => { const k = e.target.dataset && e.target.dataset.ekey; if (k) { setEdit(k, e.target.value); grow(e.target); save(); return; } if (e.target.tagName !== "SELECT") onBind(e, false); });
document.addEventListener("change", e => { if (e.target.type === "file") return; onBind(e, true); });
function readFile(inp, fn) { inp.addEventListener("change", () => { const f = inp.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { try { if (fn(JSON.parse(r.result)) !== false) { save(); render(); } } catch (err) { alert("That file could not be read: " + err.message); } inp.value = ""; }; r.readAsText(f); }); }
function init() {
  document.title = C.titles.app + " · " + C.practice; $("#practice").textContent = C.practice; $("#apptitle").textContent = C.titles.app;
  migrateEdits();
  readFile($("#importFile"), j => { if (j.type === "ITS-OT-FullEval-Prefill") return loadScreener(j); else if (j.v === 1 && j.meta) { sigImport(j); S = merge(blank(), j); migrateEdits(); } else throw new Error("not an OT evaluation or screener prefill file"); });
  readFile($("#prefillFile"), j => { loadScreener(j); });
  render();
  if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register("service-worker.js").catch(() => {});
}
window.__ote = { S: () => S, sum6, fusionAll, genVal, recVal, parentAuto, status: id => status(SEC[id]), importPrefill: j => { importPrefill(j); save(); render(); }, loadScreener, readHandoffs, isDirty, render, set: o => { merge(S, o); save(); render(); } };
init();
})();
