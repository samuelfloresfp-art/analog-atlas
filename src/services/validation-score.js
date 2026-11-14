// Community validation score (Phase 3 – B). Transparent rules, shown on screen.
// Every weight lives in SCORE_CONFIG — edit here, the page and the "How the score works" table follow.
// This is a game score / community check, NOT peer review.

import { haversineKm } from "./geo.js";

export const DIMENSIONS = ["geology", "terrain", "atmosphere", "temperature", "water", "biology", "subsurface", "operational"];
export const LEVELS = ["strong", "partial", "weak", "nodata"];
const LEVEL_RANK = { strong: 2, partial: 1, weak: 0 };
/** Indicators with the same value for every Earth site (ISS dose, DONKI) are context, never scored. */
export const NOT_SITE_SPECIFIC = ["radiation_gap", "space_weather"];

export const SCORE_CONFIG = {
  max: 100,
  coordinateOnLand: 10,
  agreeSame: 8,
  agreeOneOff: 4,
  agreeOpposite: -4,
  evidencePerDimension: 3,
  evidenceMax: 15,
  lacksMinItems: 2,
  lacksBonus: 5,
  missionUnjustified: -10,
  noveltyBonus: 10,
  noveltyMinKm: 25,
  autoCheckedMin: 60,
  // Classic analog regions never earn novelty (center + radius, rough team choice).
  classicRegions: [
    { name: "Atacama", lat: -24.1, lon: -69.9, radiusKm: 450 },
    { name: "Haughton / Devon Island", lat: 75.38, lon: -89.68, radiusKm: 250 },
    { name: "Iceland", lat: 65.0, lon: -18.5, radiusKm: 350 },
    { name: "Hawai'i", lat: 19.6, lon: -155.49, radiusKm: 350 },
    { name: "Antarctica", latBelow: -60 },
  ],
};

export const NICK_RE = /^[A-Za-z0-9][A-Za-z0-9 _.-]{1,18}[A-Za-z0-9]$/;
const EMAIL_RE = /[^\s@]+@[^\s@]+\.[^\s@]+/;
const PHONE_RE = /\+?\d[\d\s().-]{8,}\d/;

export function looksPersonal(text) {
  return EMAIL_RE.test(text || "") || PHONE_RE.test(text || "");
}

/** "doi:10.1/x", "https://doi.org/10.1/x" or "10.1/x" → "10.1/x"; else null. */
export function normalizeDoi(s) {
  const m = String(s || "").trim().match(/^(?:doi:\s*|https?:\/\/(?:dx\.)?doi\.org\/)?(10\.\d{4,9}\/\S+)$/i);
  return m ? m[1] : null;
}

/**
 * Checks that an evidence link exists — NOT its content.
 * DOI: valid format is enough. URL: a no-cors GET that does not throw counts as "responds"
 * (browsers hide status codes of cross-origin no-cors requests).
 */
export async function evidenceResponds(ref, timeoutMs = 6000) {
  if (normalizeDoi(ref)) return { ok: true, how: "DOI format valid" };
  let url;
  try {
    url = new URL(String(ref).trim());
    if (!/^https?:$/.test(url.protocol)) return { ok: false, how: "not http(s)" };
  } catch {
    return { ok: false, how: "not a URL or DOI" };
  }
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    await fetch(url.href, { method: "GET", mode: "no-cors", signal: ctrl.signal, cache: "no-store" });
    return { ok: true, how: "URL responded" };
  } catch (e) {
    return { ok: false, how: e.name === "AbortError" ? "URL timed out" : "URL did not respond" };
  } finally {
    clearTimeout(t);
  }
}

export function isClassicRegion(lat, lon, cfg = SCORE_CONFIG) {
  return cfg.classicRegions.find((r) => (r.latBelow != null ? lat < r.latBelow : haversineKm(lat, lon, r.lat, r.lon) <= r.radiusKm)) || null;
}

