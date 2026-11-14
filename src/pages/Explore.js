// #/explore and #/explore/:planet/:mission — structured proposal form.

import { S } from "../strings.js";
import { esc, navigate } from "../util.js";
import { NavBar, FormStepper } from "../components/small.js";
import { renderStep, STEP_IDS } from "../components/ExplorerForm.js";
import { createWorldMap } from "../components/WorldMap.js";
import { emptyForm, formChecks, validateSubmission, MAX_TEXT } from "../services/validate.js";
import { runDataChecks } from "../services/dataChecks.js";
import { list as listCommunity, saveResult, newId } from "../services/communityStore.js";

const DRAFT_KEY = "analogAtlas.draft.v1";

export function loadDraft() {
  try {
    const d = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || "null");
    if (d && d.form) return d;
  } catch {
    /* ignore */
  }
  return null;
}
export function saveDraft(d) {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(d));
  } catch {
    /* ignore */
  }
}
export function clearDraft() {
  try {
    sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

function setPath(obj, path, value) {
  const keys = path.split(".");
  let o = obj;
  for (const k of keys.slice(0, -1)) o = o[k];
  o[keys.at(-1)] = value;
}

export function Explore(root, { params }, data) {
  const draft = loadDraft() || { step: 0, form: emptyForm() };
  const [pPlanet, pMission] = params;
  if (data.planets.includes(pPlanet) && data.missionById[pMission]) {
    // coming from a card: preset target, keep other answers
    draft.form.planet = pPlanet;
    draft.form.mission = pMission;
  }
  saveDraft(draft);

  let miniMap = null;
  let marker = null;
  let busy = false;

  function errorsHtml(checks) {
    const fails = checks.filter((c) => c.status === "fail");
    return fails.length
      ? `<div class="errors" role="alert"><strong>${esc(S.fixErrors)}</strong><ul>${fails.map((f) => `<li>${esc(f.message)}</li>`).join("")}</ul></div>`
      : "";
  }

  function render(errors = "") {
    if (miniMap) {
      miniMap.remove();
      miniMap = null;
      marker = null;
    }
    const stepId = STEP_IDS[draft.step];
    const last = draft.step === STEP_IDS.length - 1;
    root.innerHTML = `<div class="explore">
      ${NavBar("explore")}
      <main class="page narrow">
        <h1>${esc(S.exploreHeading)}</h1>
        <p class="muted">${esc(S.exploreIntro)}</p>
        ${FormStepper(S.formSteps, draft.step)}
        <form id="xform" novalidate>
          <div id="errors">${errors}</div>
          ${renderStep(stepId, draft.form, data)}
          <div id="busy" class="busy" hidden>${esc(S.checking)}</div>
          <nav class="sim-nav">
            <button type="button" class="btn btn-outline" id="back" ${draft.step === 0 ? "disabled" : ""}>${esc(S.back)}</button>
            <button type="submit" class="btn btn-primary" id="next">${esc(last ? S.checkProposal : S.next)}</button>
          </nav>
        </form>
      </main>
    </div>`;
    bind(stepId);
  }

  function bind(stepId) {
    const formEl = root.querySelector("#xform");
    formEl.querySelectorAll("[data-field]").forEach((el) => {
      const handler = () => {
        if (el.type === "radio" && !el.checked) return;
        setPath(draft.form, el.dataset.field, el.value);
        saveDraft(draft);
        if (el.type === "radio") {
          el.closest(".opt-row").querySelectorAll(".opt").forEach((o) => o.classList.toggle("on", o.contains(el)));
        }
        const counter = formEl.querySelector(`[data-counter="${el.dataset.field}"]`);
        if (counter) counter.textContent = S.chars(el.value.length, MAX_TEXT);
        if ((el.dataset.field === "lat" || el.dataset.field === "lon") && marker) syncMarkerFromInputs();
      };
      el.addEventListener("input", handler);
      el.addEventListener("change", handler);
    });

    root.querySelector("#back").addEventListener("click", () => {
      draft.step = Math.max(0, draft.step - 1);
      saveDraft(draft);
      render();
    });

    formEl.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (busy) return;
      const last = draft.step === STEP_IDS.length - 1;
      const checks = await formChecks(draft.form, { step: stepId });
      if (checks.some((c) => c.status === "fail")) {
        root.querySelector("#errors").innerHTML = errorsHtml(checks);
        root.querySelector("#errors").scrollIntoView({ block: "nearest" });
        return;
      }
      if (!last) {
        draft.step++;
        saveDraft(draft);
        render();
        window.scrollTo(0, 0);
        return;
      }
      busy = true;
      root.querySelector("#busy").hidden = false;
      root.querySelector("#next").disabled = true;
      const community = await listCommunity();
      const result = await validateSubmission(draft.form, data, community, runDataChecks);
      busy = false;
      if (result.blocked) {
        root.querySelector("#busy").hidden = true;
        root.querySelector("#next").disabled = false;
        root.querySelector("#errors").innerHTML = errorsHtml(result.formChecks);
        return;
      }
      const id = draft.form._editingId || newId("sub");
      const form = { ...draft.form };
      delete form._editingId;
      await saveResult({ id, createdAt: new Date().toISOString(), nickname: form.nickname.trim(), form, result, published: false });
      draft.form._editingId = id;
      saveDraft(draft);
      navigate(`#/explore/result/${id}`);
    });

    if (stepId === "location") initMiniMap();
  }

  function syncMarkerFromInputs() {
    const lat = Number(draft.form.lat), lon = Number(draft.form.lon);
    if (draft.form.lat === "" || draft.form.lon === "" || !Number.isFinite(lat) || !Number.isFinite(lon)) return;
    if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return;
    marker.setLatLng([lat, lon]).addTo(miniMap);
  }

  function initMiniMap() {
    const L = window.L;
    miniMap = createWorldMap(root.querySelector("#mini-map"), { minZoom: 1 });
    marker = L.marker([0, 0], {
      draggable: true,
      keyboard: true,
      icon: L.divIcon({ className: "site-marker", html: `<span class="dot dot-pin"></span>`, iconSize: [22, 22], iconAnchor: [11, 11] }),
    });
    const setFromLatLng = (ll) => {
      draft.form.lat = ll.lat.toFixed(4);
      draft.form.lon = ll.lng.toFixed(4);
      root.querySelector('[data-field="lat"]').value = draft.form.lat;
      root.querySelector('[data-field="lon"]').value = draft.form.lon;
      saveDraft(draft);
    };
    miniMap.on("click", (e) => {
      marker.setLatLng(e.latlng).addTo(miniMap);
      setFromLatLng(e.latlng);
    });
    marker.on("dragend", () => setFromLatLng(marker.getLatLng()));
    if (draft.form.lat !== "" && draft.form.lon !== "") {
      syncMarkerFromInputs();
      if (miniMap.hasLayer(marker)) miniMap.setView(marker.getLatLng(), 5);
    }
  }

  render();
  return () => {
    if (miniMap) miniMap.remove();
  };
}
