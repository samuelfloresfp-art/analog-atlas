// Game score (NOT science). Transparent rules, max 100:
//   Role coverage   40 pts  = 40 × (recommended roles covered / total roles)
//   Vehicle fit     30 pts  = 30 if vehicle.bestFor shares an environment with the site, else 12
//   Conditions      30 pts  = sum of chosen option points (each group max 10), scaled to 30

import { S } from "../strings.js";

export const SCORE_WEIGHTS = { roles: 40, vehicle: 30, vehicleNoFit: 12, conditions: 30 };

export function coveredRoles(mission, team) {
  const teamRoles = new Set(team.flatMap((r) => r.roles));
  return mission.roles.map((role) => ({ ...role, covered: teamRoles.has(role.id) }));
}

export function scoreRun({ mission, site, team, vehicle, conditions }) {
  const parts = [];

  const roles = coveredRoles(mission, team);
  const covered = roles.filter((r) => r.covered).length;
  const rolePts = Math.round((SCORE_WEIGHTS.roles * covered) / roles.length);
  parts.push({
    label: S.scoreRoles,
    points: rolePts,
    max: SCORE_WEIGHTS.roles,
    explanation: S.scoreRolesExplain(covered, roles.length, roles.filter((r) => !r.covered).map((r) => r.label)),
  });

  const overlap = vehicle.bestFor.filter((e) => site.environment.includes(e));
  parts.push({
    label: S.scoreVehicle,
    points: overlap.length ? SCORE_WEIGHTS.vehicle : SCORE_WEIGHTS.vehicleNoFit,
    max: SCORE_WEIGHTS.vehicle,
    explanation: overlap.length ? S.scoreVehicleFit(overlap.join(", ")) : S.scoreVehicleNoFit,
  });

  let sum = 0;
  let max = 0;
  const notes = [];
  for (const group of mission.conditions) {
    const opt = group.options.find((o) => o.id === conditions[group.id]);
    const groupMax = Math.max(...group.options.map((o) => o.points));
    max += groupMax;
    sum += opt ? opt.points : 0;
    notes.push(`${group.label}: ${opt ? opt.label : "—"} (${opt ? opt.points : 0}/${groupMax})`);
  }
  parts.push({
    label: S.scoreConditions,
    points: Math.round((SCORE_WEIGHTS.conditions * sum) / max),
    max: SCORE_WEIGHTS.conditions,
    explanation: S.scoreConditionsExplain(notes),
  });

  return { total: parts.reduce((a, p) => a + p.points, 0), max: 100, parts };
}
