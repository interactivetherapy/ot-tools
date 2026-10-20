/* ITS OT Developmental Screener — app logic. Local only: no network calls; data autosaves to localStorage. */
(function () {
"use strict";
const C = CONFIG, KEY = "its-ot-screener-v1";
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const optL = o => typeof o === "string" ? o : o.l;
const todayISO = () => { const d = new Date(); return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
const RANK = { Typical: 0, Monitor: 1, Concern: 2 };
const SECS = Object.fromEntries(C.sections.map(s => [s.id, s]));

function blank() {
  return { v: 1, meta: { initials: "", dob: "", date: todayISO(), clinician: "", concern: "", setting: "", informants: [], src: "P" },
    bandOv: "auto", olderAll: false, secBand: {}, secAuto: {}, older: {}, younger: {},
    ans: {}, src: {}, prompt: {}, opts: {}, sel: {}, text: {},
    prios: [{}, {}, {}], behav: { none: false, f: {} },
    domOv: {}, outOv: "", rescreen: "", tests: {}, refs: {}, next: [], notes: "", evalDate: "", sign: "",
    sum: { showAreas: true, showStart: true, start: {}, shared: [], home: [], text: null, addl: "", activity: "play" }, tab: "form", updated: null };
}
let S = load();
function load() { try { const j = JSON.parse(localStorage.getItem(KEY)); if (j && j.v === 1) return fix(merge(blank(), j)); } catch (e) {} return blank(); }
function fix(st) { st.sum.home = (st.sum.home || []).map(x => typeof x === "number" ? C.homeIdeas[x] : x).filter(Boolean); Object.keys(st.src).forEach(k => { if (!C.itemSources.includes(st.src[k])) delete st.src[k]; }); return st; }
const IKEY = "its-ot-home-ideas-v1";
function savedIdeas() { try { return JSON.parse(localStorage.getItem(IKEY)) || []; } catch (e) { return []; } }
function allIdeas() { return [...new Set(C.homeIdeas.concat(savedIdeas(), S.sum.home))]; }
function merge(a, b) { for (const k in b) { if (b[k] && typeof b[k] === "object" && !Array.isArray(b[k]) && a[k] && typeof a[k] === "object" && !Array.isArray(a[k])) merge(a[k], b[k]); else a[k] = b[k]; } return a; }
let saveT; function save() { S.updated = new Date().toISOString(); clearTimeout(saveT); saveT = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(S)); flash("Saved on this device"); } catch (e) { flash("Could not save — export JSON"); } }, 150); }
function flash(t) { const el = $("#savestate"); if (el) { el.textContent = t; el.classList.add("on"); clearTimeout(flash.t); flash.t = setTimeout(() => el.classList.remove("on"), 1200); } }

/* ---------- age & bands ---------- */
function age() {
  const m = S.meta; if (!m.dob) return null;
  const a = new Date(m.dob + "T00:00"), b = new Date((m.date || todayISO()) + "T00:00");
  let mo = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()); if (b.getDate() < a.getDate()) mo--;
  if (mo < 0 || isNaN(mo)) return null;
  const y = Math.floor(mo / 12); return { mo, y, m: mo % 12, txt: y + ";" + (mo % 12), band: y < 3 ? 0 : y < 6 ? 1 : y < 13 ? 2 : 3 };
}
function childBand() { if (S.bandOv !== "auto") return +S.bandOv; const a = age(); return a ? Math.min(a.band, 3) : 1; }
function bandLabel(b) { const a = age(); return C.bands[b].label + (b === 0 && a && a.y === 2 && S.bandOv === "auto" ? " (early preschool)" : ""); }
function range(r) { return ({ "0–3": [0, 0], "3–5": [1, 1], "3–12": [1, 2], "3–18": [1, 3], "6–18": [2, 3], "6–12": [2, 2], "0–12": [0, 2], "0–5": [0, 1], "13–18": [3, 3] })[r] || [0, 3]; }
function workBand(sec) { return S.secBand[sec] != null ? S.secBand[sec] : childBand(); }

