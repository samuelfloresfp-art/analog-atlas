// Learning-map site card. State: validated | candidate (hidden sites never open).

import { S } from "../strings.js";
import { esc } from "../util.js";
import { ConfidenceTag, DimensionTable } from "./small.js";
import { CriteriaChecklist } from "./CriteriaChecklist.js";
import { EvidenceBlock } from "./EvidenceBlock.js";
import { openModal, imageHtml } from "./Modal.js";
import { siteState } from "../services/status.js";
import { getCombo, evaluateRules } from "../services/criteria.js";
import { NasaPanel, bindNasaPanel, SpaceWeatherBlock, CantReproduceHtml, conflictsHtml, earthImageHtml } from "./NasaPanel.js";

export { closeModal as closeSiteModal } from "./Modal.js";

function block(title, inner, confidence) {
  return `<section class="m-block"><h3>${esc(title)} ${ConfidenceTag(confidence)}</h3>${inner}</section>`;
}
const list = (items) => `<ul>${items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`;

function sourcesHtml(site) {
  if (!site.sources?.length) return `<p class="small muted">${esc(S.sources)}: ${esc(S.noSources)}</p>`;
  return `<div class="small muted"><strong>${esc(S.sources)}:</strong><ul>${site.sources
    .map((s) => `<li>${s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)}</a>` : esc(s.label)}</li>`)
    .join("")}</ul></div>`;
}

function historyHtml(site, planet, mission, data) {
  // matching planet+mission first, then other uses of the site
  const sorted = [...site.history].sort(
    (a, b) => (b.planet === planet && b.mission === mission.id) - (a.planet === planet && a.mission === mission.id)
  );
  return `<ul class="history">${sorted
    .map((h) => {
      const match = h.planet === planet && h.mission === mission.id;
      const src = h.source
        ? h.source.url
          ? `<a href="${esc(h.source.url)}" target="_blank" rel="noopener">${esc(h.source.title)}</a>`
          : esc(h.source.title)
        : `<span class="pending">${esc(S.sourcePending)}</span>`;
      return `<li class="${match ? "match" : "other"}">
        <strong>${esc(data.missionById[h.mission]?.name || h.mission)} · ${esc(S.planetNames[h.planet])}</strong>
        ${h.year ? ` (${esc(h.year)})` : ""}${h.org ? ` · ${esc(h.org)}` : ""} — ${esc(h.what)}
        <div class="small">${src} ${ConfidenceTag(h.confidence)}</div>
      </li>`;
    })
    .join("")}</ul>`;
}

export function openSiteModal(site, planet, mission, data) {
  const state = siteState(data, site, planet, mission.id);
  if (!state) return;
  const planetName = S.planetNames[planet];
  const combo = getCombo(data, planet, mission.id);
  const results = evaluateRules(combo, site.attributes, site.lat);
  const stateLabel = state === "validated" ? S.stateValidated : S.stateCandidate;
  const lacks = [...site.whatItLacks];

  const body = `
    <p class="eyebrow"><span class="state-pill pill-${state}">${esc(stateLabel)}</span> ${esc(planetName)} · ${esc(mission.name)}</p>
    <h2 id="modal-title">${esc(site.name)}</h2>
    <p class="muted small">${esc(site.country)} · ${esc(site.environment.join(", "))}</p>
    ${state === "candidate" ? `<p class="notice">${esc(S.noKnownTest(mission.name.toLowerCase(), planetName, site.searchedOn))}</p>` : ""}
    ${conflictsHtml(site, planet, mission.id)}
    ${block(
      S.mirrorsOn(planetName),
      `<p class="mirrors">${esc(site.mirrors[planet] || S.noMirror)}</p><p>${esc(site.summary)}</p>`,
      site.confidence
    )}
    ${state === "validated" ? block(S.previousSims, historyHtml(site, planet, mission, data), "assumption") : ""}
    ${block(
      S.whyWorks(mission.name, planetName),
      `<p class="small muted">${esc(S.whyWorksIntro)}</p>${CriteriaChecklist(results, data)}`,
      site.attributes.confidence
    )}
    ${block(
      S.whatItLacks,
      `${list(lacks)}<p class="small"><strong>${esc(S.notReproducible)}:</strong></p>${list(data.criteria.notReproducible[planet])}${CantReproduceHtml(planet)}`,
      site.confidence
    )}
    ${NasaPanel(site, planet, mission.id)}
    ${mission.id === "landing" || mission.id === "base" ? SpaceWeatherBlock() : ""}
    ${EvidenceBlock(site.evidence, planet)}
    ${block(S.dimensionsTitle, DimensionTable(site.dimensions), site.confidence)}
    ${sourcesHtml(site)}
    <div class="m-actions">
      <a class="btn btn-primary" href="#/contribute?site=${esc(site.id)}&planet=${planet}&mission=${mission.id}">${esc(S.validateThisSite)}</a>
      ${state === "candidate" ? `<a class="btn btn-outline" href="#/explore/${planet}/${mission.id}">${esc(S.proposeLike)}</a>` : ""}
    </div>`;

  openModal({
    imgHtml: site.imageUrl ? imageHtml(site.name, site.id, site.imageUrl) : earthImageHtml(site),
    bodyHtml: body,
    accent: mission.accent,
    stateClass: `state-${state}`,
    bind: (root) => bindNasaPanel(root, site, planet, mission.id),
  });
}
