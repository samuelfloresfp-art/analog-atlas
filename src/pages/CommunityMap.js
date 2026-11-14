// #/community — map of explorer submissions.

import { S } from "../strings.js";
import { esc } from "../util.js";
import { NavBar, StatusBadge } from "../components/small.js";
import { createWorldMap, createClusterLayer, fitToMarkers } from "../components/WorldMap.js";
import { SubmissionMarker, SiteMarker, markerHtml } from "../components/SiteMarker.js";
import { openModal, closeModal, imageHtml } from "../components/Modal.js";
import { CheckTable } from "../components/CheckTable.js";
import { hydrateCriteria } from "../services/validate.js";
import { siteState } from "../services/status.js";
import { enumLabel, fieldLabel } from "../services/criteria.js";
import * as store from "../services/communityStore.js";
import { COMMUNITY_COLORS, CANDIDATE_COLOR, VALIDATED_COLOR } from "../config.js";

const filters = { planet: "all", mission: "all", status: "all", reference: false };

function opts(values, current) {
  return values.map(([v, l]) => `<option value="${esc(v)}" ${v === current ? "selected" : ""}>${esc(l)}</option>`).join("");
}

function submissionBody(sub, data) {
  const { form, result } = sub;
  const mission = data.missionById[form.mission];
  const attrs = Object.entries(form.attrs)
    .map(([f, v]) => `<tr><th scope="row">${esc(fieldLabel(data, f))}</th><td>${esc(enumLabel(data, f, v))}</td></tr>`)
    .join("");
  return `
    <p class="eyebrow">${StatusBadge(result.status)} ${sub.example ? StatusBadge(null, { example: true }) : ""}</p>
    <h2 id="modal-title">${esc(form.name)}</h2>
    <p class="muted small">${esc(S.planetNames[form.planet])} · ${esc(mission.name)} · ${esc(form.country || "—")} ·
      ${Number(form.lat).toFixed(3)}, ${Number(form.lon).toFixed(3)}</p>
    <p class="small">${esc(sub.nickname || S.anonymous)} · ${esc(S.submittedOn)} ${esc((sub.publishedAt || sub.createdAt || "").slice(0, 10))}</p>
    <section class="m-block"><h3>${esc(S.declaredData)}</h3>
      <table class="dim-table"><tbody>${attrs}
        ${form.tempMin !== "" ? `<tr><th scope="row">${esc(S.dimensionLabels.temperature)}</th><td>${esc(form.tempMin)} … ${esc(form.tempMax)} °C</td></tr>` : ""}
        <tr><th scope="row">${esc(S.fUsedBefore)}</th><td>${esc(S.usedBefore[form.usedBefore] || "—")}</td></tr>
      </tbody></table>
      <p><strong>${esc(S.fWhy)}</strong> ${esc(form.why)}</p>
      <p><strong>${esc(S.fLacks)}</strong> ${esc(form.lacks)}</p>
      ${form.evidenceUrl ? `<p class="small"><a href="${esc(form.evidenceUrl)}" target="_blank" rel="noopener nofollow">${esc(S.fEvidence.replace(" (optional)", ""))}</a></p>` : ""}
    </section>
    <section class="m-block"><h3>${esc(S.checksTitle)} · ${esc(S.score)} ${result.score}/100</h3>
      ${CheckTable(result, hydrateCriteria(result, form, data), data)}
      <p class="notice small">${esc(S.disclaimer)}</p>
    </section>
    <div class="m-actions">
      <button type="button" class="btn btn-outline" id="report" ${sub.reported ? "disabled" : ""}>${esc(sub.reported ? S.reported : S.report)}</button>
      ${!sub.example ? `<button type="button" class="btn btn-outline" id="remove">${esc(S.removeLocal)}</button>` : ""}
    </div>`;
}

