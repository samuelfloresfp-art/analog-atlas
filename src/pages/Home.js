// Home: title, one-line subtitle and the 3 "Choose your mission" buttons.
// The search bar was removed on 2026-11-14 (team decision, see DECISIONS.md "Fase 3 – Prompt 1").
// A small Moon/Mars toggle sets which learning map the mission buttons open (default: Mars).

import { S } from "../strings.js";
import { esc } from "../util.js";
import { countsFor } from "../services/status.js";

function missionButtons(data, planet) {
  return `<div class="mission-buttons">${data.missions
    .map((m) => {
      const c = countsFor(data, planet, m.id);
      return `<a class="mission-btn" href="#/map/${planet}/${m.id}" style="--accent:${m.accent}">
        <span class="mission-btn-name">${esc(m.name)}</span>
        <span class="mission-count">${esc(S.counts(c.validated, c.possible))}</span>
        ${c.validated === 0 ? `<span class="small warn-text">${esc(S.noValidatedYet)}</span>` : ""}
        <span class="mission-btn-desc">${esc(m.description)}</span>
      </a>`;
    })
    .join("")}</div>`;
}

function planetToggle(data, planet) {
  return `<div class="planet-toggle" role="group" aria-label="${esc(S.planetSelectLabel)}">${data.planets
    .map(
      (p) =>
        `<button type="button" class="planet-toggle-btn ${p === planet ? "selected" : ""}" data-planet="${p}" aria-pressed="${p === planet}">${esc(S.planetNames[p])}</button>`
    )
    .join("")}</div>`;
}

export function Home(root, { query }, data) {
  let planet = data.planets.includes(query.get("planet")) ? query.get("planet") : "mars";

  root.innerHTML = `<main class="home space-bg">
    <div class="home-inner">
      <h1 class="logo">${esc(S.appName)}</h1>
      <p class="tagline">${esc(S.tagline)}</p>
      <h2 class="section-label home-choose">${esc(S.chooseMission)}</h2>
      <div id="planet-toggle"></div>
      <div id="missions"></div>
      <div class="m-actions center"><a class="btn btn-outline" style="--accent:#9cc0ff" href="#/contribute">${esc(S.navValidate)}</a>
        <a class="btn btn-outline" style="--accent:#9cc0ff" href="#/leaderboard">${esc(S.navLeaderboard)}</a></div>
      <p class="home-links small">
        <a href="#/explore">${esc(S.navExplore)}</a> · <a href="#/community">${esc(S.navCommunity)}</a>
      </p>
    </div>
    <footer class="footer">${esc(S.footer)} · <a href="#/sources">${esc(S.navSources)}</a></footer>
  </main>`;

  const draw = () => {
    root.querySelector("#planet-toggle").innerHTML = planetToggle(data, planet);
    root.querySelector("#missions").innerHTML = missionButtons(data, planet);
    root.querySelectorAll("[data-planet]").forEach((b) =>
      b.addEventListener("click", () => {
        planet = b.dataset.planet;
        history.replaceState(null, "", `#/?planet=${planet}`);
        draw();
        root.querySelector(`[data-planet="${planet}"]`).focus();
      })
    );
  };
  draw();
}
