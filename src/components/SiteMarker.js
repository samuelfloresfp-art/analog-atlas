// Leaflet markers: learning-map sites and community submissions.

import { S } from "../strings.js";
import { esc } from "../util.js";
import { CANDIDATE_COLOR, VALIDATED_COLOR, COMMUNITY_COLORS } from "../config.js";

function accessible(marker, label) {
  marker.on("add", () => {
    const el = marker.getElement();
    if (el) {
      el.setAttribute("role", "button");
      el.setAttribute("aria-label", label);
    }
  });
}

export const ROCKET_SVG = `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M12 2c3 2.2 4.6 5.6 4.6 9.3 0 1.3-.2 2.5-.6 3.6l2.4 2.4v3.2l-3.6-1.9H9.2l-3.6 1.9v-3.2L8 14.9c-.4-1.1-.6-2.3-.6-3.6C7.4 7.6 9 4.2 12 2zm0 6.2a1.9 1.9 0 1 0 0 3.8 1.9 1.9 0 0 0 0-3.8zM10.4 20h3.2l-.6 2h-2z"/></svg>`;

export function markerHtml(state, color) {
  return state === "validated"
    ? `<span class="pin pin-rocket" style="--c:${color}">${ROCKET_SVG}</span>`
    : `<span class="pin pin-target" style="--c:${color}"><i></i></span>`;
}

/** state: validated | candidate */
export function SiteMarker(L, site, state, onOpen, { faded = false } = {}) {
  const color = state === "validated" ? VALIDATED_COLOR : CANDIDATE_COLOR;
  const icon = L.divIcon({
    className: `site-marker marker-${state} ${faded ? "faded" : ""}`,
    html: markerHtml(state, color),
    iconSize: state === "validated" ? [32, 32] : [22, 22],
    iconAnchor: state === "validated" ? [16, 16] : [11, 11],
  });
  const marker = L.marker([site.lat, site.lon], { icon, keyboard: !faded, title: site.name, zIndexOffset: state === "validated" ? 200 : 0 });
  if (onOpen) marker.on("click", () => onOpen(site));
  accessible(marker, S.markerLabel(site.name, state === "validated" ? S.stateValidated : S.stateCandidate));
  marker.bindTooltip(esc(site.name), { direction: "top", offset: [0, -10] });
  return marker;
}

export function SubmissionMarker(L, sub, onOpen) {
  const kind = sub.example ? "example" : sub.result.status === "plausible" ? "plausible" : sub.result.status === "needs-evidence" ? "needs" : "notConsistent";
  const html =
    kind === "example"
      ? `<span class="sub-icon sub-example" style="--c:${COMMUNITY_COLORS.example}">★</span>`
      : `<span class="dot sub-${kind}" style="--c:${COMMUNITY_COLORS[kind]}"></span>`;
  const icon = L.divIcon({ className: `site-marker`, html, iconSize: [22, 22], iconAnchor: [11, 11] });
  const marker = L.marker([Number(sub.form.lat), Number(sub.form.lon)], { icon, keyboard: true, title: sub.form.name, zIndexOffset: 400 });
  marker.on("click", () => onOpen(sub));
  accessible(marker, `${sub.form.name} — ${sub.example ? S.exampleBadge : S.status[sub.result.status]}`);
  marker.bindTooltip(esc(sub.form.name), { direction: "top", offset: [0, -10] });
  return marker;
}