export async function CommunityMap(root, { query }, data) {
  root.innerHTML = `<div class="map-page">
    ${NavBar("community")}
    <header class="map-header">
      <strong>${esc(S.communityHeading)}</strong>
      <span id="count" class="untapped"></span>
      <div class="filters">
        <label>${esc(S.filterPlanet)}<select id="f-planet">${opts([["all", S.all], ...data.planets.map((p) => [p, S.planetNames[p]])], filters.planet)}</select></label>
        <label>${esc(S.filterMission)}<select id="f-mission">${opts([["all", S.all], ...data.missions.map((m) => [m.id, m.name])], filters.mission)}</select></label>
        <label>${esc(S.filterStatus)}<select id="f-status">${opts(
          [["all", S.all], ["plausible", S.status.plausible], ["needs-evidence", S.status["needs-evidence"]], ["example", S.legendExample]],
          filters.status
        )}</select></label>
        <label class="check"><input type="checkbox" id="f-ref" ${filters.reference ? "checked" : ""}/> ${esc(S.showReference)}</label>
        <button type="button" class="btn btn-small" id="export">${esc(S.exportJson)}</button>
        <label class="btn btn-small file-btn">${esc(S.importJson)}<input type="file" id="import" accept="application/json,.json" hidden /></label>
      </div>
    </header>
    <div id="msg" class="toast" role="status"></div>
    <div id="map" class="map" aria-label="${esc(S.communityHeading)}"></div>
    <aside class="legend" aria-label="${esc(S.legendTitle)}">
      <strong>${esc(S.legendTitle)}</strong>
      <div><span class="dot sub-plausible" style="--c:${COMMUNITY_COLORS.plausible}"></span> ${esc(S.legendPlausible)}</div>
      <div><span class="dot sub-needs" style="--c:${COMMUNITY_COLORS.needs}"></span> ${esc(S.legendNeeds)}</div>
      <div><span class="sub-icon sub-example" style="--c:${COMMUNITY_COLORS.example}">★</span> ${esc(S.legendExample)}</div>
      <div class="faded-legend lg-row">${markerHtml("validated", VALIDATED_COLOR)}${markerHtml("candidate", CANDIDATE_COLOR)} <span>${esc(S.legendReference)}</span></div>
    </aside>
    <footer class="map-footer">${esc(S.communityFooter)}</footer>
  </div>`;

  const map = createWorldMap(root.querySelector("#map"));
  const refLayer = window.L.layerGroup().addTo(map);
  const subLayer = createClusterLayer().addTo(map);
  let subs = [];

  const toast = (t) => {
    const el = root.querySelector("#msg");
    el.textContent = t;
    el.classList.add("show");
    setTimeout(() => el.classList.remove("show"), 3500);
  };

  const openSub = (sub) =>
    openModal({
      imgHtml: imageHtml(sub.form.name, sub.id, null),
      bodyHtml: submissionBody(sub, data),
      accent: COMMUNITY_COLORS.plausible,
      bind: (m) => {
        m.querySelector("#report")?.addEventListener("click", async () => {
          await store.report(sub.id);
          closeModal();
          await refresh();
          toast(S.reported);
        });
        m.querySelector("#remove")?.addEventListener("click", async () => {
          await store.remove(sub.id);
          closeModal();
          await refresh();
        });
      },
    });

  function drawReference() {
    refLayer.clearLayers();
    if (!filters.reference) return;
    for (const site of data.sites) {
      let state = null;
      const planets = filters.planet === "all" ? data.planets : [filters.planet];
      const missions = filters.mission === "all" ? data.missions.map((m) => m.id) : [filters.mission];
      for (const p of planets)
        for (const m of missions) {
          const s = siteState(data, site, p, m);
          if (s === "validated") state = "validated";
          else if (s === "candidate" && !state) state = "candidate";
        }
      if (state) refLayer.addLayer(SiteMarker(window.L, site, state, null, { faded: true }));
    }
  }

  async function refresh(fit = false) {
    subs = await store.list();
    subLayer.clearLayers();
    const shown = subs.filter(
      (s) =>
        (filters.planet === "all" || s.form.planet === filters.planet) &&
        (filters.mission === "all" || s.form.mission === filters.mission) &&
        (filters.status === "all" || (filters.status === "example" ? s.example : !s.example && s.result.status === filters.status))
    );
    for (const s of shown) subLayer.addLayer(SubmissionMarker(window.L, s, openSub));
    root.querySelector("#count").textContent = S.communityCount(shown.filter((s) => !s.example).length);
    drawReference();
    if (fit) fitToMarkers(map, shown.map((s) => [Number(s.form.lat), Number(s.form.lon)]), 4);
  }

  for (const [id, key] of [["#f-planet", "planet"], ["#f-mission", "mission"], ["#f-status", "status"]])
    root.querySelector(id).addEventListener("change", (e) => {
      filters[key] = e.target.value;
      refresh();
    });
  root.querySelector("#f-ref").addEventListener("change", (e) => {
    filters.reference = e.target.checked;
    drawReference();
  });

  root.querySelector("#export").addEventListener("click", async () => {
    const blob = new Blob([await store.exportJson()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `analog-atlas-community-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
  root.querySelector("#import").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const n = await store.importJson(await file.text());
      await refresh(true);
      toast(S.imported(n));
    } catch {
      toast(S.importError);
    }
    e.target.value = "";
  });

  await refresh(true);
  const focus = subs.find((s) => s.id === query.get("sub"));
  if (focus) {
    map.setView([Number(focus.form.lat), Number(focus.form.lon)], 6);
    setTimeout(() => openSub(focus), 80);
  }

  return () => {
    closeModal();
    map.remove();
  };
}
