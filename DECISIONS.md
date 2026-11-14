# Decisions log

Decisions taken while building the prototype without asking. Review them as a team.

---

# v2 — Learn → Be an explorer → Community map (2026-11-14)

## Scope change
- **V1. Simulation/team/vehicle layer removed in v2; code kept in /archive.**
  - Archived files: researchers, seedRuns, scoring, stats, Simulation, Results, ResearcherCard, the old `small.js` (Stepper/StatsBars), the seed script, the v1 map page, and v1 copies of missions/sites/strings.
  - There is no bundler. "Not in the build" means no file in `index.html`, `app.js` or `src/` imports anything from `/archive` (checked with grep).
  - Delete `/archive` before publishing on GitHub Pages if it should not be public.
- **V2. Stack unchanged (plain JS).** Node.js is still unavailable, so there is still no `npm run build`.
  - Leaflet 1.9.4, Leaflet.markercluster 1.5.3 and Natural Earth `ne_110m_land.geojson` (public domain) are now served from `vendor/`, not a CDN.

## Data model
- **V3. Planet assignment of existing history entries** (`[ASSUMPTION]`). v1 entries had no planet, so each got one:
  - Moon: Black Point (rover), Cinder Lake (landing, rover), Florida hazard field (landing).
  - Mars: everything else.
  - No HI-SEAS/Concordia/Lanzarote Moon entries were added, because no sourced record exists in the JSON.
  - Result: **Moon·Base and Mars·Landing have 0 validated sites** and show "No validated simulation sites yet".
  - All entries have `org: null`, `year: null`, `source: null`, `confidence: assumption`, so the card shows "Source pending".
- **V4. Site `attributes` are common-sense estimates** (`confidence: assumption`) and need team review. The most consequential choice:
  - **Vargeão, Vista Alegre, Cerro do Jarau and Araguainha have `vegetation: moderate`** (farmland, grassland, cerrado).
  - All Landing and Rover combos require none/sparse vegetation, and their isolation is populated/rural (Base requires remote).
  - So **these four Brazilian craters are hidden on every learning map**. Search still finds them and says why.
  - We kept the rule strict and the attribute honest. Options for the team:
    - (a) describe a smaller exposed area, e.g. the crater core or outcrops, with its own attributes;
    - (b) relax the vegetation rule to allow "moderate" as partial for Rover;
    - (c) keep them hidden and let explorers propose them.
- **V5. `evidence` entries are all `status: pending` with `value: null`.** Each site gets 3 dimensions (terrain, temperature, geology) per relevant body, using these suggested datasets:
  - **Earth:** SRTM/Copernicus DEM, NASA POWER, EMIT L2B.
  - **Moon:** LOLA, Diviner, M3.
  - **Mars:** MOLA, THEMIS, CRISM.
  - The card says "pending team verification" until the status is `verified`.
- **V6. `mirrors` is now per planet** (`{moon, mars}`). If a site has no feature for the chosen planet, the card says so.
- **V7. "What a site needs" lives in `criteria.json` (`combos[*].needs`)** instead of `missions.json`, so the rules have a single source.
  - `missions.json` keeps only name, description, accent and confidence.
- **V8. Physical limits (gravity, atmosphere/vacuum, radiation)** are in `criteria.json → notReproducible`. They are always appended to "What it lacks" and never used as a pass/fail rule.

## Criteria (`src/data/criteria.json`) — weights and thresholds are assumptions
- **V9. Scoring:** each rule checks one attribute: pass = 1, partial = 0.5, fail = 0. Score = 100 × weighted average.
  - A site is hidden / a proposal is "Not consistent" only if a **required** rule fails. Partial is allowed.
- **V10. Rule adjustments vs the brief:**
  - **Landing:** vegetation none = pass, sparse = partial. Access road/track is optional.
    - Moon bonus "low sun angle" uses `latitudeBand`, computed from the coordinates: > 60° = pass, 30–60° = partial.
    - Mars bonuses: dust and arid climate.
  - **Rover:** slopes 2–30° pass, > 30° partial, 0–2° **fail** (required).
  - **Base:** isolation must be remote/extreme (rural fails). Climate must be arid/hyper-arid/polar/high-altitude, with semi-arid as partial.
    - ISRU (permafrost or hydrated minerals) is optional with weight 3.
    - Mars adds a ground-ice bonus. Moon adds cold and lava-tube bonuses.

