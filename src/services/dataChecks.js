// Layer C — optional, asynchronous open-data cross-checks.
// Every check returns status: "consistent" | "mismatch-light" | "mismatch-strong" | "not-checked".
// On any network/CORS/timeout error the result is "not-checked" so the site works offline.

import { ENDPOINTS, DATA_CHECK_TIMEOUT_MS, forceOffline } from "../config.js";
import { loadDemPatch } from "./dem.js";

async function withTimeout(fn) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), DATA_CHECK_TIMEOUT_MS);
  try {
    return await fn(ctrl.signal);
  } finally {
    clearTimeout(t);
  }
}

const notChecked = (base, reason) => ({ ...base, status: "not-checked", observed: null, note: reason });

// ---------- Climate: NASA POWER climatology ----------

// Aridity classes by annual precipitation (mm/yr). Simplified thresholds (team assumption).
const PRECIP_CLASSES = [
  { id: "hyper-arid", max: 100 },
  { id: "arid", max: 250 },
  { id: "semi-arid", max: 600 },
  { id: "humid", max: Infinity },
];
const classIndex = (id) => PRECIP_CLASSES.findIndex((c) => c.id === id);

export async function checkClimate(lat, lon, declared) {
  const base = { id: "climate", label: "Climate vs NASA POWER climatology", origin: "NASA data", source: "NASA POWER" };
  if (forceOffline()) return notChecked(base, "Offline mode");
  try {
    const url =
      `${ENDPOINTS.power}?parameters=T2M,T2M_MIN,T2M_MAX,PRECTOTCORR&community=AG` +
      `&longitude=${lon.toFixed(4)}&latitude=${lat.toFixed(4)}&format=JSON`;
    const json = await withTimeout(async (signal) => {
      const res = await fetch(url, { signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    });
    const p = json.properties.parameter;
    const precipYr = p.PRECTOTCORR.ANN * 365;
    const tMean = p.T2M.ANN;
    const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    const tMin = Math.min(...months.map((m) => p.T2M_MIN[m]));
    const tMax = Math.max(...months.map((m) => p.T2M_MAX[m]));
    const elev = Array.isArray(json.geometry?.coordinates) ? json.geometry.coordinates[2] : null;
    const observedClass = PRECIP_CLASSES.find((c) => precipYr < c.max).id;

    let status = "consistent";
    let note = "";
    const c = declared.climate;
    if (classIndex(c) >= 0) {
      const d = Math.abs(classIndex(c) - classIndex(observedClass));
      status = d === 0 ? "consistent" : d === 1 ? "mismatch-light" : "mismatch-strong";
      note = `Declared ${c}; annual precipitation suggests ${observedClass}.`;
    } else if (c === "polar-cold") {
      status = tMean < 0 ? "consistent" : tMean < 8 ? "mismatch-light" : "mismatch-strong";
      note = `Declared polar/cold; mean annual air temperature is ${tMean.toFixed(1)} °C.`;
    } else if (c === "high-altitude") {
      if (typeof elev === "number") {
        status = elev >= 2500 ? "consistent" : elev >= 1500 ? "mismatch-light" : "mismatch-strong";
        note = `Declared high altitude; POWER grid-cell elevation is ${Math.round(elev)} m.`;
      } else {
        status = "consistent";
        note = "Elevation not returned; altitude not checked.";
      }
    }

    // Optional declared temperature range
    if (declared.tempMin !== "" && declared.tempMin != null && Math.abs(Number(declared.tempMin) - tMin) > 10) {
      if (status === "consistent") status = "mismatch-light";
      note += ` Declared min ${declared.tempMin} °C vs monthly mean min ${tMin.toFixed(1)} °C.`;
    }
    if (declared.tempMax !== "" && declared.tempMax != null && Math.abs(Number(declared.tempMax) - tMax) > 10) {
      if (status === "consistent") status = "mismatch-light";
      note += ` Declared max ${declared.tempMax} °C vs monthly mean max ${tMax.toFixed(1)} °C.`;
    }

    return {
      ...base,
      status,
      declared: `${c}${declared.tempMin !== "" && declared.tempMin != null ? `, ${declared.tempMin}…${declared.tempMax} °C` : ""}`,
      observed: `${Math.round(precipYr)} mm/yr, mean ${tMean.toFixed(1)} °C (monthly ${tMin.toFixed(0)}…${tMax.toFixed(0)} °C)${typeof elev === "number" ? `, ~${Math.round(elev)} m` : ""}`,
      note: note.trim(),
    };
  } catch (e) {
    return notChecked(base, `Request failed (${e.name === "AbortError" ? "timeout" : e.message})`);
  }
}

// ---------- Slope: AWS Terrain Tiles (Terrarium, aggregates SRTM and others) ----------

export const SLOPE_CLASSES = [
  { id: "0-2", max: 2 },
  { id: "2-5", max: 5 },
  { id: "5-15", max: 15 },
  { id: "15-30", max: 30 },
  { id: ">30", max: Infinity },
];
const slopeIdx = (id) => SLOPE_CLASSES.findIndex((c) => c.id === id);

export async function checkSlope(lat, lon, declaredClass, radiusKm = 1) {
  const base = { id: "slope", label: "Slope vs elevation tiles (SRTM-based)", origin: "open data", source: "AWS Terrain Tiles (Terrarium)" };
  if (forceOffline()) return notChecked(base, "Offline mode");
  try {
    const dem = await withTimeout((signal) => loadDemPatch(lat, lon, radiusKm, { signal }));
    const { x: fx, y: fy } = dem.toPx(lat, lon);
    const cx = Math.round(fx), cy = Math.round(fy), rPx = dem.rPx, mPerPx = dem.mPerPx;
    let sum = 0, count = 0, max = 0;
    for (let y = cy - rPx; y <= cy + rPx; y++)
      for (let x = cx - rPx; x <= cx + rPx; x++) {
        if ((x - cx) ** 2 + (y - cy) ** 2 > rPx * rPx) continue;
        if (!dem.inside(x, y)) continue;
        const deg = dem.slopeDeg(x, y);
        sum += deg;
        count++;
        max = Math.max(max, deg);
      }
    if (!count) return notChecked(base, "No elevation samples");
    const mean = sum / count;
    const observedClass = SLOPE_CLASSES.find((c) => mean < c.max).id;
    const d = Math.abs(slopeIdx(declaredClass) - slopeIdx(observedClass));
    return {
      ...base,
      status: d === 0 ? "consistent" : d === 1 ? "mismatch-light" : "mismatch-strong",
      declared: `${declaredClass}°`,
      observed: `mean ${mean.toFixed(1)}° (max ${max.toFixed(0)}°) within ${radiusKm} km, ~${Math.round(mPerPx)} m/px`,
      note: `DEM suggests ${observedClass}°. Coarse resolution tends to underestimate local slopes.`,
    };
  } catch (e) {
    return notChecked(base, `Request failed (${e.name === "AbortError" ? "timeout" : e.message})`);
  }
}

/** Runs all data checks in parallel. */
export async function runDataChecks(form) {
  const lat = Number(form.lat), lon = Number(form.lon);
  return Promise.all([
    checkClimate(lat, lon, { climate: form.attrs.climate, tempMin: form.tempMin, tempMax: form.tempMax }),
    checkSlope(lat, lon, form.attrs.slopeClass),
  ]);
}
