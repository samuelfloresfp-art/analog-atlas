// Terrain scan around a point: a grid of cells, each with mean/max slope and relief from the DEM.
// Idea taken from the team's Python scanner (app_marte.py: grid of sectors around a point), but scoring
// only what the data can resolve at this scale. Climate (NASA POWER, ~50 km cells) is NOT scanned per cell.

import { TERRAIN_SCAN, DATA_CHECK_TIMEOUT_MS, forceOffline } from "../config.js";
import { loadDemPatch } from "./dem.js";
import { SLOPE_CLASSES } from "./dataChecks.js";

const KM_PER_DEG_LAT = 110.57;
const kmPerDegLon = (lat) => 111.32 * Math.cos((lat * Math.PI) / 180);

/** Slope class colors (flat = green → steep = red). Same classes as the slope check. */
export const SLOPE_COLORS = { "0-2": "#3ddc84", "2-5": "#b5e853", "5-15": "#ffd166", "15-30": "#ff9f43", ">30": "#ff6b6b" };

export const slopeClassOf = (deg) => SLOPE_CLASSES.find((c) => deg < c.max).id;

/**
 * Returns { cells: [{i, row, col, lat, lon, bounds, meanSlope, maxSlope, reliefM, slopeClass}], bounds, mPerPx }.
 * Throws on network/CORS/timeout errors (caller shows "not available").
 */
export async function scanTerrain(lat, lon, { grid = TERRAIN_SCAN.grid, cellKm = TERRAIN_SCAN.cellKm } = {}) {
  if (forceOffline()) throw new Error("offline mode");
  const halfKm = (grid * cellKm) / 2;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), DATA_CHECK_TIMEOUT_MS);
  let dem;
  try {
    dem = await loadDemPatch(lat, lon, halfKm * 1.05, { signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }

  const dLat = cellKm / KM_PER_DEG_LAT;
  const dLon = cellKm / kmPerDegLon(lat);
  const south = lat - (grid / 2) * dLat;
  const west = lon - (grid / 2) * dLon;

  const cells = [];
  for (let row = 0; row < grid; row++)
    for (let col = 0; col < grid; col++) {
      const s = south + row * dLat, w = west + col * dLon;
      const n = s + dLat, e = w + dLon;
      const a = dem.toPx(n, w), b = dem.toPx(s, e); // top-left, bottom-right in pixel space
      let sum = 0, count = 0, max = 0, lo = Infinity, hi = -Infinity;
      for (let y = Math.ceil(a.y); y <= Math.floor(b.y); y++)
        for (let x = Math.ceil(a.x); x <= Math.floor(b.x); x++) {
          if (!dem.inside(x, y)) continue;
          const deg = dem.slopeDeg(x, y);
          const z = dem.elev(x, y);
          sum += deg;
          count++;
          if (deg > max) max = deg;
          if (z < lo) lo = z;
          if (z > hi) hi = z;
        }
      if (!count) continue;
      const meanSlope = sum / count;
      cells.push({
        row,
        col,
        lat: (s + n) / 2,
        lon: (w + e) / 2,
        bounds: [
          [s, w],
          [n, e],
        ],
        meanSlope,
        maxSlope: max,
        reliefM: hi - lo,
        slopeClass: slopeClassOf(meanSlope),
      });
    }
  // number cells top-left → bottom-right, as read on the map
  cells.sort((p, q) => q.row - p.row || p.col - q.col).forEach((c, k) => (c.i = k + 1));
  return {
    cells,
    bounds: [
      [south, west],
      [south + grid * dLat, west + grid * dLon],
    ],
    mPerPx: dem.mPerPx,
    grid,
    cellKm,
  };
}

/** CSV of a scan (for the team's evidence / NASA Data field). */
export function scanToCsv(scan, center) {
  const head = ["cell", "lat", "lon", "mean_slope_deg", "max_slope_deg", "relief_m", "slope_class", "center_lat", "center_lon", "dem_m_per_px", "source"];
  const rows = scan.cells.map((c) =>
    [c.i, c.lat.toFixed(5), c.lon.toFixed(5), c.meanSlope.toFixed(2), c.maxSlope.toFixed(1), Math.round(c.reliefM), c.slopeClass, center.lat, center.lon, Math.round(scan.mPerPx), "AWS Terrain Tiles (Terrarium, SRTM-based) z12"]
  );
  return [head, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\r\n");
}

export function downloadText(filename, text, type = "text/csv;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
