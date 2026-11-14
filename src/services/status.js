// Learning-map marker state (computed, never typed by hand):
//   validated = history has an entry with the same planet AND mission
//   candidate = no such entry, but passes every REQUIRED rule of criteria.json
//   null      = fails a required rule -> hidden

import { getCombo, evaluateRules, requiredNotFailed } from "./criteria.js";

export function hasHistory(site, planet, mission) {
  return site.history.some((h) => h.planet === planet && h.mission === mission);
}

/** @returns {"validated"|"candidate"|null} */
export function siteState(data, site, planet, mission) {
  if (hasHistory(site, planet, mission)) return "validated";
  const results = evaluateRules(getCombo(data, planet, mission), site.attributes, site.lat);
  return requiredNotFailed(results) ? "candidate" : null;
}

export function countsFor(data, planet, mission) {
  let validated = 0;
  let possible = 0;
  for (const s of data.sites) {
    const st = siteState(data, s, planet, mission);
    if (st === "validated") validated++;
    else if (st === "candidate") possible++;
  }
  return { validated, possible };
}

/** All planet×mission combos where a site is visible. Validated first. */
export function visibleCombos(data, site) {
  const out = [];
  for (const planet of data.planets)
    for (const m of data.missions) {
      const state = siteState(data, site, planet, m.id);
      if (state) out.push({ planet, mission: m, state });
    }
  return out.sort((a, b) => (a.state === "validated" ? -1 : 0) - (b.state === "validated" ? -1 : 0));
}
