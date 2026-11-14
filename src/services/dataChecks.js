import { LANG } from "../i18n.js";
const T = (en, pt) => (LANG === "pt" ? pt : en);
// Layer C — optional, asynchronous open-data cross-checks.
// Every check returns status: "consistent" | "mismatch-light" | "mismatch-strong" | "not-checked".
// On any network/CORS/timeout error the result is "not-checked" so the site works offline.

import { ENDPOINTS, DATA_CHECK_TIMEOUT_MS, forceOffline } from "../config.js";

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
  const base = { id: "climate", label: T("Climate vs NASA POWER climatology", "Clima x climatologia NASA POWER"), origin: "NASA data", source: "NASA POWER" };
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
      note = T(`Declared ${c}; annual precipitation suggests ${observedClass}.`, `Declarado: ${c}; a chuva anual indica ${observedClass}.`);
    } else if (c === "polar-cold") {
      status = tMean < 0 ? "consistent" : tMean < 8 ? "mismatch-light" : "mismatch-strong";
      note = T(`Declared polar/cold; mean annual air temperature is ${tMean.toFixed(1)} °C.`, `Declarado polar/frio; a temperatura média anual do ar é ${tMean.toFixed(1)} °C.`);
    } else if (c === "high-altitude") {
      if (typeof elev === "number") {
        status = elev >= 2500 ? "consistent" : elev >= 1500 ? "mismatch-light" : "mismatch-strong";
        note = T(`Declared high altitude; POWER grid-cell elevation is ${Math.round(elev)} m.`, `Declarado grande altitude; a altitude da célula POWER é ${Math.round(elev)} m.`);
      } else {
        status = "consistent";
        note = T("Elevation not returned; altitude not checked.", "Altitude não retornada; não conferida.");
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
    return notChecked(base, T(`Request failed (${e.name === "AbortError" ? "timeout" : e.message})`, `Falha na consulta (${e.name === "AbortError" ? "tempo esgotado" : e.message})`));
  }
}

// ---------- Slope: AWS Terrain Tiles (Terrarium, aggregates SRTM and others) ----------

const SLOPE_CLASSES = [
  { id: "0-2", max: 2 },
  { id: "2-5", max: 5 },
  { id: "5-15", max: 15 },
  { id: "15-30", max: 30 },
  { id: ">30", max: Infinity },
];
const slopeIdx = (id) => SLOPE_CLASSES.findIndex((c) => c.id === id);

function loadTileImage(url, signal) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("tile load / CORS error"));
    signal.addEventListener("abort", () => reject(Object.assign(new Error("timeout"), { name: "AbortError" })));
    img.src = url;
  });
}

export async function checkSlope(lat, lon, declaredClass, radiusKm = 1) {
  const base = { id: "slope", label: T("Slope vs elevation tiles (SRTM-based)", "Declividade x modelo de elevação (base SRTM)"), origin: "open data", source: "AWS Terrain Tiles (Terrarium)" };
  if (forceOffline()) return notChecked(base, "Offline mode");
  try {
    const z = 12;
    const n = 2 ** z;
    const latR = (lat * Math.PI) / 180;
    // global pixel coords
    const px = ((lon + 180) / 360) * n * 256;
    const py = ((1 - Math.log(Math.tan(latR) + 1 / Math.cos(latR)) / Math.PI) / 2) * n * 256;
    const mPerPx = (156543.03392 * Math.cos(latR)) / n;
    const rPx = Math.ceil((radiusKm * 1000) / mPerPx);

    const x0 = Math.floor((px - rPx - 1) / 256), x1 = Math.floor((px + rPx + 1) / 256);
    const y0 = Math.floor((py - rPx - 1) / 256), y1 = Math.floor((py + rPx + 1) / 256);
    const w = (x1 - x0 + 1) * 256, h = (y1 - y0 + 1) * 256;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    await withTimeout(async (signal) => {
      const jobs = [];
      for (let tx = x0; tx <= x1; tx++)
        for (let ty = y0; ty <= y1; ty++) {
          const url = ENDPOINTS.terrarium.replace("{z}", z).replace("{x}", ((tx % n) + n) % n).replace("{y}", ty);
          jobs.push(loadTileImage(url, signal).then((img) => ctx.drawImage(img, (tx - x0) * 256, (ty - y0) * 256)));
        }
      await Promise.all(jobs);
    });

    const data = ctx.getImageData(0, 0, w, h).data;
    const elev = (x, y) => {
      const i = (y * w + x) * 4;
      return data[i] * 256 + data[i + 1] + data[i + 2] / 256 - 32768;
    };
    const cx = Math.round(px - x0 * 256), cy = Math.round(py - y0 * 256);
    let sum = 0, count = 0, max = 0;
    for (let y = cy - rPx; y <= cy + rPx; y++)
      for (let x = cx - rPx; x <= cx + rPx; x++) {
        if ((x - cx) ** 2 + (y - cy) ** 2 > rPx * rPx) continue;
        if (x < 1 || y < 1 || x >= w - 1 || y >= h - 1) continue;
        const dzdx = (elev(x + 1, y) - elev(x - 1, y)) / (2 * mPerPx);
        const dzdy = (elev(x, y + 1) - elev(x, y - 1)) / (2 * mPerPx);
        const deg = (Math.atan(Math.hypot(dzdx, dzdy)) * 180) / Math.PI;
        sum += deg;
        count++;
        max = Math.max(max, deg);
      }
    if (!count) return notChecked(base, T("No elevation samples", "Sem amostras de elevação"));
    const mean = sum / count;
    const observedClass = SLOPE_CLASSES.find((c) => mean < c.max).id;
    const d = Math.abs(slopeIdx(declaredClass) - slopeIdx(observedClass));
    return {
      ...base,
      status: d === 0 ? "consistent" : d === 1 ? "mismatch-light" : "mismatch-strong",
      declared: `${declaredClass}°`,
      observed: `mean ${mean.toFixed(1)}° (max ${max.toFixed(0)}°) within ${radiusKm} km, ~${Math.round(mPerPx)} m/px`,
      note: T(`DEM suggests ${observedClass}°. Coarse resolution tends to underestimate local slopes.`, `O modelo de elevação indica ${observedClass}°. A resolução grosseira tende a subestimar declives locais.`),
    };
  } catch (e) {
    return notChecked(base, T(`Request failed (${e.name === "AbortError" ? "timeout" : e.message})`, `Falha na consulta (${e.name === "AbortError" ? "tempo esgotado" : e.message})`));
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
