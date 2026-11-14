// #/map/:planet/:mission — learning map.

import { S } from "../strings.js";
import { esc, navigate } from "../util.js";
import { siteState, countsFor } from "../services/status.js";
import { SiteMarker } from "../components/SiteMarker.js";
import { openSiteModal, closeSiteModal } from "../components/SiteModal.js";
import { createWorldMap, createClusterLayer, fitToMarkers } from "../components/WorldMap.js";
import { NavBar } from "../components/small.js";
import { CANDIDATE_COLOR, VALIDATED_COLOR } from "../config.js";

export function LearnMap(root, { params, query }, data) {
  const [planet, missionId] = params;
  const mission = data.missionById[missionId];
  if (!data.planets.includes(planet) || !mission) {
    root.innerHTML = `<main class="page"><p>${esc(S.notFound)}</p><a href="#/">${esc(S.backHome)}</a></main>`;
    return;
  }
  const counts = countsFor(data, planet, mission.id);
  const searched = [...new Set(data.sites.map((s) => s.searchedOn))].sort().pop();
  const hidden = data.sites.filter((s) => !siteState(data, s, planet, mission.id)).length;

  root.innerHTML = `<div class="map-page" style="--accent:${mission.accent}">
    ${NavBar("learn", `#/map/${planet}/${mission.id}`)}
    <header class="map-header">
      <div class="mission-title">
        <label class="sr-only" for="planet-select">${esc(S.planetSelectLabel)}</label>
        <select id="planet-select" class="mission-select">
          ${data.planets.map((p) => `<option value="${p}" ${p === planet ? "selected" : ""}>${esc(S.planetNames[p])}</option>`).join("")}
        </select>
        <label class="sr-only" for="mission-select">${esc(S.missionSelectLabel)}</label>
        <select id="mission-select" class="mission-select">
          ${data.missions.map((m) => `<option value="${m.id}" ${m.id === mission.id ? "selected" : ""}>${esc(m.name)}</option>`).join("")}
        </select>
        <span class="untapped">${esc(S.mapCounts(counts.validated, counts.possible))}</span>
      </div>
      ${counts.validated === 0 ? `<span class="banner-warn">${esc(S.noValidatedYet)}</span>` : ""}
    </header>
    <div id="map" class="map" aria-label="World map of analog sites"></div>
    <aside class="legend" aria-label="${esc(S.legendTitle)}">
      <strong>${esc(S.legendTitle)}</strong>
      <div><span class="dot dot-validated" style="--c:${VALIDATED_COLOR}"></span> ${esc(S.legendValidated)}</div>
      <div><span class="dot dot-candidate" style="--c:${CANDIDATE_COLOR}"></span> ${esc(S.legendCandidate(searched))}</div>
      ${hidden ? `<div class="small muted">${esc(S.hiddenNote(hidden))}</div>` : ""}
    </aside>
  </div>`;

  const map = createWorldMap(root.querySelector("#map"));
  const cluster = createClusterLayer().addTo(map);
  const open = (site) => openSiteModal(site, planet, mission, data);

  const latlngs = [];
  for (const site of data.sites) {
    const state = siteState(data, site, planet, mission.id);
    if (!state) continue;
    cluster.addLayer(SiteMarker(window.L, site, state, open));
    latlngs.push([site.lat, site.lon]);
  }

  const go = () => navigate(`#/map/${root.querySelector("#planet-select").value}/${root.querySelector("#mission-select").value}`);
  root.querySelector("#planet-select").addEventListener("change", go);
  root.querySelector("#mission-select").addEventListener("change", go);

  const focus = data.siteById[query.get("site")];
  if (focus && siteState(data, focus, planet, mission.id)) {
    map.setView([focus.lat, focus.lon], 6);
    setTimeout(() => open(focus), 80);
  } else {
    fitToMarkers(map, latlngs);
  }

  return () => {
    closeSiteModal();
    map.remove();
  };
}
