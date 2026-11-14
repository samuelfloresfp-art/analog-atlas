// Explorer proposal validation, 4 layers:
//   A. Form checks      [rule]
//   B. Criteria checks  [rule]   (criteria.json — same rules as the learning map)
//   C. Data checks      [NASA data / open data]  (async, optional, may be "not checked")
//   D. Novelty          [rule]
// Final status is never "validated"/"approved".

import { getCombo, evaluateRules, weightedScore, requiredNotFailed, requiredAllPass } from "./criteria.js";
import { haversineKm, landTest } from "./geo.js";
import { loadLandMask } from "./data.js";
import { hasHistory } from "./status.js";
import { NOVELTY_RADIUS_KM } from "../config.js";

export const MAX_TEXT = 400;
export const MAX_NICK = 30;
export const ATTR_FIELDS = ["topography", "slopeClass", "surface", "vegetation", "climate", "waterIce", "subsurface", "access", "isolation"];

export function emptyForm(planet = "", mission = "") {
  return {
    planet,
    mission,
    name: "",
    lat: "",
    lon: "",
    country: "",
    attrs: Object.fromEntries(ATTR_FIELDS.map((f) => [f, ""])),
    tempMin: "",
    tempMax: "",
    usedBefore: "",
    why: "",
    lacks: "",
    evidenceUrl: "",
    nickname: "",
  };
}

const EMAIL_RE = /[^\s@]+@[^\s@]+\.[^\s@]+/;
const PHONE_RE = /\+?\d[\d\s().-]{8,}\d/;

/** Layer A. Returns [{id,label,status:"pass"|"fail",message}] — async because of the land mask. */
export async function formChecks(form, { step } = {}) {
  const out = [];
  const add = (id, label, ok, message) => out.push({ id, label, origin: "rule", status: ok ? "pass" : "fail", message });
  const want = (s) => step == null || step === s;

  if (want("target")) {
    add("planet", "Planet selected", !!form.planet, "Choose Moon or Mars.");
    add("mission", "Mission selected", !!form.mission, "Choose Landing, Rover or Base.");
  }
  if (want("location")) {
    add("name", "Site name", form.name.trim().length > 0, "Give the site a name.");
    const lat = Number(form.lat), lon = Number(form.lon);
    const latOk = form.lat !== "" && Number.isFinite(lat) && lat >= -90 && lat <= 90;
    const lonOk = form.lon !== "" && Number.isFinite(lon) && lon >= -180 && lon <= 180;
    add("lat", "Latitude in [-90, 90]", latOk, "Latitude must be a number between -90 and 90.");
    add("lon", "Longitude in [-180, 180]", lonOk, "Longitude must be a number between -180 and 180.");
    if (latOk && lonOk) {
      try {
        const mask = await loadLandMask();
        const t = landTest(mask, lat, lon);
        add("land", "Point is on land (Natural Earth 110m mask)", t.onLand, "This point looks like open ocean. Move it onto land.");
      } catch {
        add("land", "Point is on land (mask not available)", true, "");
      }
    }
  }
  if (want("terrain")) for (const f of ["topography", "slopeClass", "surface", "vegetation"]) add(f, `${f} answered`, !!form.attrs[f], "Answer every terrain question.");
  if (want("environment")) {
    for (const f of ["climate", "waterIce", "subsurface"]) add(f, `${f} answered`, !!form.attrs[f], "Answer every environment question.");
    const hasMin = form.tempMin !== "", hasMax = form.tempMax !== "";
    if (hasMin || hasMax) {
      const ok = hasMin && hasMax && Number.isFinite(Number(form.tempMin)) && Number.isFinite(Number(form.tempMax)) && Number(form.tempMin) <= Number(form.tempMax);
      add("temp", "Temperature range valid", ok, "Give both min and max (°C), with min ≤ max — or leave both empty.");
    }
  }
  if (want("operations")) {
    for (const f of ["access", "isolation"]) add(f, `${f} answered`, !!form.attrs[f], "Answer every operations question.");
    add("usedBefore", "Previous tests answered", !!form.usedBefore, "Tell us if the site was already used for tests.");
  }
  if (want("reasoning")) {
    add("why", "“Why is it an analog?” filled", form.why.trim().length > 0 && form.why.length <= MAX_TEXT, `Required, up to ${MAX_TEXT} characters.`);
    add("lacks", "“What does it lack?” filled", form.lacks.trim().length > 0 && form.lacks.length <= MAX_TEXT, `Required, up to ${MAX_TEXT} characters.`);
    add("nickname", "Nickname length", form.nickname.length <= MAX_NICK, `Up to ${MAX_NICK} characters.`);
    const url = form.evidenceUrl.trim();
    add("evidenceUrl", "Evidence link format", !url || /^https?:\/\/\S+$/.test(url), "Use a full link starting with http:// or https://.");
    const text = `${form.why} ${form.lacks} ${form.nickname}`;
    add("personal", "No personal data in texts", !EMAIL_RE.test(text) && !PHONE_RE.test(text), "Remove e-mail addresses or phone numbers.");
  }
  return out;
}

