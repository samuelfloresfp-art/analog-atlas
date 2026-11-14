// "NASA data" panel, real Earth/planet imagery, space weather and "What Earth can't reproduce"
// blocks for the learning-map site card (Fase 3 – Prompt 1). Reads the pre-computed cache
// (data/nasa-cache/index.json, loaded at start) and can re-check live.

import { S } from "../strings.js";
import { esc, hueFrom } from "../util.js";
import { nasaStatic } from "../services/nasa/sources.js";
import { gibsThumbUrl, trekTileFor, earthdataSearchUrl, worldviewUrl } from "../services/nasa/imagery.js";
import { getStudies } from "../services/nasa/osdr.js";
import { getIssDose } from "../services/nasa/radlab.js";
import { validateCoordinates } from "../services/nasa/validate.js";

const fmtDate = (iso) => (iso ? String(iso).slice(0, 10) : "—");
const link = (url, text) => (url ? `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(text)}</a>` : esc(text));

export function cacheEntry(siteId) {
  return nasaStatic()?.cache?.sites?.[siteId] || null;
}

/** Left side of the modal: GIBS true-colour tile (falls back to the gradient placeholder if it fails). */
export function earthImageHtml(site) {
  const h = hueFrom(site.id);
  const url = cacheEntry(site.id)?.media?.gibs?.url || gibsThumbUrl(site.lat, site.lon);
  return `<figure class="nasa-earth-img" style="--h1:${h};--h2:${(h + 60) % 360}">
    <img src="${esc(url)}" alt="${esc(site.name)} — satellite image" onerror="this.closest('figure').classList.add('img-failed');this.remove()" />
    <span class="ph-name">${esc(site.name)}</span>
    <figcaption class="small">${esc(S.earthImageCaption)}</figcaption>
  </figure>`;
}

function valueText(i) {
  if (i.value == null) return "—";
  return `${i.value}${i.unit ? ` ${i.unit}` : ""}`;
}

function rowsHtml(report) {
  return report.indicators
    .map(
      (i) => `<tr>
        <td>${esc(S.nasaIndicatorLabels[i.key] || i.key)}<div class="small muted">${esc(S.dimensionLabels[i.dimension] || i.dimension)}</div></td>
        <td>${esc(valueText(i))}</td>
        <td><span class="lvl lvl-${esc(i.suggestedLevel)}">${esc(S.levelLabels[i.suggestedLevel] || i.suggestedLevel)}</span></td>
        <td class="small">${link(i.source.url, i.source.name)}${i.source.doi ? ` · doi:${esc(i.source.doi)}` : ""}</td>
        <td><span class="nasa-st nasa-st-${esc(i.status)}">${esc(S.nasaStatus[i.status] || i.status)}</span></td>
      </tr>`
    )
    .join("");
}

function tableHtml(report) {
  return `<table class="ev-table nasa-table"><thead><tr>
      <th>${esc(S.nasaColIndicator)}</th><th>${esc(S.nasaColValue)}</th><th>${esc(S.nasaColLevel)}</th><th>${esc(S.nasaColSource)}</th><th>${esc(S.nasaColStatus)}</th>
    </tr></thead><tbody>${rowsHtml(report)}</tbody></table>
    <p class="small muted">${esc(S.nasaCheckedOn(fmtDate(report.checkedAt)))}</p>
    ${report.errors?.length ? `<details class="small muted"><summary>${report.errors.length} source message(s)</summary><ul>${report.errors.map((e) => `<li>${esc(e)}</li>`).join("")}</ul></details>` : ""}`;
}

/** Conflicts relevant to this card: attribute conflicts + state conflicts for this planet·mission. */
export function conflictsHtml(site, planet, missionId) {
  const list = site.dataCheck?.conflicts || cacheEntry(site.id)?.conflicts || [];
  const rel = list.filter((c) => c.type === "attribute-vs-data" || (c.planet === planet && c.mission === missionId));
  if (!rel.length) return "";
  return `<div class="notice notice-conflict" role="note">${rel
    .map((c) => `<p><strong>${esc(S.dataConflict)}:</strong> ${esc(c.message)}</p>`)
    .join("")}<p class="small muted">${esc(S.dataConflictHint)}</p></div>`;
}

