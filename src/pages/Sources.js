// #/sources — Sources & Method (Fase 3 – Prompt 3). All content comes from JSON:
//   data/sources-page.json (texts), data/official-resources.json, data/nasa-endpoints.json,
//   data/datasources.json, data/references.json, data/education.json, data/nasa-cache/index.json (radiation),
//   src/services/validation-score.js (SCORE_CONFIG → score table, never out of date).
// "removed" items are never rendered. Section links scroll in place (the app uses hash routing).

import { S } from "../strings.js";
import { esc } from "../util.js";
import { NavBar, ConfidenceTag } from "../components/small.js";
import { loadStatic } from "../services/nasa/http.js";
import { loadNasaStatic } from "../services/nasa/sources.js";
import { scoreRulesTable, SCORE_CONFIG, NOT_SITE_SPECIFIC } from "../services/validation-score.js";

const DIMS = ["geology", "terrain", "atmosphere", "temperature", "water", "biology", "subsurface", "operational"];
const shown = (i) => i && i.verification !== "removed";
const link = (url, text) => (url ? `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(text || url)}</a>` : esc(text || ""));
const vBadge = (v) => (v === "verified" ? `<span class="vbadge v-verified">verified</span>` : `<span class="vbadge v-unverified">unverified</span>`);
const doiLink = (doi) => (doi ? `<a href="https://doi.org/${esc(doi)}" target="_blank" rel="noopener">doi:${esc(doi)}</a>` : "");
const opt = (v, label, sel) => `<option value="${esc(v)}" ${v === sel ? "selected" : ""}>${esc(label)}</option>`;

async function safe(path, fallback) {
  try {
    return await loadStatic(path);
  } catch (e) {
    console.warn(`[sources] ${path}: ${e.message}`);
    return fallback;
  }
}

function citeFor(refs, topic) {
  if (!topic) return "";
  const list = refs.filter((r) => r.topic === topic && r.verification === "verified");
  if (!list.length) return "";
  return ` <span class="cite">(${list
    .slice(0, 4)
    .map((r) => {
      const first = (r.authors?.[0] || "").split(",")[0];
      const etal = r.authors?.length > 2 ? " et al." : r.authors?.length === 2 ? ` & ${(r.authors[1] || "").split(",")[0]}` : "";
      return `<a href="#/sources?s=references" data-jump="ref-${esc(r.id)}">${esc(first)}${esc(etal)}, ${esc(r.year)}</a>`;
    })
    .join("; ")})</span>`;
}

function thresholdRows(ep) {
  const rows = [];
  for (const [srcKey, src] of Object.entries(ep.sources)) {
    for (const [key, th] of Object.entries(src.thresholds || {})) {
      let rule;
      if (th.direction === "higher") rule = `strong ≥ ${th.strong} · partial ≥ ${th.partial} · weak below`;
      else if (th.direction === "lower") rule = `strong < ${th.strong} · partial < ${th.partial} · weak above`;
      else if (th.fixedLevel) rule = `always "${th.fixedLevel}"`;
      else if (th.strongClasses) rule = `strong: classes ${th.strongClasses.join(", ")} · partial: ${th.partialClasses.join(", ")} · water = ${th.waterClass}`;
      else if (key === "vegetationClass") rule = `none < ${th.noneMax} · sparse < ${th.sparseMax} · moderate < ${th.moderateMax} · dense above`;
      else if (key === "climateClass") rule = `polar-cold if T2M < ${th.polarColdMaxT2M} °C · high-altitude if ≥ ${th.highAltitudeMinElevation} m · hyper-arid < ${th.hyperAridMaxMm} · arid < ${th.aridMaxMm} · semi-arid < ${th.semiAridMaxMm} mm/yr · else humid`;
      else rule = JSON.stringify(th);
      rows.push(`<tr><td><code>${esc(key)}</code></td><td>${esc(th.measure || "")} <span class="muted">${esc(th.unit || "")}</span></td><td>${esc(rule)}</td><td class="small muted">${esc(src.name)}</td></tr>`);
    }
  }
  return rows.join("");
}

