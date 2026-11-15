// Renders one step of the explorer form. Pure HTML; the page binds events.

import { S } from "../strings.js";
import { esc } from "../util.js";
import { MAX_TEXT, MAX_NICK } from "../services/validate.js";
import { optionVisual, hasVisuals, OPTION_VISUALS } from "../data/optionVisuals.js";

export const STEP_IDS = ["location", "terrain", "environment", "operations", "reasoning"];

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
  if (!hasVisuals(field)) return radios(`attrs.${field}`, data.criteria.fieldLabels[field], data.criteria.enums[field], form.attrs[field]);
  const name = `attrs.${field}`;
  const value = form.attrs[field];
  const usesSat = data.criteria.enums[field].some((o) => OPTION_VISUALS[field][o.id]?.kind === "sat");
  return `<fieldset class="field opts opts-visual">
    <legend>${esc(data.criteria.fieldLabels[field])}</legend>
    <div class="opt-grid">${data.criteria.enums[field]
      .map(
        (o) => `<label class="opt-card ${value === o.id ? "on" : ""}">
          <input type="radio" name="${esc(name)}" value="${esc(o.id)}" ${value === o.id ? "checked" : ""} data-field="${esc(name)}" />
          ${optionVisual(field, o.id)}
          <span class="opt-label">${esc(o.label)}</span>
        </label>`
      )
      .join("")}</div>
    ${usesSat ? `<p class="credit-line">${esc(S.satCredit)}</p>` : ""}
  </fieldset>`;
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
        <div id="mini-map" class="mini-map"></div>`;
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