## Explorer validation
- **V11. Final status:**
  - **Plausible** = all required rules *pass* and every data check is *consistent*.
  - **Not consistent** = a required rule fails, or any data check is a *strong* mismatch.
  - **Needs evidence** = everything else, including "not checked" (offline).
- **V12. Data checks — endpoints tested from the browser on 2026-11-14:**
  - ✅ **NASA POWER climatology API** (`power.larc.nasa.gov/api/temporal/climatology/point`, no key, CORS ok).
    - Returns monthly T2M / T2M_MIN / T2M_MAX / PRECTOTCORR, plus grid elevation in `geometry.coordinates[2]`.
    - Precipitation classes (team assumption): hyper-arid < 100 mm/yr, arid < 250, semi-arid < 600, humid ≥ 600.
    - Polar/cold is checked with mean annual temperature (< 0 °C ok, < 8 °C light mismatch).
    - High altitude is checked with POWER grid elevation (≥ 2500 m ok, ≥ 1500 m light mismatch).
    - A declared temperature range more than 10 °C off counts as a light mismatch.
  - ✅ **AWS Terrain Tiles, Terrarium** (`s3.amazonaws.com/elevation-tiles-prod/terrarium`, CORS ok). Open data that aggregates SRTM and other DEMs.
    - Mean slope is computed at zoom 12 (~36 m/px at the equator) within 1 km.
    - One class off = light mismatch; two or more = strong.
    - The coarse DEM underestimates local slopes.
  - ❌ **Earthdata / CMR downloads were not used.** They need Earthdata Login, which is not possible from a public static page.
  - Timeout is 8 s per check. Any error → "not checked".
- **V13. Land mask:** Natural Earth 110m. Points within 30 km of a coastline segment count as land, because the 110m coasts are coarse.
- **V14. Novelty:** a known analog area is < 10 km from a site with any history; a duplicate is < 10 km from another submission. Novelty is shown but does not change the status.
- **V15. Personal data:** no personal fields are asked. The texts are rejected if they contain something that looks like an e-mail or phone number. The nickname is optional, up to 30 characters.

## Community
- **V16. Storage:** examples come from `src/data/community.json`; submissions live in this browser's `localStorage`.
  - "Report" is a local flag only.
  - Export/Import JSON is meant for consolidating submissions across machines.
  - A Supabase stub is commented in `communityStore.js` (no key, no call).
- **V17. Two example submissions** (Riachão crater, Vale da Lua) are marked `example: true`, carry the badge "Example submission (team-created)" and are excluded from counts and export.
  - Their attributes and coordinates are rough team guesses.
- **V18. Not consistent proposals** can only be saved locally. Publishing or saving clears the draft so the next proposal starts fresh.

## Map
- **V19. noWrap + maxBounds.** Minimum zoom is computed from the container width so there are no empty side bands. Nearby markers are clustered.
  - Basemap fallback chain: NASA GIBS → CARTO dark → local Natural Earth land polygons (offline).
  - Debug switch to simulate offline: `localStorage.setItem("analogAtlas.forceOffline","1")`.

---

# v1 decisions (simulation prototype — partly superseded by v2)

## Stack
1. **No Vite/React/TypeScript — plain HTML/CSS/JS fallback.** Node.js/npm are not installed on the build machine, so the spec's fallback was used: `index.html` + `app.js` + ES modules in `src/`, Leaflet 1.9.4 from unpkg. Installing Node system-wide was not done without the team's approval.
   - The requested folder structure was kept (`src/pages`, `src/components`, `src/services`, `src/data`), with `.js` instead of `.ts`. `src/types.js` documents the data shapes with JSDoc.
   - The small components (ConfidenceTag, DimensionTable, Stepper, MissionButtons, StatsBars) live together in `src/components/small.js`.
   - "Build without TypeScript errors" does not apply. Verification was done in the browser instead (see PROGRESS.md).
   - Migrating to Vite + React later is straightforward: the JSON, strings and services are framework-independent.
2. **Seed generator in Python** (`scripts/generate_seed.py`, fixed seed 2026), because Node is unavailable and Python is installed.
3. **Data is loaded with `fetch`**, so the site needs an HTTP server (GitHub Pages or `python -m http.server`). It does not open from `file://`.

## Content / data
4. **"Hover" read as "Rover"** `[ASSUMPTION]`, as in the project context. If it means a hover flight test, it needs a different mission with different site criteria.
5. **No site in the seed list had a past *landing* test**, but the spec requires ≥2 stars per mission. Two sites were added from general knowledge, both flagged "(to verify)" and `confidence: assumption`:
   - *Cinder Lake Crater Field, Arizona*: artificial craters used for Apollo-era training and rover tests.
   - *Florida lander hazard field*: engineered hazard field used for autonomous lander tests.
   - **Verify both before the demo, or replace them.**
