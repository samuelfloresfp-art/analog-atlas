import { S } from "../strings.js";
import { esc, navigate } from "../util.js";
import { siteStatus } from "../services/status.js";
import { SiteMarker } from "../components/SiteMarker.js";
import { openSiteModal, closeSiteModal } from "../components/SiteModal.js";

// Filters and view survive mission switches within the session.
const filters = { target: "all", env: "all" };
let lastView = null;

const GIBS_URL =
  "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_ShadedRelief_Bathymetry/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg";
const CARTO_URL = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";

function matchesFilters(site) {
  if (filters.target === "moon" && !["moon", "both"].includes(site.target)) return false;
  if (filters.target === "mars" && !["mars", "both"].includes(site.target)) return false;
  if (filters.target === "both" && site.target !== "both") return false;
  if (filters.env !== "all" && !site.environment.includes(filters.env)) return false;
  return true;
}

export function MissionMap(root, { params, query }, data) {
  const mission = data.missionById[params[0]];
  if (!mission) {
    root.innerHTML = `<main class="page"><p>${esc(S.notFound)}</p><a href="#/">${esc(S.backHome)}</a></main>`;
    return;
  }
  const envs = [...new Set(data.sites.flatMap((s) => s.environment))].sort();

  root.innerHTML = `<div class="map-page" style="--accent:${mission.accent}">
    <header class="map-header">
      <a href="#/" class="home-link">${esc(S.appName)}</a>
      <div class="mission-title">
        <label for="mission-select" class="sr-only">${esc(S.missionSelectLabel)}</label>
        <select id="mission-select" class="mission-select">
          ${data.missions.map((m) => `<option value="${m.id}" ${m.id === mission.id ? "selected" : ""}>${esc(m.name)}</option>`).join("")}
        </select>
        <span id="untapped" class="untapped"></span>
      </div>
      <div class="filters">
        <label>${esc(S.filterTarget)}
          <select id="f-target">
            <option value="all">${esc(S.targetAll)}</option>
            <option value="moon">${esc(S.targetMoon)}</option>
            <option value="mars">${esc(S.targetMars)}</option>
            <option value="both">${esc(S.targetBoth)}</option>
          </select>
        </label>
        <label>${esc(S.filterEnvironment)}
          <select id="f-env">
            <option value="all">${esc(S.envAll)}</option>
            ${envs.map((e) => `<option value="${esc(e)}">${esc(e)}</option>`).join("")}
          </select>
        </label>
      </div>
    </header>
    <div id="map" class="map" aria-label="World map of analog sites"></div>
    <aside class="legend" aria-label="${esc(S.legendTitle)}">
      <strong>${esc(S.legendTitle)}</strong>
      <div><span class="legend-star">★</span> ${esc(S.legendStar)}</div>
      <div><span class="dot dot-green"></span> ${esc(S.legendGreen)}</div>
      <div><span class="dot dot-grey"></span> ${esc(S.legendGrey)}</div>
    </aside>
  </div>`;

  const L = window.L;
  const map = L.map("map", { worldCopyJump: true, minZoom: 2, maxZoom: 12 }).setView(
    lastView?.center || [5, -30],
    lastView?.zoom || 2
  );

  // Base map: NASA GIBS, falls back to CARTO if GIBS tiles fail.
  let loaded = 0;
  let errors = 0;
  let fellBack = false;
  const gibs = L.tileLayer(GIBS_URL, { maxNativeZoom: 8, maxZoom: 12, attribution: S.imageryNasa }).addTo(map);
  gibs.on("tileload", () => loaded++);
  gibs.on("tileerror", () => {
    errors++;
    if (!fellBack && loaded === 0 && errors >= 4) {
      fellBack = true;
      map.removeLayer(gibs);
      L.tileLayer(CARTO_URL, { subdomains: "abcd", maxZoom: 19, attribution: S.imageryCarto }).addTo(map);
    }
  });

  const layer = L.layerGroup().addTo(map);
  const open = (site) => openSiteModal(site, mission, data);

  function draw() {
    layer.clearLayers();
    let untapped = 0;
    for (const site of data.sites) {
      const state = siteStatus(site, mission.id);
      if (!state || !matchesFilters(site)) continue;
      if (state === "green") untapped++;
      SiteMarker(L, site, state, open).addTo(layer);
    }
    root.querySelector("#untapped").textContent = S.untappedCount(untapped);
  }

  const fTarget = root.querySelector("#f-target");
  const fEnv = root.querySelector("#f-env");
  fTarget.value = filters.target;
  fEnv.value = envs.includes(filters.env) ? filters.env : "all";
  fTarget.addEventListener("change", () => ((filters.target = fTarget.value), draw()));
  fEnv.addEventListener("change", () => ((filters.env = fEnv.value), draw()));
  root.querySelector("#mission-select").addEventListener("change", (e) => navigate(`#/mission/${e.target.value}`));

  draw();

  // Focus a site if requested (?site=id): center the map and open its card.
  const focus = data.siteById[query.get("site")];
  if (focus && siteStatus(focus, mission.id)) {
    if (!matchesFilters(focus)) {
      filters.target = "all";
      filters.env = "all";
      fTarget.value = "all";
      fEnv.value = "all";
      draw();
    }
    map.setView([focus.lat, focus.lon], 6);
    setTimeout(() => open(focus), 50);
  }

  return () => {
    lastView = { center: map.getCenter(), zoom: map.getZoom() };
    closeSiteModal();
    map.remove();
  };
}
