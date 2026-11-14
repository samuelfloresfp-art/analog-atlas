// ✓ / ~ / ✗ checklist of criteria.json rules for a planet+mission.

import { S } from "../strings.js";
import { esc } from "../util.js";
import { enumLabel, fieldLabel } from "../services/criteria.js";

/** results: [{rule, value, result}] */
export function CriteriaChecklist(results, data, { valueLabel = S.siteValue } = {}) {
  return `<ul class="checklist">${results
    .map(
      ({ rule, value, result }) => `<li class="chk chk-${result}">
        <span class="chk-sym" aria-label="${esc(S.resultLabels[result])}">${S.resultSymbols[result]}</span>
        <div>
          <div class="chk-label"><strong>${esc(rule.label)}</strong>
            ${rule.required ? `<span class="req">${esc(S.required)}</span>` : ""}
            <span class="w">${esc(S.weight)} ${rule.weight}</span></div>
          <div class="small muted">${esc(rule.explanation)}</div>
          <div class="small">${esc(fieldLabel(data, rule.field))} (${esc(valueLabel)}): <strong>${esc(enumLabel(data, rule.field, value))}</strong></div>
        </div>
      </li>`
    )
    .join("")}</ul>`;
}