6. **History entries have no years and no mission names**, except names already given in the brief (Desert RATS, MDRS, HI-SEAS), to avoid inventing facts. Uncertain entries say "(to verify)".
7. **Sources:** all sites have empty `sources` except two, which use references the team supplied in the project context:
   - Vargeão: Icarus 252 (2015), doi:10.1016/j.icarus.2015.02.001
   - Habitat Marte: Olhar Digital (2021) article
   - Both are labeled "team-provided". `confidence` stays `assumption` everywhere.
8. **Suitability (ok/why) for every site × mission is common-sense judgement.** Each "why" needs data behind it. Crater sizes (~12 km Vargeão, ~9.5 km Vista Alegre, ~40 km Araguainha, ~13 km Serra da Cangalha) are approximate.
9. **Green card shows a notice when the site was used for another mission type** (e.g. Atacama on the Landing map), following team decision #2.
10. **Star = any history for this mission**, regardless of `suitability.ok`. A star card lists all history entries for the site, with the mission name on each.

## UX
11. **Target filter options:** All / Moon (moon + both) / Mars (mars + both) / "Moon & Mars only" (target = both).
12. **The untapped counter respects active filters.**
13. **`#/site/:id` redirects to the site's best mission** (first where it is green, else first where it is a star) and opens its card.
14. **Results have two scopes:** "This site" (as specified) and "All sites, this mission". With ~200 seeded runs spread over 3 missions × ~20 sites, each site has only a handful of runs.
15. **Team size 3–4 for all missions.** Once 4 are picked, the other cards are disabled.
16. **Researchers are sorted** by same continent first (badge "Near this site"), then by name.

## Scoring (game, not science — shown on screen)
17. Total of 100 points:
    - **Roles, 40 pts** = 40 × roles covered / roles recommended.
    - **Vehicle, 30 pts** if the vehicle's `bestFor` shares an environment with the site, else 12.
    - **Conditions, 30 pts** = sum of chosen option points, scaled to 30.
    - All weights are in `src/services/scoring.js`. Option points are in `missions.json`.

## Stats
18. Runs are saved to `localStorage` (key `analogAtlas.runs.v1`). If storage is unavailable, they are kept in memory.
    - Stats = seeded runs + this browser's runs.
    - `src/services/stats.js` is the only module touching storage. Its async API (`saveRun`, `getRun`, `getRuns`, `aggregate`) is meant to be re-implemented on Supabase/Firebase.

---

# Fase 3 – Prompt 1 — Home without search + NASA data (2026-11-14)

- **P1-0. Context files missing.** `CONTEXTO-PROJETO.md` and `prompts-fase-3-sequencial.md` do not exist in this folder or near it. I followed the prompt text, the existing code and `fontes-dados-nasa-api-earthdata.md`.
- **P1-1. Stack unchanged.** Plain HTML/JS, no Node. So:
  - browser clients are `.js` ES modules;
  - the pre-computation script is **Python** (`scripts/fetch_nasa_cache.py`, standard library only), not `scripts/fetch-nasa-cache.ts`.
  - Indicator logic exists twice (JS `validate.js` and Python). Both read the same thresholds from `data/nasa-endpoints.json`.
- **P1-2. Home.** Search bar, `SearchBar.js`, `services/search.js`, the search strings and the `.search*` CSS were deleted (only Home used them, checked with grep).
  - A small **Moon/Mars toggle** (default Mars) stays above the 3 mission buttons, because each button opens a planet-specific map.
  - "Be an explorer · Community map" are now small links instead of a big call-to-action.
  - `PlanetPicker.js` and the strings `step1`, `step2`, `step2Hint`, `exploreTitle`, `exploreText` are now unused. They were left in place, since removing them was not needed.
- **P1-3. File locations.** `data/` sits at the repo root, as the prompt names it (`data/nasa-endpoints.json`, `data/nasa-cache/`), next to the existing `src/data/`.
- **P1-4. Stub replaced.** Agent B's `src/services/nasa/validate.stub.js` was deleted. `src/services/validation-source.js` now re-exports the real `validateCoordinates` and sets `VALIDATION_IS_STUB = false`.
- **P1-5. Cache first.** For a coordinate within 1 km of a site, `validateCoordinates` returns the pre-computed report (status `cached`). New coordinates, or `opts.live`, call the sources live.
  - When a live source fails for a known site, the cached value is kept (status `cached`) and the error is listed.
  - `data/nasa-cache/index.json` is loaded at app start, so cards keep working if the network drops afterwards. A full page reload while offline still cannot work: there is no service worker.
