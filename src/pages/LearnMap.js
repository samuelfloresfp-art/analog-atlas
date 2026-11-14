// #/map/:planet/:mission — learning map.

import { S } from "../strings.js";
import { esc } from "../util.js";
import { siteState, countsFor } from "../services/status.js";
import { SiteMarker, markerHtml } from "../components/SiteMarker.js";
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

  const pill = (href, label, on, accent) =>
    `<a class="pill ${on ? "on" : ""}" href="${href}" ${on ? 'aria-current="page"' : ""} ${accent ? `style="--accent:${accent}"` : ""}>${esc(label)}</a>`;
  root.innerHTML = `<div class="map-page" style="--accent:var(--${mission.id})">
    ${NavBar("learn", `#/map/${planet}/${mission.id}`)}
    <div class="map-area">
      <div id="map" class="map" aria-label="${esc(S.navLearn)}"></div>
      <section class="map-panel" aria-label="${esc(S.missionSelectLabel)}">
        <div class="pill-row">${data.planets.map((p) => pill(`#/map/${p}/${mission.id}`, S.planetNames[p], p === planet)).join("")}</div>
        <div class="pill-row">${data.missions.map((m) => pill(`#/map/${planet}/${m.id}`, m.name, m.id === mission.id, `var(--${m.id})`)).join("")}</div>
        <div class="map-stats">
          <div><b class="stat-big stat-green">${counts.validated}</b><span>${esc(S.statValidated)}</span></div>
          <div><b class="stat-big">${counts.possible}</b><span>${esc(S.statPossible)}</span></div>
        </div>
        ${counts.validated === 0 ? `<p class="small warn-text">${esc(S.noValidatedYet)}</p>` : ""}
      </section>
      <details class="legend" open>
        <summary>${esc(S.legendTitle)}</summary>
        <div class="lg-row">${markerHtml("validated", VALIDATED_COLOR)} <span>${esc(S.legendRocket)}</span></div>
        <div class="lg-row">${markerHtml("candidate", CANDIDATE_COLOR)} <span>${esc(S.legendTarget)}</span></div>
        <div class="small muted">${esc(S.legendSearched(searched))}</div>
        ${hidden ? `<div class="small muted">${esc(S.hiddenNote(hidden))}</div>` : ""}
      </details>
    </div>
  </div>`;
  if (matchMedia("(max-width: 720px)").matches) root.querySelector(".legend").open = false;

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
