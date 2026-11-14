// ORNL DAAC TESViS (MODIS subsets). CORS ok, but calls take 30–55 s → with the 8 s browser timeout they
// usually fail live; the cards use the values pre-computed by scripts/fetch_nasa_cache.py.
// Citation: ORNL DAAC. 2018. doi:10.3334/ORNLDAAC/1600

import { getCached } from "./http.js";

const BASE = "https://modis.ornl.gov/rst/api/v1";

async function subset(product, band, lat, lon, start, end, ttlHours) {
  const qs = new URLSearchParams({ latitude: lat, longitude: lon, band, startDate: start, endDate: end, kmAboveBelow: 0, kmLeftRight: 0 });
  const j = await getCached(`${BASE}/${product}/subset?${qs}`, { ttlHours, headers: { Accept: "application/json" } });
  const scale = Number(j.scale);
  return { rows: j.subset.map((s) => s.data[0]), scale: Number.isFinite(scale) ? scale : null };
}

/** Mean NDVI of the first 10 MOD13Q1 composites of 2024 (one call, to stay within the browser budget). */
export async function getNdvi(lat, lon, ttlHours = 720) {
  const { rows, scale } = await subset("MOD13Q1", "250m_16_days_NDVI", lat, lon, "A2024001", "A2024145", ttlHours);
  const v = rows.filter((x) => x > -2000).map((x) => x * (scale || 0.0001));
  return v.length ? { mean: v.reduce((a, b) => a + b, 0) / v.length, n: v.length, period: "2024 Jan–May (MOD13Q1)" } : null;
}

/** IGBP land cover class (MCD12Q1 LC_Type1, 2022). 17 = water bodies. */
export async function getLandCover(lat, lon, ttlHours = 720) {
  const { rows } = await subset("MCD12Q1", "LC_Type1", lat, lon, "A2022001", "A2022365", ttlHours);
  const v = rows.filter((x) => x !== 255);
  return v.length ? { class: v[v.length - 1], year: 2022 } : null;
}

export const IGBP = {
  1: "Evergreen needleleaf forest", 2: "Evergreen broadleaf forest", 3: "Deciduous needleleaf forest",
  4: "Deciduous broadleaf forest", 5: "Mixed forest", 6: "Closed shrubland", 7: "Open shrubland",
  8: "Woody savanna", 9: "Savanna", 10: "Grassland", 11: "Permanent wetland", 12: "Cropland",
  13: "Urban and built-up", 14: "Cropland/natural vegetation mosaic", 15: "Permanent snow and ice",
  16: "Barren", 17: "Water bodies",
};
