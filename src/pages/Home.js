// Home: hero with the 3D Moon/Mars selector, then the 3 mission cards with real photos.
// Desktop: click the planet behind to bring it forward. Mobile: ← → arrows, one planet at a time.

import { S } from "../strings.js";
import { esc } from "../util.js";
import { countsFor } from "../services/status.js";
import { NavBar } from "../components/small.js";
import { createPlanetStage } from "../components/PlanetStage.js";

const FP = (file, w = 1400) => `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=${w}`;

/** Mission photos: real photos only (NASA, public domain). */
export const MISSION_PHOTOS = {
  landing: {
    src: "https://photojournal.jpl.nasa.gov/jpeg/PIA24428.jpg",
    fallback: FP("HiRISE_Captured_Perseverance_During_Descent_to_Mars_(cropped).jpg"),
    credit: "NASA/JPL-Caltech",
  },
  rover: { src: FP("Space_Exploration_Vehicle_in_field_(2010).jpg"), credit: "NASA" },
  base: { src: FP("Habitat_Demonstration_Unit_(2010)_cropped_androtated.jpg"), credit: "NASA" },
};

function missionCards(data, planet) {
  return data.missions
    .map((m) => {
      const c = countsFor(data, planet, m.id);
      const ph = MISSION_PHOTOS[m.id];
      return `<a class="mcard" href="#/map/${planet}/${m.id}" style="--accent:var(--${m.id})">
        <img class="mcard-img" src="${esc(ph.src)}" alt="${esc(S.missionPhoto[m.id])}" loading="lazy"
          ${ph.fallback ? `onerror="if(this.dataset.f){this.remove()}else{this.dataset.f=1;this.src='${esc(ph.fallback)}'}"` : `onerror="this.remove()"`} />
        <div class="mcard-shade"></div>
        <div class="mcard-body">
          <span class="eyebrow-mono">${esc(S.planetNames[planet])} · 0${data.missions.indexOf(m) + 1}</span>
          <h3 class="mcard-name">${esc(m.name)}</h3>
          <p class="mcard-desc">${esc(m.description)}</p>
          <div class="mcard-stats">
            <span><b class="stat-num">${c.validated}</b> ${esc(S.statValidated)}</span>
            <span><b class="stat-num stat-green">${c.possible}</b> ${esc(S.statPossible)}</span>
          </div>
          <span class="mcard-cta">${esc(S.missionOpen)} <span aria-hidden="true">→</span></span>
        </div>
        <span class="credit-line" title="${esc(S.missionPhoto[m.id])}">${esc(S.credit(ph.credit))}</span>
      </a>`;
    })
    .join("");
}

export function Home(root, { query }, data) {
  let planet = data.planets.includes(query.get("planet")) ? query.get("planet") : "mars";

  root.innerHTML = `<div class="home">
    ${NavBar("learn")}
    <section class="hero">
      <div class="hero-copy">
        <p class="eyebrow-mono">${esc(S.heroEyebrow)}</p>
        <h1 class="hero-title">${esc(S.heroTitle)}</h1>
        <p class="hero-sub">${esc(S.heroSub)}</p>
        <p class="step-label">${esc(S.stepPlanet)}</p>
        <div class="planet-switch" role="group" aria-label="${esc(S.planetSelectLabel)}">
          ${data.planets.map((p) => `<button type="button" class="ps-btn" data-planet="${p}">${esc(S.planetNames[p])}</button>`).join("")}
        </div>
        <p class="hint-desktop small">${esc(S.planetHint)}</p>
      </div>
      <div class="stage-wrap">
        <div id="stage" class="stage" aria-hidden="true"></div>
        <button type="button" class="stage-arrow left" id="prev" aria-label="${esc(S.planetPrev)}">‹</button>
        <button type="button" class="stage-arrow right" id="next" aria-label="${esc(S.planetNext)}">›</button>
        <div class="stage-label" aria-live="polite">
          <span id="planet-name" class="stage-name"></span>
          <span id="planet-stats" class="stage-stats"></span>
        </div>
      </div>
    </section>
    <section class="missions-sec" aria-labelledby="missions-h">
      <p class="step-label" id="missions-h">${esc(S.stepMission)}</p>
      <div id="missions" class="mcards"></div>
      <p class="home-links small">
        <a href="#/explore">${esc(S.explorerCta)} →</a> · <a href="#/community">${esc(S.navCommunity)}</a> · <a href="#/leaderboard">${esc(S.navLeaderboard)}</a>
      </p>
    </section>
    <footer class="footer">${esc(S.footer)} · <a href="#/sources">${esc(S.navSources)}</a> · <a href="#/about">${esc(S.navAbout)}</a>
      <div class="small">${esc(S.credit(S.texCredit))}</div></footer>
  </div>`;

  const draw = () => {
    root.querySelector("#missions").innerHTML = missionCards(data, planet);
    root.querySelector("#planet-name").textContent = S.planetNames[planet];
    root.querySelector("#planet-stats").textContent = S.planetStats[planet];
    root.querySelectorAll(".ps-btn").forEach((b) => {
      b.classList.toggle("on", b.dataset.planet === planet);
      b.setAttribute("aria-pressed", b.dataset.planet === planet);
    });
    root.querySelector(".home").dataset.planet = planet;
  };

  const setPlanet = (p, fromStage = false, dir) => {
    if (p === planet) return;
    planet = p;
    history.replaceState(null, "", `#/?planet=${planet}`);
    if (!fromStage) stage.select(p, dir);
    draw();
  };

  const stage = createPlanetStage(root.querySelector("#stage"), { planet, onChange: (p) => setPlanet(p, true) });
  if (!stage.ok) root.querySelector(".stage-wrap").classList.add("no-webgl");

  root.querySelectorAll(".ps-btn").forEach((b) => b.addEventListener("click", () => setPlanet(b.dataset.planet)));
  const step = (d) => {
    const i = data.planets.indexOf(planet);
    setPlanet(data.planets[(i + d + data.planets.length) % data.planets.length], false, d);
  };
  root.querySelector("#prev").addEventListener("click", () => step(-1));
  root.querySelector("#next").addEventListener("click", () => step(1));

  draw();
  return () => stage.destroy();
}
