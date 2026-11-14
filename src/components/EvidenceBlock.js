// "NASA data evidence" block. Never claims verification unless status === "verified".

import { S } from "../strings.js";
import { esc } from "../util.js";
import { ConfidenceTag } from "./small.js";

const fmt = (v, u) => (v == null ? "—" : `${v} ${u && u !== "-" ? u : ""}`.trim());

export function EvidenceBlock(evidence, planet) {
  const rows = evidence.filter((e) => e.planet.body === planet);
  const allVerified = rows.length > 0 && rows.every((e) => e.status === "verified");
  const title = allVerified ? S.evidenceVerified : S.evidencePending;
  return `<section class="m-block">
    <h3>${esc(title)} ${ConfidenceTag(allVerified ? "data" : "assumption")}</h3>
    ${
      rows.length
        ? `<table class="ev-table"><thead><tr><th>Dimension</th><th>${esc(S.earthSide)}</th><th>${esc(S.planetNames[planet])}</th><th>Status</th></tr></thead><tbody>${rows
            .map(
              (e) => `<tr>
                <td>${esc(e.dimension)}</td>
                <td>${esc(e.earth.dataset)}<br><span class="muted">${esc(fmt(e.earth.value, e.earth.unit))}</span></td>
                <td>${esc(e.planet.dataset)}<br><span class="muted">${esc(fmt(e.planet.value, e.planet.unit))}</span></td>
                <td><span class="ev-${e.status}">${esc(e.status)}</span></td>
              </tr>`
            )
            .join("")}</tbody></table>`
        : `<p class="small muted">—</p>`
    }
  </section>`;
}
