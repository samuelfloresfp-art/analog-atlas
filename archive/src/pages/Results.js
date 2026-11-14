import { S } from "../strings.js";
import { esc } from "../util.js";
import { getRun, aggregate } from "../services/stats.js";
import { StatsBars } from "../components/small.js";

export async function Results(root, { params, query }, data) {
  const run = await getRun(params[0]);
  if (!run) {
    root.innerHTML = `<main class="page"><p>${esc(S.runNotFound)}</p>
      <a class="btn" href="#/">${esc(S.chooseAnotherMission)}</a></main>`;
    return;
  }
  const mission = data.missionById[run.mission];
  const site = data.siteById[run.siteId];
  const scope = query.get("scope") === "mission" ? "mission" : "site";
  const agg = await aggregate({ mission: run.mission, siteId: scope === "site" ? run.siteId : undefined });

  const vehicleName = Object.fromEntries(mission.vehicles.map((v) => [v.id, v.name]));
  const vehicles = agg.vehicles.map((v) => ({ label: vehicleName[v.id] || v.id, ...v, mine: v.id === run.vehicleId }));
  const researchers = agg.researchers.map((r) => ({
    label: data.researcherById[r.id]?.name || r.id,
    ...r,
    mine: run.researcherIds.includes(r.id),
  }));
  const groups = mission.conditions.map((g) => {
    const label = Object.fromEntries(g.options.map((o) => [o.id, o.label]));
    return StatsBars(
      S.methodStats(g.label),
      agg.conditions[g.id].map((o) => ({ label: label[o.id], ...o, mine: run.conditions[g.id] === o.id })),
      mission.accent
    );
  });

  const base = `#/results/${run.id}`;
  root.innerHTML = `<main class="page results" style="--accent:${mission.accent}">
    <header class="results-header">
      <a href="#/" class="home-link">${esc(S.appName)}</a>
      <h1>${esc(S.resultsTitle)}: ${esc(mission.name)} · ${esc(site?.name || run.siteId)}</h1>
      <p><span class="conf conf-assumption">${esc(S.simulatedStats)}</span>
        ${typeof run.score === "number" ? ` · ${esc(S.yourRun)}: <strong>${run.score}/100</strong>` : ""}</p>
      <div class="tabs" role="tablist">
        <a role="tab" aria-selected="${scope === "site"}" class="tab ${scope === "site" ? "on" : ""}" href="${base}">${esc(S.scopeSite)}</a>
        <a role="tab" aria-selected="${scope === "mission"}" class="tab ${scope === "mission" ? "on" : ""}" href="${base}?scope=mission">${esc(S.scopeMission)}</a>
      </div>
      <p class="muted small">${esc(S.runsCount(agg.total))}${scope === "site" && agg.total < 5 ? ` — ${esc(S.fewRuns)}` : ""}</p>
    </header>
    <div class="stats-grid">
      ${StatsBars(S.vehicleStats, vehicles, mission.accent)}
      ${groups.join("")}
      ${StatsBars(S.researcherStats, researchers, mission.accent)}
    </div>
    <div class="m-actions">
      <a class="btn btn-primary" href="#/mission/${mission.id}">${esc(S.tryAnotherSite)}</a>
      <a class="btn btn-outline" href="#/">${esc(S.chooseAnotherMission)}</a>
    </div>
    <footer class="footer">${esc(S.footer)}</footer>
  </main>`;
}
