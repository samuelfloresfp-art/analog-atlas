// Entry point + hash router.
// Routes: #/  #/map/:planet/:mission  #/explore  #/explore/:planet/:mission
//         #/explore/result/:id  #/community  #/contribute  #/leaderboard
// Old v1 routes (#/mission, #/sim, #/results, #/site) redirect to #/.
// Nothing in /archive is imported.

import { S } from "./src/strings.js";
import { hasChosenLang, setLang } from "./src/i18n.js";
import { esc } from "./src/util.js";
import { loadData } from "./src/services/data.js";
import { loadNasaStatic } from "./src/services/nasa/sources.js";
import { Home } from "./src/pages/Home.js";
import { LearnMap } from "./src/pages/LearnMap.js";
import { Explore } from "./src/pages/Explore.js";
import { ExploreResult } from "./src/pages/ExploreResult.js";
import { CommunityMap } from "./src/pages/CommunityMap.js";
import { Leaderboard } from "./src/pages/Leaderboard.js";
import { Sources } from "./src/pages/Sources.js";

const Redirect = () => {
  location.replace("#/");
};

const routes = [
  [/^\/$/, Home],
  [/^\/map\/([\w-]+)\/([\w-]+)$/, LearnMap],
  [/^\/explore\/result\/([\w-]+)$/, ExploreResult],
  [/^\/explore\/([\w-]+)\/([\w-]+)$/, Explore],
  [/^\/explore$/, Explore],
  [/^\/community$/, CommunityMap],
  [/^\/contribute$/, () => location.replace("#/explore")],
  [/^\/leaderboard$/, Leaderboard],
  [/^\/sources$/, Sources],
  [/^\/(mission|sim|results|site)(\/.*)?$/, Redirect],
];

const root = document.getElementById("app");
let cleanup = null;
let data = null;

async function route() {
  const raw = location.hash.slice(1) || "/";
  const [path, qs] = raw.split("?");
  const query = new URLSearchParams(qs || "");

  if (typeof cleanup === "function") cleanup();
  cleanup = null;
  document.getElementById("modal-root").innerHTML = "";

  for (const [re, page] of routes) {
    const m = path.match(re);
    if (m) {
      window.scrollTo(0, 0);
      cleanup = await page(root, { params: m.slice(1), query }, data);
      return;
    }
  }
  root.innerHTML = `<main class="page"><p>${esc(S.notFound)}</p><a href="#/">${esc(S.backHome)}</a></main>`;
}

window.__setLang = (l) => setLang(l);

/** First visit: choose PT or EN before anything else (the presentation is in Portuguese). */
function langGate() {
  if (hasChosenLang()) return Promise.resolve();
  return new Promise((resolve) => {
    const el = document.createElement("div");
    el.className = "lang-gate";
    el.innerHTML = `<div class="lang-card" role="dialog" aria-modal="true" aria-labelledby="lg-t">
      <p class="eyebrow-mono">Analog Atlas</p>
      <h1 id="lg-t">Escolha o idioma · Choose your language</h1>
      <div class="lang-choices">
        <button type="button" class="btn btn-cta btn-big" data-l="pt">Português</button>
        <button type="button" class="btn btn-outline btn-big" data-l="en">English</button>
      </div>
      <p class="small muted">Você pode trocar depois no topo · You can change it later in the top bar</p>
    </div>`;
    document.body.appendChild(el);
    el.querySelector("[data-l=pt]").focus();
    el.querySelectorAll("[data-l]").forEach((b) =>
      b.addEventListener("click", () => {
        const l = b.dataset.l;
        setLang(l, { reload: l !== (document.documentElement.lang.startsWith("pt") ? "pt" : "en") });
        el.remove();
        resolve();
      })
    );
  });
}

async function start() {
  await langGate();
  root.innerHTML = `<p class="page muted">${esc(S.loading)}</p>`;
  try {
    data = await loadData();
    // NASA endpoints + pre-computed cache, loaded up front so site cards keep working offline afterwards
    await loadNasaStatic().catch((e) => console.warn("[nasa] static data not loaded:", e.message));
  } catch (e) {
    console.error(e);
    root.innerHTML = `<main class="page"><p>${esc(S.loadError)}</p><pre class="small">${esc(e.message)}</pre></main>`;
    return;
  }
  window.addEventListener("hashchange", route);
  route();
}

start();
