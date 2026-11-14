// NASA Open APIs helper (api.nasa.gov). ONE place that knows the key.
// Key: src/config.local.js → export const LOCAL = { NASA_API_KEY: "..." }  (git-ignored; see config.local.example.js)
// Fallback: DEMO_KEY (30 req/h and 50 req/day per IP) with a console warning.

import { getCached } from "./http.js";

let keyPromise = null;
let warned = false;

export function nasaApiKey() {
  if (!keyPromise)
    keyPromise = import("../../config.local.js")
      .then((m) => m.LOCAL?.NASA_API_KEY || null)
      .catch(() => null)
      .then((k) => {
        if (!k && !warned) {
          warned = true;
          console.warn("[nasa] No NASA_API_KEY in src/config.local.js — using DEMO_KEY (30 req/h, 50 req/day per IP).");
        }
        return k || "DEMO_KEY";
      });
  return keyPromise;
}

/** GET https://api.nasa.gov/<path>?<params>&api_key=… with the shared timeout/retry/cache policy. */
export async function nasaApi(path, params = {}, opts = {}) {
  const key = await nasaApiKey();
  const qs = new URLSearchParams({ ...params, api_key: key }).toString();
  // the cache key never contains the API key
  const cacheKey = `openapi:${path}?${new URLSearchParams(params).toString()}`;
  return getCached(`https://api.nasa.gov/${path.replace(/^\//, "")}?${qs}`, { cacheKey, ...opts });
}
