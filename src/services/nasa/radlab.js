// RadLab — OSDR Radiation Dosimetry Database Data API (https://visualization.osdr.nasa.gov/radlab/api/).
// No CORS header → pre-computed by scripts/fetch_nasa_cache.py (DosTel2 absorbed dose rate on the ISS).

import { nasaStatic } from "./sources.js";

/** ISS dose rate + Earth natural background reference (manual, UNSCEAR 2008). */
export function getIssDose() {
  const r = nasaStatic()?.cache?.shared?.radiation;
  const ref = nasaStatic()?.endpoints?.sources?.radlab?.earthBackgroundReference;
  return r ? { ...r, status: "cached" } : { status: "failed", earthBackground: ref || null };
}
