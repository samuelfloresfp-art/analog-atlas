# DATA-CHECK — hand-entered site data vs NASA data

**Total: 26 conflict(s) in 22 sites.**

Generated 2026-11-14T19:05:47+00:00 by `scripts/fetch_nasa_cache.py`. **Nothing was changed automatically.** Each conflict is shown on the site card as "Data conflict: …"; the team decides whether to edit `src/data/sites.json`.

- **state-vs-data**: the map shows the site (validated/possible) for a planet·mission, but a required rule fails with the NASA-inferred value.
- **attribute-vs-data**: a hand-entered attribute differs from the NASA-inferred one, and the difference would change which maps show the site.
- Inference thresholds: `data/nasa-endpoints.json` (project rules, not scientific consensus). Only vegetation (NDVI) and climate (POWER) can be inferred.

## Atacama Desert (`atacama`) — 0 conflict(s)
No conflict.

## Haughton Crater, Devon Island (`haughton`) — 0 conflict(s)
No conflict.

## Mars Desert Research Station, Utah (`mdrs`) — 0 conflict(s)
No conflict.

## HI-SEAS, Mauna Loa, Hawaii (`hiseas`) — 3 conflict(s)
- [state-vs-data] Shown as possible (grey) for Moon · Base, but NASA data fails: Extreme climate — data suggests 'humid' (1814.0 mm/yr, mean 18.2 °C, grid elevation 1145.0 m).
- [state-vs-data] Shown as validated (green) for Mars · Base, but NASA data fails: Extreme climate — data suggests 'humid' (1814.0 mm/yr, mean 18.2 °C, grid elevation 1145.0 m).
- [attribute-vs-data] Declared climate 'high-altitude', but NASA data suggests 'humid' (1814.0 mm/yr, mean 18.2 °C, grid elevation 1145.0 m). This would change the map in: mars.base, moon.base.

## Black Point Lava Flow, Arizona (`black-point`) — 0 conflict(s)
No conflict.

## Lanzarote (`lanzarote`) — 0 conflict(s)
No conflict.

## Río Tinto (`rio-tinto`) — 1 conflict(s)
- [state-vs-data] Shown as validated (green) for Mars · Rover, but NASA data fails: No or sparse vegetation — data suggests 'moderate' (NDVI 0.446).

## Habitat Marte, Rio Grande do Norte (`habitat-marte`) — 2 conflict(s)
- [state-vs-data] Shown as validated (green) for Mars · Base, but NASA data fails: Extreme climate — data suggests 'humid' (799.0 mm/yr, mean 25.8 °C, grid elevation 292.0 m).
- [attribute-vs-data] Declared climate 'semi-arid', but NASA data suggests 'humid' (799.0 mm/yr, mean 25.8 °C, grid elevation 292.0 m). This would change the map in: mars.base, moon.base.
- _Sources that failed for this site:_ TESViS land cover failed (HTTPError: HTTP Error 502: Proxy Error); TESViS LST failed (HTTPError: HTTP Error 503: Service Unavailable); TESViS NDVI failed (HTTPError: HTTP Error 502: Proxy Error)

## Iceland lava fields (`iceland`) — 6 conflict(s)
- [state-vs-data] Shown as possible (grey) for Moon · Landing, but NASA data fails: land cover says water.
- [state-vs-data] Shown as possible (grey) for Moon · Rover, but NASA data fails: land cover says water.
- [state-vs-data] Shown as possible (grey) for Moon · Base, but NASA data fails: land cover says water.
- [state-vs-data] Shown as possible (grey) for Mars · Landing, but NASA data fails: land cover says water.
- [state-vs-data] Shown as validated (green) for Mars · Rover, but NASA data fails: land cover says water.
- [state-vs-data] Shown as possible (grey) for Mars · Base, but NASA data fails: land cover says water.

## Concordia Station (`concordia`) — 0 conflict(s)
No conflict.
- _Sources that failed for this site:_ TESViS LST failed (HTTPError: HTTP Error 502: Proxy Error); TESViS NDVI failed (HTTPError: HTTP Error 503: Service Unavailable); TESViS land cover failed (HTTPError: HTTP Error 503: Service Unavailable)