function trekHtml(site, planet) {
  const entry = cacheEntry(site.id);
  const t = entry?.media?.trek?.[planet] || trekTileFor(nasaStatic()?.trek, site.id, planet);
  if (!t) return `<p class="small muted">${esc(S.trekNone)}</p>`;
  return `<div class="nasa-pair">
    <figure><img src="${esc(cacheEntry(site.id)?.media?.gibs?.url || gibsThumbUrl(site.lat, site.lon))}" alt="${esc(site.name)} (Earth)" loading="lazy" onerror="this.remove()" />
      <figcaption class="small">${esc(S.earthSide)} · ${esc(site.name)}</figcaption></figure>
    <figure><img src="${esc(t.url)}" alt="${esc(t.feature)}" loading="lazy" onerror="this.remove()" />
      <figcaption class="small">${esc(S.trekCaption(t.feature, t.layer))}</figcaption></figure>
  </div>`;
}

function eonetHtml(site) {
  const ev = cacheEntry(site.id)?.report?.context?.eonet;
  if (!ev) return "";
  return `<details class="small"><summary>${esc(S.eonetTitle)} (${ev.length})</summary>${
    ev.length ? `<ul>${ev.map((e) => `<li>${link(e.link, e.title)} <span class="muted">· ${esc(e.category || "")} · ${esc(fmtDate(e.date))}</span></li>`).join("")}</ul>` : `<p class="muted">${esc(S.eonetNone)}</p>`
  }</details>`;
}

/** Buttons that open this point in the two official NASA apps of the challenge Resources tab. */
function officialAppsHtml(site) {
  return `<p class="small nasa-open">${esc(S.openInTitle)}
    ${link(worldviewUrl(site.lat, site.lon), S.openWorldview)} ·
    ${link(earthdataSearchUrl(site.lat, site.lon, "SRTMGL1"), S.openEarthdataSrtm)} ·
    ${link(earthdataSearchUrl(site.lat, site.lon, "EMITL2BMIN"), S.openEarthdataEmit)}</p>`;
}

const extras = () => nasaStatic()?.extras || {};

/** Terrain from SRTM / ASTER GDEM sampled through AppEEARS (scripts/fetch_official_extras.py --appeears). */
function terrainHtml(site) {
  const a = extras().appeears;
  const t = a?.sites?.[site.id];
  if (!t) return "";
  const row = (key) => {
    const d = t[key];
    if (!d || d.elevationM == null) return "";
    const f = (x) => (x ? `${x.slopeDeg}° · ${x.reliefM} m` : "—");
    const lab = a.source.layers.find((L) => L.key === key)?.label || key;
    return `<tr><td>${esc(lab)}</td><td>${esc(d.elevationM)} m</td><td>${esc(f(d.local))}</td><td>${esc(f(d.site))}</td></tr>`;
  };
  return `<h4 class="small">${esc(S.terrainTitle)}</h4>
    <table class="ev-table nasa-table"><thead><tr><th>${esc(S.terrainColDem)}</th><th>${esc(S.terrainColElev)}</th><th>${esc(S.terrainColLocal)}</th><th>${esc(S.terrainColSite)}</th></tr></thead>
    <tbody>${row("srtm")}${row("aster")}</tbody></table>
    <p class="small muted">${esc(S.terrainNote)} ${link(a.source.url, a.source.name)} · ${esc(S.nasaStatus.cached)} · ${esc(S.nasaCheckedOn(fmtDate(a.generatedAt)))}</p>`;
}

/** Moon side, measured: LRO Diviner south-pole temperatures vs this site's temperature range (NASA POWER). */
function divinerHtml(site, planet) {
  const dv = extras().diviner;
  if (planet !== "moon" || !dv?.targets?.length) return "";
  const k2c = (k) => (k == null ? "—" : `${Math.round(k)} K (${Math.round(k - 273.15)} °C)`);
  const tr = cacheEntry(site.id)?.report?.indicators?.find((i) => i.key === "temp_range")?.details;
  const earth = tr ? S.divinerEarth(site.name, tr.tMinMonthC, tr.tMaxMonthC) : "";
  const rows = dv.targets
    .map((t) => `<tr><td>${esc(t.name)}</td><td>${esc(k2c(t.tavgK?.median))}</td><td>${esc(k2c(t.tmaxK?.median))}</td>
      <td>${t.shareTmaxBelow110K == null ? "—" : `${Math.round(t.shareTmaxBelow110K * 100)}%`}</td></tr>`)
    .join("");
  return `<h4 class="small">${esc(S.divinerTitle)}</h4>
    <table class="ev-table nasa-table"><thead><tr><th>${esc(S.divinerColTarget)}</th><th>${esc(S.divinerColAvg)}</th><th>${esc(S.divinerColMax)}</th><th>${esc(S.divinerColCold(dv.coldTrapThresholdK))}</th></tr></thead>
    <tbody>${rows}</tbody></table>
    ${earth ? `<p class="small">${esc(earth)}</p>` : ""}
    <p class="small muted">${link(dv.source.url, dv.source.name)} · ${esc(dv.source.reference)} · ${esc(S.nasaStatus.cached)} · ${esc(S.nasaCheckedOn(fmtDate(dv.generatedAt)))}</p>`;
}

