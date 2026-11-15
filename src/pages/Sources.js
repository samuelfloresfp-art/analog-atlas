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
import { LANG } from "../i18n.js";

// PT: page texts come from *.pt.json; descriptive texts of the other JSON files come from
// data/sources-i18n.pt.json (looked up at render time — the shared English objects are never mutated).
const PT = LANG === "pt";
const T = (en, pt) => (PT ? pt : en);
let I18N = {};
const trOfficialGroup = (g, k) => I18N.official?.groups?.[g.id]?.[k] ?? g[k];
const trOfficialItem = (i, k) => I18N.official?.items?.[i.name]?.[k] ?? i[k];
const trEp = (key, s, k) => I18N.endpoints?.[key]?.[k] ?? s[k];
const BODY = { Earth: T("Earth", "Terra"), Moon: T("Moon", "Lua"), Mars: T("Mars", "Marte") };
const ACCESS = { open: T("open", "aberto"), login: "login" };
const STATUS = { verified: T("verified", "verificado"), failed: T("failed", "falhou"), candidate: T("candidate", "candidato") };
const NASA_ST = { live: T("live", "ao vivo"), cached: T("cached", "em cache"), failed: T("failed", "falhou") };
const trRes = (r) => (PT && r ? r.replace(/arc-second/g, "segundo de arco").replace(/pixels per degree/g, "pixels por grau").replace(/layer name/g, "camada") : r);

