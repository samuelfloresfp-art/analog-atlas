// #/explore and #/explore/:planet/:mission — structured proposal form.

import { S } from "../strings.js";
import { esc, navigate } from "../util.js";
import { NavBar, FormStepper, ExternalViewLinks } from "../components/small.js";
import { renderStep, STEP_IDS } from "../components/ExplorerForm.js";
import { createWorldMap } from "../components/WorldMap.js";
import { emptyForm, formChecks, validateSubmission, MAX_TEXT } from "../services/validate.js";
import { runDataChecks } from "../services/dataChecks.js";
import { scanTerrain, scanToCsv, downloadText, SLOPE_COLORS } from "../services/terrainScan.js";
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
  let scanLayer = null;
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
      scanLayer = null;
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
    updateLinks();
  }

  function updateLinks() {
    const el = root.querySelector("#ext-links");
    if (el) el.innerHTML = draft.form.lat !== "" && draft.form.lon !== "" ? ExternalViewLinks(draft.form.lat, draft.form.lon) : "";
  }

  // Terrain scan around the marker (grid of DEM slope cells). Click a cell to move the marker there.
  async function runScan(setFromLatLng) {
    const out = root.querySelector("#scan-out");
    const btn = root.querySelector("#scan-btn");
    const lat = Number(draft.form.lat), lon = Number(draft.form.lon);
    if (draft.form.lat === "" || draft.form.lon === "" || !Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 85 || Math.abs(lon) > 180) {
      out.innerHTML = `<p class="small warn">${esc(S.scanNeedPoint)}</p>`;
      return;
    }
    const L = window.L;
    btn.disabled = true;
    out.innerHTML = `<p class="busy">${esc(S.scanRunning)}</p>`;
    let scan;
    try {
      scan = await scanTerrain(lat, lon);
    } catch (e) {
      btn.disabled = false;
      out.innerHTML = `<p class="small warn">${esc(S.scanFailed(e.name === "AbortError" ? "timeout" : e.message))}</p>`;
      return;
    }
    btn.disabled = false;
    if (!miniMap) return; // user left the step meanwhile

    if (scanLayer) scanLayer.remove();
    scanLayer = L.layerGroup().addTo(miniMap);
    const moveTo = (c) => {
      const ll = L.latLng(c.lat, c.lon);
      marker.setLatLng(ll).addTo(miniMap);
      setFromLatLng(ll);
    };
    scan.cells.forEach((c) => {
      L.rectangle(c.bounds, { color: "#0a0d18", weight: 1, fillColor: SLOPE_COLORS[c.slopeClass], fillOpacity: 0.35 })
        .bindTooltip(S.scanCell(c.i, c.meanSlope.toFixed(1), c.maxSlope.toFixed(1), Math.round(c.reliefM)))
        .on("click", () => moveTo(c))
        .addTo(scanLayer);
    });
    L.rectangle(scan.bounds, { color: "#ffffff", weight: 1.5, dashArray: "5, 5", fill: false, interactive: false }).addTo(scanLayer);
    miniMap.fitBounds(scan.bounds, { padding: [20, 20] });

    const flat = scan.cells.filter((c) => c.meanSlope < 5).length;
    const best = [...scan.cells].sort((a, b) => a.meanSlope - b.meanSlope).slice(0, 3);
    out.innerHTML = `
      <p class="small"><strong>${esc(S.scanDone(flat, scan.cells.length))}</strong></p>
      <p class="scan-legend small">${esc(S.scanLegend)}: ${Object.entries(SLOPE_COLORS)
        .map(([k, col]) => `<span><i style="background:${col}"></i>${esc(k)}°</span>`)
        .join("")}</p>
      <p class="small"><strong>${esc(S.scanFlattest)}:</strong></p>
      <ul class="scan-best small">${best
        .map(
          (c) => `<li>${esc(S.scanCell(c.i, c.meanSlope.toFixed(1), c.maxSlope.toFixed(1), Math.round(c.reliefM)))}
            <button type="button" class="link-btn" data-cell="${c.i}">${esc(S.scanUseCell)}</button></li>`
        )
        .join("")}</ul>
      <button type="button" class="btn btn-outline btn-small" id="scan-csv">${esc(S.scanCsv)}</button>
      <p class="small muted">${esc(S.scanClimateNote)}</p>
      <p class="small muted">${esc(S.scanSource)}</p>`;
    out.querySelectorAll("[data-cell]").forEach((b) =>
      b.addEventListener("click", () => moveTo(scan.cells.find((c) => c.i === Number(b.dataset.cell))))
    );
    out.querySelector("#scan-csv").addEventListener("click", () =>
      downloadText(`terrain-scan_${lat.toFixed(4)}_${lon.toFixed(4)}.csv`, scanToCsv(scan, { lat, lon }))
    );
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
      updateLinks();
    };
    miniMap.on("click", (e) => {
      marker.setLatLng(e.latlng).addTo(miniMap);
      setFromLatLng(e.latlng);
    });
    marker.on("dragend", () => setFromLatLng(marker.getLatLng()));
    root.querySelector("#scan-btn").addEventListener("click", () => runScan(setFromLatLng));
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
