// #/explore/result/:id — result of the proposal check.

import { S } from "../strings.js";
import { esc, navigate } from "../util.js";
import { NavBar, StatusBadge } from "../components/small.js";
import { CheckTable } from "../components/CheckTable.js";
import { hydrateCriteria } from "../services/validate.js";
import { getResult, saveResult, add } from "../services/communityStore.js";
import { saveDraft, clearDraft } from "./Explore.js";
import { MISSION_PHOTOS } from "./Home.js";
import { rankOptions } from "../services/validate.js";

export async function ExploreResult(root, { params }, data) {
  const entry = await getResult(params[0]);
  if (!entry) {
    root.innerHTML = `${NavBar("explore")}<main class="page"><p>${esc(S.resultNotFound)}</p><a class="btn" href="#/explore">${esc(S.navExplore)}</a></main>`;
    return;
  }
  const { form, result } = entry;
  const mission = data.missionById[form.mission];
  const criteria = hydrateCriteria(result, form, data);
  const notConsistent = result.status === "not-consistent";
  // older results (before the "best option" flow) are ranked on the fly
  const options = result.options || rankOptions(form, data, result.dataChecks || []);
  const ph = MISSION_PHOTOS[form.mission];
  const optName = (o) => `${data.missionById[o.mission].name} · ${S.planetNames[o.planet]}`;
  const bestHtml = `<section class="best-card" style="--accent:var(--${form.mission})">
      <img class="best-photo" src="${esc(ph.src)}" alt="" ${ph.fallback ? `onerror="if(this.dataset.f){this.remove()}else{this.dataset.f=1;this.src='${esc(ph.fallback)}'}"` : `onerror="this.remove()"`}/>
      <div class="best-shade"></div>
      <img class="best-planet" src="assets/planets/${form.planet}-2k.jpg" alt="${esc(S.planetNames[form.planet])}"/>
      <div class="best-body">
        <p class="eyebrow-mono">${esc(S.bestEyebrow)}</p>
        <h2>${esc(S.bestMsg(form.mission, form.planet))}</h2>
        ${notConsistent ? `<p class="small warn-text">${esc(S.bestWeak)}</p>` : ""}
        <div class="best-tags">${StatusBadge(result.status)}<span class="score-chip"><b>${result.score}</b>/100</span></div>
      </div>
      <span class="credit-line">${esc(S.credit(ph.credit))}</span>
    </section>
    <h2>${esc(S.otherOptions)}</h2>
    <ul class="opt-rank">${options
      .slice(1)
      .map(
        (o) => `<li style="--accent:var(--${o.mission})"><span class="or-name">${esc(optName(o))}</span>
          <span class="or-bar"><i style="width:${o.score}%"></i></span><span class="or-score mono">${o.score}</span>${StatusBadge(o.status)}</li>`
      )
      .join("")}</ul>`;

  const render = (msg = "") => {
    root.innerHTML = `${NavBar("explore")}
    <main class="page narrow" style="--accent:var(--${mission.id})">
      <h1>${esc(S.resultHeading)}: ${esc(form.name)}</h1>
      <p class="muted mono">${Number(form.lat).toFixed(3)}, ${Number(form.lon).toFixed(3)}</p>
      ${bestHtml}
      <h2>${esc(S.bestDetails)}: ${esc(optName(form))}</h2>
      <p class="small muted">${esc(S.statusHint[result.status])} ${esc(S.scoreExplain)}</p>
      <p class="notice">${esc(S.disclaimer)}</p>
      ${CheckTable(result, criteria, data)}
      ${
        result.improvements.length
          ? `<h2>${esc(S.improveTitle)}</h2><ul class="improve">${result.improvements.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>`
          : ""
      }
      <div id="msg">${msg}</div>
      <div class="m-actions">
        ${
          notConsistent
            ? `<button type="button" class="btn btn-primary" id="save-local" ${entry.savedLocally ? "disabled" : ""}>${esc(S.saveLocal)}</button>
               <span class="small muted">${esc(S.notConsistentNoPublish)}</span>`
            : `<button type="button" class="btn btn-primary" id="publish" ${entry.published ? "disabled" : ""}>${esc(S.publish)}</button>`
        }
        ${entry.published ? `<a class="btn btn-outline" href="#/community?sub=${entry.id}">${esc(S.viewOnCommunity)}</a>` : ""}
        <button type="button" class="btn btn-outline" id="edit">${esc(S.editAnswers)}</button>
        <button type="button" class="btn btn-outline" id="restart">${esc(S.startOver)}</button>
      </div>
    </main>`;

    root.querySelector("#publish")?.addEventListener("click", async () => {
      entry.published = true;
      entry.publishedAt = new Date().toISOString();
      await add({ ...entry });
      await saveResult(entry);
      clearDraft(); // next proposal starts fresh; "Edit answers" still works from this page
      render(`<p class="ok-msg">${esc(S.published)}</p>`);
    });
    root.querySelector("#save-local")?.addEventListener("click", async () => {
      entry.savedLocally = true;
      await saveResult(entry);
      clearDraft();
      render(`<p class="ok-msg">${esc(S.savedLocal)}</p>`);
    });
    root.querySelector("#edit").addEventListener("click", () => {
      saveDraft({ step: 0, form: { ...form, planet: "", mission: "", _editingId: entry.id } });
      navigate("#/explore");
    });
    root.querySelector("#restart").addEventListener("click", () => {
      clearDraft();
      navigate("#/explore");
    });
  };
  render();
}
