// #/leaderboard — ranking by validated sites (Fase 3 – Prompt 2).
// Query: ?tab=all|landing|rover|base|sa   ·   ?admin=<ADMIN_CODE from src/config.local.js> (demo admin mode)

import { S } from "../strings.js";
import { esc } from "../util.js";
import { NavBar } from "../components/small.js";
import { getLeaderboard, listContributions, contributionPoint, confirmContribution, isAdmin, storageName, antiFarm } from "../services/leaderboard.js";

const TABS = ["all", "landing", "rover", "base", "sa"];

function bestLink(c, data) {
  const p = contributionPoint(c);
  const name = p?.name || "—";
  if (c.mode === "existing" && data.siteById[c.siteId]) return `<a href="#/map/${esc(c.planet)}/${esc(c.mission)}?site=${esc(c.siteId)}">${esc(name)}</a> <span class="muted small">(${c.score})</span>`;
  return `${esc(name)} <span class="muted small">(${esc(p ? `${p.lat.toFixed(2)}, ${p.lon.toFixed(2)}` : "")} · ${c.score})</span>`;
}

export async function Leaderboard(root, { query }, data) {
  const tab = TABS.includes(query.get("tab")) ? query.get("tab") : "all";
  const admin = await isAdmin(query);
  root.innerHTML = `<div class="page-wrap">${NavBar("leaderboard")}<main class="page narrow"><p class="muted">${esc(S.loading)}</p></main></div>`;

  const [rows, all, store] = await Promise.all([getLeaderboard({ scope: tab }), listContributions(), storageName()]);
  const table = rows.length
    ? `<div class="table-wrap"><table class="ev-table lb-table"><thead><tr>${S.lbCols.map((h) => `<th scope="col">${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows
        .map(
          (r) => `<tr>
          <td class="num">${r.rank}</td>
          <td><strong>${esc(r.nickname)}</strong>${r.seedOnly ? ` <span class="seed-label">${esc(S.lbSeedLabel)}</span>` : ""}
            ${r.badges.map((b) => `<span class="badge">${esc(b)}</span>`).join("")}</td>
          <td class="num">${r.validated}</td>
          <td class="num">${r.score}</td>
          <td>${r.best ? bestLink(r.best, data) : "—"}</td>
          <td>${r.top ? `<span class="status-badge st-${esc(r.top)}">${esc(S.cStatus[r.top] || r.top)}</span>` : "—"}</td>
        </tr>`
        )
        .join("")}</tbody></table></div>`
    : `<p class="muted">${esc(S.lbEmpty)}</p>`;

  let adminHtml = "";
  if (admin) {
    const flags = antiFarm(all);
    const recent = all.filter((c) => !c.seed).slice(-30).reverse();
    adminHtml = `<section class="m-block"><h2 class="h3">${esc(S.lbAdmin)} · ${esc(S.lbRecent)}</h2>${
      recent.length
        ? `<ul class="admin-list">${recent
            .map(
              (c) => `<li><strong>${esc(c.nickname)}</strong> · ${esc(contributionPoint(c)?.name || "—")} · ${esc(c.mission)} · ${c.score} · ${esc(S.cStatus[c.status] || c.status)}${flags.get(c.id)?.counted ? "" : ` <span class="muted small">(${esc(flags.get(c.id)?.reason || "")})</span>`}
              <button type="button" class="btn btn-small" data-confirm="${esc(c.id)}" data-on="${c.status === "team-confirmed" ? "0" : "1"}">${esc(c.status === "team-confirmed" ? S.lbUnconfirm : S.lbConfirm)}</button></li>`
            )
            .join("")}</ul>`
        : `<p class="muted">${esc(S.lbEmpty)}</p>`
    }</section>`;
  }

  root.querySelector("main").innerHTML = `
    <h1>${esc(S.lbHeading)}</h1>
    <p class="notice">${esc(S.lbNotice)}</p>
    <nav class="tabs" aria-label="Leaderboard scope">${TABS.map((t) => `<a class="tab ${t === tab ? "on" : ""}" ${t === tab ? 'aria-current="page"' : ""} href="#/leaderboard?tab=${t}">${esc(S.lbTabs[t])}</a>`).join("")}</nav>
    ${table}
    <p class="small muted">Order: validated sites (Auto-checked or Team-confirmed), then total score, then first arrival. · ${esc(S.lbStorage(store))}</p>
    <div class="m-actions"><a class="btn btn-primary" style="--accent:#9cc0ff" href="#/contribute">${esc(S.navValidate)}</a></div>
    ${adminHtml}`;

  root.querySelectorAll("[data-confirm]").forEach((b) =>
    b.addEventListener("click", async () => {
      await confirmContribution(b.dataset.confirm, b.dataset.on === "1");
      Leaderboard(root, { query }, data);
    })
  );
}
