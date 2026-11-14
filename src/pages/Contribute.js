// #/contribute — "Validate a site" (Fase 3 – Prompt 2).
// Query: ?site=<id>&planet=<moon|mars>&mission=<landing|rover|base> pre-selects an existing site.
// Validation goes ONLY through services/validation-source.js; score rules live in services/validation-score.js.

import { S } from "../strings.js";
import { esc, normalize } from "../util.js";
import { NavBar } from "../components/small.js";
import { createWorldMap } from "../components/WorldMap.js";
import { validateCoordinates } from "../services/validation-source.js";
import { DIMENSIONS, LEVELS, computeScore, agreementRows, scoreRulesTable } from "../services/validation-score.js";
import { submitContribution, listContributions, antiFarm, newContributionId } from "../services/leaderboard.js";
import { getCombo } from "../services/criteria.js";

const DRAFT_KEY = "analogAtlas.contributeDraft.v1";

function emptyContribution(data, query) {
  const site = data.siteById[query.get("site")];
  return {
    id: newContributionId(),
    nickname: "",
    mode: "existing",
    siteId: site ? site.id : "",
    site: { lat: null, lon: null, name: "", country: "", environment: "" },
    planet: data.planets.includes(query.get("planet")) ? query.get("planet") : "mars",
    mission: data.missionById[query.get("mission")] ? query.get("mission") : "rover",
    mirrorFeature: "",
    dimensions: Object.fromEntries(DIMENSIONS.map((d) => [d, { level: "nodata", dataset: "", url: "", note: "" }])),
    lacks: [],
    requirements: {},
  };
}

function loadDraft() {
  try {
    return JSON.parse(sessionStorage.getItem(DRAFT_KEY) || "null");
  } catch {
    return null;
  }
}
function saveDraft(c) {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(c));
  } catch {
    /* ignore */
  }
}

const field = (id, label, input, hint = "") =>
  `<label class="field" for="${id}"><span>${esc(label)}</span>${input}${hint ? `<small class="muted">${esc(hint)}</small>` : ""}</label>`;
const opt = (v, label, sel) => `<option value="${esc(v)}" ${v === sel ? "selected" : ""}>${esc(label)}</option>`;

