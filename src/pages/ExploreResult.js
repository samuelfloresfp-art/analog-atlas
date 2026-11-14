// #/explore/result/:id — result of the proposal check.

import { S } from "../strings.js";
import { esc, navigate } from "../util.js";
import { NavBar, StatusBadge } from "../components/small.js";
import { CheckTable } from "../components/CheckTable.js";
import { hydrateCriteria } from "../services/validate.js";
import { getResult, saveResult, add } from "../services/communityStore.js";
import { saveDraft, clearDraft } from "./Explore.js";

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

  const render = (msg = "") => {
    root.innerHTML = `${NavBar("explore")}
    <main class="page narrow" style="--accent:${mission.accent}">
      <h1>${esc(S.resultHeading)}: ${esc(form.name)}</h1>
      <p class="muted">${esc(S.planetNames[form.planet])} · ${esc(mission.name)} · ${Number(form.lat).toFixed(3)}, ${Number(form.lon).toFixed(3)}</p>
      <div class="result-head">
        ${StatusBadge(result.status)}
        <div class="score-big"><span>${result.score}</span>/ 100 <span class="small muted">${esc(S.score)}</span></div>
      </div>
      <p class="small muted">${esc(S.statusHint[result.status])} ${esc(S.scoreExplain)}</p>
      <p class="notice">${esc(S.disclaimer)}</p>
      <h2>${esc(S.checksTitle)}</h2>
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
      saveDraft({ step: 0, form: { ...form, _editingId: entry.id } });
      navigate("#/explore");
    });
    root.querySelector("#restart").addEventListener("click", () => {
      clearDraft();
      navigate("#/explore");
    });
  };
  render();
}
