// validateCoordinates(lat, lon, opts?) → Promise<ValidationReport>   (contract shared with prompts 2 and 3)
//
// Known sites (≤ 1 km from a site in sites.json): the pre-computed report in data/nasa-cache/ is returned
// (status "cached") — no network needed. New coordinates, or opts.live = true ("Re-check with NASA data"),
// call the sources live; a live source that fails keeps the cached value when there is one.
// Thresholds: data/nasa-endpoints.json — PROJECT RULES, not scientific consensus.
// Same logic as scripts/fetch_nasa_cache.py; keep both in sync.

import { loadData, loadLandMask } from "../data.js";
import { haversineKm, landTest } from "../geo.js";
import { loadNasaStatic, sourceRef, ttl } from "./sources.js";
import { getPowerClimatology } from "./power.js";
import { getNdvi, getLandCover, IGBP } from "./tesvis.js";
import { getCoverage } from "./cmr.js";
import { getSpaceWeather } from "./donki.js";
import { getIssDose } from "./radlab.js";

const KNOWN_SITE_KM = 1;
const r = (v, n = 1) => (v == null || !Number.isFinite(v) ? null : Math.round(v * 10 ** n) / 10 ** n);

export function levelFor(v, th) {
  if (v == null) return "nodata";
  if (th.direction === "higher") return v >= th.strong ? "strong" : v >= th.partial ? "partial" : "weak";
  return v < th.strong ? "strong" : v < th.partial ? "partial" : "weak";
}

export function vegClass(ndvi, ep) {
  if (ndvi == null) return null;
  const t = ep.sources.tesvis.thresholds.vegetationClass;
  return ndvi < t.noneMax ? "none" : ndvi < t.sparseMax ? "sparse" : ndvi < t.moderateMax ? "moderate" : "dense";
}

export function climateClass(p, ep) {
  if (!p) return null;
  const t = ep.sources.power.thresholds.climateClass;
  if (p.t2mAnn < t.polarColdMaxT2M) return "polar-cold";
  if (p.elevation != null && p.elevation >= t.highAltitudeMinElevation) return "high-altitude";
  const mm = p.precipMmYr;
  return mm < t.hyperAridMaxMm ? "hyper-arid" : mm < t.aridMaxMm ? "arid" : mm < t.semiAridMaxMm ? "semi-arid" : "humid";
}

const ruleResult = (rule, v) => (rule.pass.includes(v) ? "pass" : rule.partial.includes(v) ? "partial" : "fail");

/** Data-inferred values × REQUIRED rules of criteria.json for planet.mission. */
export function missionFitFor(report, criteria, planet, mission) {
  const combo = criteria.combos[`${planet}.${mission}`];
  const failing = [];
  const checked = [];
  if (!combo) return { ok: true, failingRequirements: [], checked, planet };
  if (report.basic.onLand === false) failing.push("On land");
  for (const rule of combo.rules) {
    const v = report.inferred?.[rule.field];
    if (!rule.required || v == null) continue;
    const res = ruleResult(rule, v);
    checked.push({ rule: rule.label, field: rule.field, inferred: v, result: res });
    if (res === "fail") failing.push(rule.label);
  }
  return { ok: failing.length === 0, failingRequirements: failing, checked, planet };
}

function indicator(ep, key, value, unit, level, source, status, details) {
  const o = { key, dimension: ep.indicatorDimensions[key], value, unit, suggestedLevel: level, source, status };
  if (details) o.details = details;
  return o;
}

function nearest(sites, lat, lon) {
  let best = null;
  for (const s of sites) {
    const km = haversineKm(lat, lon, s.lat, s.lon);
    if (!best || km < best.km) best = { km, site: s };
  }
  return best;
}

/** Deep copy of a cached report with every indicator marked "cached". */
function fromCache(entry) {
  const rep = JSON.parse(JSON.stringify(entry.report));
  rep.indicators.forEach((i) => {
    if (i.status === "live") i.status = "cached";
  });
  rep.cachedAt = entry.generatedAt;
  delete rep.missionFitBy;
  return rep;
}

