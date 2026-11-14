// Geometry helpers: distance and a low-resolution land mask test.

const R = 6371; // km

export function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Approx. distance (km) from a point to a segment, local equirectangular projection. */
function segmentKm(lat, lon, lat1, lon1, lat2, lon2) {
  const kx = 111.32 * Math.cos((lat * Math.PI) / 180);
  const ky = 110.57;
  const ax = (lon1 - lon) * kx, ay = (lat1 - lat) * ky;
  const bx = (lon2 - lon) * kx, by = (lat2 - lat) * ky;
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2)) : 0;
  return Math.hypot(ax + t * dx, ay + t * dy);
}

function inRing(lon, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function inPolygon(lon, lat, rings) {
  if (!inRing(lon, lat, rings[0])) return false;
  for (let k = 1; k < rings.length; k++) if (inRing(lon, lat, rings[k])) return false;
  return true;
}

/**
 * Natural Earth 110m is coarse: small islands and thin coasts are missing.
 * Returns {onLand, nearCoastKm} — a point outside the polygons but within
 * `coastToleranceKm` of a coastline vertex is treated as "near coast".
 */
export function landTest(geojson, lat, lon, coastToleranceKm = 30) {
  let minKm = Infinity;
  for (const f of geojson.features) {
    const g = f.geometry;
    const polys = g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : [];
    for (const rings of polys) {
      if (inPolygon(lon, lat, rings)) return { onLand: true, nearCoastKm: null };
      const ring = rings[0];
      for (let i = 1; i < ring.length; i++) {
        const [x1, y1] = ring[i - 1];
        const [x2, y2] = ring[i];
        if (Math.min(y1, y2) - lat > 3 || lat - Math.max(y1, y2) > 3) continue;
        if (Math.min(x1, x2) - lon > 4 || lon - Math.max(x1, x2) > 4) continue;
        minKm = Math.min(minKm, segmentKm(lat, lon, y1, x1, y2, x2));
      }
    }
  }
  return { onLand: minKm <= coastToleranceKm, nearCoastKm: Number.isFinite(minKm) ? minKm : null };
}