- **P1-6. `opts.planet`** (default `mars`) was added to the signature, because `criteria.json` rules are per planet·mission. The required rules that data can check (vegetation, climate) are the same for both planets.
- **P1-7. `onLand`.** It comes from MODIS land cover: class 17 = water → `false`.
  - If land cover fails (usual in the browser: TESViS is too slow), the Natural Earth 110m mask is used **only to say "water"** (open ocean > 30 km from a coast), never to say "land". Otherwise `onLand` is `null`. `basic.onLandSource` tells which source decided.
- **P1-8. Indicator → dimension** (`indicatorDimensions` in nasa-endpoints.json):
  - temp_range → temperature; aridity → water; vegetation → biology;
  - elevation → atmosphere (higher = thinner air); wind → atmosphere (aeolian);
  - land_cover → terrain; solar, data_coverage, space_weather → operational;
  - radiation_gap → atmosphere (shielding; always `weak`). space_weather is always `nodata` (context, same for all sites).
- **P1-9. Thresholds** are project rules, all in `data/nasa-endpoints.json`:
  - NDVI < 0.2 strong / < 0.4 partial;
  - precipitation < 250 / < 600 mm/yr;
  - temperature range ≥ 35 / ≥ 20 °C;
  - elevation ≥ 2500 / ≥ 1500 m;
  - solar ≥ 6 / ≥ 4.5 kWh/m²/day;
  - wind ≥ 5 / ≥ 3 m/s;
  - CMR coverage 4 / ≥ 2 of 4.
  - Classes for missionFit: NDVI < 0.15 none, < 0.3 sparse, < 0.5 moderate, else dense. Climate class follows V12 (polar if T2M < 0 °C, high altitude if ≥ 2500 m, then the precipitation classes).
- **P1-10. missionFit** uses the REQUIRED rules of `src/data/criteria.json` (requirements moved there in v2, V7), not `missions.json`. Only data-inferable fields are checked (vegetation, climate). Water fails everything as "On land".
- **P1-11. Data check.** Hand-entered status is computed (v2), so "hand status" = the state derived from hand-typed attributes and history. Two kinds of conflict:
  - **state-vs-data**: the site is shown on a planet·mission map, but missionFit fails;
  - **attribute-vs-data**: the declared vegetation/climate differs from the inferred one *and* this changes a required-rule result somewhere.
  - Written into `sites.json` (`dataCheck`) and `DATA-CHECK.md`. Nothing else in sites.json is changed.
