// EONET v3 natural events near a point (context only, last 365 days).

import { getCached } from "./http.js";

export async function getNearbyEvents(lat, lon, ttlHours = 24) {
  const bbox = `${(lon - 2).toFixed(2)},${(lat + 2).toFixed(2)},${(lon + 2).toFixed(2)},${(lat - 2).toFixed(2)}`;
  const j = await getCached(`https://eonet.gsfc.nasa.gov/api/v3/events?bbox=${bbox}&status=all&days=365&limit=5`, { ttlHours });
  return (j.events || []).map((e) => ({
    id: e.id,
    title: e.title,
    category: e.categories?.[0]?.title,
    date: e.geometry?.[e.geometry.length - 1]?.date,
    link: e.link,
  }));
}