/* ---------- domain status ---------- */
function perfItems(sec) { return (SECS[sec].blocks || []).filter(b => b.t === "perf").flatMap(b => b.items); }
function freqItems(sec) { return (SECS[sec].blocks || []).filter(b => b.t === "freq").flatMap(b => b.items.map(i => Object.assign({ pos: b.pos }, i))); }
const has = (id, v) => (S.opts[id] || []).includes(v);
function isFlagF(i) { const v = S.ans[i.id]; return i.pos ? (v === "N" || v === "R") : (v === "O" || v === "A"); }
function isMildF(i) { return S.ans[i.id] === "S"; }
function prioLimit(dom) { return S.prios.some(p => p.limits && p.dom === dom); }
function autoStatus(d) {
  const why = []; let st = 0, b = childBand();
  const bump = (n, w) => { if (w) why.push(w); st = Math.max(st, n); };
  if (["FM", "GM", "ADL", "ADAPT"].includes(d.id)) {
    const items = perfItems(d.sec).filter(i => { const [lo, hi] = range(i.r); return b >= lo && b <= hi; });
    let ns = 0, e = 0;
    items.forEach(i => { const v = S.ans[i.id], p = S.prompt[i.id]; if (v === "NS" || (["M", "PP", "FP"].includes(p) && v !== "NA")) ns++; else if (v === "E") e++; });
    if (ns >= 2) bump(2, ns + " age-expected items need support"); else if (ns === 1) bump(1, "1 age-expected item needs support");
    if (e >= 2) bump(1, e + " age-expected items emerging");
    if (d.id === "GM") { const seen = S.opts.gmSeen || [], nm = S.opts.neuroM || []; if (nm.length) bump(1, "changes in movement reported"); if (seen.length >= 2) bump(1, seen.length + " postural / movement notes");
      if ((S.opts.wcFlags || []).some(f => f !== "Self-propels")) bump(1, "mobility device flags"); }
    if (d.id === "ADL") { const w = S.sel.sleepWake; if (w === "2–3 per night" || w === "4+ per night") bump(1, "night wakings " + w); }
  } else {
    const items = freqItems(d.sec); const fl = items.filter(isFlagF).length, mi = items.filter(isMildF).length;
    if (d.id === "SAFETY") { if (fl) bump(2, fl + " safety item(s) often/always"); else if (mi) bump(1, mi + " safety item(s) sometimes");
      if (["Arm's length", "1:1 / hands-on"].some(v => has("superv", v)) && childBand() > 0) bump(1, "supervision above age-typical"); }
    else if (d.id === "FEED") {
      if (fl >= 2) bump(2, fl + " mealtime items often/always"); else if (fl === 1) bump(1, "1 mealtime item often/always"); if (mi >= 2) bump(1, mi + " mealtime items sometimes");
      const cc = S.ans.fe2; if (cc === "O" || cc === "A") bump(2, "cough / choke / wet voice often"); else if (cc === "S" || cc === "R") bump(1, "cough / choke / wet voice reported");
      if (S.sel.foods === "Fewer than 10") bump(2, "fewer than 10 foods accepted"); else if (S.sel.foods === "10–19") bump(1, "fewer than 20 foods accepted");
      if (S.sel.meal === "Over 30 min") bump(1, "meals over 30 min");
      if ((S.opts.refuses || []).length >= 3) bump(1, "refuses 3+ food groups / textures");
      if (has("growth", "Weight / growth concern (MD)") || has("growth", "Tube feeding now/past")) bump(1, "growth / tube-feeding history");
    } else if (d.id === "PLAY") {
      if (has("play", "Mostly screens")) bump(1, "mostly screen play"); if (S.sel.playMin === "Under 2 min" && b > 0) bump(1, "stays with play under 2 min");
    } else if (d.id === "SOCIAL") {
      const f = Object.values(S.behav.f); const hi = f.filter(v => v === "O" || v === "A").length, so = f.filter(v => v === "S").length;
      if (!S.behav.none) { if (hi >= 2) bump(2, hi + " behaviors often/always"); else if (hi === 1) bump(1, "1 behavior often/always"); if (so >= 2) bump(1, so + " behaviors sometimes"); }
    } else { // SENS, SCHOOL
      if (fl >= 2) bump(2, fl + " items " + (d.id === "SCHOOL" ? "rarely/never met" : "often/always")); else if (fl === 1) bump(1, "1 item " + (d.id === "SCHOOL" ? "rarely/never met" : "often/always"));
      if (mi >= 2) bump(1, mi + " items sometimes");
    }
  }
  if (prioLimit(d.id)) { if (st === 1) bump(2, "caregiver priority limits a daily routine"); else bump(1, "caregiver priority limits a daily routine"); }
  return { st: ["Typical", "Monitor", "Concern"][st], why };
}
function status(d) { const a = autoStatus(d); return { auto: a.st, why: a.why, ov: S.domOv[d.id] || "", st: S.domOv[d.id] || a.st }; }
function devInfo(d) {
  if (!d.range) return null;
  const tally = [0, 1, 2, 3].map(() => ({ p: 0, n: 0 }));
  perfItems(d.sec).forEach(i => { const v = S.ans[i.id]; if (["I", "E", "NS"].includes(v)) { tally[i.lvl].n++; if (v === "I") tally[i.lvl].p++; } });
  if (d.id === "FM") ["grasp", "shapes"].forEach(g => { const bl = SECS.s4.blocks.find(b => b.id === g); (S.opts[g] || []).forEach(v => { const o = bl.opts.find(x => optL(x) === v); if (o && o.lvl != null) { tally[o.lvl].n++; tally[o.lvl].p++; } }); });
  if (!tally.some(t => t.n)) return null;
  const maxL = Math.max(...perfItems(d.sec).map(i => i.lvl), d.id === "FM" ? 2 : 0);
  for (let b = 3; b >= 0; b--) if (tally[b].n && tally[b].p / tally[b].n >= 0.5) return { b, top: b === maxL && childBand() > maxL };
  return { b: -1 };
}
function devRange(d) {
  const i = devInfo(d); if (!i) return null; if (i.b < 0) return "skills not yet observed at the 0–3 items";
  return i.top ? "skills observed through the highest screener level for this area (" + C.bands[i.b].label + "); older skills not sampled" : "skills observed mostly in the " + C.bands[i.b].label + " range";
}
function safetyOA() { return freqItems("s13").some(i => S.ans[i.id] === "O" || S.ans[i.id] === "A"); }
function outcome() {
  const sts = C.domains.map(d => status(d).st); const nc = sts.filter(s => s === "Concern").length, nm = sts.filter(s => s === "Monitor").length;
  const pl = S.prios.some(p => p.limits), so = safetyOA(), why = [];
  if (nc) why.push(nc + " domain(s) Concern"); if (nm >= 2) why.push(nm + " domains Monitor"); if (pl) why.push("a caregiver priority limits a daily routine"); if (so) why.push("a Safety item is Often/Always");
  let auto = (nc || nm >= 2 || pl || so) ? "FULL" : nm === 1 ? "MON" : "NONE";
  if (auto === "MON") why.push("exactly 1 domain Monitor, no Concern"); if (auto === "NONE") why.push("all domains Typical, no other trigger");
  return { auto, why, nc, nm, k: S.outOv || auto };
}
/* ---------- suggested tests & referrals ---------- */
function suggest() {
  const st = Object.fromEntries(C.domains.map(d => [d.id, status(d).st])), fl = id => st[id] !== "Typical", a = age(), y = a ? a.mo / 12 : null, out = outcome();
  const T = {}, R = {};
  const anyFlag = Object.values(st).some(s => s !== "Typical");
  if (y != null && y < 6 && anyFlag) T.DAYC2 = "under 6 with flagged area(s)";
  if ((y == null || y >= 4) && (fl("FM") || fl("GM"))) T.BOT2 = "motor domain flagged" + (y == null ? " (check age 4+)" : "");
  if ((y == null || y >= 2) && fl("FM")) T.VMI = "fine motor / visual-motor flagged";
  if (fl("ADL") || fl("ADAPT") || fl("SOCIAL")) T.VINE = "adaptive / ADL / social flagged";
  if (fl("SENS")) T.SENSQ = "sensory Monitor / Concern";
  const dx = S.opts.dx || [], add = (id, c, p) => { const r = R[id] || (R[id] = { c: [], p: [] }); if (!r.c.includes(c)) r.c.push(c); if (p && !r.p.includes(p)) r.p.push(p); };
  const regress = (S.opts.regress || []).filter(v => v !== "None reported");
  if (regress.length) add("neuro", "loss of previously gained skills (regression: " + regress.join(", ").toLowerCase() + ")", "loss of previously gained skills");
  if ((S.opts.neuroM || []).length) add("neuro", "changes in movement (one-sided weakness, very low or high muscle tone, or new or increasing falls)", "changes in movement");
  if (R.neuro) R.neuro.c.push("Recommend discussing with pediatrician / neurology referral");
  if (["sa4", "sa5", "sa6"].some(i => ["O", "A"].includes(S.ans[i]))) add("aba", "frequent aggression, self-injury, or elopement (Safety)", "safety-related behaviors");
  if (!S.behav.none && Object.values(S.behav.f).some(v => v === "O" || v === "A") && st.SOCIAL === "Concern") add("aba", "behavior blocks daily routines", "behaviors that interrupt daily routines");
  const comm = perfItems("s9").filter(i => i.comm), cF = comm.filter(i => ["NS", "E"].includes(S.ans[i.id])), cNS = cF.filter(i => S.ans[i.id] === "NS").length;
  if (cNS || cF.length >= 2) { const parts = [...new Set(cF.map(i => i.lang))]; add("slp", "communication items need support / emerging: " + parts.join(", "), null); parts.forEach(x => R.slp.p.push(x)); }
  if (["R", "S", "O", "A"].includes(S.ans.fe2) || ["O", "A"].includes(S.ans.fe3)) add("slp", "feeding / swallow signs reported", "feeding and swallowing");
  if (["R", "S", "O", "A"].includes(S.ans.fe2)) add("feed", "cough / choke / wet voice with intake", "chewing and swallowing safety");
  if (fl("GM")) add("pt", "gross motor " + st.GM, "gross motor skills and balance");
  if (["O", "A"].includes(S.ans.sa1)) add("pt", "frequent falls", "fall risk");
  if ((S.opts.wc || []).some(v => v !== "No")) add("pt", "mobility device in use", "mobility and equipment needs");
  if (Object.values(st).filter(s => s === "Concern").length >= 3 && (!dx.length || dx.includes("None"))) add("devped", "Concern in 3+ areas, no diagnosis", "development across several areas");
  if ((S.opts.vh || []).some(v => ["Failed / referred screen", "Not screened", "Hearing aids / concern"].includes(v))) add("audvis", "failed / missed screen or concern", "hearing and vision");
  if (has("growth", "Weight / growth concern (MD)")) add("gi", "growth / weight concern", "growth");
  if (S.sel.foods === "Fewer than 10" || S.sel.foods === "10–19" || (S.opts.refuses || []).length >= 3) add("gi", "very limited diet", "nutrition and food variety");
  if (has("mh", "Behavior / mood change reported")) add("psych", "behavior / mood change reported", "emotional and behavioral regulation");
  if (has("mh", "Self-harm statements reported")) add("psych", "self-harm statements reported: URGENT, same-day follow-up", "emotional and behavioral regulation");
  if (Object.keys(R).length) add("peds", "coordinate referrals / medical follow-up", "coordinate care and the referrals above");
  return { T, R, out };
}
const urgentPsych = () => has("mh", "Self-harm statements reported");
const regressed = () => (S.opts.regress || []).some(v => v !== "None reported");
const refReasonC = (g, id) => g.R[id] ? g.R[id].c.join("; ") : "";
const joinOr = l => l.length < 2 ? l.join("") : l.length === 2 ? l[0] + " and/or " + l[1] : l.slice(0, -1).join(", ") + ", and/or " + l[l.length - 1];
function refReasonP(g, r) {
  let p = g.R[r.id] ? g.R[r.id].p.slice() : []; if (!p.length) return r.preason;
  if (p.includes("expressive language") && p.includes("receptive language")) { p[p.indexOf("expressive language")] = "expressive and receptive language"; p = p.filter(x => x !== "receptive language"); }
  return r.pverb + " " + joinOr(p);
}
const chosen = (map, sug, id) => map[id] != null ? map[id] : !!sug[id];