/** Blocking problems (the contribution cannot be submitted). Returns string[]. */
export function blockers(c, report) {
  const out = [];
  if (!NICK_RE.test(c.nickname || "") || looksPersonal(c.nickname)) out.push("Public nickname: 3–20 letters, digits, space, _ . - (no e-mail or phone).");
  if (!c.planet || !c.mission) out.push("Choose the target (Moon or Mars) and the mission.");
  if (c.mode === "existing" && !c.siteId) out.push("Choose the site you are validating.");
  if (c.mode === "proposal" && !(c.site?.name || "").trim()) out.push("Give the new site a name.");
  if (report) {
    if (!report.basic.inRange) out.push("Coordinates out of range: latitude must be in [−90, 90] and longitude in [−180, 180].");
    else if (report.basic.onLand === false) out.push("This point looks like open ocean. Pick a point on land.");
  }
  const lacks = (c.lacks || []).filter((x) => x.trim());
  if (lacks.length < SCORE_CONFIG.lacksMinItems) out.push(`"What it lacks": add at least ${SCORE_CONFIG.lacksMinItems} items — where does the analogy fail?`);
  const texts = [c.site?.name, c.mirrorFeature, ...lacks, ...DIMENSIONS.map((d) => c.dimensions?.[d]?.note), ...Object.values(c.requirements || {}).map((r) => r.justification)];
  if (texts.some(looksPersonal)) out.push("Remove anything that looks like an e-mail or phone number.");
  return out;
}

/** User level × data-suggested level, one row per indicator with a suggestion. */
export function agreementRows(c, report) {
  if (!report) return [];
  return report.indicators
    .filter((i) => i.suggestedLevel !== "nodata" && !NOT_SITE_SPECIFIC.includes(i.key))
    .map((i) => {
      const user = c.dimensions?.[i.dimension]?.level || "nodata";
      let points = 0, verdict = "not compared";
      if (user !== "nodata") {
        const d = Math.abs(LEVEL_RANK[user] - LEVEL_RANK[i.suggestedLevel]);
        [points, verdict] = d === 0 ? [SCORE_CONFIG.agreeSame, "same level"] : d === 1 ? [SCORE_CONFIG.agreeOneOff, "one level apart"] : [SCORE_CONFIG.agreeOpposite, "opposite (strong × weak)"];
      }
      return { indicator: i, user, points, verdict, strongConflict: points === SCORE_CONFIG.agreeOpposite };
    });
}

/**
 * Full score. Async because evidence links are probed.
 * @returns {{score:number, lines:{label:string,points:number,note:string}[], blocked:string[], strongConflict:boolean, status:string}}
 */
