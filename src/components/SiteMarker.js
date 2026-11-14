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

/** state: validated | candidate */
export function SiteMarker(L, site, state, onOpen, { faded = false } = {}) {
  const color = state === "validated" ? VALIDATED_COLOR : CANDIDATE_COLOR;
  const icon = L.divIcon({
    className: `site-marker marker-${state} ${faded ? "faded" : ""}`,
    html: `<span class="dot dot-${state}" style="--c:${color}"></span>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
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
      ? `<span class="sub-icon sub-example" style="--c:${COMMUNITY_COLORS.example}">E</span>`
      : `<span class="dot sub-${kind}" style="--c:${COMMUNITY_COLORS[kind]}"></span>`;
  const icon = L.divIcon({ className: `site-marker`, html, iconSize: [22, 22], iconAnchor: [11, 11] });
  const marker = L.marker([Number(sub.form.lat), Number(sub.form.lon)], { icon, keyboard: true, title: sub.form.name, zIndexOffset: 400 });
  marker.on("click", () => onOpen(sub));
  accessible(marker, `${sub.form.name} — ${sub.example ? S.exampleBadge : S.status[sub.result.status]}`);
  marker.bindTooltip(esc(sub.form.name), { direction: "top", offset: [0, -10] });
  return marker;
}
