// Applies src/data/criteria.json rules to a set of attributes.
// Used BOTH by the learning map (to place candidates) and by the explorer
// validation — the same rules the user learns are the ones that check them.

export function latitudeBand(lat) {
  const a = Math.abs(Number(lat));
  if (a > 60) return "polar";
  if (a >= 30) return "mid";
  return "low";
}

export function getCombo(data, planet, mission) {
  return data.criteria.combos[`${planet}.${mission}`];
}

export function enumLabel(data, field, id) {
  return data.criteria.enums[field]?.find((e) => e.id === id)?.label ?? id ?? "—";
}

export function fieldLabel(data, field) {
  return data.criteria.fieldLabels[field] || field;
}

/**
 * @returns {{rule:object, value:string, result:"pass"|"partial"|"fail"}[]}
 */
export function evaluateRules(combo, attrs, lat) {
  const values = { ...attrs, latitudeBand: latitudeBand(lat) };
  return combo.rules.map((rule) => {
    const value = values[rule.field];
    const result = rule.pass.includes(value) ? "pass" : rule.partial.includes(value) ? "partial" : "fail";
    return { rule, value, result };
  });
}

const POINTS = { pass: 1, partial: 0.5, fail: 0 };

/** Weighted score 0–100. */
export function weightedScore(results) {
  const total = results.reduce((a, r) => a + r.rule.weight, 0);
  const got = results.reduce((a, r) => a + r.rule.weight * POINTS[r.result], 0);
  return total ? Math.round((100 * got) / total) : 0;
}

/** True when no required rule fails (partial is allowed). */
export function requiredNotFailed(results) {
  return results.every((r) => !r.rule.required || r.result !== "fail");
}

/** True when every required rule fully passes. */
export function requiredAllPass(results) {
  return results.every((r) => !r.rule.required || r.result === "pass");
}
