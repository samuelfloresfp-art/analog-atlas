import { S } from "../strings.js";
import { esc } from "../util.js";
import { siteStatus } from "../services/status.js";
import { scoreRun, coveredRoles } from "../services/scoring.js";
import { saveRun, newRunId } from "../services/stats.js";
import { Stepper, ConfidenceTag } from "../components/small.js";
import { ResearcherCard } from "../components/ResearcherCard.js";

const RUN_MS = 5000;
const STEP = { briefing: 0, team: 1, vehicle: 2, conditions: 3, run: 4, complete: 5 };

export function Simulation(root, { params }, data) {
  const mission = data.missionById[params[0]];
  const site = data.siteById[params[1]];
  if (!mission || !site) {
    root.innerHTML = `<main class="page"><p>${esc(S.notFound)}</p><a href="#/">${esc(S.backHome)}</a></main>`;
    return;
  }
  const status = siteStatus(site, mission.id);
  if (status !== "green" && status !== "star") {
    root.innerHTML = `<main class="page"><p>${esc(S.notViable)}</p><a class="btn" href="#/mission/${mission.id}?site=${site.id}">${esc(S.back)}</a></main>`;
    return;
  }

  const state = { step: 0, team: [], vehicleId: null, conditions: {}, result: null, runId: null };
  let timer = null;
  let raf = null;

  // Researchers from the site's continent first.
  const researchers = [...data.researchers].sort(
    (a, b) => (b.continent === site.continent) - (a.continent === site.continent) || a.name.localeCompare(b.name)
  );
  const roleLabel = Object.fromEntries(mission.roles.map((r) => [r.id, r.label]));
  const teamObjs = () => state.team.map((id) => data.researcherById[id]);

  function canNext() {
    switch (state.step) {
      case STEP.team:
        return state.team.length >= mission.teamSize.min && state.team.length <= mission.teamSize.max;
      case STEP.vehicle:
        return !!state.vehicleId;
      case STEP.conditions:
        return mission.conditions.every((g) => state.conditions[g.id]);
      default:
        return true;
    }
  }

  function briefing() {
    return `<section class="sim-grid">
      <div class="panel">
        <h2>${esc(S.briefingHow(mission.name))} ${ConfidenceTag(mission.confidence)}</h2>
        <p>${esc(mission.briefing)}</p>
        <h3>${esc(S.siteNeeds)}</h3>
        <ul>${mission.siteNeeds.map((n) => `<li>${esc(n)}</li>`).join("")}</ul>
      </div>
      <div class="panel">
        <h2>${esc(S.briefingWhy)} ${ConfidenceTag(site.confidence)}</h2>
        <p class="mirrors">${esc(site.mirrors)}</p>
        <p>${esc(site.suitability[mission.id].why)}</p>
        <ul>${site.whyAnalog.map((w) => `<li>${esc(w)}</li>`).join("")}</ul>
      </div>
    </section>`;
  }

  function team() {
    const roles = coveredRoles(mission, teamObjs());
    const full = state.team.length >= mission.teamSize.max;
    return `<section>
      <h2>${esc(S.chooseTeam)}</h2>
      <p class="muted">${esc(S.teamHint(mission.teamSize.min, mission.teamSize.max))} <strong>${esc(S.teamSelected(state.team.length))}</strong></p>
      <div class="roles-bar"><span class="small muted">${esc(S.rolesCovered)}:</span>
        ${roles.map((r) => `<span class="role-pill ${r.covered ? "on" : ""}">${r.covered ? "✓" : "○"} ${esc(r.label)}</span>`).join("")}
      </div>
      <div class="researcher-grid">${researchers
        .map((r) => {
          const selected = state.team.includes(r.id);
          return ResearcherCard(r, {
            selected,
            near: r.continent === site.continent,
            roleLabels: r.roles.filter((id) => roleLabel[id]).map((id) => roleLabel[id]),
            disabled: full && !selected,
          });
        })
        .join("")}</div>
    </section>`;
  }

  function vehicle() {
    return `<section>
      <h2>${esc(S.chooseVehicle)}</h2>
      <div class="choice-grid">${mission.vehicles
        .map(
          (v) => `<button type="button" class="choice ${state.vehicleId === v.id ? "selected" : ""}" data-vid="${v.id}" aria-pressed="${state.vehicleId === v.id}">
            <span class="choice-title">${esc(v.name)}</span>
            <span class="small muted">${esc(v.description)}</span>
            <dl class="attrs">${v.attributes.map((a) => `<dt>${esc(a.label)}</dt><dd>${esc(a.value)}</dd>`).join("")}</dl>
            <span class="small"><strong>${esc(S.tradeoff)}:</strong> ${esc(v.tradeoff)}</span>
          </button>`
        )
        .join("")}</div>
    </section>`;
  }

  function conditions() {
    return `<section>
      <h2>${esc(S.chooseConditions)}</h2>
      ${mission.conditions
        .map(
          (g) => `<fieldset class="cond-group"><legend>${esc(g.label)}</legend>
            <div class="choice-grid">${g.options
              .map(
                (o) => `<button type="button" class="choice choice-small ${state.conditions[g.id] === o.id ? "selected" : ""}" data-gid="${g.id}" data-oid="${o.id}" aria-pressed="${state.conditions[g.id] === o.id}">
                  <span class="choice-title">${esc(o.label)}</span>
                  <span class="small muted">${esc(o.description)}</span>
                </button>`
              )
              .join("")}</div>
          </fieldset>`
        )
        .join("")}
    </section>`;
  }

  function run() {
    const video = mission.videoUrl
      ? `<video src="${esc(mission.videoUrl)}" autoplay muted playsinline></video>`
      : `<span>${esc(S.videoPlaceholder)}</span>`;
    return `<section>
      <h2>${esc(S.run)}…</h2>
      <div class="video-box">${video}</div>
      <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div class="progress-fill"></div></div>
    </section>`;
  }

  function complete() {
    const r = state.result;
    return `<section class="complete">
      <h2 class="congrats">${esc(S.complete)}</h2>
      <p class="muted">${esc(mission.name)} · ${esc(site.name)}</p>
      <div class="score-big"><span>${r.total}</span>/ ${r.max}</div>
      <p class="notice">${esc(S.scoreDisclaimer)}</p>
      <table class="score-table"><tbody>${r.parts
        .map((p) => `<tr><th scope="row">${esc(p.label)}</th><td class="num">${p.points}/${p.max}</td><td class="small muted">${esc(p.explanation)}</td></tr>`)
        .join("")}</tbody></table>
      <div class="m-actions"><a class="btn btn-primary btn-big" href="#/results/${state.runId}">${esc(S.seeResults)}</a></div>
    </section>`;
  }

  function startRun() {
    const fill = root.querySelector(".progress-fill");
    const bar = root.querySelector(".progress");
    const t0 = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / RUN_MS);
      fill.style.width = `${p * 100}%`;
      bar.setAttribute("aria-valuenow", String(Math.round(p * 100)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    timer = setTimeout(finish, RUN_MS);
  }

  async function finish() {
    const vehicleObj = mission.vehicles.find((v) => v.id === state.vehicleId);
    state.result = scoreRun({ mission, site, team: teamObjs(), vehicle: vehicleObj, conditions: state.conditions });
    state.runId = newRunId();
    await saveRun({
      id: state.runId,
      mission: mission.id,
      siteId: site.id,
      vehicleId: state.vehicleId,
      researcherIds: [...state.team],
      conditions: { ...state.conditions },
      score: state.result.total,
      ts: Date.now(),
    });
    state.step = STEP.complete;
    render();
  }

  function render() {
    const body = [briefing, team, vehicle, conditions, run, complete][state.step]();
    const showNav = state.step < STEP.run;
    root.innerHTML = `<main class="sim page" style="--accent:${mission.accent}">
      <header class="sim-header">
        <a href="#/mission/${mission.id}?site=${site.id}" class="small">← ${esc(S.cancel)}</a>
        <h1>${esc(mission.name)} · ${esc(site.name)}</h1>
        ${Stepper(state.step)}
      </header>
      <div class="sim-body">${body}</div>
      ${
        showNav
          ? `<nav class="sim-nav">
              <button type="button" class="btn btn-outline" id="back" ${state.step === 0 ? "disabled" : ""}>${esc(S.back)}</button>
              <button type="button" class="btn btn-primary" id="next" ${canNext() ? "" : "disabled"}>${esc(S.next)}</button>
            </nav>`
          : ""
      }
    </main>`;

    root.querySelector("#back")?.addEventListener("click", () => {
      state.step--;
      render();
    });
    root.querySelector("#next")?.addEventListener("click", () => {
      if (!canNext()) return;
      state.step++;
      render();
      window.scrollTo(0, 0);
    });
    root.querySelectorAll("[data-rid]").forEach((el) =>
      el.addEventListener("click", () => {
        const id = el.dataset.rid;
        state.team = state.team.includes(id) ? state.team.filter((x) => x !== id) : [...state.team, id];
        keepScroll(render);
        root.querySelector(`[data-rid="${id}"]`)?.focus();
      })
    );
    root.querySelectorAll("[data-vid]").forEach((el) =>
      el.addEventListener("click", () => {
        state.vehicleId = el.dataset.vid;
        keepScroll(render);
        root.querySelector(`[data-vid="${el.dataset.vid}"]`)?.focus();
      })
    );
    root.querySelectorAll("[data-gid]").forEach((el) =>
      el.addEventListener("click", () => {
        state.conditions[el.dataset.gid] = el.dataset.oid;
        keepScroll(render);
        root.querySelector(`[data-gid="${el.dataset.gid}"][data-oid="${el.dataset.oid}"]`)?.focus();
      })
    );
    if (state.step === STEP.run) startRun();
  }

  render();

  return () => {
    clearTimeout(timer);
    cancelAnimationFrame(raf);
  };
}

function keepScroll(fn) {
  const y = window.scrollY;
  fn();
  window.scrollTo(0, y);
}