export function Contribute(root, { query }, data) {
  const draft = loadDraft();
  const fromCard = !!query.get("site");
  let c = draft && !fromCard ? { ...emptyContribution(data, query), ...draft, id: newContributionId() } : emptyContribution(data, query);
  if (fromCard) c.nickname = draft?.nickname || "";
  let report = null;
  let result = null;
  let miniMap = null;
  let marker = null;

  root.innerHTML = `<div class="page-wrap">
    ${NavBar("contribute")}
    <main class="page narrow contribute">
      <h1>${esc(S.cHeading)}</h1>
      <p class="muted">${esc(S.cIntro)}</p>
      <p class="notice">${esc(S.cNoPersonal)}</p>
      <form id="cform" novalidate>
        <section class="m-block">
          ${field("c-nick", S.cNickname, `<input id="c-nick" name="nickname" maxlength="20" autocomplete="off" required value="${esc(c.nickname)}" />`)}
        </section>

        <section class="m-block">
          <fieldset class="field"><legend>${esc(S.cMode)}</legend>
            <label><input type="radio" name="mode" value="existing" ${c.mode === "existing" ? "checked" : ""}/> ${esc(S.cModeExisting)}</label>
            <label><input type="radio" name="mode" value="proposal" ${c.mode === "proposal" ? "checked" : ""}/> ${esc(S.cModeProposal)}</label>
          </fieldset>
          <div id="mode-existing">
            ${field("c-filter", S.cFilter, `<input id="c-filter" type="search" autocomplete="off" />`)}
            ${field("c-site", S.cSite, `<select id="c-site" name="siteId" size="6"></select>`)}
          </div>
          <div id="mode-proposal">
            <p class="small muted">${esc(S.cMapHint)}</p>
            <div id="c-map" class="mini-map" aria-label="Map to place the proposed site"></div>
            <div class="grid2">
              ${field("c-lat", S.cLat, `<input id="c-lat" name="lat" inputmode="decimal" value="${esc(c.site.lat ?? "")}" />`)}
              ${field("c-lon", S.cLon, `<input id="c-lon" name="lon" inputmode="decimal" value="${esc(c.site.lon ?? "")}" />`)}
            </div>
            ${field("c-name", S.cName, `<input id="c-name" name="name" maxlength="80" value="${esc(c.site.name)}" />`)}
            <div class="grid2">
              ${field("c-country", S.cCountry, `<input id="c-country" name="country" maxlength="60" value="${esc(c.site.country)}" />`)}
              ${field("c-env", S.cEnvironment, `<input id="c-env" name="environment" maxlength="80" value="${esc(c.site.environment)}" />`)}
            </div>
          </div>
        </section>

        <section class="m-block">
          <h2 class="h3">${esc(S.cTarget)}</h2>
          <div class="grid2">
            ${field("c-planet", S.cPlanet, `<select id="c-planet" name="planet">${data.planets.map((p) => opt(p, S.planetNames[p], c.planet)).join("")}</select>`)}
            ${field("c-mission", S.cMission, `<select id="c-mission" name="mission">${data.missions.map((m) => opt(m.id, m.name, c.mission)).join("")}</select>`)}
          </div>
          ${field("c-mirror", S.cMirror, `<input id="c-mirror" name="mirrorFeature" maxlength="120" value="${esc(c.mirrorFeature)}" />`)}
        </section>

        <section class="m-block">
          <h2 class="h3">${esc(S.cDimensions)}</h2>
          <p class="small muted">${esc(S.cDimHint)} ${esc(S.cEvidenceNote)}</p>
          ${DIMENSIONS.map((d) => {
            const v = c.dimensions[d];
            return `<fieldset class="dim-field"><legend>${esc(S.dimensionLabels[d])}</legend>
              <div class="grid4">
                ${field(`d-${d}-level`, S.cLevel, `<select id="d-${d}-level" data-dim="${d}" data-k="level">${LEVELS.map((l) => opt(l, S.levelLabels[l], v.level)).join("")}</select>`)}
                ${field(`d-${d}-dataset`, S.cDataset, `<input id="d-${d}-dataset" data-dim="${d}" data-k="dataset" maxlength="80" value="${esc(v.dataset)}" />`)}
                ${field(`d-${d}-url`, S.cUrl, `<input id="d-${d}-url" data-dim="${d}" data-k="url" maxlength="300" value="${esc(v.url)}" />`)}
                ${field(`d-${d}-note`, S.cNote, `<input id="d-${d}-note" data-dim="${d}" data-k="note" maxlength="160" value="${esc(v.note)}" />`)}
              </div></fieldset>`;
          }).join("")}
        </section>

        <section class="m-block">
          ${field("c-lacks", S.cLacks, `<textarea id="c-lacks" name="lacks" rows="3" maxlength="600">${esc(c.lacks.join("\n"))}</textarea>`, S.cLacksHint)}
        </section>

        <section class="m-block">
          <h2 class="h3">${esc(S.cRequirements)}</h2>
          <p class="small muted">${esc(S.cRequirementsHint)}</p>
          <div id="c-reqs"></div>
        </section>

        <div class="m-actions"><button type="submit" class="btn btn-primary btn-big" style="--accent:#9cc0ff">${esc(S.cCheck)}</button></div>
      </form>
      <div id="c-result" aria-live="polite"></div>
      <details class="m-block"><summary>${esc(S.cHowScore)}</summary>
        <div class="table-wrap"><table class="ev-table"><thead><tr><th>${esc(S.cRuleCol)}</th><th>${esc(S.cPointsCol)}</th><th>${esc(S.cNotesCol)}</th></tr></thead><tbody>
          ${scoreRulesTable().map((r) => `<tr>${r.map((x) => `<td>${esc(x)}</td>`).join("")}</tr>`).join("")}
        </tbody></table></div>
        <p class="small muted">${esc(S.cEvidenceNote)} ${esc(S.lbNotice)}</p>
      </details>
    </main>
  </div>`;

  const $ = (s) => root.querySelector(s);
  const form = $("#cform");

  // ---- existing-site list with a simple filter
  const drawSites = () => {
    const q = normalize($("#c-filter").value);
    const list = data.sites.filter((s) => !q || normalize(`${s.name} ${s.country}`).includes(q));
    $("#c-site").innerHTML = list.map((s) => opt(s.id, `${s.name} — ${s.country}`, c.siteId)).join("");
  };
  $("#c-filter").addEventListener("input", drawSites);
  drawSites();

  // ---- requirements of the chosen planet·mission (required rules of criteria.json)
  const drawReqs = () => {
    const combo = getCombo(data, c.planet, c.mission);
    const rules = (combo?.rules || []).filter((r) => r.required);
    $("#c-reqs").innerHTML = rules
      .map((r) => {
        const a = c.requirements[r.id] || { ok: false, justification: "" };
        return `<div class="req-row">
          <label><input type="checkbox" data-req="${esc(r.id)}" ${a.ok ? "checked" : ""}/> <strong>${esc(r.label)}</strong> — <span class="small muted">${esc(r.explanation)}</span></label>
          ${field(`r-${r.id}`, S.cJustification, `<input id="r-${r.id}" data-just="${esc(r.id)}" maxlength="200" value="${esc(a.justification)}" />`)}
        </div>`;
      })
      .join("");
  };
  drawReqs();

  // ---- mini map for proposals
  const setPoint = (lat, lon) => {
    c.site.lat = Math.round(lat * 1e5) / 1e5;
    c.site.lon = Math.round(lon * 1e5) / 1e5;
    $("#c-lat").value = c.site.lat;
    $("#c-lon").value = c.site.lon;
    saveDraft(c);
  };
  const showMode = () => {
    $("#mode-existing").hidden = c.mode !== "existing";
    $("#mode-proposal").hidden = c.mode !== "proposal";
    if (c.mode === "proposal" && !miniMap) {
      const L = window.L;
      miniMap = createWorldMap($("#c-map"), { minZoom: 1 });
      marker = L.marker([0, 0], { draggable: true, icon: L.divIcon({ className: "site-marker", html: `<span class="dot dot-pin"></span>`, iconSize: [22, 22], iconAnchor: [11, 11] }) });
      if (Number.isFinite(c.site.lat) && Number.isFinite(c.site.lon) && c.site.lat !== null) marker.setLatLng([c.site.lat, c.site.lon]).addTo(miniMap);
      miniMap.on("click", (e) => {
        marker.setLatLng(e.latlng).addTo(miniMap);
        setPoint(e.latlng.lat, e.latlng.lng);
      });
      marker.on("dragend", () => {
        const p = marker.getLatLng();
        setPoint(p.lat, p.lng);
      });
    }
    if (miniMap) setTimeout(() => miniMap.invalidateSize(), 50);
  };
  showMode();

  // ---- read the form into c
  const num = (v) => (String(v).trim() === "" ? null : Number(String(v).replace(",", ".")));
  const read = () => {
    c.nickname = $("#c-nick").value.trim();
    c.mode = form.querySelector('input[name="mode"]:checked').value;
    c.siteId = $("#c-site").value || c.siteId;
    c.site = { lat: num($("#c-lat").value), lon: num($("#c-lon").value), name: $("#c-name").value.trim(), country: $("#c-country").value.trim(), environment: $("#c-env").value.trim() };
    c.planet = $("#c-planet").value;
    c.mission = $("#c-mission").value;
    c.mirrorFeature = $("#c-mirror").value.trim();
    form.querySelectorAll("[data-dim]").forEach((el) => (c.dimensions[el.dataset.dim][el.dataset.k] = el.value.trim()));
    c.lacks = $("#c-lacks").value.split("\n").map((x) => x.trim()).filter(Boolean);
    const reqs = {};
    form.querySelectorAll("[data-req]").forEach((el) => (reqs[el.dataset.req] = { ok: el.checked, justification: form.querySelector(`[data-just="${el.dataset.req}"]`)?.value.trim() || "" }));
    c.requirements = reqs;
    saveDraft(c);
  };

  form.addEventListener("change", (e) => {
    read();
    if (e.target.name === "mode") showMode();
    if (e.target.name === "planet" || e.target.name === "mission") drawReqs();
    if ((e.target.name === "lat" || e.target.name === "lon") && marker && Number.isFinite(c.site.lat) && Number.isFinite(c.site.lon) && c.site.lat !== null && c.site.lon !== null) {
      try {
        marker.setLatLng([c.site.lat, c.site.lon]).addTo(miniMap);
      } catch {
        /* out of range: the check will block */
      }
    }
    result = null;
  });

  const point = () => {
    if (c.mode === "existing") {
      const s = data.siteById[c.siteId];
      return s ? { lat: s.lat, lon: s.lon } : null;
    }
    return c.site.lat === null || c.site.lon === null ? null : { lat: c.site.lat, lon: c.site.lon };
  };

  // ---- Check with NASA data
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    read();
    const out = $("#c-result");
    const p = point();
    if (!p) {
      out.innerHTML = `<div class="notice notice-error"><strong>${esc(S.cBlocked)}</strong><ul><li>${esc(c.mode === "existing" ? "Choose the site you are validating." : "Place the point on the map or type latitude and longitude.")}</li></ul></div>`;
      return;
    }
    out.innerHTML = `<p class="muted">${esc(S.cChecking)}</p>`;
    report = await validateCoordinates(p.lat, p.lon, { mission: c.mission, planet: c.planet });
    c._evidenceCache = {};
    result = await computeScore(c, report, getCombo(data, c.planet, c.mission));
    renderResult();
    out.querySelector("h2")?.focus();
  });

  function renderResult() {
    const out = $("#c-result");
    const rows = agreementRows(c, report);
    const byKey = new Map(rows.map((r) => [r.indicator.key, r]));
    const compare = report.indicators
      .map((i) => {
        const r = byKey.get(i.key);
        const you = c.dimensions[i.dimension]?.level || "nodata";
        return `<tr>
          <td>${esc(S.dimensionLabels[i.dimension] || i.dimension)}</td>
          <td>${esc(S.nasaIndicatorLabels[i.key] || i.key)}<div class="small muted">${esc(i.value == null ? "—" : `${i.value} ${i.unit || ""}`)}</div></td>
          <td><span class="lvl lvl-${esc(you)}">${esc(S.levelLabels[you])}</span></td>
          <td><span class="lvl lvl-${esc(i.suggestedLevel)}">${esc(S.levelLabels[i.suggestedLevel])}</span> <span class="nasa-st nasa-st-${esc(i.status)}">${esc(i.status)}</span></td>
          <td class="small"><a href="${esc(i.source.url)}" target="_blank" rel="noopener">${esc(i.source.name)}</a></td>
          <td>${r ? (r.points > 0 ? "+" : "") + r.points : "—"}</td>
        </tr>`;
      })
      .join("");
    const st = result.status;
    out.innerHTML = `<section class="m-block result-block">
      <h2 tabindex="-1">${esc(S.cScoreTitle)}: ${result.score}/100 · <span class="status-badge st-${esc(st)}">${esc(S.cStatus[st])}</span></h2>
      ${result.blocked.length ? `<div class="notice notice-error" role="alert"><strong>${esc(S.cBlocked)}</strong><ul>${result.blocked.map((b) => `<li>${esc(b)}</li>`).join("")}</ul></div>` : ""}
      <h3>${esc(S.cCompareTitle)}</h3>
      <div class="table-wrap"><table class="ev-table"><thead><tr><th>${esc(S.cColDimension)}</th><th>${esc(S.cColIndicator)}</th><th>${esc(S.cColYou)}</th><th>${esc(S.cColData)}</th><th>${esc(S.nasaColSource)}</th><th>${esc(S.cColPoints)}</th></tr></thead><tbody>${compare}</tbody></table></div>
      <h3>${esc(S.cScoreTitle)}</h3>
      <div class="table-wrap"><table class="ev-table"><tbody>${result.lines
        .map((l) => `<tr><td>${esc(l.label)}</td><td class="num">${l.points > 0 ? "+" : ""}${l.points}</td><td class="small muted">${esc(l.note)}</td></tr>`)
        .join("")}<tr><th>Total (0–100)</th><th class="num">${result.score}</th><td class="small muted">raw ${result.raw}</td></tr></tbody></table></div>
      ${report.errors?.length ? `<details class="small muted"><summary>${report.errors.length} data source message(s)</summary><ul>${report.errors.map((e) => `<li>${esc(e)}</li>`).join("")}</ul></details>` : ""}
      <div class="m-actions">
        <button type="button" id="c-submit" class="btn btn-primary" style="--accent:#3ddc84" ${result.blocked.length ? "disabled" : ""}>${esc(S.cSubmit)}</button>
        <span id="c-submit-msg" class="small" aria-live="polite"></span>
      </div>
    </section>`;
    $("#c-submit").addEventListener("click", async () => {
      const btn = $("#c-submit");
      btn.disabled = true;
      const contribution = {
        ...c,
        createdAt: new Date().toISOString(),
        score: result.score,
        status: result.status,
        scoreLines: result.lines,
        report: { checkedAt: report.checkedAt, basic: report.basic, indicators: report.indicators.map(({ key, value, unit, suggestedLevel, status }) => ({ key, value, unit, suggestedLevel, status })), missionFit: report.missionFit },
      };
      try {
        await submitContribution(contribution);
        const flags = antiFarm(await listContributions());
        const f = flags.get(contribution.id);
        $("#c-submit-msg").innerHTML = `${esc(f && !f.counted ? S.cNotCounted(f.reason) : S.cSubmitted)} <a href="#/leaderboard">${esc(S.cSeeLeaderboard)}</a>`;
        c = { ...emptyContribution(data, new URLSearchParams()), nickname: c.nickname };
        saveDraft({ nickname: c.nickname });
      } catch (e) {
        $("#c-submit-msg").textContent = e.message;
        btn.disabled = false;
      }
    });
  }

  return () => {
    if (miniMap) miniMap.remove();
  };
}
