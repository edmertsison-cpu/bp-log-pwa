/* BP Log — vanilla JS PWA. No framework, no build step, localStorage-backed. */

const PROFILES = [
  { id: "tep", name: "Tep", accent: "#4A6FA5" },
  { id: "jeng", name: "Jeng", accent: "#C1666B" },
];
const INK = "#1B2A2E", PAPER = "#F0F3F1", CARD = "#FFFFFF", LINE = "#D8DFDC", MUTE = "#6B7A78";

const state = {
  profileId: "tep",
  view: "log",
  session: defaultSession(),
  editingId: null,
  weekOffset: 0,
  formDraft: { sys: "", dia: "", pulse: "", note: "" },
  entries: { tep: loadEntries("tep"), jeng: loadEntries("jeng") },
};

/* ---------- storage ---------- */
function loadEntries(id) {
  try {
    const raw = localStorage.getItem(`bp:entries:${id}`);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("BP load error:", e);
    return [];
  }
}
function persistEntries(id, list) {
  try {
    localStorage.setItem(`bp:entries:${id}`, JSON.stringify(list));
    return true;
  } catch (e) {
    console.error("BP save error:", e);
    return false;
  }
}

/* ---------- helpers ---------- */
function defaultSession() {
  return new Date().getHours() < 15 ? "Morning" : "Evening";
}
function getCategory(sys, dia) {
  if (sys == null || dia == null) return { label: "—", color: MUTE };
  if (sys > 180 || dia > 120) return { label: "Crisis", color: "#9B2C2C" };
  if (sys >= 140 || dia >= 90) return { label: "Stage 2", color: "#C1666B" };
  if (sys >= 130 || dia >= 80) return { label: "Stage 1", color: "#C68A3E" };
  if (sys >= 120 && dia < 80) return { label: "Elevated", color: "#B7A63E" };
  if (sys < 120 && dia < 80) return { label: "Normal", color: "#5B8C5A" };
  return { label: "—", color: MUTE };
}
function formatDateTime(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) + " · " +
    d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}
function getWeekStart(d) {
  const date = new Date(d);
  const day = date.getDay();
  date.setDate(date.getDate() + ((day === 0 ? -6 : 1) - day));
  date.setHours(0, 0, 0, 0);
  return date;
}
function dateKey(d) {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${dt.getMonth()}-${dt.getDate()}`;
}
function esc(s) { return (s || "").replace(/</g, "&lt;"); }

/* ---------- icons (inline SVG, no library) ---------- */
const icon = {
  pulseLine: (color) => `<svg viewBox="0 0 240 40" width="100%" height="30" preserveAspectRatio="none">
    <polyline points="0,20 50,20 62,6 74,34 86,20 100,20 112,12 124,28 136,20 240,20" fill="none"
      stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="drawline"/></svg>`,
  sunrise: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2v7M4.2 10.2l1.4 1.4M19.8 10.2l-1.4 1.4M2 18h20M6 18a6 6 0 0 1 12 0"/></svg>`,
  moon: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z"/></svg>`,
  download: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12m0 0-4-4m4 4 4-4M4 19h16"/></svg>`,
  pencil: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 2 4 4-13 13H5v-4z"/></svg>`,
  trash: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13"/></svg>`,
  chevL: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>`,
  chevR: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>`,
  plus: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>`,
  x: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>`,
};

