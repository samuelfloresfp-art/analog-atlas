// NASA CMR granule search (no login for search). Proves COVERAGE of a collection at a point (CMR-Hits header).
// Short names confirmed via /search/collections.json on 2026-11-14.

import { getCached } from "./http.js";

export const COVERAGE_COLLECTIONS = ["EMITL2BMIN", "SRTMGL1", "ASTGTM", "HLSL30"];

export async function getCoverage(lat, lon, ttlHours = 168) {
  const out = {};
  await Promise.all(
    COVERAGE_COLLECTIONS.map(async (s) => {
      const url = `https://cmr.earthdata.nasa.gov/search/granules.json?short_name=${s}&point=${lon},${lat}&page_size=1`;
      const h = await getCached(url, { as: "headers", ttlHours });
      out[s] = Number(h["cmr-hits"] ?? 0);
    })
  );
  return out;
}
