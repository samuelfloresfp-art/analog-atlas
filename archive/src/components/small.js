// Small presentational components that return HTML strings:
// ConfidenceTag, DimensionTable, Stepper, MissionButtons, StatsBars.

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

export function Stepper(current) {
  return `<ol class="stepper" aria-label="Simulation steps">${S.steps
    .map(
      (label, i) =>
        `<li class="${i < current ? "done" : i === current ? "current" : ""}" ${i === current ? 'aria-current="step"' : ""}><span class="num">${i + 1}</span><span class="lbl">${esc(label)}</span></li>`
    )
    .join("")}</ol>`;
}

export function MissionButtons(missions) {
  return `<div class="mission-buttons">${missions
    .map(
      (m) =>
        `<a class="mission-btn" href="#/mission/${m.id}" style="--accent:${m.accent}">
          <span class="mission-btn-name">${esc(m.name)}</span>
          <span class="mission-btn-desc">${esc(m.description)}</span>
        </a>`
    )
    .join("")}</div>`;
}

/** rows: {label, pct, count, mine?}[] */
export function StatsBars(title, rows, accent) {
  return `<section class="stats-block">
    <h3>${esc(title)}</h3>
    <table class="stats-table">
      <tbody>${rows
        .map(
          (r) => `<tr class="${r.mine ? "mine" : ""}">
            <th scope="row">${esc(r.label)}${r.mine ? ` <span class="mine-tag">${esc(S.yourChoice)}</span>` : ""}</th>
            <td class="bar-cell"><div class="bar" style="--w:${r.pct.toFixed(1)}%;--accent:${accent}"></div></td>
            <td class="num">${r.pct.toFixed(0)}%</td>
            <td class="num muted">${r.count}</td>
          </tr>`
        )
        .join("")}</tbody>
    </table>
  </section>`;
}
