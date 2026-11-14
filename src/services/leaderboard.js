// Contributions + leaderboard (Phase 3 – B). The ONLY module that knows where contributions live.
// Interface: submitContribution(c), listContributions(), getLeaderboard(opts), confirmContribution(id), isAdmin(query).
// Adapters: localStorage (default) and Supabase REST (only if src/config.local.js has SUPABASE_URL + SUPABASE_ANON_KEY).
// Seed data: src/data/seedContributions.json — every item has seed:true and is labeled "Sample data (prototype)".

import { getData } from "./data.js";
import { haversineKm } from "./geo.js";
import { DIMENSIONS } from "./validation-score.js";

const KEY = "analogAtlas.contributions.v1";
const CONFIRM_KEY = "analogAtlas.contributions.confirmed.v1";
const ADMIN_KEY = "analogAtlas.admin.v1";
const DUP_KM = 1;
const mem = {};

// ---------- local config (src/config.local.js, kept out of git) ----------
let localCfg;
export async function localConfig() {
  if (localCfg !== undefined) return localCfg;
  try {
    localCfg = (await import("../config.local.js")).LOCAL || {};
  } catch {
    localCfg = {};
  }
  return localCfg;
}

/** Admin mode for the demo: #/leaderboard?admin=<ADMIN_CODE> (code in config.local.js). Remembered for the tab session. */
export async function isAdmin(query) {
  const cfg = await localConfig();
  if (!cfg.ADMIN_CODE) return false;
  const given = query?.get?.("admin");
  try {
    if (given) sessionStorage.setItem(ADMIN_KEY, given === cfg.ADMIN_CODE ? "1" : "0");
    return sessionStorage.getItem(ADMIN_KEY) === "1";
  } catch {
    return given === cfg.ADMIN_CODE;
  }
}

// ---------- storage adapters ----------
function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : mem[key] ?? fallback;
  } catch {
    return mem[key] ?? fallback;
  }
}
function write(key, value) {
  mem[key] = value;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* memory only */
  }
}

const localAdapter = {
  name: "localStorage",
  async list() {
    return read(KEY, []);
  },
  async insert(c) {
    write(KEY, [...read(KEY, []).filter((x) => x.id !== c.id), c]);
  },
};

function supabaseAdapter(url, anonKey) {
  const base = `${url.replace(/\/$/, "")}/rest/v1/contributions`;
  const headers = { apikey: anonKey, Authorization: `Bearer ${anonKey}`, "Content-Type": "application/json" };
  return {
    name: "supabase",
    async list() {
      const res = await fetch(`${base}?select=payload&order=created_at.asc`, { headers });
      if (!res.ok) throw new Error(`Supabase list ${res.status}`);
      return (await res.json()).map((r) => r.payload);
    },
    async insert(c) {
      const res = await fetch(base, {
        method: "POST",
        headers: { ...headers, Prefer: "return=minimal" },
        body: JSON.stringify({ id: c.id, nickname: c.nickname, created_at: c.createdAt, payload: c }),
      });
      if (!res.ok) throw new Error(`Supabase insert ${res.status}`);
    },
  };
}

let adapter;
async function store() {
  if (adapter) return adapter;
  const cfg = await localConfig();
  adapter = cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY ? supabaseAdapter(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY) : localAdapter;
  return adapter;
}
export async function storageName() {
  return (await store()).name;
}

// ---------- seeds ----------
let seeds;
async function loadSeeds() {
  if (!seeds) {
    try {
      const res = await fetch("src/data/seedContributions.json");
      seeds = res.ok ? await res.json() : [];
    } catch {
      seeds = [];
    }
  }
  return seeds;
}