/* ---------- render helpers ---------- */
function chip(act, attrs, label, on, tone) { return `<button type="button" class="chip${on ? " on" : ""}${tone ? " t-" + tone : ""}" data-act="${act}" ${attrs} aria-pressed="${on}">${esc(label)}</button>`; }
function optsBlock(b) {
  if (b.showIf && !b.showIf(S)) return "";
  const cur = S.opts[b.id] || [];
  return `<div class="row-opts"><div class="lbl">${esc(b.label)}</div><div class="chips">${b.opts.map(o => chip("opt", `data-g="${b.id}" data-v="${esc(optL(o))}" data-m="${b.multi ? 1 : 0}" data-none="${esc(b.none || "")}"`, optL(o), cur.includes(optL(o)), /flag/.test(optL(o)) ? "flag" : "")).join("")}</div></div>`;
}
function selBlock(b) { return `<label class="row-sel"><span class="lbl">${esc(b.label)}</span><select data-bind="sel.${b.id}">${b.opts.map(o => `<option value="${esc(o)}"${S.sel[b.id] === o ? " selected" : ""}>${o ? esc(o) : "Select…"}</option>`).join("")}</select></label>`; }
function textBlock(b) { return `<label class="row-text"><span class="lbl">${esc(b.label)}</span><input type="text" maxlength="160" data-bind="text.${b.id}" value="${esc(S.text[b.id] || "")}"></label>`; }
const srcOf = id => S.src[id] || "O";
function srcTag(id) { const s = srcOf(id); return `<button type="button" class="src s-${s}" data-act="src" data-id="${id}" title="Tap: Observed → Parent/Caregiver → Teacher">${esc(C.srcShort[s])}</button>`; }
function perfRow(i, prompt, tag) {
  const v = S.ans[i.id];
  return `<div class="item${v ? " done" : ""}" data-item="${i.id}"><div class="ilbl">${esc(i.l)} ${tag ? `<span class="band">${tag}</span>` : ""}${srcTag(i.id)}</div>
  <div class="chips rate">${C.scales.perf.map(o => chip("rate", `data-id="${i.id}" data-v="${o.k}"`, o.l, v === o.k, o.tone)).join("")}</div>
  ${prompt ? `<select class="prompt" data-bind="prompt.${i.id}">${C.scales.prompt.map(o => `<option value="${o.k}"${(S.prompt[i.id] || "") === o.k ? " selected" : ""}>${o.l}</option>`).join("")}</select>` : ""}</div>`;
}
function perfBlock(b, sec) {
  const cb = childBand(), wb = workBand(sec), groups = { at: [], yv: [], yh: [], old: [] };
  b.items.forEach(i => { const [lo, hi] = range(i.r); if (wb >= lo && wb <= hi) groups.at.push(i); else if (hi < wb) (hi >= wb - 1 ? groups.yv : groups.yh).push(i); else groups.old.push(i); });
  const tag = i => i.r === A ? "All ages" : i.r;
  let h = "";
  // adaptive banners
  const at = groups.at;   if (typeof S.secAuto[sec] === "number") h += `<div class="banner">2+ misses in a row: working band moved to ${C.bands[wb].label}. <button type="button" class="link" data-act="undoband" data-sec="${sec}">Undo</button></div>`;
  h += `<div class="grp-h">Working band: ${C.bands[wb].label}${wb !== cb ? ` <span class="muted">(child's band ${C.bands[cb].label})</span>` : ""} <span class="bandpick">${C.bands.map(x => chip("sband", `data-sec="${sec}" data-b="${x.id}"`, x.label, x.id === wb, "sm")).join("")}</span></div>`;
  h += at.map(i => perfRow(i, b.prompt, tag(i))).join("") || `<div class="muted pad">No items at this band in this section.</div>`;
  const allPass = at.length && at.every(i => S.ans[i.id] === "I");
  if (groups.yv.length) h += `<div class="grp-h">Younger skills — score if working below age</div>` + groups.yv.map(i => perfRow(i, b.prompt, tag(i))).join("");
  if (groups.yh.length) h += (S.younger[sec] || groups.yh.some(i => S.ans[i.id])) ? `<div class="grp-h">Earlier skills <button type="button" class="link" data-act="younger" data-sec="${sec}">Hide</button></div>` + groups.yh.map(i => perfRow(i, b.prompt, tag(i))).join("")
    : `<button type="button" class="more" data-act="younger" data-sec="${sec}">Show earlier items (${groups.yh.length})</button>`;
  if (groups.old.length) { const open = S.older[sec] || S.olderAll || groups.old.some(i => S.ans[i.id]);
    h += open ? `<div class="grp-h">Older items</div>` + groups.old.map(i => perfRow(i, b.prompt, tag(i))).join("")
      : `<button type="button" class="more${allPass ? " offer" : ""}" data-act="older" data-sec="${sec}">${allPass ? "All passed — show older items" : "Show older items"} (${groups.old.length})</button>`; }
  return h;
}
function freqBlock(b) {
  return b.items.map(i => { const v = S.ans[i.id], fl = isFlagF(Object.assign({ pos: b.pos }, i));
    return `<div class="item${v ? " done" : ""}${fl ? " flagged" : ""}" data-item="${i.id}"><div class="ilbl">${esc(i.l)} ${i.sys ? `<span class="band">${i.sys}</span>` : ""}${srcTag(i.id)}</div>
    <div class="chips rate">${C.scales.freq.map(o => { const bad = b.pos ? (o.k === "N" || o.k === "R") : (o.k === "O" || o.k === "A"); return chip("rate", `data-id="${i.id}" data-v="${o.k}"`, o.l, v === o.k, bad ? "flag" : o.k === "S" ? "mid" : "ok"); }).join("")}</div></div>`; }).join("");
}
function prioBlock() {
  return S.prios.map((p, n) => `<div class="prio"><div class="pnum">${n + 1}</div><div class="pbody">
    <div class="pgrid"><label><span class="lbl">Area</span><select data-bind="prios.${n}.dom"><option value="">Select…</option>${C.domains.map(d => `<option value="${d.id}"${p.dom === d.id ? " selected" : ""}>${esc(d.name)}</option>`).join("")}</select></label>
    <label><span class="lbl">Routine affected</span><select data-bind="prios.${n}.routine"><option value="">Select…</option>${C.routines.map(r => `<option${p.routine === r ? " selected" : ""}>${esc(r)}</option>`).join("")}</select></label></div>
    <div class="prow">${chip("plim", `data-n="${n}"`, "Limits a daily routine", !!p.limits, "flag")}<input type="text" maxlength="120" placeholder="What happens, where, how often (optional)" data-bind="prios.${n}.note" value="${esc(p.note || "")}"></div></div></div>`).join("");
}
function behavBlock() {
  const B = S.behav;
  return `<div class="row-opts"><div class="lbl">Behaviors (select all that apply, then how often)</div><div class="chips">${chip("behnone", "", "None reported / observed", B.none, "ok")}${C.behaviors.map(b => chip("beh", `data-id="${b.id}"`, b.l, B.f[b.id] != null)).join("")}</div>
  ${C.behaviors.filter(b => B.f[b.id] != null).map(b => `<div class="item sub"><div class="ilbl">${esc(b.l)}</div><div class="chips rate">${C.scales.behFreq.map(o => chip("behf", `data-id="${b.id}" data-v="${o.k}"`, o.l, B.f[b.id] === o.k, (o.k === "O" || o.k === "A") ? "flag" : o.k === "S" ? "mid" : "ok")).join("")}</div></div>`).join("")}</div>`;
}
function headerSection() {
  const m = S.meta, a = age();
  return `<div class="grid4">
    <label><span class="lbl">Child initials / ID</span><input type="text" maxlength="20" autocomplete="off" data-bind="meta.initials" value="${esc(m.initials)}"></label>
    <label><span class="lbl">Date of birth</span><input type="date" data-bind="meta.dob" value="${esc(m.dob)}"></label>
    <label><span class="lbl">Screening date</span><input type="date" data-bind="meta.date" value="${esc(m.date)}"></label>
    <div class="agebox"><span class="lbl">Age</span><div class="agev">${a ? a.txt + " <small>y;m</small>" : "—"}</div><div class="muted">${a ? "Band " + esc(bandLabel(childBand())) : "Enter DOB"}</div></div></div>
  <div class="row-opts"><div class="lbl">Setting <span class="muted">(sets section emphasis)</span></div><div class="chips">${C.settings.map(s => chip("setting", `data-v="${s.k}"`, s.l, m.setting === s.k)).join("")}</div></div>
  <div class="row-opts"><div class="lbl">Informant(s) interviewed <span class="muted">(items default to Observed; tap an item’s tag to mark Parent/Caregiver or Teacher report)</span></div><div class="chips">${C.informants.map(s => chip("inf", `data-v="${s.k}"`, s.l, m.informants.includes(s.k))).join("")}</div></div>
  <div class="grid2"><label><span class="lbl">Age band</span><select data-bind="bandOv"><option value="auto"${S.bandOv === "auto" ? " selected" : ""}>Auto from DOB${a ? " (" + C.bands[a.band].label + ")" : ""}</option>${C.bands.map(b => `<option value="${b.id}"${S.bandOv === String(b.id) ? " selected" : ""}>Override: ${b.label}</option>`).join("")}</select></label>
    <label><span class="lbl">Clinician</span><input type="text" maxlength="60" data-bind="meta.clinician" value="${esc(m.clinician)}"></label></div>
  <label class="row-text"><span class="lbl">Referral concern (optional)</span><input type="text" maxlength="200" data-bind="meta.concern" value="${esc(m.concern)}"></label>
  <div class="row-opts"><div class="chips">${chip("olderAll", "", S.olderAll ? "Showing older items in all sections" : "Show older items (all sections)", S.olderAll)}</div></div>`;
}
function outcomeSection() {
  const o = outcome();
  const cards = C.domains.map(d => { const s = status(d), r = devRange(d);
    return `<div class="dom st-${s.st}"><div class="dhead"><b>${esc(d.name)}</b>${prioLimit(d.id) ? '<span class="pri">Priority</span>' : ""}</div>
    <div class="chips">${["Typical", "Monitor", "Concern"].map(v => chip("domov", `data-d="${d.id}" data-v="${v}"`, v + (s.auto === v ? " (auto)" : ""), s.st === v, v === "Concern" ? "flag" : v === "Monitor" ? "mid" : "ok")).join("")}</div>
    <div class="why">${s.ov ? `<b>Override.</b> ` : ""}${s.why.length ? esc(s.why.join(" · ")) : "No flags"}${r ? `<br><span class="range">Developmental range: ${esc(r)} (not an age equivalent)</span>` : ""}</div></div>`; }).join("");
  return `<p class="muted">Auto-computed from your taps. Tap a rating to override; tap the auto rating to go back to auto.</p><div class="doms">${cards}</div>
  <div class="outbox out-${o.k}"><div class="lbl">Outcome (${S.outOv ? "override" : "auto"}) · ${o.nc} Concern · ${o.nm} Monitor</div><div class="outv">${esc(C.outcomes[o.k].l)}</div><div class="why">${esc(o.why.join(" · "))}</div>
  <div class="chips">${Object.keys(C.outcomes).map(k => chip("outov", `data-v="${k}"`, C.outcomes[k].l.replace(" identified at this time", "") + (o.auto === k ? " (auto)" : ""), o.k === k)).join("")}</div>
  ${o.k === "MON" ? `<label class="row-sel"><span class="lbl">Rescreen</span><select data-bind="rescreen">${["", "In 3 months", "In 6 months", "Sooner if new concern"].map(v => `<option${S.rescreen === v ? " selected" : ""} value="${v}">${v || "Select…"}</option>`).join("")}</select></label>` : ""}</div>
  <details class="rule"><summary>Decision rule</summary><p><b>Full comprehensive OT evaluation</b> if any domain Concern, OR 2+ Monitor, OR a caregiver priority limits a daily routine, OR any Safety item Often/Always. <b>Monitor & rescreen</b> if exactly 1 Monitor and no Concern. <b>No OT needs</b> if all Typical. Monitor = minor / inconsistent difference, no routine limited; Concern = below age AND limits participation.</p></details>`;
}
function testsSection() {
  const g = suggest();
  return `<div class="lbl">Suggested tests <span class="muted">(by age + flagged domain; ages, norms & scoring per current manual)</span></div>
  ${C.tests.map(t => { const on = chosen(S.tests, g.T, t.id); return `<label class="check${g.T[t.id] ? " sug" : ""}"><input type="checkbox" data-act="test" data-id="${t.id}"${on ? " checked" : ""}><span><b>${esc(t.l)}</b> — ${esc(t.crit)}${g.T[t.id] ? `<em> · suggested: ${esc(g.T[t.id])}</em>` : ""}</span></label>`; }).join("")}
  <div class="lbl mt">Referrals — consider if criteria met <span class="muted">(include / exclude; discuss with caregiver)</span></div>
  ${C.referrals.map(r => { const on = chosen(S.refs, g.R, r.id), urgent = (r.id === "psych" && urgentPsych()) || (r.id === "neuro" && regressed()); return `<label class="check${g.R[r.id] ? " sug" : ""}${urgent ? " urgent" : ""}"><input type="checkbox" data-act="ref" data-id="${r.id}"${on ? " checked" : ""}><span><b>${esc(r.l)}</b> — ${esc(r.trig)}${g.R[r.id] ? `<br><em>Reason: ${esc(refReasonC(g, r.id))}</em>` : ""}${r.id === "neuro" && regressed() ? `<br><strong class="urg">Regression reported: same-week follow-up</strong>` : ""}</span></label>`; }).join("")}
  <div class="row-opts mt"><div class="lbl">${esc(C.nextStepsLabel)} <span class="muted">(clinician copy only)</span></div><div class="chips">${C.nextSteps.map(n => chip("next", `data-v="${esc(n)}"`, n, S.next.includes(n))).join("")}</div></div>
  <label class="row-text"><span class="lbl">Notes / caregiver quotes / items to probe in full eval (optional)</span><textarea rows="3" data-bind="notes">${esc(S.notes)}</textarea></label>
  <div class="grid2"><label><span class="lbl">Full eval date</span><input type="date" data-bind="evalDate" value="${esc(S.evalDate)}"></label><label><span class="lbl">Clinician name / credentials</span><input type="text" maxlength="80" data-bind="sign" value="${esc(S.sign)}"></label></div>
  <div class="actions"><button type="button" class="btn" data-act="tab" data-v="summary">Open Results Summary</button><button type="button" class="btn ghost" data-act="tab" data-v="clin">Clinician copy</button><button type="button" class="btn ghost" data-act="prefill">Start full eval (export prefill)</button></div>`;
}
function sectionBody(sec) {
  if (sec.header) return headerSection();
  if (sec.calc === "outcome") return outcomeSection();
  if (sec.calc === "tests") return testsSection();
  return sec.blocks.map(b => b.t === "opts" ? optsBlock(b) : b.t === "sel" ? selBlock(b) : b.t === "text" ? textBlock(b) : b.t === "note" ? `<p class="note">${esc(b.text)}</p>`
    : b.t === "perf" ? perfBlock(b, sec.id) : b.t === "freq" ? freqBlock(b) : b.t === "prio" ? prioBlock() : b.t === "behav" ? behavBlock() : "").join("");
}
function focusSecs() { const s = C.settings.find(x => x.k === S.meta.setting); return s ? s.focus : []; }
function renderSection(id) {
  const sec = SECS[id], el = document.getElementById(id); if (!el) return;
  const d = sec.dom && C.domains.find(x => x.id === sec.dom), st = d ? status(d).st : null;
  el.className = "sec" + (focusSecs().includes(id) ? " focus" : "");
  el.innerHTML = `<div class="sec-h"><span class="num">${sec.n}</span><h2>${esc(sec.title)}</h2>${sec.sub ? `<span class="sub">${esc(sec.sub)}</span>` : ""}${focusSecs().includes(id) ? '<span class="focus-tag">Setting focus</span>' : ""}${st ? `<span class="pill st-${st}">${st}</span>` : ""}</div><div class="sec-b">${sectionBody(sec)}</div>`;
}
function renderForm() {
  $("#form").innerHTML = C.sections.map(s => `<section id="${s.id}" class="sec"></section>`).join("");
  C.sections.forEach(s => renderSection(s.id)); renderBar();
}
function renderBar() {
  const a = age(), o = outcome();
  $("#childbar").innerHTML = `<span><b>${esc(S.meta.initials || "Child")}</b> · ${a ? a.txt : "age —"} · band ${esc(bandLabel(childBand()))} <span id="savestate" class="savestate"></span></span><span class="pill out-${o.k}">${esc(C.outcomes[o.k].l)}</span>`;
  $("#nav").innerHTML = C.sections.map(s => `<a href="#${s.id}" class="${focusSecs().includes(s.id) ? "f" : ""}">${s.n}. ${esc(s.title.split(/[,·&/(—]/)[0].trim())}</a>`).join("");
}
function refreshCalc() { ["s14", "s15"].forEach(renderSection); C.sections.filter(s => s.dom).forEach(s => { const el = document.getElementById(s.id); const d = C.domains.find(x => x.id === s.dom); const p = el && el.querySelector(".sec-h .pill"); if (p) { const st = status(d).st; p.className = "pill st-" + st; p.textContent = st; } }); renderBar(); }

/* ---------- Results Summary ---------- */
const pband = st => st === "Concern" ? "Elevated" : st;
const listJoin = l => l.length < 2 ? l.join("") : l.slice(0, -1).join(", ") + " and " + l[l.length - 1];
const poss = nm => nm + "’s";
function actPhrase(k, nm) { const a = C.activities.find(x => x.k === k) || C.activities[0]; return a.t.replace("{n}", nm); }
function autoText() {
  const a = age(), nm = S.meta.initials || "your child", Nm = S.meta.initials || "Your child", g = { Typical: [], Monitor: [], Elevated: [] };
  C.domains.forEach(d => g[pband(status(d).st)].push(d.parent.toLowerCase()));
  const who = S.meta.informants.filter(k => k !== "O").map(k => ({ P: "parent/caregiver", T: "teacher", X: "other caregiver" })[k]);
  let t = `At today’s screening${a ? ` (age ${a.y} years, ${a.m} months)` : ""}, ${actPhrase(S.sum.activity, nm)}.` + (who.length ? ` We also talked with ${poss(nm)} ${listJoin(who)}.` : "") + " ";
  const lines = C.domains.map(d => [d, status(d).st]).sort((x, y) => RANK[y[1]] - RANK[x[1]]).map(([d, st]) => areaText(d, st, Nm)).filter(Boolean);
  if (lines.length) t += "\n\n" + lines.join("\n");
  return t.trim();
}
const SRCV = { O: ["was observed to", ""], P: ["was reported to", " (per caregiver report)"], T: ["was reported to", " (per teacher report)"], N: ["was noted to", ""] };
const FW = { A: "consistently", O: "often", S: "sometimes" }, FWP = { N: "not yet", R: "rarely", S: "only sometimes" };
function itemClauses(d) {
  const out = [], cb = childBand();
  (SECS[d.sec].blocks || []).forEach(b => {
    if (b.t === "perf") b.items.forEach(i => { const v = S.ans[i.id], pr = S.prompt[i.id] || "";
      if (!v || v === "NA" || v === "NO") return;
      if (v === "NS" || ["M", "PP", "FP"].includes(pr)) out.push({ src: srcOf(i.id), kind: "ns", sup: C.support[pr] || "help", txt: i.do, impact: i.impact, lvl: i.lvl, sev: 3 });
      else if (v === "E") out.push({ src: srcOf(i.id), kind: "e", txt: i.do, impact: i.impact, lvl: i.lvl, sev: 1 }); });
    if (b.t === "freq") b.items.forEach(i => { const v = S.ans[i.id], fw = b.pos ? FWP[v] : FW[v]; if (fw) out.push({ src: srcOf(i.id), kind: "f", fw, txt: i.obs, impact: i.impact, sev: v === "S" ? 1 : 2 }); });
  });
  if (d.id === "FM") { const bl = SECS.s4.blocks.find(b => b.id === "grasp"), o = bl.opts.find(x => x.l === (S.opts.grasp || [])[0]); if (o && o.desc && o.lvl < cb) out.push({ src: "O", kind: "raw", txt: "hold the pencil with " + o.desc, impact: "handwriting", sev: 2.5 }); }
  if (d.id === "FEED") { if (["Fewer than 10", "10–19"].includes(S.sel.foods)) out.push({ src: "P", kind: "raw", txt: "accept fewer than 20 foods", impact: "nutrition and family meals", sev: 2 });
    if (S.sel.meal === "Over 30 min") out.push({ src: "P", kind: "raw", txt: "take more than 30 minutes to finish meals", impact: "mealtime routines", sev: 1 });
    if ((S.opts.refuses || []).length >= 3) out.push({ src: "P", kind: "raw", txt: "refuse several food groups or textures", impact: "food variety", sev: 1 }); }
  if (d.id === "PLAY") { if (has("play", "Mostly screens")) out.push({ src: "P", kind: "raw", txt: "play mostly with screens", impact: "play with peers", sev: 1 });
    if (S.sel.playMin === "Under 2 min") out.push({ src: "P", kind: "raw", txt: "stay with one play activity for under 2 minutes", impact: "play and learning activities", sev: 1 }); }
  if (d.id === "SOCIAL" && !S.behav.none) C.behaviors.forEach(b => { const v = S.behav.f[b.id]; if (FW[v]) out.push({ src: "N", kind: "f", fw: FW[v], txt: b.obs, impact: null, sev: v === "S" ? 1 : 2 }); });
  return out.sort((a, b) => b.sev - a.sev);
}
function domainAnswered(d) {
  const sec = SECS[d.sec]; if ((sec.blocks || []).some(b => (b.items || []).some(i => S.ans[i.id]))) return true;
  if (d.id === "SOCIAL") return S.behav.none || Object.keys(S.behav.f).length > 0;
  return (sec.blocks || []).some(b => (b.t === "opts" && (S.opts[b.id] || []).length) || (b.t === "sel" && S.sel[b.id]));
}
function impacts(d, cl) {
  const l = [...new Set((cl || itemClauses(d)).slice(0, 3).map(c => c.impact).filter(Boolean).concat(S.prios.filter(p => p.limits && p.dom === d.id && p.routine).map(p => p.routine.toLowerCase())))].slice(0, 3);
  if (!l.length) l.push(d.impact);
  return d.iv === "make" ? `This may make ${listJoin(l)} more difficult.` : `This may affect ${listJoin(l)}.`;
}
function areaText(d, st, nm) {
  if (st === "Typical") return domainAnswered(d) ? `${d.short}: ${nm} ${d.typ}.` : "";
  const cl = itemClauses(d), strong = cl.some(c => c.sev >= 2), use = cl.filter(c => !(strong && c.kind === "f" && c.sev < 2)).slice(0, 3), cb = childBand();
  const pj = l => l.length < 3 ? l.join(" and ") : l.slice(0, -1).join(", ") + ", and " + l[l.length - 1];
  const groups = ["O", "P", "T", "N"].map(k => [k, use.filter(c => c.src === k)]).filter(g => g[1].length);
  const pf = use.filter(c => c.kind === "ns" || c.kind === "e"), dmx = pf.length ? Math.max(...pf.map(c => c.lvl)) : null, allPerf = pf.length === use.length && dmx != null && dmx < cb;
  const sents = groups.map(([k, cs]) => {
    const parts = cs.filter(c => c.kind === "raw").map(c => c.txt), ns = {}, f = {};
    cs.filter(c => c.kind === "ns").forEach(c => (ns[c.sup] = ns[c.sup] || []).push(c.txt));
    Object.entries(ns).forEach(([sup, l]) => parts.push(`need ${sup} to ${listJoin(l)}`));
    const e = cs.filter(c => c.kind === "e").map(c => c.txt); if (e.length) parts.push(`still be developing the ability to ${listJoin(e)}`);
    cs.filter(c => c.kind === "f").forEach(c => (f[c.fw] = f[c.fw] || []).push(c.txt)); Object.entries(f).forEach(([fw, l]) => parts.push(`${fw} ${listJoin(l)}`));
    const lv = cs.filter(c => c.kind === "ns" || c.kind === "e"), mx = lv.length ? Math.max(...lv.map(c => c.lvl)) : null;
    const mast = groups.length === 1 && allPerf && mx != null ? `, skills usually mastered by ages ${C.bands[mx].label}` : "";
    return `${nm} ${SRCV[k][0]} ${pj(parts)}${mast}${SRCV[k][1]}.`;
  });
  if (groups.length > 1 && allPerf) sents.push(`These skills are usually mastered by ages ${C.bands[dmx].label}.`);
  if (!sents.length) sents.push("Some differences were noted in the skills checked.");
  if (d.id === "FM" && (S.opts.shapes || []).length) { const bl = SECS.s4.blocks.find(b => b.id === "shapes"), mx = Math.max(...S.opts.shapes.map(v => (bl.opts.find(o => o.l === v) || { lvl: 0 }).lvl)); sents.push(`Copying shapes was at a ${C.bands[mx].label} year level.`); }
  sents.push(impacts(d, use));
  return `${d.short}: ${sents.join(" ")}`;
}
function addressList() { return C.domains.map(d => [d, status(d).st]).filter(x => x[1] !== "Typical").sort((a, b) => RANK[b[1]] - RANK[a[1]]).slice(0, 5).map(x => x[0].address); }
function parentSteps(o) {
  const st = [];
  if (o.k === "FULL") st.push(C.parentSteps.full);
  if (S.next.includes("Teacher input / records")) st.push(C.parentSteps.teacher);
  if (S.next.includes("Medical records")) st.push(C.parentSteps.records);
  if (o.k === "MON") st.push("Rescreen" + (S.rescreen ? " " + S.rescreen.toLowerCase() : "") + " — try the home ideas, then we will check again");
  return st;
}
function renderSummary() {
  const a = age(), o = outcome(), g = suggest(), m = S.meta, sm = S.sum, txt = sm.text != null ? sm.text : autoText();
  const steps = parentSteps(o);
  const refs = C.referrals.filter(r => chosen(S.refs, g.R, r.id)).map(r => r.parent + ", " + refReasonP(g, r));
  const addr = addressList(), inf = m.informants.map(k => C.informants.find(x => x.k === k).l).join(", ");
  $("#summary").innerHTML = `<div class="paper">
  <div class="phead">${logo()}<div><div class="prac">${esc(C.practice)}</div><h1>${esc(C.titles.summary)}</h1><div class="psub">${esc(C.summarySub)}</div><div class="contact">${esc(contactLine())}</div></div></div>
  <div class="pinfo"><div><span>Child</span>${esc(m.initials || "—")}</div><div><span>Age</span>${a ? a.txt + " (y;m)" : "—"}</div><div><span>Screening date</span>${esc(fmtDate(m.date))}</div><div><span>Information from</span>${esc(inf || "—")}</div><div><span>Clinician</span>${esc(m.clinician || "—")}</div></div>
  <p class="disc">${esc(C.disclaimer)}</p>
  <table class="areas"><thead><tr><th>Area <span class="muted">(everyday examples)</span></th>${C.bandsParent.map(b => `<th class="c">${b.l}</th>`).join("")}</tr></thead><tbody>
  ${C.domains.map(d => { const pb = pband(status(d).st); return `<tr><td><b>${esc(d.parent)}</b><div class="muted">${esc(d.ex)}</div></td>${C.bandsParent.map(b => `<td class="c">${pb === b.k ? `<span class="dot d-${b.k}">●</span>` : '<span class="dot0">○</span>'}</td>`).join("")}</tr>`; }).join("")}
  </tbody></table>
  <div class="legend">${C.bandsParent.map(b => `<span><b>${b.l}:</b> ${esc(b.d)}</span>`).join("")}</div>
  <p class="bandnote">${esc(C.bandNote)}</p>
  <h3>What we observed and you shared</h3>
  <label class="no-print row-sel actsel"><span class="lbl">Opening sentence describes</span><select data-sumsel="activity">${C.activities.map(x => `<option value="${x.k}"${sm.activity === x.k ? " selected" : ""}>${esc(x.l)}</option>`).join("")}</select></label>
  <textarea class="edit no-print" rows="7" data-sum="text">${esc(txt)}</textarea><div class="print-only ptext">${esc(txt)}</div>
  <div class="no-print small-actions">${sm.text != null ? `<span class="muted">Edited.</span> <button type="button" class="link" data-act="sumreset">Reset to auto-draft</button>` : `<span class="muted">Auto-drafted from the screener. Edit as needed before printing.</span>`}</div>
  <div class="outp out-${o.k}"><div class="lbl">Screening result</div><b>${esc(C.outcomes[o.k].l)}</b><div>${esc(C.outcomes[o.k].parent)}</div></div>
  <h3>Recommended next steps</h3>${steps.length ? `<ul>${steps.map(s => `<li>${esc(s)}</li>`).join("")}</ul>` : "<p>None at this time.</p>"}
  <h3>Recommended referrals</h3>${refs.length ? `<ul>${refs.map(r => `<li>${esc(r)}</li>`).join("")}</ul>` : "<p>None at this time.</p>"}
  <div class="no-print toggles">${chip("sumt", 'data-k="showAreas"', "Include “Areas OT may address”", sm.showAreas)}${chip("sumt", 'data-k="showStart"', "Include “To start OT services”", sm.showStart)}</div>
  ${sm.showAreas && addr.length ? `<h3>Areas OT may address</h3><ul class="cols">${addr.map(x => `<li>${esc(x)}</li>`).join("")}</ul><p class="muted">Specific goals will be set after a full evaluation.</p>` : ""}
  <h3>Ideas to try at home <span class="muted no-print">(tap to include)</span></h3>
  <div class="no-print chips">${allIdeas().map(h => chip("home", `data-v="${esc(h)}"`, h, sm.home.includes(h), "sm")).join("")}</div>
  <div class="no-print addidea"><input type="text" id="ideaNew" maxlength="140" placeholder="Add your own idea"><label class="savechk"><input type="checkbox" id="ideaSave"> Save to my list</label><button type="button" class="btn sm" data-act="ideaadd">Add</button></div>
  <ul class="print-only">${sm.home.length ? sm.home.map(h => `<li>${esc(h)}</li>`).join("") : "<li>We will share ideas at the next visit.</li>"}</ul>
  ${sm.showStart ? `<h3>To start OT services</h3><div class="startlist">${C.startOT.map(s => { const on = sm.start[s.id] != null ? sm.start[s.id] : s.on; return `<div class="st-item${on ? "" : " off"}"><span class="box">☐</span> <span class="stl">${esc(s.l)}</span> <button type="button" class="link no-print" data-act="start" data-id="${s.id}">${on ? "Skip" : "Include"}</button></div>`; }).join("")}</div>` : ""}
  <label class="no-print row-text"><span class="lbl">Additional note to family (optional)</span><input type="text" maxlength="200" data-sum="addl" value="${esc(sm.addl)}"></label>${sm.addl ? `<p class="print-only">${esc(sm.addl)}</p>` : ""}
  <div class="endrow">  <div class="shared"><b>Shared with:</b> ${["Parent", "School"].map(w => `<button type="button" class="cb" data-act="shared" data-v="${w}">${sm.shared.includes(w) ? "☑" : "☐"} ${w}</button>`).join("")}</div>
  <div class="sig"><div><span class="line"></span>Clinician signature / credentials${S.sign ? `: ${esc(S.sign)}` : ""}</div><div><span class="line short"></span>Date</div></div></div>
  <p class="foot">${esc(C.practice)}</p></div>`;
  document.querySelectorAll("#summary textarea.edit").forEach(grow);
}
function grow(el) { el.style.height = "auto"; el.style.height = (el.scrollHeight + 4) + "px"; }
/* ---------- Clinician copy ---------- */
function fmtDate(d) { if (!d) return "—"; const [y, m, dd] = d.split("-"); return `${m}/${dd}/${y}`; }
function logo(badge) { return `<img class="logo${badge ? "" : " hlogo"}" src="${esc(badge ? C.logoBadge : (C.logoDataUrl || C.logo))}" alt="${esc(C.practice)} logo">`; }
const contactLine = () => { const k = C.contact; return `${k.address} · Phone ${k.phone} · Fax ${k.fax} · ${k.email}`; };
function setFoot() { let st = document.getElementById("pagefoot"); if (!st) { st = document.createElement("style"); st.id = "pagefoot"; document.head.appendChild(st); }
  const k = C.contact, q = JSON.stringify(`${k.name} · ${k.address} · Phone ${k.phone} · Fax ${k.fax} · ${k.email}`), f = '7pt -apple-system,"Segoe UI",Roboto,Arial,sans-serif';
  st.textContent = `@page{@bottom-left{content:${q};width:82%;font:${f};color:#6b7686;vertical-align:top;padding-top:1.5mm}@bottom-right{content:"Page " counter(page) " of " counter(pages);width:16%;white-space:nowrap;font:${f};color:#6b7686;vertical-align:top;padding-top:1.5mm}}`; }
function lblOf(scale, k) { const o = C.scales[scale].find(x => x.k === k); return o ? o.l : k; }
function renderClin() {
  const a = age(), o = outcome(), g = suggest(), m = S.meta;
  const secs = C.sections.filter(s => s.blocks).map(s => {
    const rows = s.blocks.map(b => {
      if (b.t === "opts") return (S.opts[b.id] || []).length ? `<tr><td>${esc(b.label)}</td><td>${esc(S.opts[b.id].join(", "))}</td></tr>` : "";
      if (b.t === "sel") return S.sel[b.id] ? `<tr><td>${esc(b.label)}</td><td>${esc(S.sel[b.id])}</td></tr>` : "";
      if (b.t === "text") return S.text[b.id] ? `<tr><td>${esc(b.label)}</td><td>${esc(S.text[b.id])}</td></tr>` : "";
      if (b.t === "perf" || b.t === "freq") return b.items.filter(i => S.ans[i.id]).map(i => `<tr><td>${esc(i.l)}</td><td><b>${esc(lblOf(b.t === "perf" ? "perf" : "freq", S.ans[i.id]))}</b>${S.prompt[i.id] ? " · prompt: " + esc(lblOf("prompt", S.prompt[i.id])) : ""} <span class="muted">(${esc(C.srcShort[srcOf(i.id)])})</span></td></tr>`).join("");
      if (b.t === "prio") return S.prios.filter(p => p.dom || p.note).map((p, n) => `<tr><td>Priority ${n + 1}</td><td>${esc((C.domains.find(d => d.id === p.dom) || {}).name || "")}${p.routine ? " · " + esc(p.routine) : ""}${p.limits ? " · <b>limits a daily routine</b>" : ""}${p.note ? " · " + esc(p.note) : ""}</td></tr>`).join("");
      if (b.t === "behav") return S.behav.none ? `<tr><td>Behaviors</td><td>None reported / observed</td></tr>` : C.behaviors.filter(x => S.behav.f[x.id] != null).map(x => `<tr><td>${esc(x.l)}</td><td>${esc(lblOf("behFreq", S.behav.f[x.id]) || "frequency not set")}</td></tr>`).join("");
      return "";
    }).join("");
    return rows ? `<h4>${s.n}. ${esc(s.title)}</h4><table class="ct">${rows}</table>` : `<h4>${s.n}. ${esc(s.title)}</h4><p class="muted">No responses recorded.</p>`;
  }).join("");
  $("#clin").innerHTML = `<div class="paper">
  <div class="phead">${logo()}<div><div class="prac">${esc(C.practice)}</div><h1>${esc(C.titles.clinician)}</h1><div class="psub">${esc(C.titles.screener)} · confidential clinician record</div><div class="contact">${esc(contactLine())}</div></div></div>
  <div class="pinfo"><div><span>Child</span>${esc(m.initials || "—")}</div><div><span>DOB</span>${esc(fmtDate(m.dob))}</div><div><span>Age / band</span>${a ? a.txt : "—"} · ${esc(bandLabel(childBand()))}</div><div><span>Date</span>${esc(fmtDate(m.date))}</div><div><span>Setting</span>${esc((C.settings.find(x => x.k === m.setting) || {}).l || "—")}</div><div><span>Informants</span>${esc(m.informants.map(k => C.informants.find(x => x.k === k).l).join(", ") || "—")}</div></div>
  ${m.concern ? `<p><b>Referral concern:</b> ${esc(m.concern)}</p>` : ""}
  <h3>Domain status</h3><table class="ct"><tr><th>Domain</th><th>Status</th><th>Basis</th></tr>${C.domains.map(d => { const s = status(d), r = devRange(d); return `<tr><td>${esc(d.name)}</td><td><b>${s.st}</b>${s.ov ? ` <span class="muted">(override; auto ${s.auto})</span>` : ""}</td><td>${esc(s.why.join(" · ") || "No flags")}${r ? `<br><i>${esc(r)} (not an age equivalent)</i>` : ""}${s.st !== "Typical" ? `<br><span class="impact">Possible functional impact: ${esc(impacts(d))}</span>` : ""}</td></tr>`; }).join("")}</table>
  <div class="outp out-${o.k}"><div class="lbl">Outcome ${S.outOv ? "(override; auto: " + esc(C.outcomes[o.auto].l) + ")" : "(auto)"}</div><b>${esc(C.outcomes[o.k].l)}</b>${o.k === "MON" && S.rescreen ? " · rescreen " + esc(S.rescreen.toLowerCase()) : ""}<div>${esc(o.why.join(" · "))}</div></div>
  <h3>Tests</h3><ul>${C.tests.filter(t => chosen(S.tests, g.T, t.id)).map(t => `<li><b>${esc(t.l)}</b> — ${esc(t.crit)}</li>`).join("") || "<li>None selected</li>"}</ul>
  <h3>Referrals</h3><ul>${C.referrals.filter(r => chosen(S.refs, g.R, r.id)).map(r => `<li${(r.id === "psych" && urgentPsych()) || (r.id === "neuro" && regressed()) ? ' class="urgent"' : ""}><b>${esc(r.l)}</b>: ${esc(refReasonC(g, r.id) || "included by clinician")}${r.id === "neuro" && regressed() ? " · <b>Regression reported: same-week follow-up</b>" : ""}<div class="muted">Trigger: ${esc(r.trig)}</div></li>`).join("") || "<li>None selected</li>"}</ul>
  ${S.next.length ? `<p><b>${esc(C.nextStepsLabel)}:</b> ${esc(S.next.join(" · "))}</p>` : ""}${S.notes ? `<p><b>Notes:</b> ${esc(S.notes)}</p>` : ""}
  <h3>Responses</h3>${secs}
  <div class="sig"><div><span class="line"></span>Clinician signature${S.sign ? ": " + esc(S.sign) : ""}</div><div><span class="line short"></span>Date</div></div>
  ${S.evalDate ? `<p>Full eval scheduled: ${esc(fmtDate(S.evalDate))}</p>` : ""}</div>`;
}
/* ---------- tabs, export ---------- */
function setTab(t) {
  S.tab = t; document.body.dataset.tab = t;
  document.querySelectorAll(".tabs button").forEach(b => b.classList.toggle("on", b.dataset.v === t));
  if (t === "summary") renderSummary(); if (t === "clin") renderClin(); if (t === "form") renderForm();
  window.scrollTo(0, 0); save();
}
function download(name, obj) { const b = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" }); const u = URL.createObjectURL(b); const a = document.createElement("a"); a.href = u; a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(u); a.remove(); }, 500); }
const fname = p => `${p}_${(S.meta.initials || "child").replace(/[^\w-]/g, "")}_${S.meta.date || todayISO()}.json`;
function prefill() {
  const a = age(), o = outcome(), g = suggest();
  const concerns = [];
  C.sections.forEach(s => (s.blocks || []).forEach(b => { if (b.t === "perf") b.items.forEach(i => { if (S.ans[i.id] === "NS" || S.ans[i.id] === "E") concerns.push({ section: s.title, item: i.l, rating: lblOf("perf", S.ans[i.id]), source: C.srcShort[srcOf(i.id)] }); });
    if (b.t === "freq") b.items.forEach(i => { if (isFlagF(Object.assign({ pos: b.pos }, i)) || S.ans[i.id] === "S") concerns.push({ section: s.title, item: i.l, rating: lblOf("freq", S.ans[i.id]), source: C.srcShort[srcOf(i.id)] }); }); }));
  return { type: "ITS-OT-FullEval-Prefill", version: C.version, created: new Date().toISOString(), practice: C.practice,
    demographics: { initials: S.meta.initials, dob: S.meta.dob, age: a ? a.txt : "", band: C.bands[childBand()].label, screeningDate: S.meta.date, setting: S.meta.setting, informants: S.meta.informants.map(k => C.informants.find(x => x.k === k).l), clinician: S.meta.clinician },
    referralConcern: S.meta.concern, priorities: S.prios.filter(p => p.dom), history: { birth: S.opts.birth, diagnoses: S.opts.dx, visionHearing: S.opts.vh, regression: S.opts.regress, neuroSigns: (S.opts.neuroM || []).concat(S.opts.neuroH || []), servicesNow: S.opts.svcNow, servicesPast: S.opts.svcPast, mobility: S.opts.wc, mobilityFlags: S.opts.wcFlags },
    domains: C.domains.map(d => { const s = status(d); return { id: d.id, name: d.name, status: s.st, auto: s.auto, override: s.ov || null, basis: s.why, developmentalRange: devRange(d) }; }),
    concerns, outcome: C.outcomes[o.k].l, tests: C.tests.filter(t => chosen(S.tests, g.T, t.id)).map(t => t.l), referrals: C.referrals.filter(r => chosen(S.refs, g.R, r.id)).map(r => ({ referral: r.l, reason: refReasonC(g, r.id) || "included by clinician" })) };
}
/* ---------- events ---------- */
function setPath(path, val) { const ks = path.split("."); let o = S; ks.slice(0, -1).forEach(k => { o = o[k]; }); o[ks[ks.length - 1]] = val; }
function after(el, full) { save(); if (full) { renderForm(); return; } const sec = el && el.closest(".sec"); if (sec && !["s14", "s15"].includes(sec.id)) renderSection(sec.id); refreshCalc(); }
document.addEventListener("click", e => {
  const el = e.target.closest("[data-act]"); if (!el) return; const d = el.dataset, act = d.act;
  if (act === "test" || act === "ref") { (act === "test" ? S.tests : S.refs)[d.id] = el.checked; save(); return; }
  e.preventDefault();
  switch (act) {
    case "rate": { const was = S.ans[d.id]; if (was === d.v) delete S.ans[d.id]; else S.ans[d.id] = d.v;
      // adaptive drop: 2+ consecutive misses at working band
      const secEl = el.closest(".sec"), sid = secEl && secEl.id;
      if (sid && d.v === "NS" && was !== "NS") { const wb = workBand(sid); if (wb > 0 && S.secAuto[sid] == null) { const at = perfItems(sid).filter(i => { const [lo, hi] = range(i.r); return wb >= lo && wb <= hi; }); let run = 0, mx = 0; at.forEach(i => { if (S.ans[i.id] === "NS") { run++; mx = Math.max(mx, run); } else if (S.ans[i.id]) run = 0; }); if (mx >= 2) { S.secAuto[sid] = wb; S.secBand[sid] = wb - 1; } } }
      after(el); break; }
    case "src": { const k = C.itemSources, n = k[(k.indexOf(srcOf(d.id)) + 1) % k.length]; if (n === "O") delete S.src[d.id]; else S.src[d.id] = n; after(el); break; }
    case "opt": { let cur = S.opts[d.g] || []; const v = d.v;
      if (d.m === "1") { if (cur.includes(v)) cur = cur.filter(x => x !== v); else { cur = v === d.none ? [v] : cur.filter(x => x !== d.none).concat(v); } } else cur = cur.includes(v) ? [] : [v];
      S.opts[d.g] = cur; after(el); break; }
    case "setting": S.meta.setting = S.meta.setting === d.v ? "" : d.v; after(el, true); break;
    case "inf": S.meta.informants = S.meta.informants.includes(d.v) ? S.meta.informants.filter(x => x !== d.v) : S.meta.informants.concat(d.v); after(el); break;
    case "olderAll": S.olderAll = !S.olderAll; after(el, true); break;
    case "older": S.older[d.sec] = true; after(el); break;
    case "younger": S.younger[d.sec] = !S.younger[d.sec]; after(el); break;
    case "sband": { const b = +d.b; if (b === childBand()) delete S.secBand[d.sec]; else S.secBand[d.sec] = b; S.secAuto[d.sec] = "manual"; after(el); break; }
    case "undoband": delete S.secBand[d.sec]; S.secAuto[d.sec] = "undone"; after(el); break;
    case "plim": S.prios[+d.n].limits = !S.prios[+d.n].limits; after(el); break;
    case "behnone": S.behav.none = !S.behav.none; if (S.behav.none) S.behav.f = {}; after(el); break;
    case "beh": if (S.behav.f[d.id] != null) delete S.behav.f[d.id]; else { S.behav.f[d.id] = ""; S.behav.none = false; } after(el); break;
    case "behf": S.behav.f[d.id] = d.v; after(el); break;
    case "domov": { const st = status(C.domains.find(x => x.id === d.d)); if (d.v === st.auto || st.ov === d.v) delete S.domOv[d.d]; else S.domOv[d.d] = d.v; after(el); break; }
    case "outov": S.outOv = d.v === outcome().auto ? "" : d.v; after(el); break;
    case "next": S.next = S.next.includes(d.v) ? S.next.filter(x => x !== d.v) : S.next.concat(d.v); after(el); break;
    case "tab": setTab(d.v); break;
    case "sumt": S.sum[d.k] = !S.sum[d.k]; save(); renderSummary(); break;
    case "home": { const v = d.v, h = S.sum.home; S.sum.home = h.includes(v) ? h.filter(x => x !== v) : h.concat(v); save(); renderSummary(); break; }
    case "ideaadd": { const v = ($("#ideaNew").value || "").trim(); if (!v) break; if (!S.sum.home.includes(v)) S.sum.home.push(v);
      if ($("#ideaSave").checked) { const l = savedIdeas(); if (!l.includes(v) && !C.homeIdeas.includes(v)) { l.push(v); try { localStorage.setItem(IKEY, JSON.stringify(l)); } catch (e) {} } }
      save(); renderSummary(); break; }
    case "start": { const s = C.startOT.find(x => x.id === d.id), cur = S.sum.start[d.id] != null ? S.sum.start[d.id] : s.on; S.sum.start[d.id] = !cur; save(); renderSummary(); break; }
    case "shared": S.sum.shared = S.sum.shared.includes(d.v) ? S.sum.shared.filter(x => x !== d.v) : S.sum.shared.concat(d.v); save(); renderSummary(); break;
    case "sumreset": S.sum.text = null; save(); renderSummary(); break;
    case "print": if (S.tab === "form") setTab("clin"); setTimeout(() => window.print(), 50); break;
    case "export": download(fname("OT_Screener"), S); break;
    case "prefill": download(fname("OT_FullEval_Prefill"), prefill()); flash("Prefill exported"); break;
    case "import": $("#importFile").click(); break;
    case "new": if (confirm("Start a new screener? This clears the current one from this device. Export JSON first if you need to keep it.")) { S = blank(); save(); setTab("form"); } break;
  }
});
document.addEventListener("input", e => {
  const el = e.target;
  if (el.dataset.sum) { S.sum[el.dataset.sum] = el.value; const pt = el.parentElement.querySelector(".ptext"); if (pt && el.dataset.sum === "text") pt.textContent = el.value; if (el.tagName === "TEXTAREA") grow(el); save(); return; }
  if (el.dataset.bind && (el.type === "text" || el.tagName === "TEXTAREA")) { setPath(el.dataset.bind, el.value); save(); if (el.dataset.bind === "meta.initials") renderBar(); }
});
document.addEventListener("change", e => {
  const el = e.target;
  if (el.dataset.sum === "addl") { renderSummary(); return; }
  if (el.dataset.sumsel === "activity") { const nm = S.meta.initials || "your child", old = actPhrase(S.sum.activity, nm); S.sum.activity = el.value; if (S.sum.text != null) S.sum.text = S.sum.text.replace(old, actPhrase(el.value, nm)); save(); renderSummary(); return; }
  if (el.dataset.bind && el.type !== "text" && el.tagName !== "TEXTAREA") { setPath(el.dataset.bind, el.value); const full = /^(meta\.(dob|date)|bandOv)$/.test(el.dataset.bind); if (full) { S.secBand = {}; S.secAuto = {}; } after(el, full); }
});
$("#importFile").addEventListener("change", e => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { try { const j = JSON.parse(r.result); if (j.v !== 1) throw 0; S = fix(merge(blank(), j)); save(); setTab("form"); flash("Imported"); } catch (x) { alert("That file is not a screener export."); } e.target.value = ""; }; r.readAsText(f); });
window.addEventListener("beforeprint", () => { if (S.tab === "summary") renderSummary(); if (S.tab === "clin") renderClin(); });
// header
document.querySelectorAll("[data-title]").forEach(el => el.textContent = C.titles[el.dataset.title]);
$("#practice").textContent = C.practice; $("#logo").outerHTML = logo(true); setFoot();
setTab(S.tab || "form");
if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register("service-worker.js").catch(() => {});
window.__ots = { get state() { return S; }, outcome, status: id => status(C.domains.find(d => d.id === id)), reset: () => { S = blank(); save(); setTab("form"); } };
})();
