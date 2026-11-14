# Progress — v2 (Learn → Be an explorer → Community map)

## Execution
- [x] Detected stack: plain HTML/JS (no Node). Modified the existing project.
- [x] 1. Removed the simulation layer from the flow and moved its files to `/archive` (nothing imports it).
- [x] 2. Home: planet picker → mission buttons with "X validated · Y possible", "Be an explorer" + "Community map".
- [x] 3. Learning map `#/map/:planet/:mission`:
  - computed states, legend, nav bar, noWrap/maxBounds, clustering, vendored Leaflet;
  - cards with criteria checklist, history ("Source pending"), what it lacks + physical limits, evidence (pending), 8 dimensions.
- [x] 4. Data: new sites.json schema, criteria.json (6 combos), missions.json simplified, community.json (2 examples).
- [x] 5. Explorer form (6 steps, mini-map) + 4-layer validation + result page.
- [x] 6. Community map: filters, status colors, reference overlay, card, report, export/import, store interface + Supabase stub.
- [x] 7. Strings in `src/strings.js`; new routes; old routes redirect to `#/`.
- [x] 8. Verification in Chrome (below).

## Learning map counts (computed, verified in browser)
| Planet × Mission | Validated | Possible (candidates) | Banner |
|---|---|---|---|
| Moon · Landing | 2 | 5 | — |
| Moon · Rover | 2 | 11 | — |
| Moon · Base | **0** | 11 | "No validated simulation sites yet" ✓ |
| Mars · Landing | **0** | 7 | "No validated simulation sites yet" ✓ |
| Mars · Rover | 6 | 8 | — |
| Mars · Base | 5 | 7 | — |

**Vargeão in Mars·Rover:** hidden, because its estimated `vegetation` is `moderate` and the required rule fails. We kept the attribute; DECISIONS.md V4 lists options. The same happens to Vista Alegre, Cerro do Jarau and Araguainha on every map. Search still finds Vargeão (with and without accent) and says it fails a required criterion.

## Form test cases (run 2026-11-14 through the real form, online)
| Case | Expected | Result |
|---|---|---|
| 1. Salar de Uyuni, Moon, Landing, 0–2°, salt crust, no vegetation | Plausible or Needs evidence | **Plausible candidate**, score 83. NASA POWER: 332 mm/yr, ~3692 m → consistent with "high altitude". DEM: mean slope 1.3° → consistent with 0–2°. |
| 2. Atlantic Ocean (0, −30) | Blocked at form check | **Blocked** at the Location step: "This point looks like open ocean." |
| 3. Amazon (−3.1, −60.0), Mars, Rover, dense vegetation | Not consistent | **Not consistent**, score 0. Required slope and vegetation rules fail; only "Save locally only" is offered. |
| Offline (forced flag), case 1 again | Rules work, data "not checked" | **Needs evidence**; both data checks "not checked". Basemap fell back to local Natural Earth land. |

## Other checks
- Published case 1, reloaded the page: it appears on the Community map (marker + count "1 submission"). ✓
- Export → remove → Import JSON round-trip restored the submission. Tested by calling the store functions, without downloading a file in the browser. ✓
- Old routes `#/mission/rover`, `#/sim/...`, `#/results/...` redirect to `#/`. ✓
- No console errors. ✓
- `history`/`evidence`: no invented URLs, programs or years (all `null` / "Source pending" / `pending`). ✓
- No personal-data fields; texts reject e-mail/phone patterns. ✓
- Test data created during verification was removed from the browser.

## Ready
- Complete Learn → Explore → Community flow with transparent, editable rules (`criteria.json`) shared by map and validation.
- Two live open-data checks working from the browser (NASA POWER, AWS Terrain Tiles).
- Works offline for rules, map and storage.

## Missing
- No real evidence values. Every site's `evidence` is `pending` and every attribute is an estimate.
- No real images; no history sources.
- No backend: submissions are per browser, consolidated through Export/Import.
- Not tested with the network physically disconnected. Offline was simulated with the debug flag (tile fallback chain + checks).
- Mobile layout not checked on a real phone.

## Known bugs / limitations
- At the minimum zoom the far north and south are cut off (e.g. Iceland on Moon·Landing); zoom out or pan to see them.
- The coarse DEM (~36 m/px) underestimates slopes; 110m land mask misses small islands (30 km coast tolerance).
- POWER elevation is the grid-cell mean (~0.5°), not the exact point.
- "Report" is only stored in the local browser.
- `window.__analogMap` debug handle is left in `WorldMap.js`.

## Endpoints
| Endpoint | Result |
|---|---|
| NASA POWER climatology point API | ✅ works from browser (CORS, no key) |
| AWS Terrain Tiles (Terrarium PNG) | ✅ works from browser (CORS) |
| NASA GIBS WMTS (basemap) | ✅ |
| Earthdata / CMR data download | ❌ not used — needs Earthdata Login |

