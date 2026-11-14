// Small presentational components returning HTML strings:
// ConfidenceTag, DimensionTable, StatusBadge, FormStepper, NavBar.

import { S } from "../strings.js";
import { esc } from "../util.js";

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

/** Fixed top navigation: Learn | Be an explorer | Community map | Validate a site | Leaderboard */
export function NavBar(active, learnHref = "#/") {
  const item = (id, href, label) =>
    `<a href="${href}" class="nav-item ${active === id ? "on" : ""}" ${active === id ? 'aria-current="page"' : ""}>${esc(label)}</a>`;
  return `<nav class="nav" aria-label="Main">
    <a href="#/" class="home-link">${esc(S.appName)}</a>
    <div class="nav-items">
      ${item("learn", learnHref, S.navLearn)}
      ${item("explore", "#/explore", S.navExplore)}
      ${item("community", "#/community", S.navCommunity)}
      ${item("contribute", "#/contribute", S.navValidate)}
      ${item("leaderboard", "#/leaderboard", S.navLeaderboard)}
      ${item("sources", "#/sources", S.navSources)}
    </div>
  </nav>`;
}
