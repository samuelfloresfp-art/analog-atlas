// Loads data/nasa-endpoints.json (sources, thresholds, TTLs), data/trek-features.json
// and the pre-computed cache data/nasa-cache/index.json. Loaded once at app start (see services/data.js),
// so the cards keep working if the network goes offline afterwards.

import { loadStatic } from "./http.js";

export const ENDPOINTS_PATH = "data/nasa-endpoints.json";
export const TREK_PATH = "data/trek-features.json";
export const CACHE_INDEX_PATH = "data/nasa-cache/index.json";

let state = null;

export async function loadNasaStatic() {
  if (state) return state;
  const [endpoints, trek, cache] = await Promise.all([
    loadStatic(ENDPOINTS_PATH),
    loadStatic(TREK_PATH),
    loadStatic(CACHE_INDEX_PATH).catch((e) => {
      console.warn("[nasa] cache index not available:", e.message);
      return { sites: {}, shared: {} };
    }),
  ]);
  state = { endpoints, trek, cache };
  return state;
}

/** Synchronous access after loadNasaStatic() resolved (null before). */
export function nasaStatic() {
  return state;
}

export function sourceRef(endpoints, key, name) {
  const s = endpoints.sources[key];
  const ref = { name: name || s.name, agency: s.agency, url: s.baseUrl || "" };
  if (s.doi) ref.doi = s.doi;
  return ref;
}

export function ttl(endpoints, key, fallback = 24) {
  return endpoints.cacheTtlHours?.[key] ?? fallback;
}
