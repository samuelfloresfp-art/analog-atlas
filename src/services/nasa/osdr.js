// NASA OSDR search API (https://osdr.nasa.gov/osdr/data/search?term=…&type=cgene).
// The API answers Access-Control-Allow-Origin: osdr.nasa.gov, so browsers on other origins are blocked.
// Studies are fetched by scripts/fetch_nasa_cache.py and read here from the pre-computed cache.

import { nasaStatic } from "./sources.js";

/** 1–3 OSD studies (partial gravity, regolith, radiation) for "What Earth can't reproduce". */
export function getStudies(planet) {
  const o = nasaStatic()?.cache?.shared?.osdr;
  return { status: o ? "cached" : "failed", studies: o?.byPlanet?.[planet] || [], generatedAt: o?.generatedAt || null, terms: o?.terms || {} };
}
