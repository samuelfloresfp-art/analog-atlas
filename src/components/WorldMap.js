// Shared Leaflet world map: no wrapping, bounded to the world.
// Default base "Auto" = NASA GIBS Blue Marble at world scale, high-resolution satellite from
// AUTO_HIRES_FROM_ZOOM on (GIBS Blue Marble only exists up to zoom 8, so it pixelates when zoomed in).
// A layer switcher offers NASA Landsat 30 m, satellite and topographic maps.
// Fallbacks if NASA tiles fail: CARTO → local Natural Earth land polygons when offline.

import { S } from "../strings.js";
import { TILES, AUTO_HIRES_FROM_ZOOM, forceOffline } from "../config.js";
import { loadLandMask } from "../services/data.js";

const WORLD = [
  [-85, -180],
  [85, 180],
];

export function createWorldMap(el, { minZoom = 2 } = {}) {
  const L = window.L;
  // With noWrap, make sure the world fills the container width (no empty side bands).
  minZoom = Math.max(minZoom, Math.ceil(Math.log2(Math.max(el.clientWidth, 256) / 256)));
  const map = L.map(el, {
    worldCopyJump: false,
    minZoom,
    maxZoom: 18,
    maxBounds: WORLD,
    maxBoundsViscosity: 1,
  }).setView([10, -20], minZoom);

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

  const tile = (url, opts) => L.tileLayer(url, { noWrap: true, bounds: WORLD, ...opts });

  // Watches a layer; if no tile ever loads and several fail, calls onFail once.
  const watchFail = (layer, onFail) => {
    let loaded = 0, errors = 0, failed = false;
    layer.on("tileload", () => loaded++);
    layer.on("tileerror", () => {
      errors++;
      if (!failed && loaded === 0 && errors >= 4) {
        failed = true;
        onFail();
      }
    });
  };

  const addTiles = (url, opts, onFail) => {
    const layer = tile(url, opts).addTo(map);
    watchFail(layer, () => {
      map.removeLayer(layer);
      onFail();
    });
  };

  if (forceOffline()) {
    addLocal();
  } else {
    const blueMarble = () => tile(TILES.gibs, { maxNativeZoom: 8, maxZoom: 18, attribution: S.imageryNasa });
    const satellite = (minZoom = 0) => tile(TILES.esriImagery, { minZoom, maxNativeZoom: 18, maxZoom: 18, attribution: S.imageryEsri });

    const autoNasa = tile(TILES.gibs, { maxNativeZoom: 8, maxZoom: AUTO_HIRES_FROM_ZOOM - 1, attribution: S.imageryNasa });
    const auto = L.layerGroup([autoNasa, satellite(AUTO_HIRES_FROM_ZOOM)]);
    const bases = {
      [S.baseAuto]: auto,
      [S.baseBlueMarble]: blueMarble(),
      [S.baseLandsat]: tile(TILES.gibsLandsat, { maxNativeZoom: 12, maxZoom: 18, attribution: `${S.imageryNasa} (Landsat WELD)` }),
      [S.baseSatellite]: satellite(),
      [S.baseTopo]: tile(TILES.openTopo, { subdomains: "abc", maxNativeZoom: 17, maxZoom: 18, attribution: S.imageryOpenTopo }),
    };
    auto.addTo(map);
    const control = L.control.layers(bases, {}, { position: "topright", collapsed: true }).addTo(map);

    // If NASA GIBS is unreachable, fall back exactly as before (CARTO → local land mask).
    watchFail(autoNasa, () => {
      if (!map.hasLayer(auto)) return;
      map.removeLayer(auto);
      control.remove();
      stage = 1;
      addTiles(TILES.carto, { subdomains: "abcd", maxZoom: 19, attribution: S.imageryCarto }, addLocal);
    });
    map.setBaseLayer = (name) => {
      const layer = bases[name];
      if (!layer || map.hasLayer(layer)) return;
      Object.values(bases).forEach((b) => map.hasLayer(b) && map.removeLayer(b));
      layer.addTo(map);
    };
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
