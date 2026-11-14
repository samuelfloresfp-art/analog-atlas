// Statistics service. The ONLY module that knows where runs are stored.
// Today: seeded runs (src/data/seedRuns.json) + this browser's localStorage.
// To move to Supabase/Firebase, re-implement these async functions with the
// same signatures; pages do not need to change.

import { getData } from "./data.js";

const KEY = "analogAtlas.runs.v1";
let memoryRuns = []; // fallback when localStorage is unavailable

function readLocal() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : memoryRuns;
  } catch {
    return memoryRuns;
  }
}

function writeLocal(runs) {
  memoryRuns = runs;
  try {
    localStorage.setItem(KEY, JSON.stringify(runs));
  } catch {
    /* private mode etc. — keep in memory */
  }
}

export function newRunId() {
  return `run-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Save a completed run. */
export async function saveRun(run) {
  writeLocal([...readLocal(), run]);
  return run;
}

/** Find a run by id (local first, then seeded). */
export async function getRun(id) {
  return readLocal().find((r) => r.id === id) || getData().seedRuns.find((r) => r.id === id) || null;
}

/** All runs, optionally filtered. */
export async function getRuns({ mission, siteId } = {}) {
  return [...getData().seedRuns, ...readLocal()].filter(
    (r) => (!mission || r.mission === mission) && (!siteId || r.siteId === siteId)
  );
}

function tally(total, ids, counts) {
  return ids
    .map((id) => ({ id, count: counts[id] || 0, pct: total ? ((counts[id] || 0) / total) * 100 : 0 }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Aggregate choice percentages for a mission (and optionally a site).
 * @returns {{total:number, vehicles:{id,count,pct}[], researchers:{id,count,pct}[], conditions:Record<string,{id,count,pct}[]>}}
 */
export async function aggregate({ mission, siteId }) {
  const { missionById, researchers } = getData();
  const m = missionById[mission];
  const runs = await getRuns({ mission, siteId });
  const total = runs.length;

  const vCount = {};
  const rCount = {};
  const cCount = {};
  for (const run of runs) {
    vCount[run.vehicleId] = (vCount[run.vehicleId] || 0) + 1;
    for (const rid of run.researcherIds) rCount[rid] = (rCount[rid] || 0) + 1;
    for (const [g, o] of Object.entries(run.conditions)) {
      cCount[g] ??= {};
      cCount[g][o] = (cCount[g][o] || 0) + 1;
    }
  }

  return {
    total,
    vehicles: tally(total, m.vehicles.map((v) => v.id), vCount),
    researchers: tally(total, researchers.map((r) => r.id), rCount).filter((r) => r.count > 0),
    conditions: Object.fromEntries(
      m.conditions.map((g) => [g.id, tally(total, g.options.map((o) => o.id), cCount[g.id] || {})])
    ),
  };
}