export async function computeScore(c, report, combo, cfg = SCORE_CONFIG) {
  const lines = [];
  const add = (label, points, note = "") => lines.push({ label, points, note });
  const blocked = blockers(c, report);

  // 1. coordinate
  const b = report?.basic;
  if (b?.inRange && b.onLand === true) add("Valid coordinate on land", cfg.coordinateOnLand, "Range check + MODIS land cover (not water).");
  else if (b?.inRange && b.onLand == null && b.landMask === "land") add("Valid coordinate on land", cfg.coordinateOnLand, "Range check + Natural Earth land mask (MODIS land cover did not answer in time).");
  else add("Valid coordinate on land", 0, b?.onLand == null ? "Land could not be confirmed." : "Out of range or not on land (blocks submission).");

  // 2. agreement with NASA data
  const rows = agreementRows(c, report);
  for (const r of rows)
    add(`NASA data agreement — ${r.indicator.key} (${r.indicator.dimension})`, r.points, `You: ${r.user}; data suggests: ${r.indicator.suggestedLevel} (${r.verdict}).`);
  if (!rows.length) add("NASA data agreement", 0, "No indicator with a data-suggested level for this point.");

  // 3. evidence
  let ev = 0;
  for (const d of DIMENSIONS) {
    const ref = (c.dimensions?.[d]?.url || "").trim();
    if (!ref) continue;
    const r = c._evidenceCache?.[ref] || (await evidenceResponds(ref));
    if (c._evidenceCache) c._evidenceCache[ref] = r;
    const pts = r.ok && ev < cfg.evidenceMax ? Math.min(cfg.evidencePerDimension, cfg.evidenceMax - ev) : 0;
    ev += pts;
    add(`Evidence link — ${d}`, pts, `${r.how}. Only existence is checked, not content.`);
  }
  if (!ev && !lines.some((l) => l.label.startsWith("Evidence"))) add("Evidence links", 0, "No dataset URL/DOI given.");

  // 4. what it lacks
  const lacks = (c.lacks || []).filter((x) => x.trim()).length;
  add('"What it lacks" (≥ 2 items)', lacks >= cfg.lacksMinItems ? cfg.lacksBonus : 0, `${lacks} item(s).${lacks < cfg.lacksMinItems ? " Blocks submission." : ""}`);

  // 5. mission coherence
  const failing = report?.missionFit?.failingRequirements || [];
  const required = (combo?.rules || []).filter((r) => r.required);
  let unjustified = 0;
  for (const label of failing) {
    const rule = required.find((r) => r.label === label);
    const answer = rule ? c.requirements?.[rule.id] : null;
    if (answer?.ok && !(answer.justification || "").trim()) {
      unjustified++;
      add(`Mission requirement — ${label}`, cfg.missionUnjustified, "Marked as met, but data says it fails and no justification was given.");
    } else {
      add(`Mission requirement — ${label}`, 0, answer?.ok ? "Data says it fails; your justification was recorded for review." : "Data says it fails; you did not claim it is met.");
    }
  }
  if (!failing.length) add("Mission requirements vs data", 0, report?.missionFit ? "No requirement contradicted by the data checked." : "Not checked.");

  // 6. novelty (new proposals only)
  if (c.mode === "proposal" && b?.inRange) {
    const classic = isClassicRegion(c.site.lat, c.site.lon, cfg);
    const far = b.nearestKnownSiteKm == null || b.nearestKnownSiteKm > cfg.noveltyMinKm;
    const pts = far && !classic ? cfg.noveltyBonus : 0;
    add(
      "Novelty (new site)",
      pts,
      classic ? `Inside a classic analog region (${classic.name}).` : far ? `${b.nearestKnownSiteKm ?? "?"} km from the nearest known site.` : `Only ${b.nearestKnownSiteKm} km from a known site (${b.nearestKnownSiteId}).`
    );
  }

  const raw = lines.reduce((s, l) => s + l.points, 0);
  const score = Math.max(0, Math.min(cfg.max, raw));
  const strongConflict = rows.some((r) => r.strongConflict) || unjustified > 0;
  const status = blocked.length ? "blocked" : score >= cfg.autoCheckedMin && !strongConflict ? "auto-checked" : "needs-review";
  return { score, raw, lines, blocked, strongConflict, status };
}

/** Rule table for the "How the score works" panel. */
export function scoreRulesTable(cfg = SCORE_CONFIG) {
  return [
    ["Valid coordinate on land", `+${cfg.coordinateOnLand}`, "Out of range or open ocean blocks submission."],
    ["Agreement with NASA data (per indicator)", `+${cfg.agreeSame} same · +${cfg.agreeOneOff} one level off · ${cfg.agreeOpposite} opposite`, "Only indicators with a data-suggested level. Dimensions without one neither gain nor lose."],
    ["Evidence link per dimension", `+${cfg.evidencePerDimension} (max +${cfg.evidenceMax})`, "URL that responds or DOI in a valid format. Content is NOT checked."],
    [`"What it lacks" with ≥ ${cfg.lacksMinItems} items`, `+${cfg.lacksBonus}`, "Fewer items blocks submission."],
    ["Mission requirement marked as met, but data says it fails, without justification", `${cfg.missionUnjustified} each`, ""],
    ["Novelty: new site > " + cfg.noveltyMinKm + " km from any known site", `+${cfg.noveltyBonus}`, "Classic regions (Atacama, Haughton, Iceland, Hawai'i, Antarctica) never earn novelty."],
    ["Status", `Auto-checked ≥ ${cfg.autoCheckedMin}`, "Below that, or with a strong conflict → Needs review. Team-confirmed is set by the team."],
  ];
}
