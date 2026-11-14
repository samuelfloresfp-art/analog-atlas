# Analog Atlas — prototype (v2)

Prototype for the NASA Space Apps Challenge 2026 challenge *"Identify Earth Locations that Analog the Permanent Moon Base Locations and Mars"*.

**Two phases:**
1. **Learn:** pick Moon or Mars and a mission (Landing / Rover / Base).
   - **Validated simulation sites** (green) are places where a test of that type is known.
   - **Possible** sites (dashed grey) pass the mission's required criteria, but no known test was found.
   - Each card explains the rules, ✓/~/✗ per criterion.
2. **Be an explorer:** propose a new site through a structured form.
   - It is checked with the **same rules** (`criteria.json`), plus open data when online: NASA POWER climate, and slope from AWS Terrain Tiles (SRTM-based).
   - The result can be published to the **Community map**.

> All site content is placeholder (`confidence: "assumption"`) and must be validated. Proposal checks test consistency with criteria and open data; they are not scientific validation.

## Run locally

No build step: plain HTML/CSS/JS ES modules, with Leaflet + markercluster in `vendor/`. You need an HTTP server, because the data is loaded with `fetch`:

```bash
python -m http.server 8765
# open http://localhost:8765
```

Works offline: the basemap falls back to local Natural Earth land polygons and the data checks show "not checked". To simulate offline, run this in the browser console: `localStorage.setItem("analogAtlas.forceOffline","1")`.

## Edit the content

| File | What it holds |
|---|---|
| `src/data/criteria.json` | **The rules.** Enums for every attribute, field labels, the "not reproducible on Earth" texts, and per `planet.mission`: `needs` + `rules` (`field`, `pass`, `partial`, `required`, `weight`, `explanation`) |
| `src/data/sites.json` | Sites: `attributes` (enum ids), `history` (`planet`, `mission`, `what`, `org`, `year`, `source`, `confidence`), `mirrors` per planet, `whyAnalog`, `whatItLacks`, `dimensions`, `evidence` (`pending`/`verified`), `searchedOn`, `sources` |
| `src/data/missions.json` | Mission name, description, accent color |
| `src/data/community.json` | Team example submissions (`example: true`) — max 3 |
| `src/strings.js` | All UI text (English) |
| `src/config.js` | Candidate color, community colors, novelty radius, timeouts, tile and API endpoints |
| `src/types.js` | JSDoc of every data shape |

**Marker rule** (`src/services/status.js`):
- **validated** = `history` has the same planet *and* mission;
- **candidate** = no required rule of `criteria.json` fails;
- otherwise **hidden**.

**To add a real source** to a past simulation, set `"source": { "title": "...", "url": "..." }` and change `confidence`. **To mark evidence as checked**, fill `value` fields and set `"status": "verified"`; only then does the card stop saying "pending team verification".

## Code map

```
index.html, styles.css, app.js        entry + hash router
vendor/                               Leaflet 1.9.4, markercluster 1.5.3, Natural Earth 110m land
src/config.js, src/strings.js, src/types.js
src/pages/       Home, LearnMap, Explore, ExploreResult, CommunityMap
src/components/  WorldMap, SiteMarker, SiteModal, NasaPanel, Modal, PlanetPicker,
                 CriteriaChecklist, EvidenceBlock, CheckTable, ExplorerForm, small (ConfidenceTag, DimensionTable, StatusBadge, FormStepper, NavBar)
src/services/    data, criteria, status, geo, validate, dataChecks, communityStore
src/services/nasa/  http (timeout/retry/cache), openApi, power, tesvis, cmr, donki, eonet, osdr, radlab, imagery, sources, validate
scripts/fetch_nasa_cache.py           pre-computes NASA data for every site → data/nasa-cache/, DATA-CHECK.md
data/            nasa-endpoints.json (sources + thresholds), trek-features.json, nasa-cache/
archive/         v1 simulation layer (not loaded)
```

Routes: `#/`, `#/map/:planet/:mission` (`?site=id` focuses a site), `#/contribute` (`?site=&planet=&mission=`), `#/leaderboard` (`?tab=`), `#/explore`, `#/explore/:planet/:mission`, `#/explore/result/:id`, `#/community` (`?sub=id`). Old v1 routes redirect to `#/`.

**Community storage:** `src/services/communityStore.js` is the only module that touches storage (`list`, `add`, `remove`, `report`, export/import). Today it uses `community.json` + `localStorage`. A commented Supabase stub shows where a backend plugs in. Use **Export submissions (JSON)** and **Import JSON** on the Community map to merge submissions from several machines.

## NASA data (Fase 3)

The home page has no search (team decision, 2026-11-14): title, subtitle and the three "Choose your mission" buttons.

