import { S } from "../strings.js";
import { esc } from "../util.js";

const ICON = {
  moon: `<svg viewBox="0 0 48 48" width="56" height="56" aria-hidden="true"><circle cx="24" cy="24" r="20" fill="#cfd3dc"/><circle cx="17" cy="18" r="4" fill="#aeb3bf"/><circle cx="30" cy="28" r="6" fill="#aeb3bf"/><circle cx="20" cy="33" r="2.5" fill="#aeb3bf"/></svg>`,
  mars: `<svg viewBox="0 0 48 48" width="56" height="56" aria-hidden="true"><circle cx="24" cy="24" r="20" fill="#c1440e"/><path d="M8 22c8-3 14 2 22-1s10-2 10-2" stroke="#8a2d06" stroke-width="3" fill="none"/><circle cx="31" cy="31" r="3" fill="#8a2d06"/></svg>`,
};

export function PlanetPicker(planets, selected) {
  return `<div class="planet-picker" role="group" aria-label="Planet">${planets
    .map(
      (p) => `<button type="button" class="planet-btn ${selected === p ? "selected" : ""}" data-planet="${p}" aria-pressed="${selected === p}">
        ${ICON[p]}
        <span class="planet-name">${esc(S.planetNames[p])}</span>
        <span class="small muted">${esc(S.planetBlurb[p])}</span>
      </button>`
    )
    .join("")}</div>`;
}
