// Entry point + hash router.
// Routes: #/  #/map/:planet/:mission  #/explore  #/explore/:planet/:mission
//         #/explore/result/:id  #/community  #/contribute  #/leaderboard
// Old v1 routes (#/mission, #/sim, #/results, #/site) redirect to #/.
// Nothing in /archive is imported.

import { S } from "./src/strings.js";
import { esc } from "./src/util.js";
import { loadData } from "./src/services/data.js";
import { loadNasaStatic } from "./src/services/nasa/sources.js";
import { Home } from "./src/pages/Home.js";
import { LearnMap } from "./src/pages/LearnMap.js";
import { Explore } from "./src/pages/Explore.js";
import { ExploreResult } from "./src/pages/ExploreResult.js";
import { CommunityMap } from "./src/pages/CommunityMap.js";
import { Contribute } from "./src/pages/Contribute.js";
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
  [/^\/contribute$/, Contribute],
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

async function start() {
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