Each site card has a **NASA data** panel: indicator · value · unit · suggested level · source link · live/cached · date, plus **Re-check with NASA data**. The card also shows:
- a real Earth image (GIBS) and Moon/Mars tile (Trek);
- space weather (DONKI) on Landing and Base maps;
- ISS radiation (RadLab) and OSDR studies under "What Earth can't reproduce";
- "Data conflict" warnings from `DATA-CHECK.md`.

Full list of sources, where each one is used and its status: **`NASA-DATA-USAGE.md`**. Endpoints and thresholds: `data/nasa-endpoints.json`.

```bash
# refresh the cache (≈ 15–20 min: the ORNL DAAC MODIS API takes 30–55 s per call)
python scripts/fetch_nasa_cache.py            # all sites → data/nasa-cache/*.json, sites.json dataCheck, DATA-CHECK.md
python scripts/fetch_nasa_cache.py --site uyuni
python scripts/fetch_nasa_cache.py --point -27.13 -52.13 --mission rover   # print a report only
```

**Keys:** copy `src/config.local.example.js` to `src/config.local.js` (git-ignored) and set `NASA_API_KEY`. Without it the site uses `DEMO_KEY`, limited to 30 requests/hour and 50/day per IP. The script reads `NASA_API_KEY` from the environment.

In code: `validateCoordinates(lat, lon, { mission, planet, live })` from `src/services/validation-source.js`. It returns the cached report for known sites and calls the sources live for new coordinates. `getSpaceWeather()` comes from `src/services/nasa/donki.js`.

## Validate a site + Leaderboard (Fase 3)

- **`#/contribute`** — public nickname only (no personal data).
  - Validate an existing site or propose a new one (map click or lat/lon).
  - Choose mission + mirrored feature, rate the 8 dimensions with optional evidence, and list "What it lacks" (≥ 2).
  - **Check with NASA data** compares your levels with the data-suggested levels and shows the score line by line. Weights are in `SCORE_CONFIG` (`src/services/validation-score.js`) and on screen under "How the score works".
- **`#/leaderboard`** — ranked by validated sites (Auto-checked ≥ 60 or Team-confirmed), then total score, then first arrival.
  - Tabs: All time · Landing · Rover · Base · Brazil & South America.
  - Anti-farm: same nickname + site + mission counts once; points < 1 km from a site the same nickname already validated do not add up.
  - Sample data: `src/data/seedContributions.json` (`seed: true`, labelled "Sample data (prototype)"; regenerate with `python scripts/generate_seed_contributions.py`).
- Storage: `localStorage` by default. Optional Supabase if `SUPABASE_URL` + `SUPABASE_ANON_KEY` are in `src/config.local.js`; table + RLS in `docs/supabase.sql`.
- Admin (demo): `#/leaderboard?admin=<ADMIN_CODE>` (code in `src/config.local.js`) → "Mark Team-confirmed".

## Test checklist

- [ ] Home shows the title, subtitle and the 3 mission buttons; the Moon/Mars toggle changes the counts.
- [ ] Each mission map opens; clicking a site opens its card with the NASA data panel.
- [ ] In DevTools, go offline after loading: cards still show the cached indicators.
- [ ] "Re-check with NASA data" turns POWER/CMR/DONKI rows to `live`; TESViS rows keep `cached` (slow API).
- [ ] Landing and Base cards show "Space weather on the target (real data)".
- [ ] Explorer form: the Atlantic (0, −30) is blocked as ocean.
- [ ] Community map loads.
- [ ] Validate a site: a new point in Brazil → Check with NASA data → score → Submit → appears on the leaderboard; submitting it again adds no points.
- [ ] Ocean (0, −30) and latitude 95 are blocked with a clear message.
- [ ] Site card → "Validate this site" opens the form with the site pre-selected.

## Publish on GitHub Pages

1. Push this folder to a GitHub repository (files at the repo root). Remove `archive/` first if it should not be public.
2. Repository → **Settings → Pages** → *Deploy from a branch* → `main`, `/ (root)`.
3. Open `https://<user>.github.io/<repo>/`. Hash routing needs no server config; `.nojekyll` is included.

## Data and credits

- Basemap: NASA GIBS (Blue Marble Shaded Relief + Bathymetry). Fallbacks: © OpenStreetMap contributors © CARTO; Natural Earth (public domain).
- Climate check: NASA POWER climatology API (no key).
- NASA data panel: see `NASA-DATA-USAGE.md` (DONKI, Trek, OSDR, RadLab, POWER, ORNL DAAC TESViS doi:10.3334/ORNLDAAC/1600, CMR, GIBS, EONET).
- Slope check: AWS Terrain Tiles (Terrarium), open data that aggregates SRTM and other DEMs.
- Libraries: Leaflet, Leaflet.markercluster (BSD-2-Clause).
- Code generated with AI assistance (Claude Code). Declare this in the "Use of Artificial Intelligence" field.
