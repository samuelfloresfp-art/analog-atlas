# NASA data used in Analog Atlas

For the "NASA Data" field of the Space Apps form. Machine-readable version (endpoints, CORS, thresholds, test date): `data/nasa-endpoints.json`.
All sources were called for real on 2026-11-14. "Pre-computed" = fetched by `scripts/fetch_nasa_cache.py` and stored in `data/nasa-cache/` (so the demo works offline); "live" = also called from the browser for new coordinates or "Re-check with NASA data".

| Resource | On the challenge Resources tab? | Where it appears on the site | File(s) | Status |
|---|---|---|---|---|
| **NASA Open APIs** (api.nasa.gov) | no (team brief) | First try for DONKI space weather; key helper with DEMO_KEY fallback | `src/services/nasa/openApi.js`, `donki.js` | verified (DEMO_KEY was rate-limited on 2026-11-14 → falls back to the CCMC host) |
| **DONKI** (CCMC) — FLR, CME, SEP, GST | no (team brief) | Site card, Landing and Base maps: "Space weather on the target (real data)"; indicator `space_weather`; `getSpaceWeather()` for the simulation | `src/services/nasa/donki.js`, `src/components/NasaPanel.js`, `data/nasa-cache/space-weather.json` | verified, live + pre-computed |
| **Solar System Treks** (Mars Trek MOLA, Moon Trek LROC WAC) | no (team brief) | Site card → NASA data panel: Moon/Mars tile next to the Earth image | `src/services/nasa/imagery.js`, `data/trek-features.json` | verified, live tiles |
| **NASA OSDR** search API | no (team brief) | Site card → "What it lacks" → "What Earth can't reproduce": 1–3 OSD studies (partial gravity, regolith, radiation) | `src/services/nasa/osdr.js`, `data/nasa-cache/osdr.json` | verified, pre-computed (no CORS for browsers) |
| **RadLab** (OSDR Radiation Dosimetry Database) | no (team brief) | Indicator `radiation_gap`; "What Earth can't reproduce": ISS DosTel2 dose rate vs Earth background | `src/services/nasa/radlab.js`, `data/nasa-cache/radiation.json` | verified, pre-computed (no CORS). Earth background value is manual (UNSCEAR 2008) |
| **NASA POWER** climatology | — | Indicators `temp_range`, `aridity`, `elevation`, `solar`, `wind`; climate class used by `missionFit` and DATA-CHECK | `src/services/nasa/power.js` | verified, live + pre-computed |
| **ORNL DAAC TESViS** (MOD13Q1 NDVI, MOD11A2 LST, MCD12Q1 land cover), doi:10.3334/ORNLDAAC/1600 | — | Indicators `vegetation`, `land_cover`, `basic.onLand`, LST in `temp_range.details`; vegetation class used by `missionFit` and DATA-CHECK | `src/services/nasa/tesvis.js` | verified; pre-computed (30–55 s per call, so live calls usually time out) |
| **NASA CMR** (EMITL2BMIN, SRTMGL1, ASTGTM, HLSL30) | yes, as the catalogue behind Earthdata Search | Indicator `data_coverage` | `src/services/nasa/cmr.js` | verified, live + pre-computed |
| **NASA GIBS WMTS** (Landsat WELD annual true colour; Blue Marble basemap) | yes, as the imagery service behind Worldview | Site card left image + Earth tile in the NASA data panel; learning-map basemap | `src/services/nasa/imagery.js`, `src/config.js` | verified, live tiles |
| **EONET** v3 | — | Site card → "Natural events nearby (EONET, last year)" | `src/services/nasa/eonet.js` | verified, pre-computed (live client available) |
| AppEEARS | — | — | — | failed: no Earthdata Login on the build machine |
| Harmony | — | — | — | failed: no Earthdata Login on the build machine |
| OpenTopography (plan C, not NASA) | — | — | — | candidate (needs a key) |
| ESA Copernicus DEM / Sentinel-2, INPE Brazil Data Cube, CONAE | partner agencies | — | — | candidate (not integrated) |

**Validation** (`src/services/nasa/validate.js` → `validateCoordinates(lat, lon, {mission, planet, live})`): combines the sources above into a `ValidationReport`, used by the site cards, the contribution form (prompt 2) and the Data check (`DATA-CHECK.md`).

Thresholds that turn values into "strong / partial / weak" are project rules written in `data/nasa-endpoints.json`, not scientific consensus.

**Official challenge Resources tab** (checked 2026-11-14 on https://www.spaceappschallenge.org/2026/challenges/permanent-moon-base-locations-and-mars/):
- It lists NASA Earthdata Search, NASA Worldview, NASA PDS, LRO / LRO Diviner (PDS Geosciences Node), CSA RCM and RADARSAT-1, the CSA SAR tutorial, Copernicus Data Space Ecosystem, the ESA Open Science Catalog and JAXA G-Portal.
- The app integrates two of them through their services: Earthdata Search, through its catalogue (CMR), and Worldview, through its imagery service (GIBS). The Moon tile uses LRO data via Moon Trek.
- The others are cited on `#/sources`.
- api.nasa.gov, DONKI, OSDR, RadLab and Trek came from the team brief and are **not** on that tab.
