// Elevation patch from AWS Terrain Tiles (Terrarium PNG, aggregates NASA SRTM and other DEMs).
// Shared by the slope check (dataChecks.js) and the terrain scan (terrainScan.js).

import { ENDPOINTS } from "../config.js";

function loadTileImage(url, signal) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("tile load / CORS error"));
    signal?.addEventListener("abort", () => reject(Object.assign(new Error("timeout"), { name: "AbortError" })));
    img.src = url;
  });
}

/** Global Web-Mercator pixel coordinates of a point at zoom z (256 px tiles). */
function toGlobalPx(lat, lon, z) {
  const n = 2 ** z;
  const latR = (lat * Math.PI) / 180;
  return {
    px: ((lon + 180) / 360) * n * 256,
    py: ((1 - Math.log(Math.tan(latR) + 1 / Math.cos(latR)) / Math.PI) / 2) * n * 256,
  };
}

/**
 * Loads the DEM tiles covering a square of half-size `halfKm` around (lat, lon).
 * Returns helpers in local pixel space: elev(x, y), slopeDeg(x, y), toPx(lat, lon), mPerPx, w, h.
 */
export async function loadDemPatch(lat, lon, halfKm, { z = 12, signal } = {}) {
  const n = 2 ** z;
  const latR = (lat * Math.PI) / 180;
  const mPerPx = (156543.03392 * Math.cos(latR)) / n;
  const { px, py } = toGlobalPx(lat, lon, z);
  const rPx = Math.ceil((halfKm * 1000) / mPerPx);

  const x0 = Math.floor((px - rPx - 1) / 256), x1 = Math.floor((px + rPx + 1) / 256);
  const y0 = Math.floor((py - rPx - 1) / 256), y1 = Math.floor((py + rPx + 1) / 256);
  const w = (x1 - x0 + 1) * 256, h = (y1 - y0 + 1) * 256;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  const jobs = [];
  for (let tx = x0; tx <= x1; tx++)
    for (let ty = y0; ty <= y1; ty++) {
      const url = ENDPOINTS.terrarium.replace("{z}", z).replace("{x}", ((tx % n) + n) % n).replace("{y}", ty);
      jobs.push(loadTileImage(url, signal).then((img) => ctx.drawImage(img, (tx - x0) * 256, (ty - y0) * 256)));
    }
  await Promise.all(jobs);

  const data = ctx.getImageData(0, 0, w, h).data;
  const elev = (x, y) => {
    const i = (y * w + x) * 4;
    return data[i] * 256 + data[i + 1] + data[i + 2] / 256 - 32768;
  };
  const slopeDeg = (x, y) => {
    const dzdx = (elev(x + 1, y) - elev(x - 1, y)) / (2 * mPerPx);
    const dzdy = (elev(x, y + 1) - elev(x, y - 1)) / (2 * mPerPx);
    return (Math.atan(Math.hypot(dzdx, dzdy)) * 180) / Math.PI;
  };
  const toPx = (la, lo) => {
    const g = toGlobalPx(la, lo, z);
    return { x: g.px - x0 * 256, y: g.py - y0 * 256 };
  };
  const inside = (x, y) => x >= 1 && y >= 1 && x < w - 1 && y < h - 1;
  return { elev, slopeDeg, toPx, inside, mPerPx, w, h, rPx };
}