/**
 * @param {number} lat
 * @param {number} lon
 * @param {{mission?:"landing"|"rover"|"base", planet?:"moon"|"mars", live?:boolean}} [opts]
 * @returns {Promise<import("../../types.js").ValidationReport>}
 */
export async function validateCoordinates(lat, lon, opts = {}) {
  lat = Number(lat);
  lon = Number(lon);
  const { mission, planet = "mars", live = false } = opts;
  const [{ endpoints: ep, cache }, data] = await Promise.all([loadNasaStatic(), loadData()]);
  const errors = [];
  const inRange = Number.isFinite(lat) && Number.isFinite(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
  const empty = { lat, lon, checkedAt: new Date().toISOString(), basic: { inRange, onLand: null, nearestKnownSiteKm: null, nearestKnownSiteId: null }, indicators: [], errors };
  if (!inRange) {
    errors.push("Coordinates out of range: latitude must be in [-90, 90] and longitude in [-180, 180].");
    if (mission) empty.missionFit = { ok: false, failingRequirements: ["Valid coordinates"] };
    return empty;
  }

  const near = nearest(data.sites, lat, lon);
  const known = near && near.km <= KNOWN_SITE_KM ? near.site : null;
  const cached = known ? cache.sites?.[known.id] : null;

  // ---- known site, cache first
  if (cached && !live) {
    const rep = fromCache(cached);
    rep.lat = lat;
    rep.lon = lon;
    rep.checkedAt = cached.generatedAt;
    if (mission) rep.missionFit = missionFitFor(rep, data.criteria, planet, mission);
    return rep;
  }

  // ---- live
  const rep = empty;
  if (near) {
    rep.basic.nearestKnownSiteKm = r(near.km, 1);
    rep.basic.nearestKnownSiteId = near.site.id;
  }
  const prev = cached ? Object.fromEntries(cached.report.indicators.map((i) => [i.key, i])) : {};
  const attempt = (name, p) =>
    p.then(
      (v) => ({ v, status: "live" }),
      (e) => {
        errors.push(`${name} failed (${e.message}).`);
        return { v: null, status: "failed" };
      }
    );
  const [power, ndvi, lc, cov, sw] = await Promise.all([
    attempt("NASA POWER", getPowerClimatology(lat, lon, ttl(ep, "power"))),
    attempt("TESViS NDVI", getNdvi(lat, lon, ttl(ep, "tesvis"))),
    attempt("TESViS land cover", getLandCover(lat, lon, ttl(ep, "tesvis"))),
    attempt("NASA CMR", getCoverage(lat, lon, ttl(ep, "cmr"))),
    getSpaceWeather().then((v) => ({ v, status: v.status })),
  ]);

  // keep the cached indicator when a live source fails for a known site
  const pick = (key, built) => (built.status === "failed" && prev[key] ? { ...prev[key], status: "cached" } : built);
  const thP = ep.sources.power.thresholds;
  const P = power.v || {};
  const powerRef = sourceRef(ep, "power");
  rep.indicators.push(
    pick("temp_range", indicator(ep, "temp_range", r(P.tempRange), "°C", levelFor(P.tempRange ?? null, thP.temp_range), powerRef, power.status, power.v ? { tMaxMonthC: r(P.tMaxMonth), tMinMonthC: r(P.tMinMonth), t2mAnnC: r(P.t2mAnn) } : undefined)),
    pick("aridity", indicator(ep, "aridity", r(P.precipMmYr, 0), "mm/yr", levelFor(P.precipMmYr ?? null, thP.aridity), powerRef, power.status, power.v ? { rh2mPct: r(P.rh) } : undefined)),
    pick("elevation", indicator(ep, "elevation", r(P.elevation, 0), "m (grid-cell mean)", levelFor(P.elevation ?? null, thP.elevation), powerRef, power.status)),
    pick("solar", indicator(ep, "solar", r(P.solar, 2), "kWh/m²/day", levelFor(P.solar ?? null, thP.solar), powerRef, power.status)),
    pick("wind", indicator(ep, "wind", r(P.wind, 2), "m/s", levelFor(P.wind ?? null, thP.wind), powerRef, power.status))
  );
  const thT = ep.sources.tesvis.thresholds;
  const nd = ndvi.v?.mean ?? null;
  rep.indicators.push(
    pick("vegetation", indicator(ep, "vegetation", r(nd, 3), "NDVI", levelFor(nd, thT.vegetation), sourceRef(ep, "tesvis", "MODIS MOD13Q1 NDVI via ORNL DAAC TESViS"), ndvi.status, ndvi.v ? { inferredClass: vegClass(nd, ep), n: ndvi.v.n, period: ndvi.v.period } : undefined))
  );
  const lcl = thT.land_cover;
  const cls = lc.v?.class ?? null;
  const lcLevel = cls == null ? "nodata" : lcl.strongClasses.includes(cls) ? "strong" : lcl.partialClasses.includes(cls) ? "partial" : "weak";
  rep.indicators.push(
    pick("land_cover", indicator(ep, "land_cover", cls == null ? null : IGBP[cls] || `class ${cls}`, "IGBP class", lcLevel, sourceRef(ep, "tesvis", "MODIS MCD12Q1 land cover via ORNL DAAC TESViS"), lc.status, cls == null ? undefined : { class: cls, year: lc.v.year }))
  );
  const covN = cov.v ? Object.values(cov.v).filter((n) => n > 0).length : null;
  rep.indicators.push(
    pick("data_coverage", indicator(ep, "data_coverage", covN, "of 4 collections", levelFor(covN, ep.sources.cmr.thresholds.data_coverage), sourceRef(ep, "cmr"), cov.status, cov.v ? { granules: cov.v } : undefined))
  );
  const rad = getIssDose();
  rep.indicators.push(
    indicator(ep, "radiation_gap", rad.medianUGyPerH ?? null, "µGy/h on the ISS (DosTel2)", rad.status === "failed" ? "nodata" : "weak", sourceRef(ep, "radlab"), rad.status, rad.status === "failed" ? undefined : { iss: { instrument: rad.instrument, period: rad.period, n: rad.n, meanUGyPerH: rad.meanUGyPerH, medianUGyPerH: rad.medianUGyPerH }, earthBackground: rad.earthBackground, note: "No place on Earth's surface reproduces this radiation environment." })
  );
  const S = sw.v;
  rep.indicators.push(
    indicator(ep, "space_weather", S.total30d ?? null, "DONKI events, last 30 days", "nodata", sourceRef(ep, "donki"), S.status, S.status === "failed" ? undefined : { counts30d: S.counts30d, counts365d: S.counts365d, window30d: S.window30d })
  );

  // onLand: land cover ≠ water. If land cover failed, the Natural Earth 110m mask may only say "water"
  // (open ocean > 30 km from any coast) — it is never used to claim "land".
  const lcInd = rep.indicators.find((i) => i.key === "land_cover");
  const lcClass = lcInd.details?.class;
  // basic.landMask (extra field): local Natural Earth 110m test — "land" (inside a polygon), "coast" (≤ 30 km) or "water".
  try {
    const mask = await loadLandMask();
    const inside = landTest(mask, lat, lon, 0).onLand;
    rep.basic.landMask = inside ? "land" : landTest(mask, lat, lon, 30).onLand ? "coast" : "water";
  } catch {
    rep.basic.landMask = null;
  }
  if (lcClass != null) rep.basic.onLand = lcClass !== lcl.waterClass;
  else if (rep.basic.landMask === "water") {
    rep.basic.onLand = false;
    rep.basic.onLandSource = "Natural Earth 110m land mask (open ocean only)";
  }

  const vegInd = rep.indicators.find((i) => i.key === "vegetation");
  const powerOk = rep.indicators.find((i) => i.key === "aridity").value != null;
  rep.inferred = {
    vegetation: vegInd.value == null ? null : vegClass(vegInd.value, ep),
    climate: power.v ? climateClass(P, ep) : powerOk && cached ? cached.report.inferred?.climate ?? null : null,
  };
  if (mission) rep.missionFit = missionFitFor(rep, data.criteria, planet, mission);
  return rep;
}
