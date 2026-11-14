import { S } from "../strings.js";
import { esc, initials, hueFrom } from "../util.js";

export function ResearcherCard(r, { selected, near, roleLabels, disabled }) {
  return `<button type="button" class="researcher ${selected ? "selected" : ""}" data-rid="${r.id}"
      aria-pressed="${selected ? "true" : "false"}" ${disabled ? "disabled" : ""}>
    <div class="researcher-top">
      <span class="avatar" style="--h:${hueFrom(r.name)}" aria-hidden="true">${esc(initials(r.name))}</span>
      <div>
        <div class="researcher-name">${esc(r.name)}</div>
        <div class="small muted">${esc(r.country)} · ${esc(r.continent)}</div>
      </div>
    </div>
    <div class="badges">
      <span class="badge badge-fictional">${esc(S.fictional)}</span>
      ${near ? `<span class="badge badge-near">${esc(S.nearSite)}</span>` : ""}
    </div>
    <div class="small"><strong>${esc(r.field)}</strong></div>
    <span class="tag">${esc(r.strength)}</span>
    <p class="small muted">${esc(r.background)}</p>
    ${roleLabels.length ? `<div class="small">${roleLabels.map((l) => `<span class="role-chip">${esc(l)}</span>`).join("")}</div>` : ""}
  </button>`;
}
