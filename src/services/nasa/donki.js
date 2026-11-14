// DONKI space weather. First try api.nasa.gov/DONKI (official Open API, needs a key); on failure
// (e.g. DEMO_KEY 429) use the CCMC host https://ccmc.gsfc.nasa.gov/DONKI-API (no key, CORS ok, max 60 days per call).
// getSpaceWeather() is exported for the simulation (prompt 3).

import { getCached } from "./http.js";
import { nasaApi } from "./openApi.js";
import { nasaStatic } from "./sources.js";

export const DONKI_TYPES = ["FLR", "CME", "SEP", "GST"];
const CCMC = "https://ccmc.gsfc.nasa.gov/DONKI-API/get";
const iso = (d) => d.toISOString().slice(0, 10);

async function events(type, start, end, ttlHours) {
  try {
    return { list: (await nasaApi(`DONKI/${type}`, { startDate: start, endDate: end }, { ttlHours })) || [], host: "api.nasa.gov" };
  } catch {
    const list = await getCached(`${CCMC}/${type}?startDate=${start}&endDate=${end}`, { ttlHours });
    return { list: list || [], host: "ccmc.gsfc.nasa.gov/DONKI-API" };
  }
}

/**
 * Space weather "on the target": FLR, CME, SEP, GST of the last 30 days (+ 365-day counts).
 * Live first; if the network fails, returns the pre-computed snapshot (status "cached").
 * @param {{days?:number, includeYear?:boolean}} opts
 * @returns {Promise<{status:"live"|"cached"|"failed", window30d:string[], counts30d:object, counts365d?:object, total30d:number|null, recent:object[], host?:string, generatedAt:string, source:object, errors:string[]}>}
 */
export async function getSpaceWeather({ days = 30, includeYear = false } = {}) {
  const end = new Date();
  const start = new Date(end.getTime() - days * 86400e3);
  const ttl = nasaStatic()?.endpoints?.cacheTtlHours?.donki ?? 6;
  const source = { name: "DONKI (CCMC)", agency: "NASA", url: "https://ccmc.gsfc.nasa.gov/tools/DONKI/" };
  try {
    const res = await Promise.all(DONKI_TYPES.map((t) => events(t, iso(start), iso(end), ttl)));
    const counts30d = Object.fromEntries(DONKI_TYPES.map((t, i) => [t, res[i].list.length]));
    const recent = res
      .flatMap((r, i) => r.list.slice(-2).map((e) => ({ type: DONKI_TYPES[i], id: e.flrID || e.activityID || e.sepID || e.gstID, time: e.peakTime || e.startTime || e.eventTime || e.beginTime, class: e.classType, link: e.link })))
      .sort((a, b) => String(b.time).localeCompare(String(a.time)));
    const out = { status: "live", window30d: [iso(start), iso(end)], counts30d, total30d: Object.values(counts30d).reduce((a, b) => a + b, 0), recent, host: res[0].host, generatedAt: new Date().toISOString(), source, errors: [] };
    if (includeYear) {
      out.counts365d = {};
      for (const t of DONKI_TYPES) {
        let n = 0;
        for (let a = new Date(end.getTime() - 365 * 86400e3); a < end; a = new Date(a.getTime() + 60 * 86400e3)) {
          const b = new Date(Math.min(a.getTime() + 59 * 86400e3, end.getTime()));
          n += (await events(t, iso(a), iso(b), ttl)).list.length;
        }
        out.counts365d[t] = n;
      }
    }
    return out;
  } catch (e) {
    const snap = nasaStatic()?.cache?.shared?.spaceWeather;
    if (snap) return { ...snap, status: "cached", errors: [`live DONKI failed: ${e.message}`] };
    return { status: "failed", window30d: [iso(start), iso(end)], counts30d: {}, total30d: null, recent: [], generatedAt: new Date().toISOString(), source, errors: [e.message] };
  }
}
