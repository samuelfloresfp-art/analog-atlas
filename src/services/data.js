// Loads the editable JSON files once and builds lookup maps.
// When the visitor chose Portuguese, src/data/pt.json is laid over the English data
// (mission names, site texts, criteria labels). The English JSON stays the source of truth.

import { LANG } from "../i18n.js";

let cache = null;
let landMask = null;

async function fetchJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path} (${res.status})`);
  return res.json();
}

function applyPt(d, pt) {
  for (const m of d.missions) Object.assign(m, pt.missions?.[m.id] || {});

  const c = d.criteria, pc = pt.criteria || {};
  for (const [field, list] of Object.entries(c.enums)) for (const e of list) e.label = pc.enums?.[field]?.[e.id] ?? e.label;
  Object.assign(c.fieldLabels, pc.fieldLabels || {});
  if (pc.notReproducible) c.notReproducible = pc.notReproducible;
  for (const combo of Object.values(c.combos))
    for (const r of combo.rules) {
      const t = pc.rules?.[r.id];
      if (t) Object.assign(r, t);
    }

  for (const s of d.sites) {
    const t = pt.sites?.[s.id];
    if (!t) continue;
    s.name_en = s.name;
    for (const k of ["name", "country", "environment", "summary", "whyAnalog", "whatItLacks"]) if (t[k]) s[k] = t[k];
    if (t.mirrors) s.mirrors = { ...s.mirrors, ...t.mirrors };
    if (t.history) s.history.forEach((h, i) => t.history[i] && (h.what = t.history[i]));
  }

  for (const sub of d.community) {
    if (!sub.pt) continue;
    sub.form.name = sub.pt.name || sub.form.name;
    sub.form.why = sub.pt.why || sub.form.why;
    sub.form.lacks = sub.pt.lacks || sub.form.lacks;
    if (sub.form.country === "Brazil") sub.form.country = "Brasil";
  }
}

export async function loadData() {
  if (cache) return cache;
  const [missions, sites, criteria, community] = await Promise.all(
    ["missions", "sites", "criteria", "community"].map((n) => fetchJson(`src/data/${n}.json`))
  );
  const d = { missions, sites, criteria, community };
  if (LANG === "pt") {
    try {
      applyPt(d, await fetchJson("src/data/pt.json"));
    } catch (e) {
      console.warn("[i18n] pt.json not applied:", e.message);
    }
  }
  cache = {
    ...d,
    planets: ["moon", "mars"],
    missionById: Object.fromEntries(missions.map((m) => [m.id, m])),
    siteById: Object.fromEntries(sites.map((s) => [s.id, s])),
  };
  return cache;
}

export function getData() {
  if (!cache) throw new Error("Data not loaded yet");
  return cache;
}

/** Natural Earth 110m land polygons (public domain), served from vendor/. */
export async function loadLandMask() {
  if (!landMask) landMask = await fetchJson("vendor/naturalearth/ne_110m_land.geojson");
  return landMask;
}
