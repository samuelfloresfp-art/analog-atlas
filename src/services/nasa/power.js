// NASA POWER climatology point API (no key, CORS ok). Elevation = geometry.coordinates[2] (grid-cell mean).

import { getCached } from "./http.js";

const BASE = "https://power.larc.nasa.gov/api/temporal/climatology/point";
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

export async function getPowerClimatology(lat, lon, ttlHours = 720) {
  const qs = new URLSearchParams({
    parameters: "T2M,T2M_MAX,T2M_MIN,T2M_RANGE,PRECTOTCORR,ALLSKY_SFC_SW_DWN,WS10M,RH2M",
    community: "RE",
    longitude: lon.toFixed(4),
    latitude: lat.toFixed(4),
    format: "JSON",
  });
  const j = await getCached(`${BASE}?${qs}`, { ttlHours });
  const p = j.properties.parameter;
  return {
    t2mAnn: p.T2M.ANN,
    tempRange: Math.max(...MONTHS.map((m) => p.T2M_MAX[m])) - Math.min(...MONTHS.map((m) => p.T2M_MIN[m])),
    tMaxMonth: Math.max(...MONTHS.map((m) => p.T2M_MAX[m])),
    tMinMonth: Math.min(...MONTHS.map((m) => p.T2M_MIN[m])),
    precipMmYr: p.PRECTOTCORR.ANN * 365,
    solar: p.ALLSKY_SFC_SW_DWN.ANN,
    wind: p.WS10M.ANN,
    rh: p.RH2M.ANN,
    elevation: j.geometry?.coordinates?.[2] ?? null,
  };
}
