// Learning-map site card (v3). Order: why it works (criteria ✓ ~ ✗) + analog dimensions
// (hover/tap explains each level) → simulations already done → limits → sources and data.
// Left side: high-resolution satellite view of the site (zoomable) so the visitor can see
// whether the ground is flat, rocky, sandy or vegetated.

import { S } from "../strings.js";
import { esc } from "../util.js";
import { LANG } from "../i18n.js";
import { openModal } from "./Modal.js";
import { siteState } from "../services/status.js";
import { getCombo, evaluateRules, enumLabel, fieldLabel } from "../services/criteria.js";
import { cacheEntry } from "./NasaPanel.js";
import { ROCKET_SVG } from "./SiteMarker.js";
import { TILES } from "../config.js";
import { DIM_HELP, DIM_INDICATORS } from "../data/dimensionHelp.js";

export { closeModal as closeSiteModal } from "./Modal.js";

const DIMS = ["geology", "terrain", "atmosphere", "temperature", "water", "biology", "subsurface", "operational"];
const list = (items) => `<ul class="clean-list">${items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`;
const link = (url, text) => (url ? `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(text)}</a>` : esc(text));
const fmtCoord = (lat, lon) => `${Math.abs(lat).toFixed(3)}° ${lat < 0 ? "S" : "N"} · ${Math.abs(lon).toFixed(3)}° ${lon < 0 ? (LANG === "pt" ? "O" : "W") : "E"}`;

function indicatorText(i) {
  const label = S.nasaIndicatorLabels[i.key] || i.key;
  const v = i.value == null ? "—" : `${i.value}${i.unit ? ` ${i.unit}` : ""}`;
  return `${label}: ${v}`;
}

function criteriaHtml(results, data) {
  const sym = { pass: "✓", partial: "~", fail: "✗" };
  return `<ul class="checklist">${results
    .map(
      ({ rule, value, result }) => `<li class="chk chk-${result}">
        <span class="chk-sym" aria-label="${esc(S.resultLabels[result])}">${sym[result]}</span>
        <div>
          <div class="chk-label"><strong>${esc(rule.label)}</strong>${rule.required ? ` <span class="req">${esc(S.required)}</span>` : ""}</div>
          <div class="small muted">${esc(rule.explanation)}</div>
          <div class="small chk-val">${esc(fieldLabel(data, rule.field))}: <strong>${esc(enumLabel(data, rule.field, value))}</strong></div>
        </div>
      </li>`
    )
    .join("")}</ul>`;
}

function dimensionsHtml(site, missionId) {
  const help = (DIM_HELP[LANG] || DIM_HELP.en)[missionId];
  const inds = cacheEntry(site.id)?.report?.indicators || [];
  return `<div class="dims">${DIMS.map((d, idx) => {
    const lv = site.dimensions[d] || "nodata";
    const measured = inds.filter((i) => DIM_INDICATORS[d].includes(i.key) && i.value != null);
    const tipId = `tip-${d}`;
    return `<div class="dim ${idx % 2 ? "right" : ""}">
      <button type="button" class="dim-btn lvl-${lv}" aria-describedby="${tipId}">
        <span class="dim-name">${esc(S.dimensionLabels[d])}</span>
        <span class="dim-lvl">${esc(S.levelLabels[lv])}</span>
        <span class="dim-bar" aria-hidden="true"><i style="width:${{ strong: 100, partial: 60, weak: 25, nodata: 0 }[lv]}%"></i></span>
      </button>
      <div class="dim-tip" role="tooltip" id="${tipId}">
        <p class="tip-lvl lvl-text-${lv}">${esc(S.levelMeaning[lv])}</p>
        <p class="tip-h">${esc(S.dimNeed)}</p>
        <p>${esc(help[d])}</p>
        ${
          measured.length
            ? `<p class="tip-h">${esc(S.dimData)}</p><ul>${measured.map((i) => `<li>${esc(indicatorText(i))} <span class="muted">· ${esc(i.source.name.split(" — ")[0].split(" via ")[0])}</span></li>`).join("")}</ul>`
            : ""
        }
      </div>
    </div>`;
  }).join("")}</div>`;
}

function historyHtml(site, planet, mission, data) {
  const sorted = [...site.history].sort((a, b) => (b.planet === planet && b.mission === mission.id) - (a.planet === planet && a.mission === mission.id));
  return `<ul class="history">${sorted
    .map((h) => {
      const match = h.planet === planet && h.mission === mission.id;
      return `<li class="${match ? "match" : "other"}">
        <span class="h-year">${esc(h.year || "—")}</span>
        <div><strong>${esc(data.missionById[h.mission]?.name || h.mission)} · ${esc(S.planetNames[h.planet])}</strong>${h.org ? ` <span class="muted">· ${esc(h.org)}</span>` : ""}
        <div class="small">${esc(h.what)}</div></div>
      </li>`;
    })
    .join("")}</ul>`;
}

