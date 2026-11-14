// Renders one step of the explorer form. Pure HTML; the page binds events.

import { S } from "../strings.js";
import { esc } from "../util.js";
import { MAX_TEXT, MAX_NICK } from "../services/validate.js";
import { TERRAIN_SCAN } from "../config.js";

export const STEP_IDS = ["target", "location", "terrain", "environment", "operations", "reasoning"];

function radios(name, label, options, value) {
  return `<fieldset class="field opts">
    <legend>${esc(label)}</legend>
    <div class="opt-row">${options
      .map(
        (o) => `<label class="opt ${value === o.id ? "on" : ""}">
          <input type="radio" name="${esc(name)}" value="${esc(o.id)}" ${value === o.id ? "checked" : ""} data-field="${esc(name)}" />
          <span>${esc(o.label)}</span>
        </label>`
      )
      .join("")}</div>
  </fieldset>`;
}

function enumRadios(data, field, form) {
  return radios(`attrs.${field}`, data.criteria.fieldLabels[field], data.criteria.enums[field], form.attrs[field]);
}

function input(name, label, value, { type = "text", max, placeholder = "", step } = {}) {
  return `<label class="field">
    <span>${esc(label)}</span>
    <input type="${type}" data-field="${esc(name)}" value="${esc(value)}" ${max ? `maxlength="${max}"` : ""} ${step ? `step="${step}"` : ""} placeholder="${esc(placeholder)}" />
  </label>`;
}

function textarea(name, label, value) {
  return `<label class="field">
    <span>${esc(label)} <span class="small muted counter" data-counter="${esc(name)}">${esc(S.chars(value.length, MAX_TEXT))}</span></span>
    <textarea data-field="${esc(name)}" maxlength="${MAX_TEXT}" rows="3">${esc(value)}</textarea>
  </label>`;
}

export function renderStep(stepId, form, data) {
  switch (stepId) {
    case "target":
      return `${radios("planet", S.fPlanet, data.planets.map((p) => ({ id: p, label: S.planetNames[p] })), form.planet)}
        ${radios("mission", S.fMission, data.missions.map((m) => ({ id: m.id, label: m.name })), form.mission)}`;
    case "location":
      return `<div class="grid-2">
          ${input("name", S.fName, form.name, { max: 80 })}
          ${input("country", S.fCountry, form.country, { max: 60 })}
          ${input("lat", S.fLat, form.lat, { type: "number", step: "any", placeholder: "-26.82" })}
          ${input("lon", S.fLon, form.lon, { type: "number", step: "any", placeholder: "-52.17" })}
        </div>
        <p class="small muted">${esc(S.fMapHint)}</p>
        <div id="mini-map" class="mini-map"></div>
        <div id="ext-links"></div>
        <section class="scan" aria-labelledby="scan-title">
          <h3 id="scan-title">${esc(S.scanTitle)}</h3>
          <p class="small muted">${esc(S.scanIntro)}</p>
          <button type="button" class="btn btn-outline" id="scan-btn">${esc(S.scanButton(TERRAIN_SCAN.grid, +(TERRAIN_SCAN.grid * TERRAIN_SCAN.cellKm).toFixed(1)))}</button>
          <div id="scan-out" aria-live="polite"></div>
        </section>`;
    case "terrain":
      return ["topography", "slopeClass", "surface", "vegetation"].map((f) => enumRadios(data, f, form)).join("");
    case "environment":
      return `${enumRadios(data, "climate", form)}
        <div class="grid-2">
          ${input("tempMin", S.fTempMin, form.tempMin, { type: "number", step: "any" })}
          ${input("tempMax", S.fTempMax, form.tempMax, { type: "number", step: "any" })}
        </div>
        ${enumRadios(data, "waterIce", form)}
        ${enumRadios(data, "subsurface", form)}`;
    case "operations":
      return `${enumRadios(data, "access", form)}
        ${enumRadios(data, "isolation", form)}
        ${radios("usedBefore", S.fUsedBefore, Object.entries(S.usedBefore).map(([id, label]) => ({ id, label })), form.usedBefore)}`;
    case "reasoning":
      return `<p class="notice">${esc(S.noPersonalData)}</p>
        ${textarea("why", S.fWhy, form.why)}
        ${textarea("lacks", S.fLacks, form.lacks)}
        ${input("evidenceUrl", S.fEvidence, form.evidenceUrl, { type: "url", max: 300, placeholder: "https://…" })}
        ${input("nickname", S.fNickname, form.nickname, { max: MAX_NICK })}`;
    default:
      return "";
  }
}
