// Shared HTTP policy for every NASA client: 8 s timeout, retry 1×, cache in memory + localStorage with TTL.
// localStorage is optional (private mode / blocked storage → memory only).

import { forceOffline } from "../../config.js";

export const TIMEOUT_MS = 8000;
const mem = new Map();
const LS_PREFIX = "analogAtlas.nasa.";

function lsGet(key) {
  try {
    const raw = localStorage.getItem(LS_PREFIX + key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function lsSet(key, value) {
  try {
    localStorage.setItem(LS_PREFIX + key, JSON.stringify(value));
  } catch {
    /* quota or blocked: memory cache still works */
  }
}

/** Cached value if still fresh, else null. */
export function cacheGet(key) {
  const hit = mem.get(key) || lsGet(key);
  if (hit && hit.expires > Date.now()) {
    mem.set(key, hit);
    return hit.value;
  }
  return null;
}
export function cacheSet(key, value, ttlHours) {
  const entry = { value, expires: Date.now() + ttlHours * 3600e3, savedAt: new Date().toISOString() };
  mem.set(key, entry);
  lsSet(key, entry);
}

async function once(url, { timeoutMs, as, headers }) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers });
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }
    if (as === "headers") return Object.fromEntries([...res.headers.entries()].map(([k, v]) => [k.toLowerCase(), v]));
    if (as === "text") return await res.text();
    return await res.json();
  } catch (e) {
    if (e.name === "AbortError") throw new Error(`timeout after ${timeoutMs / 1000} s`);
    throw e;
  } finally {
    clearTimeout(t);
  }
}

/**
 * GET with the shared policy.
 * @param {string} url
 * @param {{cacheKey?:string, ttlHours?:number, timeoutMs?:number, retries?:number, as?:"json"|"text"|"headers", headers?:object}} opts
 */
export async function getCached(url, opts = {}) {
  const { cacheKey = url, ttlHours = 24, timeoutMs = TIMEOUT_MS, retries = 1, as = "json", headers } = opts;
  const hit = cacheGet(cacheKey);
  if (hit != null) return hit;
  if (forceOffline()) throw new Error("offline mode (analogAtlas.forceOffline)");
  let last;
  for (let i = 0; i <= retries; i++) {
    try {
      const value = await once(url, { timeoutMs, as, headers });
      cacheSet(cacheKey, value, ttlHours);
      return value;
    } catch (e) {
      last = e;
      if (e.status === 400 || e.status === 403 || e.status === 404) break; // retrying won't help
    }
  }
  throw last;
}

/** Loads a static JSON file of this site once (kept in memory). */
const files = new Map();
export function loadStatic(path) {
  if (!files.has(path))
    files.set(
      path,
      fetch(path).then((r) => {
        if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`);
        return r.json();
      }).catch((e) => {
        files.delete(path); // allow a later retry
        throw e;
      })
    );
  return files.get(path);
}
