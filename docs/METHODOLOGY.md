# Methodology — Analog Atlas

Prose version of the "Theoretical basis" and "Method" sections of `#/sources`. Every citation below was checked in Crossref on 2026-11-14 (full list: `data/references.json`). The numbers in §2 come from the code and the data files. If they ever disagree, the code (`src/services/validation-score.js`, `data/nasa-endpoints.json`) is the source of truth, and the live page is generated from it.

## 1. Theoretical basis

### 1.1 What a planetary analog is

A terrestrial analog is a place on Earth that resembles another planetary body in a specific, useful respect: geology, landforms, climate, isolation or operations.
- Analogs are used to validate instruments and operations before flight (Léveillé, 2009).
- They are used to study the limits of habitability (Preston & Dartnell, 2014; Martins et al., 2017).
- Foucher et al. (2021) argue that an analog should be defined by its *function*: the property it reproduces for a given study. No site reproduces everything.

The project follows that view. Every site is rated on eight dimensions, and every card has a "What it lacks" list.

### 1.2 Why eight dimensions

Geology, terrain, atmosphere/aeolian, temperature/extremes, water/ice, biology/habitability, subsurface and operational. A site can be a strong analog in one dimension and weak in another.

**[TEAM TO FILL: quote the official 2026 challenge text that motivates these dimensions and link it — https://www.spaceappschallenge.org/2026/challenges/permanent-moon-base-locations-and-mars/.]**

### 1.3 Why missions, not only similarity

Analog sites are chosen for what they will be used for:
- NASA's Desert RATS field campaigns chose terrain to test rovers, crew operations and science traverses (Gruener et al., 2013; Yingst et al., 2013).
- Landing sites on Mars are selected through engineering constraints (slope, rock abundance, surface strength) combined with science goals: Gale (Golombek et al., 2012) and Jezero (Grant et al., 2018).
- At the lunar south pole, illumination, slopes and access to volatiles define the candidate regions (Colaprete et al., 2010; Boazman et al., 2022; Barker et al., 2023).

The map is therefore organized by planet × mission (Landing, Rover, Base). Each mission has its own required rules in `src/data/criteria.json`.

### 1.4 Novelty

Most analog work concentrates on a few classic regions. Brazil has basalt-hosted impact structures that are rare on Earth and relevant to Mars:
- Vargeão (Crósta et al., 2011; Yokoyama et al., 2015; Alsemgeest et al., 2026);
- Vista Alegre (Crósta et al., 2010a; Alsemgeest et al., 2021);
- Cerro do Jarau, described as a *possible* impact structure (Crósta et al., 2010b);
- Serra da Cangalha (Kenkmann et al., 2011; Vasconcelos et al., 2013);
- Araguainha (Engelhardt et al., 1992; Lana et al., 2006).

The validation score therefore rewards documented proposals far from known sites and outside the classic regions.

### 1.5 Where Earth falls short

No place on Earth reproduces:
- **Gravity:** the Moon's ~1/6 g or Mars' ~3/8 g.
- **Atmosphere:** the lunar vacuum, or Mars' thin CO₂ atmosphere.
- **Radiation:** the environment beyond Earth's magnetic field and atmosphere. This has been measured on the way to Mars (Zeitlin et al., 2013) and on the Martian surface (Hassler et al., 2014). The site shows the gap with NASA OSDR RadLab data: the median absorbed dose rate on the ISS (DosTel2) is about **5.35 µGy/h** (2020-01-01 to 2020-01-04, n = 2739). The Earth natural background is about 2.4 mSv/yr (UNSCEAR 2008, entered manually; Sv and Gy are different quantities).
- **Biosphere:** Earth has one almost everywhere, which complicates life-detection tests (Preston & Dartnell, 2014).

## 2. Method

### 2.1 Map states

- **Validated (green):** `sites.json` has a history entry for the same planet and mission.
- **Possible (grey, dashed):** no such entry, but no REQUIRED rule of `criteria.json` fails.
- **Hidden:** a required rule fails.
- **Data conflict:** NASA data contradicts a hand-entered attribute or a required rule (`DATA-CHECK.md`). It is only shown; the team decides.

### 2.2 NASA indicators → levels (project rules, not scientific consensus)

The thresholds live in `data/nasa-endpoints.json`:

| Indicator | Source | Strong | Partial |
|---|---|---|---|
| temp_range (°C) | NASA POWER | ≥ 35 | ≥ 20 |
| aridity (mm/yr) | NASA POWER | < 250 | < 600 |
| elevation (m) | NASA POWER | ≥ 2500 | ≥ 1500 |
| solar (kWh/m²/day) | NASA POWER | ≥ 6 | ≥ 4.5 |
| wind (m/s) | NASA POWER | ≥ 5 | ≥ 3 |
| vegetation (NDVI) | MODIS MOD13Q1 via ORNL DAAC TESViS | < 0.2 | < 0.4 |
| land_cover | MODIS MCD12Q1 | barren | shrub / grass / snow |
| data_coverage | NASA CMR | 4 of 4 | ≥ 2 |

- `radiation_gap` (RadLab) is always "weak"; `space_weather` (DONKI) is context only.
- `missionFit` compares the data-inferred vegetation class and climate class with the REQUIRED rules of the chosen planet·mission.

### 2.3 Validation score (0–100)

Values from `SCORE_CONFIG`:

| Rule | Points |
|---|---|
| Valid coordinate on land (ocean or out of range blocks submission) | +10 |
| Agreement with NASA data, per indicator: same level | +8 |
| Agreement: one level apart | +4 |
| Agreement: opposite levels | −4 |
| Evidence link (URL responds or DOI format valid), per dimension | +3, max +15 |
| "What it lacks" with ≥ 2 items | +5 |
| Requirement marked met but contradicted by data, without justification | −10 each |
| Novelty: > 25 km from any known site, outside Atacama, Haughton, Iceland, Hawai'i and Antarctica | +10 |

- **Auto-checked** = ≥ 60 and no strong conflict. Below that, or with a strong conflict, **Needs review**. **Team-confirmed** is set by the team.
- Anti-farm: same nickname + site + mission counts once; < 1 km from a site the same nickname already validated does not add up.
- This is a community check against NASA open data, **not peer review**.

### 2.4 Simulation

The v1 mission simulation is archived (`/archive`) and not part of this version. Its rules are in `DECISIONS.md` (v1, item 17).

## References

APA list with DOIs: `data/references.json` and `#/sources` → References. Crósta et al. (2010a) is the Vista Alegre paper (Meteoritics & Planetary Science 45); Crósta et al. (2010b) is the Cerro do Jarau chapter (GSA Special Paper 465).
