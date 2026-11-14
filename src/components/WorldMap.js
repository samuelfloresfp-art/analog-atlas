// Shared Leaflet world map: no wrapping, bounded to the world, NASA GIBS base
// with fallbacks (CARTO → local Natural Earth land polygons when offline).

import { S } from "../strings.js";
import { TILES, HD_MIN_ZOOM, forceOffline } from "../config.js";
import { loadLandMask } from "../services/data.js";

const WORLD = [
  [-85, -180],
  [85, 180],
];

export function createWorldMap(el, { minZoom = 2, maxZoom = 17 } = {}) {
  const L = window.L;
  // With noWrap, make sure the world fills the container width (no empty side bands).
  minZoom = Math.max(minZoom, Math.ceil(Math.log2(Math.max(el.clientWidth, 256) / 256)));
  const map = L.map(el, {
    worldCopyJump: false,
    zoomControl: false,
    minZoom,
    maxZoom,
    maxBounds: WORLD,
    maxBoundsViscosity: 1,
  }).setView([10, -20], minZoom);
  L.control.zoom({ position: "topright" }).addTo(map);

  let stage = 0; // 0 gibs, 1 carto, 2 local

  const addLocal = async () => {
    stage = 2;
    try {
      const geo = await loadLandMask();
      L.geoJSON(geo, { style: { color: "#3a4a78", weight: 1, fillColor: "#1b2647", fillOpacity: 1 }, interactive: false }).addTo(map);
      map.attributionControl.addAttribution(S.imageryLocal);
    } catch {
      /* nothing else to show */
    }
  };

  const addTiles = (url, opts, onFail) => {
    let loaded = 0, errors = 0, failed = false;
    const layer = L.tileLayer(url, { noWrap: true, bounds: WORLD, ...opts }).addTo(map);
    layer.on("tileload", () => loaded++);
    layer.on("tileerror", () => {
      errors++;
      if (!failed && loaded === 0 && errors >= 4) {
        failed = true;
        map.removeLayer(layer);
        onFail();
      }
    });
  };

  if (forceOffline()) {
    addLocal();
  } else {
    // NASA Blue Marble for the globe view, then high-resolution imagery when the user zooms in.
    addTiles(TILES.gibs, { maxNativeZoom: 8, maxZoom, attribution: S.imageryNasa }, () => {
      stage = 1;
      addTiles(TILES.carto, { subdomains: "abcd", maxZoom: 19, attribution: S.imageryCarto }, addLocal);
    });
    L.tileLayer(TILES.hd, { noWrap: true, bounds: WORLD, minZoom: HD_MIN_ZOOM, maxNativeZoom: 18, maxZoom, attribution: S.imageryHd, className: "hd-tiles" }).addTo(map);
  }
  map.getBasemapStage = () => ["gibs", "carto", "local"][stage];
  window.__analogMap = map; // debug handle for manual testing
  return map;
}

/** Marker cluster group if the plugin loaded, else a plain layer group. */
export function createClusterLayer(opts = {}) {
  const L = window.L;
  return L.markerClusterGroup
    ? L.markerClusterGroup({ showCoverageOnHover: false, maxClusterRadius: 40, ...opts })
    : L.layerGroup();
}

export function fitToMarkers(map, latlngs, maxZoom = 5) {
  if (!latlngs.length) return;
  const b = window.L.latLngBounds(latlngs).pad(0.25);
  // fitBounds does not re-center when the zoom is clamped by minZoom + maxBounds,
  // so compute the zoom ourselves and use setView.
  const z = Math.max(map.getMinZoom(), Math.min(maxZoom, map.getBoundsZoom(b)));
  map.setView(b.getCenter(), z, { animate: false });
}