## 5 decisions the team must review
1. **Estimated site attributes** (DECISIONS V4). Above all, the vegetation of the four Brazilian basalt craters, which hides them everywhere.
2. **criteria.json weights and thresholds** (V9–V10). Examples: Rover requires slopes > 2°; Base requires remote isolation; Landing treats sparse vegetation as partial.
3. **Planet assignment of past simulations** (V3). It leaves Moon·Base and Mars·Landing with 0 validated sites; add sourced records if they exist.
4. **Data-check thresholds** (V12): precipitation classes, elevation ≥ 2500 m for "high altitude", slope class tolerance.
5. **Community without backend** (V16): keep per-browser + export/import for the demo, or wire Supabase before judging.

---

# Fase 3 — Prompt 1: Home without search + NASA data (2026-11-14)

## Step 0 — inspection
- **Stack:** plain HTML/JS ES modules, no Node (Python 3.15 available).
  - Router: `app.js` (hash).
  - Data: `src/data/*.json`.
  - Home: `src/pages/Home.js`. Site card: `src/components/SiteModal.js`. Strings: `src/strings.js`.
- `CONTEXTO-PROJETO.md` and `prompts-fase-3-sequencial.md` do **not** exist in the folder; the prompt text was followed.

## Works
- **Home:** title + 1-line subtitle + "Choose your mission" (Moon/Mars toggle + 3 buttons). The search was removed (`SearchBar.js`, `services/search.js`, strings, CSS) after grep confirmed only Home used it.
- **NASA clients** in `src/services/nasa/`: 8 s timeout, retry 1×, memory + localStorage cache with TTL.
  - Modules: http, openApi (key in `src/config.local.js`, DEMO_KEY fallback with console warning), power, tesvis, cmr, donki (`getSpaceWeather()` exported), eonet, osdr, radlab, imagery, sources.
- **`validateCoordinates(lat, lon, {mission, planet, live})`** in `src/services/nasa/validate.js`, re-exported by `validation-source.js`.
  - Tested in the browser: Vargeão (−27.13, −52.13) gives a coherent report (POWER/CMR/DONKI live; TESViS timeout).
  - Ocean (0, −30) gives `onLand=false`; lat 95 gives `inRange=false`.
- **Pre-computation:** `scripts/fetch_nasa_cache.py` produced `data/nasa-cache/` for all 22 sites plus `space-weather.json`, `radiation.json`, `osdr.json` and `index.json`.
- **NASA data panel** on every card: indicator · value · unit · level · source link · live/cached · date, plus "Re-check with NASA data". The card also shows:
  - a GIBS Landsat image (left) and a Trek Moon/Mars tile;
  - EONET events;
  - space weather (Landing/Base);
  - RadLab + OSDR under "What Earth can't reproduce";
  - "Data conflict" warnings.
- **Offline (simulated, every fetch rejected after load):** all 18 visible sites still show their 10 cached indicators. A real DevTools-offline test was not possible from automation; the team should repeat it by hand.
- **dataCheck:** `site.dataCheck` was written to `sites.json`, and `DATA-CHECK.md` was generated. Statuses were NOT changed.
- **Keys:** `git grep -i "api_key="` shows only code that builds the parameter and placeholder docs. No key is in the repo (`src/config.local.js` and `.env` are git-ignored).

## Sources "failed" and why
- **AppEEARS, Harmony:** no Earthdata Login credentials on the build machine. Not coded.
- **api.nasa.gov DEMO_KEY:** already rate-limited (429) from this IP. DONKI falls back to the CCMC host. Set a personal key in `src/config.local.js` before the demo.
- **ORNL DAAC TESViS:** works, but takes 30–55 s per call and returned 502/503 several times. In the browser it almost always times out. **NDVI is missing for: concordia, cerro-do-jarau, serra-da-cangalha, raso-da-catarina, jalapao** — re-run `python scripts/fetch_nasa_cache.py --site <ids>` later; failed sources now keep earlier values.
- **OSDR, RadLab:** no CORS, so pre-computed only. The RadLab GUI returned HTTP 500 (the Data API works).

## DATA-CHECK conflicts (26 in 8 sites)
- hiseas: 3
- rio-tinto: 1
- habitat-marte: 2
- iceland: 6
- cinder-lake: 5
- florida-hazard-field: 3
- serra-da-cangalha: 3
- jalapao: 3

Main patterns:
- NDVI shows moderate/dense vegetation where "sparse" was declared (cinder-lake, florida-hazard-field, iceland, serra-da-cangalha, jalapao).
- POWER says "humid" where semi-arid / high altitude was declared. For HI-SEAS this is a POWER grid-elevation limitation.
- Iceland's point falls on water in MODIS land cover.
- Details: `DATA-CHECK.md`.

Prompt 1 concluído (with the caveats above: TESViS gaps and offline tested by simulation).

# Fase 3 — Prompt 2: Validate a site + Leaderboard

