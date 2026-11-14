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
