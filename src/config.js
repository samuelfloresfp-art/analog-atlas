// One-line settings the team may want to change.

/** Marker color for "Possible, never tested" candidates (drawn with a dashed outline). */
export const CANDIDATE_COLOR = "#9AA0A6";

/** Marker color for "Validated simulation site". */
export const VALIDATED_COLOR = "#3ddc84";

/** Community map colors by status. */
export const COMMUNITY_COLORS = { plausible: "#a855f7", needs: "#d8b4fe", example: "#f0abfc", notConsistent: "#6b7280" };

/** Distance (km) for the novelty / duplicate check. */
export const NOVELTY_RADIUS_KM = 10;

/** Timeout (ms) for each live open-data check. */
export const DATA_CHECK_TIMEOUT_MS = 8000;

/** Base map tiles. */
export const TILES = {
  gibs: "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_ShadedRelief_Bathymetry/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg",
  carto: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
};

/** Open-data endpoints used by src/services/dataChecks.js (tested from the browser, see DECISIONS.md). */
export const ENDPOINTS = {
  power: "https://power.larc.nasa.gov/api/temporal/climatology/point",
  terrarium: "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png",
};

/**
 * Debug: simulate "no network" (no tiles, no data checks).
 * Turn on in the browser console:  localStorage.setItem("analogAtlas.forceOffline", "1")
 */
export function forceOffline() {
  try {
    return localStorage.getItem("analogAtlas.forceOffline") === "1";
  } catch {
    return false;
  }
}