## Step 0
- `validation-score.js` and `leaderboard.js` already existed from parallel work "Fase 3 – B" and were reused.
- The simulation services (`stats`, `scoring`) live in `/archive` (v2), not loaded.

## Works (tested in Chrome)
- Routes `#/contribute` and `#/leaderboard`. Header links "Validate a site" / "Leaderboard"; Home secondary buttons; card button "Validate this site" (opens the form with site, planet and mission pre-selected ✓).
- **New site in Brazil** (Chapada test plateau, −12.6, −41.4, Mars·Rover):
  - "Check with NASA data" used the real `validateCoordinates` (POWER, CMR, DONKI live);
  - line-by-line score 72 → Auto-checked;
  - submitted → leaderboard rank 12, correct order (validated sites, then total score, then first arrival).
- **Same site again, same nickname** → stored but "does not add points: Same person, same site and same mission — counted once" ✓.
- **Ocean (0, −30)** → blocked: "This point looks like open ocean. Pick a point on land." **lat 95** → blocked: "Coordinates out of range…" ✓
- **Reload** keeps the ranking (localStorage) ✓. Seeds: 30 items "Sample data (prototype)".
- `docs/supabase.sql` (insert-only RLS; not deployed).

## Missing
- Admin "Team-confirmed" only works per browser without Supabase.
- Mobile layout checked only via CSS breakpoints (the browser window could not be resized).

## 3 known abuse risks
1. **Nickname impersonation / sybil:** anyone can type any nickname, and many nicknames multiply points. There is no account.
2. **Gaming the score:** levels can be tuned until they match the data-suggested ones, and the "evidence" only checks that a link responds, not its content.
3. **Local storage tampering:** without a backend, localStorage can be edited to forge contributions or confirmations. With Supabase, the anon key allows unlimited inserts (no rate limit in the SQL).

Prompt 2 concluído.

# Fase 3 — Prompt 3: Sources & Method

## Step 0
- Only `vargeao` and `habitat-marte` have `sources` in sites.json. Both were checked: the DOI matches and the article link is live (`SOURCES-AUDIT.md`).

## Verification counts (2026-11-14)
| File | verified | unverified | removed |
|---|---|---|---|
| data/datasources.json | 43 | 3 (CSA open data, HI-SEAS 401, Habitat Marte DNS) | 0 |
| data/references.json | 23 | 0 | 0 |
| data/official-resources.json | 27 | 3 (RadLab GUI 500, 2 CSA pages unreachable) | 0 |

All 35 DOIs resolve in Crossref/DataCite. 111 links were requested; failures are bot blocks (403/429) on publisher pages whose DOI was confirmed, or the unverified items above. The JAXA link was fixed.

## The two resource lists differ (team must check the Resources tab)
- The brief's "official" list (api.nasa.gov, DONKI, OSDR, RadLab, Trek, the CSA youth/food pages) is **not** on the 2026 challenge Resources tab.
- The "team notes" list (Earthdata Search, Worldview, PDS, LRO/Diviner, CSA RCM/RADARSAT-1, SAR tutorial, Copernicus, ESA OSC, JAXA G-Portal) **is**.
- Labels were adjusted (DECISIONS P3-1).

## Works
- `#/sources` with a side index and anchors (scroll in place), 10 sections, data-source filters (body/agency/in app) ✓.
- No "removed" item shown ✓. Method weights = `SCORE_CONFIG` (generated) ✓. Educational model marked "In progress" with "[TEAM TO FILL]" ✓.
- "Sources & Method" in the header and the Home footer. All 9 routes load with 0 JS errors ✓.
- `docs/METHODOLOGY.md`, `docs/SUBMISSION-FIELDS.md`, `SOURCES-AUDIT.md`, `LICENSE` (Apache 2.0).

## Team must review before recording the demo
1. **Paste the official challenge text** for "Why 8 dimensions" (`data/sources-page.json`, `docs/METHODOLOGY.md`).
2. **Educational model:** fill all fields in `data/education.json` (no framework/BNCC chosen).
3. **DATA-CHECK conflicts:** decide per site (`DATA-CHECK.md`). Key ones: Iceland coordinate on water; vegetation of cinder-lake, florida, iceland, serra-da-cangalha, jalapao; climate of HI-SEAS and the Brazilian semi-arid sites.
4. **Re-run TESViS** for the sites without NDVI when ORNL is stable.
5. **Personal NASA API key** in `src/config.local.js` (DEMO_KEY is rate-limited).
6. **Trek "representative features"** (`data/trek-features.json`) and the RadLab unit (µGy/h, from the docs).
7. **Site texts without sources** (`SOURCES-AUDIT.md` §3): crater sizes now have verified papers to cite; Cerro do Jarau should say "possible impact structure".
8. Confirm the CSA pages and the Habitat Marte official site by hand (unreachable from the build machine).
9. Test real offline (DevTools) and mobile by hand.

Prompt 3 concluído.