- **P1-12. Divergences from the brief / docs:**
  - DONKI: the old host `kauai.ccmc.gsfc.nasa.gov/DONKI/WS/get` timed out. The documented OpenAPI host `https://ccmc.gsfc.nasa.gov/DONKI-API/get/*` works, but limits ranges to 60 days, so the yearly count uses 60-day chunks.
  - api.nasa.gov DEMO_KEY was already rate-limited (429) from this IP. DONKI tries api.nasa.gov first, then CCMC.
  - OSDR and RadLab send no CORS header for other origins, so they are pre-computed only.
  - RadLab: the GUI returned 500; the Data API works with `query=…&columns+=absorbed_dose_rate` (the `+` must not be URL-encoded).
  - TESViS: max 10 time steps per call, 30–55 s per call, some 502s. Pre-computed only in practice.
  - GIBS: the thumbnail uses `Landsat_WELD_CorrectedReflectance_TrueColor_Global_Annual` (cloud-free, confirmed in GetCapabilities) instead of daily MODIS True Color, which is often cloudy.
  - Trek: MOLA level 8 returns 404, so level 6 is used. Moon uses the LROC WAC mosaic (the Trek docs' sample layer), not LOLA.
- **P1-13. Trek features** (`data/trek-features.json`, `confidence: deduction`). The Mars/Moon tile shows a well-known **representative** location of the mirrored feature type (e.g. Gusev for "impact crater in basalt"), not a matched twin. Coordinates are approximate. **Team to review.**
- **P1-14. Radiation.**
  - Value = **median** DosTel2 absorbed dose rate on the ISS, 2020-01-01..04, from RadLab. The mean (~33) is pulled up by South Atlantic Anomaly passes.
  - The unit µGy/h comes from the RadLab docs example; the API has no unit column. **Verify.**
  - Earth background = UNSCEAR 2008 world average, 2.4 mSv/yr. It is marked `manual`, and the card warns that Gy and Sv are different quantities.
- **P1-15. OSDR studies.** The script picks the top hit for "partial gravity", the top "regolith" hit mentioning the planet, and the top "radiation" hit. "analog" is searched and counted but not shown: its top hits were microgravity cell studies.
- **P1-16. Earthdata Login sources** (AppEEARS, Harmony): not coded. There were no credentials to test them, and the prompt forbids untested endpoints. Elevation = NASA POWER grid-cell mean. Partner agencies (ESA, INPE, CONAE) are `candidate`.
- **P1-17. Keys.** `src/config.local.js` (git-ignored, same file Agent B uses) → `LOCAL.NASA_API_KEY`. Example in `src/config.local.example.js`. The script reads the env var `NASA_API_KEY`. The API key is never part of a cache key.

---

# Fase 3 – Prompt 2 — Validate a site + Leaderboard (2026-11-14)

- **P2-0. Precondition OK.** `src/services/nasa/validate.js` exports `validateCoordinates` with the Prompt 1 `ValidationReport`. All access goes through `src/services/validation-source.js`.
- **P2-1. Reused services.** `validation-score.js` and `leaderboard.js` already existed from parallel work ("Fase 3 – B") and match the brief: weights in the exported `SCORE_CONFIG`, anti-farm, Supabase adapter, admin mode. New in this prompt: the pages `Contribute.js` and `Leaderboard.js`, routes, nav links, the Home button, the card button, seeds, `docs/supabase.sql`, strings and CSS.
- **P2-2. Single-page form**, not a stepper: sections 1–7 on one page with labels. The draft is kept in `sessionStorage` (nickname only after submit).
- **P2-3. Indicators NOT scored for agreement:** `radiation_gap` and `space_weather` (`NOT_SITE_SPECIFIC` in validation-score.js). They have the same value for every Earth site, so scoring them would only reward or punish everyone the same way. They are still shown in the comparison table.
- **P2-4. "Valid coordinate on land" (+10).**
  - Uses `onLand === true` (MODIS land cover). If land cover did not answer (it usually times out live in the browser), the extra field `basic.landMask === "land"` (point inside a Natural Earth 110m polygon) also earns the +10.
  - `onLand` itself is never set to true from the mask. Ocean (`onLand=false`) and lat/lon out of range block the submission.
- **P2-5. Mission requirements** = the REQUIRED rules of `criteria.json` for the chosen planet·mission, each with a "Met" checkbox and an optional justification. −10 applies only when the user ticks "Met", NASA data says it fails, and there is no justification.
- **P2-6. Seeds** are in `src/data/seedContributions.json` (not `data/`), because `leaderboard.js` already loads them from there. There are 30 items, generated by `scripts/generate_seed_contributions.py` (seed 2026), with nicknames `Sample_*`, `seed: true`, and the label "Sample data (prototype)".
  - Seed scores are illustrative, not computed.
- **P2-7. Team-confirmed.** `#/leaderboard?admin=<ADMIN_CODE>` (ADMIN_CODE in the git-ignored `src/config.local.js`) shows the recent contributions with "Mark Team-confirmed".
  - Confirmations are stored in this browser only. With Supabase, the SQL policy forbids the public from inserting `team-confirmed`.
- **P2-8. Brazil & South America tab:** site continent for existing sites; a lat/lon box for proposals.
- **P2-9. Badges:** "8/8 dimensions with evidence" (a URL/DOI in all 8), and "First analog in a new country" (a validated proposal in a country with no site in sites.json). Nothing else.
- **P2-10. Supabase:** `docs/supabase.sql` (table `contributions`, RLS: select + insert for anon, no update/delete). Not deployed.

---

# Fase 3 – Prompt 3 — Sources & Method (2026-11-14)

- **P3-0. Context files** `CONTEXTO-PROJETO.md` and `prompts-fase-3-sequencial.md` still do not exist. The §3.5 list was taken from the prompt text and checked against the official challenge page.
- **P3-1. Official resources were relabelled after checking the real page.** The 2026 challenge Resources tab lists Earthdata Search, Worldview, PDS, LRO/Diviner, CSA RCM/RADARSAT-1, the CSA SAR tutorial, Copernicus, ESA OSC and JAXA G-Portal. It does NOT list api.nasa.gov, DONKI, OSDR, RadLab, Trek or the two CSA youth/food pages. So:
  - the page's own list gets the "Official challenge resource" badge;
  - the brief's tools are shown as "NASA resources from the team brief";
  - `officialChallengeResource` was set to false for those 5 in `data/nasa-endpoints.json` (new field `inTeamBrief: true`).
- **P3-2. Research by 3 AI agents, checked again by the main session.**
  - All 35 DOIs were re-resolved in Crossref/DataCite; 7 needed a slower retry because of rate limiting.
  - All links were requested over HTTP. Publisher 403 pages (bot blocking) count as verified only when the DOI resolves in Crossref.
  - Totals: datasources 43 verified / 3 unverified; references 23 / 0; official resources 27 / 3; 0 removed.
- **P3-3. Content in JSON:**
  - `data/sources-page.json` (texts), `data/official-resources.json`, `data/datasources.json`, `data/references.json`, `data/education.json`;
  - the Method score table is generated from `SCORE_CONFIG`/`scoreRulesTable()`, and the thresholds table from `data/nasa-endpoints.json`.
- **P3-4. Navigation inside the page.** The app uses hash routing (`#/…`), so section links are `#/sources?s=<id>`. The click is intercepted and scrolls in place; a direct link scrolls after render.
- **P3-5. Citations in "Theoretical basis"** are picked by topic from verified references only. The "Why 8 dimensions" paragraph keeps a visible "[TEAM TO FILL]": the official challenge text was not available to quote.
- **P3-6. Educational model** = structured placeholder ("In progress"), with every field "[TEAM TO FILL]". No framework or BNCC skill was chosen. The CSA STEM pages are linked only if verified, and they are currently unverified, so they are not linked.
- **P3-7. Simulation.** The v1 simulation is archived (since v2). There is no simulation route to keep intact; the Method section says so.
- **P3-8. License:** Apache 2.0 (`LICENSE`, official text from apache.org), because none was defined. No NASA logos.
- **P3-9. sites.json changes:** only the Vargeão source label (DOI verified, "(verify)" removed). Everything else is listed in `SOURCES-AUDIT.md` for the team: crater sizes now have verified sources available; Cerro do Jarau is a "possible" impact structure; Léveillé is 2009.
- **P3-10. Submission texts** (`docs/SUBMISSION-FIELDS.md`): the reference list is generated from the Crossref-based APA strings in `data/references.json`, not typed by hand.

---

# Map + terrain scan from the team's Python scanner (`app_marte.py`, 2026-11-14)

- **M-1. Basemap.** GIBS Blue Marble only exists up to zoom 8 (~500 m/px), so it pixelated when zooming into a site. Default base is now "Auto": Blue Marble up to zoom 8, Esri World Imagery from zoom 9 (`AUTO_HIRES_FROM_ZOOM` in `config.js`). The layer switcher (top right) adds NASA GIBS Landsat WELD 30 m, Esri satellite and OpenTopoMap (contours). Map `maxZoom` 12 → 18. The CARTO → Natural Earth fallback is unchanged.
  - Esri and OpenTopoMap are **visual context only, never used as data**, and are attributed on the map. NASA layers stay the official imagery.
- **M-2. Terrain scan** (Explorer → Location step): 5×5 cells of 600 m around the marker, mean/max slope and relief per cell from the same DEM used by the slope check (`src/services/dem.js`, shared). Click a cell or "Move marker here" to relocate; CSV download. Adapted from the Python scanner's "micro-scan around a point".
- **M-3. Climate is NOT scanned per cell.** NASA POWER is a ~0.5° × 0.625° grid; a 3 km grid would repeat the same value in every cell (the Python scanner's 0.7° micro-scan had this problem). Climate stays a single check at the end.
- **M-4. Links on site cards, explorer step and result page:** "Open in NASA Worldview" (official) and "Open in Google Maps" (3D / Street View).
- **M-5. Left out of `app_marte.py` on purpose:**
  - the "Fidelidade" 0–1 score and its 12 sub-scores (≈6 variables reused; "Radar" was a constant by latitude);
  - the ASTER "geology" (it counted CMR granules, which measures how often the satellite passed, not mineralogy);
  - Moon/Mars weights computed only from Earth data;
  - per-point Nominatim reverse geocoding (1 req/s usage policy);
  - the unused "NASA API Key" field, the dead Stamen layer, the arbitrary 0.68/0.72 colour cut-offs.