/** Layer B. */
export function criteriaChecks(form, data) {
  const combo = getCombo(data, form.planet, form.mission);
  return evaluateRules(combo, form.attrs, Number(form.lat));
}

/** Layer D. */
export function noveltyCheck(form, data, community) {
  const lat = Number(form.lat), lon = Number(form.lon);
  let nearestKnown = null;
  for (const s of data.sites) {
    const d = haversineKm(lat, lon, s.lat, s.lon);
    const isKnown = s.history.length > 0; // already used for some simulation
    if (isKnown && (!nearestKnown || d < nearestKnown.km)) nearestKnown = { name: s.name, km: d, sameCombo: hasHistory(s, form.planet, form.mission) };
  }
  let nearestSub = null;
  for (const c of community) {
    if (c.id === form._editingId) continue;
    const d = haversineKm(lat, lon, Number(c.form.lat), Number(c.form.lon));
    if (!nearestSub || d < nearestSub.km) nearestSub = { name: c.form.name, km: d, id: c.id };
  }
  if (nearestKnown && nearestKnown.km < NOVELTY_RADIUS_KM)
    return { id: "novelty", origin: "rule", status: "known-area", message: `Known analog area: ${nearestKnown.name} is ${nearestKnown.km.toFixed(1)} km away.` };
  if (nearestSub && nearestSub.km < NOVELTY_RADIUS_KM)
    return { id: "novelty", origin: "rule", status: "duplicate", message: `Possible duplicate of community submission “${nearestSub.name}” (${nearestSub.km.toFixed(1)} km away).` };
  return {
    id: "novelty",
    origin: "rule",
    status: "new",
    message: `No known analog or submission within ${NOVELTY_RADIUS_KM} km${nearestKnown ? ` (nearest known: ${nearestKnown.name}, ${Math.round(nearestKnown.km)} km)` : ""}.`,
  };
}

/** Combines the layers into the final status. */
export function finalStatus(criteria, dataChecks) {
  const strong = dataChecks.some((c) => c.status === "mismatch-strong");
  if (!requiredNotFailed(criteria) || strong) return "not-consistent";
  const allData = dataChecks.length > 0 && dataChecks.every((c) => c.status === "consistent");
  if (requiredAllPass(criteria) && allData) return "plausible";
  return "needs-evidence";
}

function improvements(criteria, dataChecks, form, data) {
  const tips = [];
  for (const r of criteria) {
    if (r.result === "fail" && r.rule.required) tips.push(`Required rule failed — ${r.rule.label}: ${r.rule.explanation}`);
    else if (r.result !== "pass") tips.push(`Could improve — ${r.rule.label}: ${r.rule.explanation}`);
  }
  for (const c of dataChecks) {
    if (c.status === "not-checked") tips.push(`${c.label} was not checked (${c.note}). Re-run online or add an evidence link.`);
    else if (c.status.startsWith("mismatch")) tips.push(`Re-check your answer: ${c.note}`);
  }
  if (!form.evidenceUrl) tips.push("Add a public evidence link (paper, dataset, field report).");
  return tips;
}

/**
 * Full validation. `dataChecksFn` is injected so the page controls network use.
 * @returns result object stored with the submission.
 */
export async function validateSubmission(form, data, community, dataChecksFn) {
  const form_ = await formChecks(form);
  if (form_.some((c) => c.status === "fail")) return { blocked: true, formChecks: form_ };
  const criteria = criteriaChecks(form, data);
  const dataChecks = dataChecksFn ? await dataChecksFn(form) : [];
  const novelty = noveltyCheck(form, data, community);
  return {
    blocked: false,
    status: finalStatus(criteria, dataChecks),
    score: weightedScore(criteria),
    formChecks: form_,
    criteria: criteria.map((r) => ({ ruleId: r.rule.id, value: r.value, result: r.result })),
    dataChecks,
    novelty,
    improvements: improvements(criteria, dataChecks, form, data),
    checkedAt: new Date().toISOString(),
  };
}

/** Re-hydrates stored criteria results with their rule objects (rules may be edited later). */
export function hydrateCriteria(result, form, data) {
  const combo = getCombo(data, form.planet, form.mission);
  return combo.rules.map((rule) => {
    const saved = result.criteria.find((c) => c.ruleId === rule.id);
    return saved ? { rule, value: saved.value, result: saved.result } : { rule, value: undefined, result: "fail" };
  });
}