## Cinder Lake Crater Field, Arizona (`cinder-lake`) — 5 conflict(s)
- [state-vs-data] Shown as validated (green) for Moon · Landing, but NASA data fails: No or sparse vegetation — data suggests 'moderate' (NDVI 0.437).
- [state-vs-data] Shown as validated (green) for Moon · Rover, but NASA data fails: No or sparse vegetation — data suggests 'moderate' (NDVI 0.437).
- [state-vs-data] Shown as possible (grey) for Mars · Landing, but NASA data fails: No or sparse vegetation — data suggests 'moderate' (NDVI 0.437).
- [state-vs-data] Shown as possible (grey) for Mars · Rover, but NASA data fails: No or sparse vegetation — data suggests 'moderate' (NDVI 0.437).
- [attribute-vs-data] Declared vegetation 'sparse', but NASA data suggests 'moderate' (NDVI 0.437). This would change the map in: mars.landing, mars.rover, moon.landing, moon.rover.

## Florida lander hazard field (`florida-hazard-field`) — 3 conflict(s)
- [state-vs-data] Shown as validated (green) for Moon · Landing, but NASA data fails: No or sparse vegetation — data suggests 'dense' (NDVI 0.751).
- [state-vs-data] Shown as possible (grey) for Mars · Landing, but NASA data fails: No or sparse vegetation — data suggests 'dense' (NDVI 0.751).
- [attribute-vs-data] Declared vegetation 'sparse', but NASA data suggests 'dense' (NDVI 0.751). This would change the map in: mars.landing, mars.rover, moon.landing, moon.rover.

## Vargeão crater (`vargeao`) — 0 conflict(s)
No conflict.

## Vista Alegre crater (`vista-alegre`) — 0 conflict(s)
No conflict.

## Cerro do Jarau (`cerro-do-jarau`) — 0 conflict(s)
No conflict.
- _Sources that failed for this site:_ TESViS land cover failed (HTTPError: HTTP Error 503: Service Unavailable); TESViS LST failed (HTTPError: HTTP Error 503: Service Unavailable); TESViS NDVI failed (HTTPError: HTTP Error 503: Service Unavailable)

## Araguainha crater (`araguainha`) — 0 conflict(s)
No conflict.

## Serra da Cangalha (`serra-da-cangalha`) — 3 conflict(s)
- [state-vs-data] Shown as possible (grey) for Moon · Base, but NASA data fails: Extreme climate — data suggests 'humid' (1325.0 mm/yr, mean 27.3 °C, grid elevation 326.0 m).
- [state-vs-data] Shown as possible (grey) for Mars · Base, but NASA data fails: Extreme climate — data suggests 'humid' (1325.0 mm/yr, mean 27.3 °C, grid elevation 326.0 m).
- [attribute-vs-data] Declared climate 'semi-arid', but NASA data suggests 'humid' (1325.0 mm/yr, mean 27.3 °C, grid elevation 326.0 m). This would change the map in: mars.base, moon.base.
- _Sources that failed for this site:_ TESViS LST failed (HTTPError: HTTP Error 503: Service Unavailable); TESViS NDVI failed (HTTPError: HTTP Error 503: Service Unavailable)

## Lençóis Maranhenses (`lencois`) — 0 conflict(s)
No conflict.

## Raso da Catarina (`raso-da-catarina`) — 0 conflict(s)
No conflict.
- _Sources that failed for this site:_ TESViS NDVI failed (HTTPError: HTTP Error 503: Service Unavailable); TESViS LST failed (HTTPError: HTTP Error 503: Service Unavailable); TESViS land cover failed (HTTPError: HTTP Error 503: Service Unavailable)

## Salar de Uyuni (`uyuni`) — 0 conflict(s)
No conflict.

## Puna de Atacama (`puna`) — 0 conflict(s)
No conflict.

## Jalapão (`jalapao`) — 3 conflict(s)
- [state-vs-data] Shown as possible (grey) for Moon · Base, but NASA data fails: Extreme climate — data suggests 'humid' (1135.0 mm/yr, mean 25.4 °C, grid elevation 640.0 m).
- [state-vs-data] Shown as possible (grey) for Mars · Base, but NASA data fails: Extreme climate — data suggests 'humid' (1135.0 mm/yr, mean 25.4 °C, grid elevation 640.0 m).
- [attribute-vs-data] Declared climate 'semi-arid', but NASA data suggests 'humid' (1135.0 mm/yr, mean 25.4 °C, grid elevation 640.0 m). This would change the map in: mars.base, moon.base.
- _Sources that failed for this site:_ TESViS land cover failed (HTTPError: HTTP Error 503: Service Unavailable); TESViS NDVI failed (HTTPError: HTTP Error 503: Service Unavailable); TESViS LST failed (HTTPError: HTTP Error 502: Proxy Error)

