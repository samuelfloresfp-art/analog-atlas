// Small presentational components returning HTML strings:
// ConfidenceTag, DimensionTable, StatusBadge, FormStepper, NavBar.

import { S } from "../strings.js";
import { esc } from "../util.js";
import { LANG } from "../i18n.js";

export function ConfidenceTag(level) {
  const lv = S.confidence[level] ? level : "assumption";
  return `<span class="conf conf-${lv}" title="${esc(S.confidenceHint[lv])}">${esc(S.confidence[lv])}</span>`;
}

export function DimensionTable(dimensions) {
  const rows = Object.entries(S.dimensionLabels)
    .map(([key, label]) => {
      const lv = dimensions[key] || "nodata";
      return `<tr><th scope="row">${esc(label)}</th><td><span class="lvl lvl-${lv}">${esc(S.levelLabels[lv])}</span></td></tr>`;
    })
    .join("");
  return `<table class="dim-table"><tbody>${rows}</tbody></table>`;
}

/** status: plausible | needs-evidence | not-consistent */
export function StatusBadge(status, { example = false } = {}) {
  if (example) return `<span class="status-badge st-example">${esc(S.exampleBadge)}</span>`;
  return `<span class="status-badge st-${esc(status)}" title="${esc(S.statusHint[status] || "")}">${esc(S.status[status] || status)}</span>`;
}

export function FormStepper(labels, current) {
  return `<ol class="stepper" aria-label="Form steps">${labels
    .map(
      (label, i) =>
        `<li class="${i < current ? "done" : i === current ? "current" : ""}" ${i === current ? 'aria-current="step"' : ""}><span class="num">${i + 1}</span><span class="lbl">${esc(label)}</span></li>`
    )
    .join("")}</ol>`;
}

const LOGO = `<svg class="wordmark-icon" viewBox="0 0 32 32" width="26" height="26" aria-hidden="true">
  <circle cx="16" cy="16" r="13" fill="none" stroke="currentColor" stroke-width="2"/>
  <circle cx="16" cy="16" r="7.5" fill="none" stroke="currentColor" stroke-width="1.2" opacity=".55"/>
  <circle cx="21" cy="11" r="2.6" fill="var(--cta)"/></svg>`;

/** Fixed top navigation: wordmark · Learn | Be an explorer | Community map | Leaderboard | Sources · PT/EN */
export function NavBar(active, learnHref = "#/") {
  const item = (id, href, label) =>
    `<a href="${href}" class="nav-item ${active === id ? "on" : ""}" ${active === id ? 'aria-current="page"' : ""}>${esc(label)}</a>`;
  return `<nav class="nav" aria-label="Main">
    <a href="#/" class="home-link">${LOGO}<span>${esc(S.appName)}</span></a>
    <button type="button" class="nav-burger" aria-expanded="false" aria-controls="nav-items" aria-label="${esc(S.navMenu)}"
      onclick="const o=this.closest('.nav').classList.toggle('open');this.setAttribute('aria-expanded',o)"><span></span><span></span><span></span></button>
    <div class="nav-items" id="nav-items">
      ${item("learn", learnHref, S.navLearn)}
      ${item("explore", "#/explore", S.navExplore)}
      ${item("community", "#/community", S.navCommunity)}
      ${item("leaderboard", "#/leaderboard", S.navLeaderboard)}
      ${item("sources", "#/sources", S.navSources)}
      ${item("about", "#/about", S.navAbout)}
    </div>
  </nav>`;
}

/** PT | EN switch. Reloads the page (see src/i18n.js). */
export function LangToggle() {
  const b = (l, label) =>
    `<button type="button" class="lang-btn ${LANG === l ? "on" : ""}" aria-pressed="${LANG === l}" onclick="window.__setLang && window.__setLang('${l}')">${label}</button>`;
  return `<div class="lang-toggle" role="group" aria-label="${esc(S.langToggleLabel)}">${b("pt", "PT")}${b("en", "EN")}</div>`;
}