/* ---------- derived data ---------- */
function currentList() { return state.entries[state.profileId] || []; }
function sortedList() { return [...currentList()].sort((a, b) => new Date(b.date) - new Date(a.date)); }
function weekAvg() {
  const cutoff = Date.now() - 7 * 86400000;
  const recent = currentList().filter((e) => new Date(e.date).getTime() >= cutoff);
  if (!recent.length) return null;
  const sum = recent.reduce((a, e) => ({ sys: a.sys + e.sys, dia: a.dia + e.dia, pulse: a.pulse + (e.pulse || 0) }), { sys: 0, dia: 0, pulse: 0 });
  return { sys: Math.round(sum.sys / recent.length), dia: Math.round(sum.dia / recent.length), pulse: Math.round(sum.pulse / recent.length), n: recent.length };
}
function chartPoints() {
  return [...currentList()].sort((a, b) => new Date(a.date) - new Date(b.date)).slice(-14);
}
function weekStartDate() {
  const base = getWeekStart(new Date());
  base.setDate(base.getDate() + state.weekOffset * 7);
  return base;
}
function weekDays() {
  const start = weekStartDate();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start); d.setDate(d.getDate() + i);
    const dayEntries = currentList().filter((e) => dateKey(e.date) === dateKey(d));
    return { date: d, morning: dayEntries.find((e) => e.session === "Morning"), evening: dayEntries.find((e) => e.session === "Evening") };
  });
}
function weekStats() {
  const start = weekStartDate();
  const inWeek = currentList().filter((e) => getWeekStart(e.date).getTime() === start.getTime());
  const avg = (arr, k) => (arr.length ? Math.round(arr.reduce((s, e) => s + e[k], 0) / arr.length) : null);
  const m = inWeek.filter((e) => e.session === "Morning"), ev = inWeek.filter((e) => e.session === "Evening");
  return { morning: { sys: avg(m, "sys"), dia: avg(m, "dia"), n: m.length }, evening: { sys: avg(ev, "sys"), dia: avg(ev, "dia"), n: ev.length }, total: inWeek.length };
}