const DIMS = ["geology", "terrain", "atmosphere", "temperature", "water", "biology", "subsurface", "operational"];
const shown = (i) => i && i.verification !== "removed";
const link = (url, text) => (url ? `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(text || url)}</a>` : esc(text || ""));
const vBadge = (v) => (v === "verified" ? `<span class="vbadge v-verified">${T("verified", "verificado")}</span>` : `<span class="vbadge v-unverified">${T("unverified", "não verificado")}</span>`);
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
      const etal = r.authors?.length > 2 ? " et al." : r.authors?.length === 2 ? ` ${T("&", "e")} ${(r.authors[1] || "").split(",")[0]}` : "";
      return `<a href="#/sources?s=references" data-jump="ref-${esc(r.id)}">${esc(first)}${esc(etal)}, ${esc(r.year)}</a>`;
    })
    .join("; ")})</span>`;
}

function thresholdRows(ep) {
  const rows = [];
  for (const [srcKey, src] of Object.entries(ep.sources)) {
    for (const [key, th] of Object.entries(src.thresholds || {})) {
      let rule;
      const st = T("strong", "forte"), pa = T("partial", "parcial"), wk = T("weak", "fraco");
      const lvl = { strong: st, partial: pa, weak: wk, nodata: T("no data", "sem dado") };
      if (th.direction === "higher") rule = `${st} ≥ ${th.strong} · ${pa} ≥ ${th.partial} · ${wk} ${T("below", "abaixo")}`;
      else if (th.direction === "lower") rule = `${st} < ${th.strong} · ${pa} < ${th.partial} · ${wk} ${T("above", "acima")}`;
      else if (th.fixedLevel) rule = `${T("always", "sempre")} "${lvl[th.fixedLevel] || th.fixedLevel}"`;
      else if (th.strongClasses) rule = T(`strong: classes ${th.strongClasses.join(", ")} · partial: ${th.partialClasses.join(", ")} · water = ${th.waterClass}`, `forte: classes ${th.strongClasses.join(", ")} · parcial: ${th.partialClasses.join(", ")} · água = ${th.waterClass}`);
      else if (key === "vegetationClass") rule = T(`none < ${th.noneMax} · sparse < ${th.sparseMax} · moderate < ${th.moderateMax} · dense above`, `nenhuma < ${th.noneMax} · esparsa < ${th.sparseMax} · moderada < ${th.moderateMax} · densa acima`);
      else if (key === "climateClass") rule = T(`polar-cold if T2M < ${th.polarColdMaxT2M} °C · high-altitude if ≥ ${th.highAltitudeMinElevation} m · hyper-arid < ${th.hyperAridMaxMm} · arid < ${th.aridMaxMm} · semi-arid < ${th.semiAridMaxMm} mm/yr · else humid`, `polar-frio se T2M < ${th.polarColdMaxT2M} °C · alta altitude se ≥ ${th.highAltitudeMinElevation} m · hiperárido < ${th.hyperAridMaxMm} · árido < ${th.aridMaxMm} · semiárido < ${th.semiAridMaxMm} mm/ano · senão úmido`);
      else rule = JSON.stringify(th);
      const measure = I18N.endpoints?.[srcKey]?.measures?.[key] ?? th.measure ?? "";
      const unit = I18N.endpoints?.[srcKey]?.units?.[key] ?? (PT && th.unit ? th.unit.replace("mm/yr", "mm/ano").replace("/day", "/dia") : th.unit) ?? "";
      rows.push(`<tr><td><code>${esc(key)}</code></td><td>${esc(measure)} <span class="muted">${esc(unit || "")}</span></td><td>${esc(rule)}</td><td class="small muted">${esc(src.name)}</td></tr>`);
    }
  }
  return rows.join("");
}

export async function Sources(root, { query }, data) {
  root.innerHTML = `<div class="page-wrap">${NavBar("sources")}<main class="page"><p class="muted">${esc(S.loading)}</p></main></div>`;
  const [pageEn, official, datasources, references, educationEn, nasa, pagePt, educationPt, i18n] = await Promise.all([
    safe("data/sources-page.json", null),
    safe("data/official-resources.json", { groups: [] }),
    safe("data/datasources.json", { items: [] }),
    safe("data/references.json", { items: [] }),
    safe("data/education.json", null),
    loadNasaStatic().catch(() => null),
    PT ? safe("data/sources-page.pt.json", null) : null,
    PT ? safe("data/education.pt.json", null) : null,
    PT ? safe("data/sources-i18n.pt.json", {}) : {},
  ]);
  const page = pagePt || pageEn;
  const education = educationPt || educationEn;
  I18N = i18n || {};
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
    <div><h3 class="h3">${T("Verification", "Verificação")}</h3><ul class="plain">${H.verification.filter((v) => v.tag !== "removed").map((v) => `<li>${vBadge(v.tag)} ${esc(v.text)}</li>`).join("")}<li class="small muted">${esc(H.verification.find((v) => v.tag === "removed").text)}</li></ul></div>
    <div><h3 class="h3">${T("NASA data status", "Status dos dados da NASA")}</h3><ul class="plain">${H.status.map((s) => `<li><span class="nasa-st nasa-st-${s.tag}">${NASA_ST[s.tag] || s.tag}</span> ${esc(s.text)}</li>`).join("")}</ul></div>
  </div>`;

  // 2. official resources
  const officialHtml = (official.groups || [])
    .map((g) => {
      const items = (g.items || []).filter(shown);
      if (!items.length) return "";
      const note = trOfficialGroup(g, "note");
      return `<h3 class="h3">${esc(trOfficialGroup(g, "title"))} ${g.official ? `<span class="obadge">${T("Official challenge resource", "Recurso oficial do desafio")}</span>` : ""}</h3>
      ${note ? `<p class="small muted">${esc(note)}</p>` : ""}
      <ul class="res-list">${items
        .map((i) => `<li><strong>${link(i.url, trOfficialItem(i, "name"))}</strong> <span class="muted small">· ${esc(i.agency)}</span> ${vBadge(i.verification)}
          <div class="small">${esc(trOfficialItem(i, "what") || "")}</div>${i.usedIn ? `<div class="small used">${T("Used in this site", "Uso neste site")}: ${esc(trOfficialItem(i, "usedIn"))}</div>` : ""}</li>`)
        .join("")}</ul>`;
    })
    .join("");

  // 3. live integrations
  const live = ep
    ? `<div class="table-wrap"><table class="ev-table"><thead><tr><th>${T("Source", "Fonte")}</th><th>Status</th><th>${T("Auth", "Autenticação")}</th><th>${T("Browser (CORS)", "Navegador (CORS)")}</th><th>${T("Last check", "Última conferência")}</th><th>${T("Used in", "Usado em")}</th></tr></thead><tbody>${Object.entries(ep.sources)
        .filter(([, s]) => s.baseUrl)
        .map(
          ([k, s]) => `<tr><td>${link(s.baseUrl.replace(/\{.*$/, ""), s.name)}${s.officialChallengeResource ? ` <span class="obadge">${T("Official", "Oficial")}</span>` : ""}</td>
          <td><span class="st-${esc(s.status)}">${esc(STATUS[s.status] || s.status)}</span></td><td class="small">${esc(trEp(k, s, "auth") || "")}</td>
          <td>${s.cors === true ? T("yes", "sim") : s.cors === false ? T("no (pre-computed)", "não (pré-calculado)") : "—"}</td><td>${esc(s.testedAt || "")}</td>
          <td class="small">${esc((trEp(k, s, "usedIn") || []).join("; ") || "—")}</td></tr>`
        )
        .join("")}</tbody></table></div><p class="small muted">${T("From data/nasa-endpoints.json — see also NASA-DATA-USAGE.md.", "Dados de data/nasa-endpoints.json — veja também NASA-DATA-USAGE.md.")}</p>`
    : `<p class="muted">—</p>`;

  // 4. data sources (filterable)
  const dataHtml = `<div class="filters">
      <label>${T("Body", "Corpo")} <select id="f-body">${opt("", T("All", "Todos"), "")}${["Earth", "Moon", "Mars"].map((b) => opt(b, BODY[b], "")).join("")}</select></label>
      <label>${T("Agency", "Agência")} <select id="f-agency">${opt("", T("All", "Todas"), "")}${agencies.map((a) => opt(a, a, "")).join("")}</select></label>
      <label>${T("In app", "No app")} <select id="f-used">${opt("", T("All", "Todos"), "")}${opt("yes", T("Used in app", "Usado no app"), "")}${opt("no", T("Cited only", "Apenas citado"), "")}</select></label>
      <span id="f-count" class="small muted"></span>
    </div>
    <div class="table-wrap"><table class="ev-table ds-table"><thead><tr><th>${T("Name", "Nome")}</th><th>${T("Agency", "Agência")}</th><th>${T("Body", "Corpo")}</th><th>${T("Dimensions", "Dimensões")}</th><th>${T("Resolution", "Resolução")}</th><th>${T("Access", "Acesso")}</th><th>DOI</th><th>${T("In app", "No app")}</th><th>${T("Check", "Conferência")}</th></tr></thead><tbody>${ds
      .map(
        (d) => `<tr data-body="${esc(d.body)}" data-agency="${esc(d.agency.split(/[ (]/)[0])}" data-used="${d.usedInApp ? "yes" : "no"}">
        <td>${link(d.url, d.name)}${d.version ? ` <span class="muted small">v${esc(String(d.version).replace(/^v/i, ""))}</span>` : ""}<div class="small muted">${esc(I18N.datasources?.[d.id] ?? d.usedFor ?? "")}</div></td>
        <td class="small">${esc(d.agency)}</td><td>${esc(BODY[d.body] || d.body)}</td>
        <td class="small">${esc((d.dimensions || []).filter((x) => DIMS.includes(x)).map((x) => S.dimensionLabels[x]).join(", "))}</td>
        <td class="small">${esc(trRes(d.resolution) || "—")}</td><td>${esc(ACCESS[d.access] || d.access || "—")}</td><td class="small">${doiLink(d.doi) || "—"}</td>
        <td>${d.usedInApp ? T("yes", "sim") : T("cited only", "apenas citado")}</td><td>${vBadge(d.verification)}</td></tr>`
      )
      .join("")}</tbody></table></div>`;

  // 5. theory
  const theory = page.theory
    .map(
      (t) => `<h3 class="h3">${esc(t.title)}</h3><p>${esc(t.text)}${citeFor(refs, t.citeTopic)}${t.teamToFill ? ` <span class="tofill">${T("team to fill", "equipe preencher")}</span>` : ""}</p>
      ${
        t.showRadiation && rad
          ? T(
              `<p class="small">ISS (NASA OSDR RadLab, ${esc(rad.instrument)}, ${esc(rad.period)}): median absorbed dose rate <strong>${esc(rad.medianUGyPerH)} µGy/h</strong> (mean ${esc(rad.meanUGyPerH)}, n = ${esc(rad.n)}). Earth natural background: ${esc(rad.earthBackground.value)} ${esc(rad.earthBackground.unit)} — ${link(rad.earthBackground.url, rad.earthBackground.citation)} (manual). ${esc(rad.earthBackground.caveat)}</p>`,
              `<p class="small">ISS (NASA OSDR RadLab, ${esc(rad.instrument.replace("project", "projeto"))}, ${esc(rad.period.replace(" to ", " a "))}): taxa de dose absorvida mediana <strong>${esc(String(rad.medianUGyPerH).replace(".", ","))} µGy/h</strong> (média ${esc(String(rad.meanUGyPerH).replace(".", ","))}, n = ${esc(rad.n)}). Radiação natural de fundo na Terra: ${esc(String(rad.earthBackground.value).replace(".", ","))} ${esc(rad.earthBackground.unit.replace("mSv/yr", "mSv/ano").replace("0.27", "0,27"))} — ${link(rad.earthBackground.url, rad.earthBackground.citation)} (manual). Dose efetiva (Sv) e dose absorvida (Gy) são grandezas diferentes; aparecem lado a lado só para dar a ordem de grandeza.</p>`
            )
          : ""
      }`
    )
    .join("");

  // 6. method
  const M = page.method;
  const C = SCORE_CONFIG;
  const method = `<h3 class="h3">${T("How a site gets its colour on the map", "Como um local ganha sua cor no mapa")}</h3>
    <div class="table-wrap"><table class="ev-table"><tbody>${M.mapStates.map((m) => `<tr><th scope="row">${esc(m.state)}</th><td>${esc(m.rule)}</td></tr>`).join("")}</tbody></table></div>
    <h3 class="h3">${T("How NASA indicators become levels", "Como os indicadores da NASA viram níveis")} <span class="tofill">${T("project rules", "regras do projeto")}</span></h3>
    <p class="small muted">${esc(M.indicatorsIntro)}</p>
    ${ep ? `<div class="table-wrap"><table class="ev-table"><thead><tr><th>${T("Indicator", "Indicador")}</th><th>${T("Measure", "Medida")}</th><th>${T("Rule", "Regra")}</th><th>${T("Source", "Fonte")}</th></tr></thead><tbody>${thresholdRows(ep)}</tbody></table></div>` : ""}
    <h3 class="h3">${T("How the validation score works", "Como funciona a pontuação de validação")}</h3>
    <p class="small muted">${esc(M.scoreIntro)}</p>
    <div class="table-wrap"><table class="ev-table"><thead><tr><th>${T("Rule", "Regra")}</th><th>${T("Points", "Pontos")}</th><th>${T("Notes", "Observações")}</th></tr></thead><tbody>${scoreRulesTable()
      .map((r) => `<tr>${r.map((x) => `<td>${esc(x)}</td>`).join("")}</tr>`)
      .join("")}</tbody></table></div>
    <p class="small">${T(
      `Score range 0–${C.max}. Indicators never scored for agreement (same value for every Earth site): ${esc(NOT_SITE_SPECIFIC.join(", "))}. Anti-farm: same nickname + same site + same mission counts once; points less than 1 km from a site the same nickname already validated do not add up.`,
      `Faixa da pontuação: 0–${C.max}. Indicadores que nunca pontuam por concordância (mesmo valor para todo local na Terra): ${esc(NOT_SITE_SPECIFIC.join(", "))}. Antifraude: mesmo apelido + mesmo local + mesma missão conta uma vez só; pontos a menos de 1 km de um local que o mesmo apelido já validou não somam.`
    )}</p>
    <p class="notice">${esc(M.scoreWarning)}</p>
    <h3 class="h3">${T("Simulation", "Simulação")}</h3><p class="small">${esc(M.simulation)}</p>`;

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
          ${r.supports ? `<div class="small muted">${esc(I18N.references?.[r.id] ?? r.supports)}</div>` : ""}</li>`)
        .join("")}</ol>`
    : `<p class="muted">—</p>`;

  // 9. AI
  const aiRule = (official.groups || []).flatMap((g) => g.items || []).find((i) => /artificial intelligence|\bAI\b/i.test(i.name) && shown(i));
  const ai = `<ul>${page.ai.items.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>${aiRule ? `<p class="small">${T("Rule", "Regra")}: ${link(aiRule.url, trOfficialItem(aiRule, "name"))} ${vBadge(aiRule.verification)}</p>` : ""}`;

  // 10. licenses
  const L = page.licenses;
  const lic = `<p>${esc(L.code)}</p><ul class="small">${L.credits.map((c) => `<li>${esc(c)}</li>`).join("")}</ul><p class="notice">${esc(L.disclaimer)}</p>`;

  const VLBL = { verified: T("verified", "verificados"), unverified: T("unverified", "não verificados") };
  const counts = (arr) => ["verified", "unverified"].map((v) => `${arr.filter((x) => x.verification === v).length} ${VLBL[v]}`).join(" · ");
  root.querySelector("main").outerHTML = `<main class="page sources-page">
    <h1>${esc(page.title)}</h1>
    <p class="muted">${esc(page.intro)}</p>
    <div class="src-layout">
      <nav class="src-toc" aria-label="${T("On this page", "Nesta página")}"><strong>${T("On this page", "Nesta página")}</strong><ol>${page.sections
        .map((s) => `<li><a href="#/sources?s=${s.id}" data-jump="sec-${s.id}">${esc(s.title)}</a></li>`)
        .join("")}</ol>
        <p class="small muted">${T("Data sources", "Fontes de dados")}: ${counts(ds)}<br>${T("References", "Referências")}: ${counts(refs)}</p></nav>
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
    root.querySelector("#f-count").textContent = `${n} ${T("of", "de")} ${ds.length}`;
  };
  ["#f-body", "#f-agency", "#f-used"].forEach((id) => root.querySelector(id).addEventListener("change", apply));
  apply();
}
