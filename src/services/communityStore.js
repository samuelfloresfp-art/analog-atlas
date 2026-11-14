// Community submissions store. The ONLY module that knows where submissions live.
// Prototype: src/data/community.json (team examples) + this browser's localStorage.
// Interface: list(), add(sub), remove(id), report(id) — plus export/import and
// local results (validation results that were not published).
//
// To move to a real backend, re-implement these async functions; pages don't change.
// A Supabase stub is at the bottom (commented, no key, no network call).

import { getData } from "./data.js";
import { criteriaChecks, finalStatus } from "./validate.js";
import { weightedScore } from "./criteria.js";

const SUBS_KEY = "analogAtlas.community.v1";
const REPORTS_KEY = "analogAtlas.reports.v1";
const RESULTS_KEY = "analogAtlas.explore.results.v1";
const mem = {};

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
    /* storage unavailable — kept in memory for this session */
  }
}

export function newId(prefix = "sub") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Examples are stored without a result: compute a rules-only one (data checks "not checked"). */
function withExampleResult(s) {
  if (s.result) return s;
  const data = getData();
  const criteria = criteriaChecks(s.form, data);
  const dataChecks = [
    { id: "climate", label: "Climate vs NASA POWER climatology", origin: "NASA data", status: "not-checked", note: "Example submission — not run" },
    { id: "slope", label: "Slope vs elevation tiles (SRTM-based)", origin: "open data", status: "not-checked", note: "Example submission — not run" },
  ];
  return {
    ...s,
    result: {
      status: finalStatus(criteria, dataChecks),
      score: weightedScore(criteria),
      formChecks: [],
      criteria: criteria.map((r) => ({ ruleId: r.rule.id, value: r.value, result: r.result })),
      dataChecks,
      novelty: { id: "novelty", origin: "rule", status: "new", message: "Example submission — not checked." },
      improvements: [],
      checkedAt: s.createdAt,
    },
  };
}

/** All published submissions: team examples (community.json) + local ones. */
export async function list() {
  const reports = read(REPORTS_KEY, []);
  const all = [...getData().community.map(withExampleResult), ...read(SUBS_KEY, [])];
  return all.map((s) => ({ ...s, reported: reports.includes(s.id) }));
}

export async function add(submission) {
  const subs = read(SUBS_KEY, []).filter((s) => s.id !== submission.id);
  write(SUBS_KEY, [...subs, submission]);
  return submission;
}

/** Only local submissions can be removed. */
export async function remove(id) {
  write(SUBS_KEY, read(SUBS_KEY, []).filter((s) => s.id !== id));
}

/** Marks a submission as reported (local only in the prototype). */
export async function report(id) {
  const r = read(REPORTS_KEY, []);
  if (!r.includes(id)) write(REPORTS_KEY, [...r, id]);
}

/** JSON of this browser's submissions (examples excluded). */
export async function exportJson() {
  return JSON.stringify({ format: "analog-atlas-community", version: 1, exportedAt: new Date().toISOString(), submissions: read(SUBS_KEY, []) }, null, 2);
}

/** Merges submissions from an exported file. Returns number added. */
export async function importJson(text) {
  const parsed = JSON.parse(text);
  const incoming = Array.isArray(parsed) ? parsed : parsed.submissions;
  if (!Array.isArray(incoming)) throw new Error("No submissions array in file");
  const valid = incoming.filter((s) => s && typeof s.id === "string" && s.form && s.result && !s.example);
  const current = read(SUBS_KEY, []);
  const ids = new Set(current.map((s) => s.id));
  const added = valid.filter((s) => !ids.has(s.id));
  write(SUBS_KEY, [...current, ...added]);
  return added.length;
}

// ---- local validation results (not published) ----
export async function saveResult(entry) {
  const all = read(RESULTS_KEY, []).filter((r) => r.id !== entry.id);
  write(RESULTS_KEY, [...all, entry]);
  return entry;
}
export async function getResult(id) {
  return read(RESULTS_KEY, []).find((r) => r.id === id) || (await list()).find((s) => s.id === id) || null;
}

/*
// ---- Supabase adapter (stub — NOT active, no key, no call) ----
// import { createClient } from "@supabase/supabase-js";
// const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// export async function list()        { const { data } = await supabase.from("submissions").select("*"); return data; }
// export async function add(sub)      { await supabase.from("submissions").insert(sub); return sub; }
// export async function remove(id)    { await supabase.from("submissions").delete().eq("id", id); }
// export async function report(id)    { await supabase.from("reports").insert({ submission_id: id }); }
*/