/* ---------- actions ---------- */
function switchProfile(id) { state.profileId = id; cancelEdit(false); render(); }
function switchView(v) { state.view = v; render(); }
function switchSession(s) { state.session = s; render(); }
function cancelEdit(doRender = true) {
  state.editingId = null;
  state.session = defaultSession();
  state.formDraft = { sys: "", dia: "", pulse: "", note: "" };
  if (doRender) render();
}
function startEdit(id) {
  const e = currentList().find((x) => x.id === id);
  if (!e) return;
  state.editingId = id;
  state.session = e.session || defaultSession();
  state.formDraft = { sys: String(e.sys), dia: String(e.dia), pulse: e.pulse != null ? String(e.pulse) : "", note: e.note || "" };
  state.view = "log";
  render();
}
function deleteEntry(id) {
  const updated = currentList().filter((e) => e.id !== id);
  state.entries[state.profileId] = updated;
  persistEntries(state.profileId, updated);
  render();
}
function saveEntry() {
  const sysEl = document.getElementById("sysInput"), diaEl = document.getElementById("diaInput"),
    pulseEl = document.getElementById("pulseInput"), noteEl = document.getElementById("noteInput"), errEl = document.getElementById("formError");
  const sys = parseInt(sysEl.value, 10), dia = parseInt(diaEl.value, 10);
  const pulse = pulseEl.value ? parseInt(pulseEl.value, 10) : null;
  const note = noteEl.value.trim();

  if (!sys || !dia || sys < 50 || sys > 260 || dia < 30 || dia > 200) {
    errEl.textContent = "Enter a valid systolic and diastolic reading.";
    errEl.style.display = "block";
    return;
  }

  let updated;
  if (state.editingId) {
    updated = currentList().map((e) => e.id === state.editingId ? { ...e, sys, dia, pulse, note, session: state.session } : e);
  } else {
    const entry = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, date: new Date().toISOString(), session: state.session, sys, dia, pulse, note };
    updated = [...currentList(), entry];
  }
  state.entries[state.profileId] = updated;
  const ok = persistEntries(state.profileId, updated);
  cancelEdit(false);
  if (!ok) {
    render();
    document.getElementById("formError").textContent = "Saved on-screen, but this device's storage may be full or restricted.";
    document.getElementById("formError").style.display = "block";
    return;
  }
  render();
}
function exportReport() {
  const profile = PROFILES.find((p) => p.id === state.profileId);
  const sorted = [...currentList()].sort((a, b) => new Date(a.date) - new Date(b.date));
  const avg = (arr, k) => (arr.length ? Math.round(arr.reduce((s, e) => s + e[k], 0) / arr.length) : null);
  const morning = sorted.filter((e) => e.session === "Morning"), evening = sorted.filter((e) => e.session === "Evening");
  const rangeStart = sorted.length ? formatDateTime(sorted[0].date) : "—";
  const rangeEnd = sorted.length ? formatDateTime(sorted[sorted.length - 1].date) : "—";
  const rows = [...sorted].reverse().map((e) => {
    const cat = getCategory(e.sys, e.dia); const d = new Date(e.date);
    return `<tr><td>${d.toLocaleDateString()}</td><td>${d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</td><td>${e.session || "—"}</td><td>${e.sys}/${e.dia}</td><td>${e.pulse ?? "—"}</td><td style="color:${cat.color};font-weight:600;">${cat.label}</td><td>${esc(e.note)}</td></tr>`;
  }).join("");
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${profile.name} — Blood Pressure Report</title>
  <style>body{font-family:-apple-system,Helvetica,Arial,sans-serif;color:#1B2A2E;max-width:720px;margin:40px auto;padding:0 16px;}
  h1{font-size:20px;margin-bottom:2px;}.sub{color:#6B7A78;font-size:13px;margin-bottom:24px;}
  table{width:100%;border-collapse:collapse;font-size:13px;}th,td{text-align:left;padding:8px 6px;border-bottom:1px solid #E3E8E6;}
  th{color:#6B7A78;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.03em;}
  .summary{display:flex;gap:24px;margin-bottom:28px;flex-wrap:wrap;}.stat{background:#F0F3F1;border-radius:10px;padding:12px 16px;min-width:140px;}
  .stat .label{font-size:11px;color:#6B7A78;}.stat .value{font-size:20px;font-weight:600;margin-top:2px;}
  @media print{body{margin:10px auto;}}</style></head><body>
  <h1>${profile.name} — Blood Pressure Report</h1>
  <div class="sub">${rangeStart} &nbsp;→&nbsp; ${rangeEnd} &nbsp;·&nbsp; ${sorted.length} readings &nbsp;·&nbsp; generated ${new Date().toLocaleDateString()}</div>
  <div class="summary">
    <div class="stat"><div class="label">Overall average</div><div class="value">${avg(sorted, "sys") ?? "—"}/${avg(sorted, "dia") ?? "—"}</div></div>
    <div class="stat"><div class="label">Morning average (${morning.length})</div><div class="value">${avg(morning, "sys") ?? "—"}/${avg(morning, "dia") ?? "—"}</div></div>
    <div class="stat"><div class="label">Evening average (${evening.length})</div><div class="value">${avg(evening, "sys") ?? "—"}/${avg(evening, "dia") ?? "—"}</div></div>
    <div class="stat"><div class="label">Avg pulse</div><div class="value">${avg(sorted, "pulse") ?? "—"} bpm</div></div>
  </div>
  <table><thead><tr><th>Date</th><th>Time</th><th>Session</th><th>BP</th><th>Pulse</th><th>Category</th><th>Note</th></tr></thead><tbody>${rows}</tbody></table>
  </body></html>`;
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `${profile.name}-BP-Report-${new Date().toISOString().slice(0, 10)}.html`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
}
function changeWeek(delta) { state.weekOffset = Math.min(0, state.weekOffset + delta); render(); }

/* ---------- render ---------- */
function sparkline(points, accent) {
  if (points.length < 2) return "";
  const w = 300, h = 90, pad = 8;
  const vals = points.flatMap((p) => [p.sys, p.dia]);
  const min = Math.min(...vals) - 5, max = Math.max(...vals) + 5;
  const x = (i) => pad + (i / (points.length - 1)) * (w - pad * 2);
  const y = (v) => h - pad - ((v - min) / (max - min)) * (h - pad * 2);
  const sysPath = points.map((p, i) => `${x(i)},${y(p.sys)}`).join(" ");
  const diaPath = points.map((p, i) => `${x(i)},${y(p.dia)}`).join(" ");
  return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" preserveAspectRatio="none">
    <polyline points="${diaPath}" fill="none" stroke="${MUTE}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <polyline points="${sysPath}" fill="none" stroke="${accent}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

function render() {
  const profile = PROFILES.find((p) => p.id === state.profileId);
  const list = sortedList();
  const latest = list[0];
  const latestCat = latest ? getCategory(latest.sys, latest.dia) : null;
  const avg7 = weekAvg();
  const draft = state.formDraft;

  let body = `
  <div class="header">
    <h1>BP Log</h1>
    <button class="btn-ghost" data-action="export">${icon.download} Export</button>
  </div>
  <div class="pulseline">${icon.pulseLine(profile.accent)}</div>

  <div class="row gap8 mb12">
    ${PROFILES.map((p) => `<button class="tab ${state.profileId === p.id ? "active" : ""}" style="${state.profileId === p.id ? `background:${p.accent};border-color:${p.accent};color:#fff;` : ""}" data-action="profile" data-id="${p.id}">${p.name}</button>`).join("")}
  </div>

  <div class="segmented mb20">
    ${["log", "weekly"].map((v) => `<button class="seg ${state.view === v ? "active" : ""}" data-action="view" data-id="${v}">${v === "log" ? "Log" : "Weekly"}</button>`).join("")}
  </div>`;

  if (state.view === "log") {
    body += `
    <div class="grid2 mb20">
      <div class="card">
        <div class="label">Latest</div>
        ${latest ? `<div class="num big">${latest.sys}/${latest.dia}</div>
          <div class="row gap8 wrap mt4">
            <span class="badge" style="background:${latestCat.color}20;color:${latestCat.color}">${latestCat.label}</span>
            ${latest.pulse ? `<span class="muted small">${latest.pulse} bpm</span>` : ""}
          </div>` : `<div class="muted small">No readings yet</div>`}
      </div>
      <div class="card">
        <div class="label">7-day avg</div>
        ${avg7 ? `<div class="num big">${avg7.sys}/${avg7.dia}</div><div class="muted small mt4">${avg7.pulse} bpm avg · ${avg7.n} reading${avg7.n > 1 ? "s" : ""}</div>` : `<div class="muted small">Not enough data</div>`}
      </div>
    </div>

    <div class="card mb20" style="border-color:${state.editingId ? profile.accent : LINE}">
      ${state.editingId ? `<div class="row spread mb12" style="color:${profile.accent};font-size:12px;font-weight:600;">
          <span>Editing reading</span>
          <button class="link" data-action="cancel-edit">${icon.x} Cancel</button>
        </div>` : ""}
      <div class="row gap8 mb12">
        ${["Morning", "Evening"].map((s) => `<button class="seg-pill ${state.session === s ? "active" : ""}" style="${state.session === s ? `background:${profile.accent};border-color:${profile.accent};color:#fff;` : ""}" data-action="session" data-id="${s}">${s === "Morning" ? icon.sunrise : icon.moon} ${s}</button>`).join("")}
      </div>
      <div class="grid3 mb12">
        <div><label>Systolic</label><input id="sysInput" type="number" inputmode="numeric" placeholder="120" value="${esc(draft.sys)}" data-field="sys"/></div>
        <div><label>Diastolic</label><input id="diaInput" type="number" inputmode="numeric" placeholder="80" value="${esc(draft.dia)}" data-field="dia"/></div>
        <div><label>Pulse</label><input id="pulseInput" type="number" inputmode="numeric" placeholder="72" value="${esc(draft.pulse)}" data-field="pulse"/></div>
      </div>
      <input id="noteInput" class="full mb12" type="text" placeholder="Note (optional)" value="${esc(draft.note)}" data-field="note"/>
      <div id="formError" class="error" style="display:none"></div>
      <button class="btn-solid full" style="background:${profile.accent}" data-action="save">${state.editingId ? icon.pencil : icon.plus} ${state.editingId ? "Update reading" : `Log ${state.session.toLowerCase()} reading`}</button>
    </div>

    ${chartPoints().length > 1 ? `<div class="card mb20">
      <div class="label mb8">Trend — last ${chartPoints().length} readings</div>
      ${sparkline(chartPoints(), profile.accent)}
    </div>` : ""}

    <div class="label mb8">History</div>
    ${list.length === 0 ? `<div class="muted small center pad">No readings logged yet.</div>` :
      `<div class="stack">${list.map((e) => {
        const cat = getCategory(e.sys, e.dia);
        return `<div class="hist-row">
          <div>
            <div class="row gap8 wrap" style="align-items:baseline">
              <span class="num" style="font-weight:600">${e.sys}/${e.dia}</span>
              ${e.pulse ? `<span class="muted small">${e.pulse} bpm</span>` : ""}
              <span class="badge" style="background:${cat.color}20;color:${cat.color}">${cat.label}</span>
            </div>
            <div class="muted small mt2">${e.session ? e.session + " · " : ""}${formatDateTime(e.date)}${e.note ? " · " + esc(e.note) : ""}</div>
          </div>
          <div class="row gap4">
            <button class="icon-btn" data-action="edit" data-id="${e.id}">${icon.pencil}</button>
            <button class="icon-btn" data-action="delete" data-id="${e.id}">${icon.trash}</button>
          </div>
        </div>`;
      }).join("")}</div>`}
    `;
  } else {
    const days = weekDays(), stats = weekStats(), start = weekStartDate();
    const end = new Date(start.getTime() + 6 * 86400000);
    const cellStyle = (entry) => entry ? `background:${getCategory(entry.sys, entry.dia).color}18;color:${INK}` : `background:${PAPER};color:${MUTE}`;
    body += `
    <div class="row spread mb16">
      <button class="icon-btn bordered" data-action="week-prev">${icon.chevL}</button>
      <div class="week-label">${start.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${end.toLocaleDateString(undefined, { month: "short", day: "numeric" })} ${state.weekOffset === 0 ? '<span class="muted small">(this week)</span>' : ""}</div>
      <button class="icon-btn bordered" data-action="week-next" ${state.weekOffset === 0 ? "disabled" : ""}>${icon.chevR}</button>
    </div>
    <div class="week-grid mb20">
      <div class="week-head"><div>Day</div><div>Morning</div><div>Evening</div></div>
      ${days.map((d, i) => `<div class="week-day" style="background:${i % 2 ? PAPER : CARD}">
        <div class="daycell"><span class="dname">${d.date.toLocaleDateString(undefined, { weekday: "short" })}</span><span class="muted small">${d.date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span></div>
        <div class="num readcell" style="${cellStyle(d.morning)}">${d.morning ? `${d.morning.sys}/${d.morning.dia}` : "—"}</div>
        <div class="num readcell" style="${cellStyle(d.evening)}">${d.evening ? `${d.evening.sys}/${d.evening.dia}` : "—"}</div>
      </div>`).join("")}
    </div>
    <div class="grid2 mb20">
      <div class="card"><div class="label row gap4">${icon.sunrise} Morning avg</div><div class="num" style="font-size:20px;font-weight:600">${stats.morning.sys ? `${stats.morning.sys}/${stats.morning.dia}` : "—"}</div><div class="muted small mt2">${stats.morning.n} logged</div></div>
      <div class="card"><div class="label row gap4">${icon.moon} Evening avg</div><div class="num" style="font-size:20px;font-weight:600">${stats.evening.sys ? `${stats.evening.sys}/${stats.evening.dia}` : "—"}</div><div class="muted small mt2">${stats.evening.n} logged</div></div>
    </div>
    <div class="muted small center">${stats.total}/14 sessions logged this week</div>
    `;
  }

  body += `<div class="footnote">Categories follow standard AHA ranges for reference only — not medical advice. Consult a doctor for readings marked Crisis or any concerning pattern.</div>`;

  document.getElementById("app").innerHTML = body;
}

/* ---------- event delegation ---------- */
document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const action = btn.dataset.action, id = btn.dataset.id;
  if (action === "profile") switchProfile(id);
  else if (action === "view") switchView(id);
  else if (action === "session") switchSession(id);
  else if (action === "cancel-edit") cancelEdit();
  else if (action === "edit") startEdit(id);
  else if (action === "delete") deleteEntry(id);
  else if (action === "save") saveEntry();
  else if (action === "export") exportReport();
  else if (action === "week-prev") changeWeek(-1);
  else if (action === "week-next") changeWeek(1);
});
document.addEventListener("input", (e) => {
  if (e.target.dataset && e.target.dataset.field) {
    state.formDraft[e.target.dataset.field] = e.target.value;
  }
});

/* ---------- service worker registration ---------- */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch((err) => console.warn("SW registration failed:", err));
  });
}

render();
