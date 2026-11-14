// Table of all checks of an explorer proposal, with the origin of each row.

import { S } from "../strings.js";
import { esc } from "../util.js";
import { enumLabel, fieldLabel } from "../services/criteria.js";

const RESULT_CLASS = {
  pass: "ok", partial: "warn", fail: "bad",
  consistent: "ok", "mismatch-light": "warn", "mismatch-strong": "bad", "not-checked": "na",
};

function row(check, declared, resultKey, resultLabel, origin, note) {
  return `<tr>
    <th scope="row">${esc(check)}</th>
    <td>${esc(declared ?? "—")}</td>
    <td><span class="res res-${RESULT_CLASS[resultKey] || "na"}">${esc(resultLabel)}</span></td>
    <td><span class="origin">${esc(S.origins[origin] || origin)}</span></td>
    <td class="small muted">${esc(note || "")}</td>
  </tr>`;
}

/** criteria: hydrated [{rule,value,result}] */
export function CheckTable(result, criteria, data) {
  const rows = [];
  for (const c of result.formChecks.filter((c) => c.status === "pass" && ["lat", "lon", "land", "personal"].includes(c.id)))
    rows.push(row(c.label, null, c.status, S.resultLabels.pass, "rule", ""));
  for (const { rule, value, result: r } of criteria)
    rows.push(
      row(
        `${rule.label}${rule.required ? ` (${S.required})` : ""} · ${S.weight} ${rule.weight}`,
        `${fieldLabel(data, rule.field)}: ${enumLabel(data, rule.field, value)}`,
        r,
        `${S.resultSymbols[r]} ${S.resultLabels[r]}`,
        rule.field === "latitudeBand" ? "rule" : "user-declared",
        rule.explanation
      )
    );
  for (const d of result.dataChecks)
    rows.push(row(d.label, d.declared, d.status, S.dataStatus[d.status], d.origin, [d.observed && `${S.colDataLbl}: ${d.observed}`, d.note, d.source && `${S.sources}: ${d.source}`].filter(Boolean).join(" · ")));
  rows.push(row(S.noveltyTitle, null, result.novelty.status === "new" ? "pass" : "partial", S.novelty[result.novelty.status], "rule", result.novelty.message));

  return `<div class="table-wrap"><table class="check-table">
    <thead><tr><th>${esc(S.colCheck)}</th><th>${esc(S.colDeclared)}</th><th>${esc(S.colResult)}</th><th>${esc(S.colOrigin)}</th><th>${esc(S.colNote)}</th></tr></thead>
    <tbody>${rows.join("")}</tbody>
  </table></div>`;
}
