// Loads the editable JSON files once and builds lookup maps.

let cache = null;
let landMask = null;

async function fetchJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path} (${res.status})`);
  return res.json();
}

export async function loadData() {
  if (cache) return cache;
  const [missions, sites, criteria, community] = await Promise.all(
    ["missions", "sites", "criteria", "community"].map((n) => fetchJson(`src/data/${n}.json`))
  );
  cache = {
    missions,
    sites,
    criteria,
    community,
    planets: ["moon", "mars"],
    missionById: Object.fromEntries(missions.map((m) => [m.id, m])),
    siteById: Object.fromEntries(sites.map((s) => [s.id, s])),
  };
  return cache;
}

export function getData() {
  if (!cache) throw new Error("Data not loaded yet");
  return cache;
}

/** Natural Earth 110m land polygons (public domain), served from vendor/. */
export async function loadLandMask() {
  if (!landMask) landMask = await fetchJson("vendor/naturalearth/ne_110m_land.geojson");
  return landMask;
}