// ---------- public interface ----------
export function newContributionId() {
  return `ctb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Location of a contribution (existing site → its coordinates). */
export function contributionPoint(c) {
  if (c.mode === "existing") {
    const s = getData().siteById[c.siteId];
    return s ? { lat: s.lat, lon: s.lon, name: s.name, country: s.country, continent: s.continent } : null;
  }
  return { lat: c.site.lat, lon: c.site.lon, name: c.site.name, country: c.site.country || "", continent: null };
}

/** Effective status: team confirmation (admin) overrides the automatic one. */
function withConfirmations(list) {
  const confirmed = new Set(read(CONFIRM_KEY, []));
  return list.map((c) => (confirmed.has(c.id) ? { ...c, status: "team-confirmed" } : c));
}

export async function listContributions({ includeSeed = true } = {}) {
  const st = await store();
  let real = [];
  try {
    real = await st.list();
  } catch (e) {
    console.warn("Contributions backend unavailable, using this browser only:", e.message);
    real = await localAdapter.list();
  }
  const all = [...(includeSeed ? await loadSeeds() : []), ...real];
  return withConfirmations(all).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function getContribution(id) {
  return (await listContributions()).find((c) => c.id === id) || null;
}

/** Saves a scored contribution. Blocked contributions are refused. */
export async function submitContribution(c) {
  if (c.status === "blocked") throw new Error("Blocked contributions cannot be submitted.");
  const clean = { ...c };
  delete clean._evidenceCache;
  await (await store()).insert(clean);
  return clean;
}

/** Admin only (demo): marks a contribution as Team-confirmed in this browser. */
export async function confirmContribution(id, on = true) {
  const set = new Set(read(CONFIRM_KEY, []));
  on ? set.add(id) : set.delete(id);
  write(CONFIRM_KEY, [...set]);
}

const isValidated = (c) => c.status === "auto-checked" || c.status === "team-confirmed";
const nickKey = (n) => String(n || "").trim().toLowerCase();
const siteKey = (c) => (c.mode === "existing" ? `site:${c.siteId}` : `geo:${c.site.lat.toFixed(3)},${c.site.lon.toFixed(3)}`);

/**
 * Anti-farm. Walks contributions in time order and marks each one `counted` or not:
 *  - same person + same site + same mission counts once;
 *  - a different point < 1 km from a site this person already validated does not add up.
 * Returns a Map id -> {counted, reason}.
 */
export function antiFarm(list) {
  const out = new Map();
  const byPerson = new Map();
  for (const c of [...list].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
    const k = nickKey(c.nickname);
    const prev = byPerson.get(k) || [];
    const p = contributionPoint(c);
    const sameSiteMission = prev.find((x) => x.key === siteKey(c) && x.mission === c.mission);
    const nearValidated = p && prev.find((x) => x.validated && x.key !== siteKey(c) && x.p && haversineKm(p.lat, p.lon, x.p.lat, x.p.lon) < DUP_KM);
    let reason = null;
    if (sameSiteMission) reason = "Same person, same site and same mission — counted once.";
    else if (nearValidated) reason = `Less than ${DUP_KM} km from a site this person already validated.`;
    out.set(c.id, { counted: !reason, reason });
    if (!reason) prev.push({ key: siteKey(c), mission: c.mission, validated: isValidated(c), p });
    byPerson.set(k, prev);
  }
  return out;
}

const SA_BOX = { latMin: -56, latMax: 13.5, lonMin: -82, lonMax: -34 };
function inSouthAmerica(c) {
  const p = contributionPoint(c);
  if (!p) return false;
  if (p.continent) return p.continent === "South America";
  return p.lat >= SA_BOX.latMin && p.lat <= SA_BOX.latMax && p.lon >= SA_BOX.lonMin && p.lon <= SA_BOX.lonMax;
}

const STATUS_RANK = { "team-confirmed": 3, "auto-checked": 2, "needs-review": 1 };

/**
 * @param {{scope?: "all"|"landing"|"rover"|"base"|"sa", includeSeed?: boolean}} opts
 * Order: validated sites desc → total score desc → first arrival asc.
 */
export async function getLeaderboard({ scope = "all", includeSeed = true } = {}) {
  const all = await listContributions({ includeSeed });
  const flags = antiFarm(all);
  const inScope = all.filter((c) =>
    scope === "all" ? true : scope === "sa" ? inSouthAmerica(c) : c.mission === scope
  );
  const knownCountries = new Set(getData().sites.map((s) => s.country.toLowerCase()));
  const people = new Map();
  for (const c of inScope) {
    if (!flags.get(c.id)?.counted) continue;
    const k = nickKey(c.nickname);
    const row = people.get(k) || { nickname: c.nickname, sites: new Set(), score: 0, firstAt: c.createdAt, best: null, top: null, seedOnly: true, badges: new Set(), n: 0 };
    row.n++;
    row.score += c.score;
    row.seedOnly = row.seedOnly && !!c.seed;
    if (isValidated(c)) row.sites.add(siteKey(c));
    if (c.createdAt < row.firstAt) row.firstAt = c.createdAt;
    if (!row.best || c.score > row.best.score) row.best = c;
    if (!row.top || (STATUS_RANK[c.status] || 0) > (STATUS_RANK[row.top] || 0)) row.top = c.status;
    if (DIMENSIONS.every((d) => (c.dimensions?.[d]?.url || "").trim())) row.badges.add("8/8 dimensions with evidence");
    if (c.mode === "proposal" && isValidated(c) && c.site.country && !knownCountries.has(c.site.country.trim().toLowerCase()))
      row.badges.add("First analog in a new country");
    people.set(k, row);
  }
  return [...people.values()]
    .map((r) => ({ ...r, validated: r.sites.size, badges: [...r.badges] }))
    .sort((a, b) => b.validated - a.validated || b.score - a.score || a.firstAt.localeCompare(b.firstAt))
    .map((r, i) => ({ ...r, rank: i + 1 }));
}
