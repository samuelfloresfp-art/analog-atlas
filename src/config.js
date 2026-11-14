// One-line settings the team may want to change.

/** Marker color for "Possible, never tested" candidates (drawn with a dashed outline). */
export const CANDIDATE_COLOR = "#B9B9BB";

/** Marker color for "Validated simulation site". */
export const VALIDATED_COLOR = "#3DD68C";

/** Community map colors by status. */
export const COMMUNITY_COLORS = { plausible: "#3BC9DB", needs: "#F5C542", example: "#288BFF", notConsistent: "#959599" };

/** Distance (km) for the novelty / duplicate check. */
export const NOVELTY_RADIUS_KM = 10;

/** Timeout (ms) for each live open-data check. */
export const DATA_CHECK_TIMEOUT_MS = 8000;

/** Zoom level where the map switches from NASA Blue Marble to high-resolution imagery. */
export const HD_MIN_ZOOM = 6;

/** Base map tiles. */
export const TILES = {
  gibs: "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_ShadedRelief_Bathymetry/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg",
  carto: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
  /** High-resolution satellite imagery used from HD_MIN_ZOOM up (sub-metre in most places). */
  hd: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
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