function sourcesHtml(site, planet) {
  const entry = cacheEntry(site.id);
  const refs = [
    ...(site.sources || []).map((s) => link(s.url, s.label)),
    ...site.history.filter((h) => h.source).map((h) => link(h.source.url, h.source.title)),
  ];
  const inds = (entry?.report?.indicators || []).filter((i) => i.value != null && !["radiation_gap", "space_weather", "data_coverage"].includes(i.key));
  const datasets = [...new Map(inds.map((i) => [i.source.name, i.source.url])).entries()];
  const trek = entry?.media?.trek?.[planet];
  return `<section class="m-block sources-block">
    <h3>${esc(S.sourcesTitle)}</h3>
    ${refs.length ? `<p class="tip-h">${esc(S.siteSources)}</p><ul class="small">${refs.map((r) => `<li>${r}</li>`).join("")}</ul>` : ""}
    ${
      inds.length
        ? `<p class="tip-h">${esc(S.nasaMeasures)}</p>
      <table class="ev-table small"><tbody>${inds.map((i) => `<tr><td>${esc(S.nasaIndicatorLabels[i.key] || i.key)}</td><td class="mono">${esc(i.value)} ${esc(i.unit || "")}</td></tr>`).join("")}</tbody></table>
      <ul class="small">${datasets.map(([n, u]) => `<li>${link(u?.includes("{") ? null : u, n)}</li>`).join("")}</ul>
      <p class="small muted">${esc(S.nasaCheckedOn(String(entry.report.checkedAt || entry.generatedAt).slice(0, 10)))}</p>`
        : ""
    }
    ${trek ? `<p class="small muted">${esc(S.trekCaption(trek.feature, trek.layer))}</p>` : ""}
    <p class="small muted">${esc(S.satCredit)} · ${esc(S.imageryNasa)}</p>
  </section>`;
}

function satelliteHtml(site, planet) {
  const trek = cacheEntry(site.id)?.media?.trek?.[planet];
  return `<div class="sat-wrap">
    <div id="sat-map" class="sat-map" aria-label="${esc(S.satCaption)}"><span class="sat-loading">${esc(S.satLoading)}</span></div>
    <div class="sat-cap"><span>${esc(S.satCaption)}</span><span class="credit-line">${esc(S.satCredit)}</span></div>
    ${
      trek
        ? `<figure class="twin"><img src="${esc(trek.url)}" alt="${esc(trek.feature)}" loading="lazy" onerror="this.closest('figure').remove()"/>
      <figcaption><span class="eyebrow-mono">${esc(S.planetNames[planet])}</span> ${esc(trek.feature)}</figcaption></figure>`
        : ""
    }
  </div>`;
}

function mountSatellite(root, site) {
  const L = window.L;
  const el = root.querySelector("#sat-map");
  if (!el || !L) return;
  const map = L.map(el, { zoomControl: true, attributionControl: false, minZoom: 4, maxZoom: 18 }).setView([site.lat, site.lon], 14);
  L.tileLayer(TILES.gibs, { maxNativeZoom: 8, maxZoom: 18 }).addTo(map);
  const hd = L.tileLayer(TILES.hd, { maxNativeZoom: 18, maxZoom: 18 }).addTo(map);
  hd.on("load", () => el.querySelector(".sat-loading")?.remove());
  L.circleMarker([site.lat, site.lon], { radius: 7, color: "#E7F434", weight: 2, fillOpacity: 0 }).addTo(map);
  setTimeout(() => map.invalidateSize(), 60);
  // Leaflet map is removed with the modal markup; drop the instance too
  const obs = new MutationObserver(() => {
    if (!document.body.contains(el)) {
      map.remove();
      obs.disconnect();
    }
  });
  obs.observe(document.getElementById("modal-root"), { childList: true });
}

export function openSiteModal(site, planet, mission, data) {
  const state = siteState(data, site, planet, mission.id);
  if (!state) return;
  const planetName = S.planetNames[planet];
  const results = evaluateRules(getCombo(data, planet, mission.id), site.attributes, site.lat);
  const stateLabel = state === "validated" ? S.stateValidated : S.stateCandidate;

  const body = `
    <p class="eyebrow"><span class="state-pill pill-${state}">${state === "validated" ? ROCKET_SVG : ""}${esc(stateLabel)}</span>
      <span class="eyebrow-mono">${esc(planetName)} · ${esc(mission.name)}</span></p>
    <h2 id="modal-title">${esc(site.name)}</h2>
    <p class="site-meta"><span>${esc(site.country)}</span> · <span>${esc(site.environment.join(", "))}</span> · <span class="mono">${esc(fmtCoord(site.lat, site.lon))}</span></p>
    <p class="mirrors">${esc(site.mirrors[planet] || S.noMirror)}</p>
    <p class="summary">${esc(site.summary)}</p>

    <section class="m-block">
      <h3>${esc(S.whyWorksTitle(mission.name, planetName))}</h3>
      ${criteriaHtml(results, data)}
    </section>

    <section class="m-block">
      <h3>${esc(S.dimsTitle)}</h3>
      <p class="small muted">${esc(S.dimsHint)}</p>
      ${dimensionsHtml(site, mission.id)}
    </section>

    ${site.history.length ? `<section class="m-block"><h3>${esc(S.historyTitle)}</h3>${historyHtml(site, planet, mission, data)}</section>` : ""}

    <details class="m-block limits">
      <summary><h3>${esc(S.limitsTitle)}</h3></summary>
      ${list(site.whatItLacks)}
      <p class="tip-h">${esc(S.notReproducible)}</p>
      ${list(data.criteria.notReproducible[planet])}
    </details>

    ${state === "candidate" ? `<div class="m-actions"><a class="btn btn-outline" href="#/explore/${planet}/${mission.id}">${esc(S.proposeLike)}</a></div>` : ""}

    ${sourcesHtml(site, planet)}`;

  openModal({
    imgHtml: satelliteHtml(site, planet),
    bodyHtml: body,
    accent: `var(--${mission.id})`,
    stateClass: `state-${state} site-card`,
    bind: (root) => mountSatellite(root, site),
  });
}