/** Main "NASA data" block. Call bindNasaPanel(root, …) after the modal is in the DOM. */
export function NasaPanel(site, planet, missionId) {
  const entry = cacheEntry(site.id);
  // pre-computed values are shown as "cached" (they were "live" when the script fetched them)
  const asCached = (rep) => ({ ...rep, indicators: rep.indicators.map((i) => (i.status === "live" ? { ...i, status: "cached" } : i)) });
  const body = entry ? tableHtml(asCached(entry.report)) : `<p class="small muted">${esc(S.nasaNoCache)}</p>`;
  return `<section class="m-block nasa-panel">
    <h3>${esc(S.nasaTitle)}</h3>
    <p class="small muted">${esc(S.nasaIntro)}</p>
    ${trekHtml(site, planet)}
    ${officialAppsHtml(site)}
    <div id="nasa-panel-body">${body}</div>
    ${terrainHtml(site)}
    ${divinerHtml(site, planet)}
    <div class="m-actions"><button type="button" class="btn btn-small" id="nasa-recheck">${esc(S.nasaRecheck)}</button>
      <span id="nasa-recheck-msg" class="small muted" aria-live="polite"></span></div>
    ${eonetHtml(site)}
  </section>`;
}

export function bindNasaPanel(root, site, planet, missionId) {
  const btn = root.querySelector("#nasa-recheck");
  if (!btn) return;
  btn.addEventListener("click", async () => {
    const msg = root.querySelector("#nasa-recheck-msg");
    btn.disabled = true;
    msg.textContent = S.nasaRechecking;
    try {
      const rep = await validateCoordinates(site.lat, site.lon, { mission: missionId, planet, live: true });
      root.querySelector("#nasa-panel-body").innerHTML = tableHtml(rep);
      const live = rep.indicators.filter((i) => i.status === "live").length;
      const failed = rep.indicators.filter((i) => i.status !== "live").length;
      msg.textContent = S.nasaRecheckDone(live, failed);
    } catch (e) {
      msg.textContent = e.message;
    } finally {
      btn.disabled = false;
    }
  });
}

/** "Space weather on the target (real data)" — Landing and Base cards. */
export function SpaceWeatherBlock() {
  const sw = nasaStatic()?.cache?.shared?.spaceWeather;
  if (!sw) return "";
  const types = Object.keys(S.spaceWeatherTypes);
  return `<section class="m-block">
    <h3>${esc(S.spaceWeatherTitle)}</h3>
    <p class="small">${esc(S.spaceWeatherIntro(sw.window30d[0], sw.window30d[1]))}</p>
    <table class="ev-table"><thead><tr><th></th><th>${esc(S.spaceWeather30)}</th><th>${esc(S.spaceWeatherYear)}</th></tr></thead><tbody>
      ${types.map((t) => `<tr><td>${esc(S.spaceWeatherTypes[t])} (${t})</td><td>${esc(sw.counts30d?.[t] ?? "—")}</td><td>${esc(sw.counts365d?.[t] ?? "—")}</td></tr>`).join("")}
    </tbody></table>
    <p class="small muted">${link("https://ccmc.gsfc.nasa.gov/tools/DONKI/", "NASA DONKI (CCMC)")} · ${esc(S.nasaStatus.cached)} · ${esc(S.nasaCheckedOn(fmtDate(sw.generatedAt)))}</p>
  </section>`;
}

/** Extra content for the "What it lacks" block. */
export function CantReproduceHtml(planet) {
  const rad = getIssDose();
  const st = getStudies(planet);
  const ref = rad.earthBackground;
  const radLine =
    rad.status !== "failed" && ref
      ? `<p class="small">${esc(S.radiationLine(rad.medianUGyPerH, rad.period, `${ref.value} ${ref.unit}`))} ${link(ref.url, ref.citation)} (manual); ${link("https://visualization.osdr.nasa.gov/radlab/gui/data-api", "NASA OSDR RadLab")}.</p>
         <p class="small muted">${esc(ref.caveat)}</p>`
      : "";
  const studies = st.studies.length
    ? `<p class="small">${esc(S.osdrIntro)}</p><ul class="small">${st.studies.map((s) => `<li>${link(s.url, `${s.id} — ${s.title}`)}</li>`).join("")}</ul>`
    : "";
  if (!radLine && !studies) return "";
  return `<h4 class="small">${esc(S.cantReproduceTitle)}</h4>${radLine}${studies}`;
}