export async function Sources(root, { query }, data) {
  root.innerHTML = `<div class="page-wrap">${NavBar("sources")}<main class="page"><p class="muted">${esc(S.loading)}</p></main></div>`;
  const [page, official, datasources, references, education, nasa] = await Promise.all([
    safe("data/sources-page.json", null),
    safe("data/official-resources.json", { groups: [] }),
    safe("data/datasources.json", { items: [] }),
    safe("data/references.json", { items: [] }),
    safe("data/education.json", null),
    loadNasaStatic().catch(() => null),
  ]);
  if (!page) {
    root.querySelector("main").innerHTML = `<p>${esc(S.loadError)}</p>`;
    return;
  }
  const ep = nasa?.endpoints;
  const refs = (references.items || []).filter(shown);
  const ds = (datasources.items || []).filter(shown);
  const rad = nasa?.cache?.shared?.radiation;
  const agencies = [...new Set(ds.map((d) => d.agency.split(/[ (]/)[0]))].sort();

  const sec = (id, inner) => `<section id="sec-${id}" class="src-sec"><h2>${esc(page.sections.find((s) => s.id === id).title)}</h2>${inner}</section>`;

  // 1. how to read
  const H = page.howToRead;
  const howToRead = `<div class="grid3 grid2">
    <div><h3 class="h3">Verification</h3><ul class="plain">${H.verification.filter((v) => v.tag !== "removed").map((v) => `<li>${vBadge(v.tag)} ${esc(v.text)}</li>`).join("")}<li class="small muted">${esc(H.verification.find((v) => v.tag === "removed").text)}</li></ul></div>
    <div><h3 class="h3">NASA data status</h3><ul class="plain">${H.status.map((s) => `<li><span class="nasa-st nasa-st-${s.tag}">${s.tag}</span> ${esc(s.text)}</li>`).join("")}</ul></div>
  </div>`;

  // 2. official resources
  const officialHtml = (official.groups || [])
    .map((g) => {
      const items = (g.items || []).filter(shown);
      if (!items.length) return "";
      return `<h3 class="h3">${esc(g.title)} ${g.official ? `<span class="obadge">Official challenge resource</span>` : ""}</h3>
      ${g.note ? `<p class="small muted">${esc(g.note)}</p>` : ""}
      <ul class="res-list">${items
        .map((i) => `<li><strong>${link(i.url, i.name)}</strong> <span class="muted small">· ${esc(i.agency)}</span> ${vBadge(i.verification)}
          <div class="small">${esc(i.what || "")}</div>${i.usedIn ? `<div class="small used">Used in this site: ${esc(i.usedIn)}</div>` : ""}</li>`)
        .join("")}</ul>`;
    })
    .join("");

  // 3. live integrations
  const live = ep
    ? `<div class="table-wrap"><table class="ev-table"><thead><tr><th>Source</th><th>Status</th><th>Auth</th><th>Browser (CORS)</th><th>Last check</th><th>Used in</th></tr></thead><tbody>${Object.values(ep.sources)
        .filter((s) => s.baseUrl)
        .map(
          (s) => `<tr><td>${link(s.baseUrl.replace(/\{.*$/, ""), s.name)}${s.officialChallengeResource ? ` <span class="obadge">Official</span>` : ""}</td>
          <td><span class="st-${esc(s.status)}">${esc(s.status)}</span></td><td class="small">${esc(s.auth || "")}</td>
          <td>${s.cors === true ? "yes" : s.cors === false ? "no (pre-computed)" : "—"}</td><td>${esc(s.testedAt || "")}</td>
          <td class="small">${esc((s.usedIn || []).join("; ") || "—")}</td></tr>`
        )
        .join("")}</tbody></table></div><p class="small muted">From data/nasa-endpoints.json — see also NASA-DATA-USAGE.md.</p>`
    : `<p class="muted">—</p>`;

  // 4. data sources (filterable)
  const dataHtml = `<div class="filters">
      <label>Body <select id="f-body">${opt("", "All", "")}${["Earth", "Moon", "Mars"].map((b) => opt(b, b, "")).join("")}</select></label>
      <label>Agency <select id="f-agency">${opt("", "All", "")}${agencies.map((a) => opt(a, a, "")).join("")}</select></label>
      <label>In app <select id="f-used">${opt("", "All", "")}${opt("yes", "Used in app", "")}${opt("no", "Cited only", "")}</select></label>
      <span id="f-count" class="small muted"></span>
    </div>
    <div class="table-wrap"><table class="ev-table ds-table"><thead><tr><th>Name</th><th>Agency</th><th>Body</th><th>Dimensions</th><th>Resolution</th><th>Access</th><th>DOI</th><th>In app</th><th>Check</th></tr></thead><tbody>${ds
      .map(
        (d) => `<tr data-body="${esc(d.body)}" data-agency="${esc(d.agency.split(/[ (]/)[0])}" data-used="${d.usedInApp ? "yes" : "no"}">
        <td>${link(d.url, d.name)}${d.version ? ` <span class="muted small">v${esc(String(d.version).replace(/^v/i, ""))}</span>` : ""}<div class="small muted">${esc(d.usedFor || "")}</div></td>
        <td class="small">${esc(d.agency)}</td><td>${esc(d.body)}</td>
        <td class="small">${esc((d.dimensions || []).filter((x) => DIMS.includes(x)).map((x) => S.dimensionLabels[x]).join(", "))}</td>
        <td class="small">${esc(d.resolution || "—")}</td><td>${esc(d.access || "—")}</td><td class="small">${doiLink(d.doi) || "—"}</td>
        <td>${d.usedInApp ? "yes" : "cited only"}</td><td>${vBadge(d.verification)}</td></tr>`
      )
      .join("")}</tbody></table></div>`;

  // 5. theory
  const theory = page.theory
    .map(
      (t) => `<h3 class="h3">${esc(t.title)}</h3><p>${esc(t.text)}${citeFor(refs, t.citeTopic)}${t.teamToFill ? ` <span class="tofill">team to fill</span>` : ""}</p>
      ${
        t.showRadiation && rad
          ? `<p class="small">ISS (NASA OSDR RadLab, ${esc(rad.instrument)}, ${esc(rad.period)}): median absorbed dose rate <strong>${esc(rad.medianUGyPerH)} µGy/h</strong> (mean ${esc(rad.meanUGyPerH)}, n = ${esc(rad.n)}). Earth natural background: ${esc(rad.earthBackground.value)} ${esc(rad.earthBackground.unit)} — ${link(rad.earthBackground.url, rad.earthBackground.citation)} (manual). ${esc(rad.earthBackground.caveat)}</p>`
          : ""
      }`
    )
    .join("");

  // 6. method
  const M = page.method;
  const C = SCORE_CONFIG;
  const method = `<h3 class="h3">How a site gets its colour on the map</h3>
    <div class="table-wrap"><table class="ev-table"><tbody>${M.mapStates.map((m) => `<tr><th scope="row">${esc(m.state)}</th><td>${esc(m.rule)}</td></tr>`).join("")}</tbody></table></div>
    <h3 class="h3">How NASA indicators become levels <span class="tofill">project rules</span></h3>
    <p class="small muted">${esc(M.indicatorsIntro)}</p>
    ${ep ? `<div class="table-wrap"><table class="ev-table"><thead><tr><th>Indicator</th><th>Measure</th><th>Rule</th><th>Source</th></tr></thead><tbody>${thresholdRows(ep)}</tbody></table></div>` : ""}
    <h3 class="h3">How the validation score works</h3>
    <p class="small muted">${esc(M.scoreIntro)}</p>
    <div class="table-wrap"><table class="ev-table"><thead><tr><th>Rule</th><th>Points</th><th>Notes</th></tr></thead><tbody>${scoreRulesTable()
      .map((r) => `<tr>${r.map((x) => `<td>${esc(x)}</td>`).join("")}</tr>`)
      .join("")}</tbody></table></div>
    <p class="small">Score range 0–${C.max}. Indicators never scored for agreement (same value for every Earth site): ${esc(NOT_SITE_SPECIFIC.join(", "))}. Anti-farm: same nickname + same site + same mission counts once; points less than 1 km from a site the same nickname already validated do not add up.</p>
    <p class="notice">${esc(M.scoreWarning)}</p>
    <h3 class="h3">Simulation</h3><p class="small">${esc(M.simulation)}</p>`;

  // 7. education
  const csa = (official.groups || []).find((g) => g.id === education?.existingMaterial?.resourceGroup);
  const eduHtml = education
    ? `<p><span class="tofill">${esc(education.badge)}</span> ${esc(education.intro)}</p>
      <div class="table-wrap"><table class="ev-table"><tbody>${education.fields
        .map((f) => `<tr><th scope="row">${esc(f.label)}</th><td><span class="tofill-text">${esc(f.value)}</span><div class="small muted">${esc(f.hint)}</div></td></tr>`)
        .join("")}</tbody></table></div>
      <p class="small">${esc(education.existingMaterial.text)} ${(csa?.items || []).filter((i) => i.verification === "verified").map((i) => link(i.url, i.name)).join(" · ")}</p>`
    : "";

  // 8. references
  const refHtml = refs.length
    ? `<ol class="refs">${[...refs]
        .sort((a, b) => (a.apa || "").localeCompare(b.apa || ""))
        .map((r) => `<li id="ref-${esc(r.id)}">${esc(r.apa || `${(r.authors || []).join(", ")} (${r.year}). ${r.title}. ${r.journal || ""}`)} ${r.doi ? doiLink(r.doi) : link(r.url)} ${vBadge(r.verification)}
          ${r.supports ? `<div class="small muted">${esc(r.supports)}</div>` : ""}</li>`)
        .join("")}</ol>`
    : `<p class="muted">—</p>`;

  // 9. AI
  const aiRule = (official.groups || []).flatMap((g) => g.items || []).find((i) => /artificial intelligence|\bAI\b/i.test(i.name) && shown(i));
  const ai = `<ul>${page.ai.items.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>${aiRule ? `<p class="small">Rule: ${link(aiRule.url, aiRule.name)} ${vBadge(aiRule.verification)}</p>` : ""}`;

  // 10. licenses
  const L = page.licenses;
  const lic = `<p>${esc(L.code)}</p><ul class="small">${L.credits.map((c) => `<li>${esc(c)}</li>`).join("")}</ul><p class="notice">${esc(L.disclaimer)}</p>`;

  const counts = (arr) => ["verified", "unverified"].map((v) => `${arr.filter((x) => x.verification === v).length} ${v}`).join(" · ");
  root.querySelector("main").outerHTML = `<main class="page sources-page">
    <h1>${esc(page.title)}</h1>
    <p class="muted">${esc(page.intro)}</p>
    <div class="src-layout">
      <nav class="src-toc" aria-label="On this page"><strong>On this page</strong><ol>${page.sections
        .map((s) => `<li><a href="#/sources?s=${s.id}" data-jump="sec-${s.id}">${esc(s.title)}</a></li>`)
        .join("")}</ol>
        <p class="small muted">Data sources: ${counts(ds)}<br>References: ${counts(refs)}</p></nav>
      <div class="src-body">
        ${sec("how-to-read", howToRead)}
        ${sec("official", officialHtml || `<p class="muted">—</p>`)}
        ${sec("live", live)}
        ${sec("data", dataHtml)}
        ${sec("theory", theory)}
        ${sec("method", method)}
        ${sec("education", eduHtml)}
        ${sec("references", refHtml)}
        ${sec("ai", ai)}
        ${sec("licenses", lic)}
      </div>
    </div>
  </main>`;

  // in-page navigation (hash routing → scroll instead of following #anchors)
  const jump = (id) => {
    const el = root.querySelector(`#${CSS.escape(id)}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      el.setAttribute("tabindex", "-1");
      el.focus({ preventScroll: true });
    }
  };
  root.querySelectorAll("[data-jump]").forEach((a) =>
    a.addEventListener("click", (e) => {
      e.preventDefault();
      const id = a.dataset.jump;
      if (id.startsWith("sec-")) history.replaceState(null, "", `#/sources?s=${id.slice(4)}`);
      jump(id);
    })
  );
  const s = query.get("s");
  if (s) setTimeout(() => jump(`sec-${s}`), 50);

  // filters
  const apply = () => {
    const b = root.querySelector("#f-body").value, a = root.querySelector("#f-agency").value, u = root.querySelector("#f-used").value;
    let n = 0;
    root.querySelectorAll(".ds-table tbody tr").forEach((tr) => {
      const ok = (!b || tr.dataset.body === b) && (!a || tr.dataset.agency === a) && (!u || tr.dataset.used === u);
      tr.hidden = !ok;
      if (ok) n++;
    });
    root.querySelector("#f-count").textContent = `${n} of ${ds.length}`;
  };
  ["#f-body", "#f-agency", "#f-used"].forEach((id) => root.querySelector(id).addEventListener("change", apply));
  apply();
}
