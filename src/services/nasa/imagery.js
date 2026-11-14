// Real images for the site card: NASA GIBS WMTS (Earth) and Solar System Treks WMTS (Moon/Mars).
// Layers confirmed on 2026-11-14 (see data/nasa-endpoints.json).

/** GIBS Landsat WELD annual true colour tile containing the point (zoom 11, ~38 m/px). */
export function gibsThumbUrl(lat, lon, z = 11) {
  const n = 2 ** z;
  const la = Math.max(-85, Math.min(85, lat));
  const col = Math.floor(((lon + 180) / 360) * n);
  const row = Math.floor(((1 - Math.asinh(Math.tan((la * Math.PI) / 180)) / Math.PI) / 2) * n);
  return `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/Landsat_WELD_CorrectedReflectance_TrueColor_Global_Annual/default/2000-12-01/GoogleMapsCompatible_Level12/${z}/${row}/${col}.jpeg`;
}

/** Trek tile for the representative feature of a site on a planet (data/trek-features.json), or null. */
export function trekTileFor(trek, siteId, planet) {
  const key = trek?.sites?.[siteId]?.[planet];
  const f = key && trek.features[planet][key];
  if (!f) return null;
  const L = trek.layers[planet];
  const d = 180 / 2 ** L.z;
  const row = Math.min(Math.floor((90 - f.lat) / d), 2 ** L.z - 1);
  const col = Math.floor((f.lon + 180) / d);
  return {
    url: `https://trek.nasa.gov/tiles/${L.body}/EQ/${L.layer}/1.0.0/default/default028mm/${L.z}/${row}/${col}.jpg`,
    feature: f.name,
    lat: f.lat,
    lon: f.lon,
    layer: L.label,
    confidence: trek.confidence,
  };
}

/** Opens the same point in the NASA Earthdata Search app (CMR is its API). sp[0] = "lon,lat" spatial point. */
export function earthdataSearchUrl(lat, lon, shortName) {
  const q = new URLSearchParams({ q: shortName });
  return `https://search.earthdata.nasa.gov/search?${q}&sp[0]=${encodeURIComponent(`${lon},${lat}`)}`;
}

/** Opens the same point in NASA Worldview (GIBS is its imagery service), with the card's Landsat layer on top. */
export function worldviewUrl(lat, lon, halfDeg = 0.2) {
  const r = (x) => Math.round(x * 1e4) / 1e4;
  const v = [r(lon - halfDeg), r(lat - halfDeg * 0.75), r(lon + halfDeg), r(lat + halfDeg * 0.75)].join(",");
  const l = ["Landsat_WELD_CorrectedReflectance_TrueColor_Global_Annual", "MODIS_Terra_CorrectedReflectance_TrueColor"].join(",");
  return `https://worldview.earthdata.nasa.gov/?v=${v}&l=${l}&t=2000-12-01`;
}
