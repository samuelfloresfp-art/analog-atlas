# Draft — Space Apps 2026 submission fields

Only items marked "verified" (checked 2026-11-14) are listed. The team must review these drafts before pasting them.

---

## NASA Data

Analog Atlas uses NASA open data to check every analog site and every community proposal.

**From the challenge Resources tab:**
- **NASA Earthdata Search / CMR** — proves that EMIT L2B minerals (EMITL2BMIN), SRTM (SRTMGL1), ASTER GDEM (ASTGTM) and HLS (HLSL30) data cover each site.
- **NASA Worldview / GIBS** — Earth basemap and a Landsat WELD true-colour image on every site card.
- **LRO data via Moon Trek** — LROC WAC mosaic shown next to the Earth site.

**Other NASA services:**
- **NASA POWER** climatology API — temperature range, precipitation, solar energy, wind and grid elevation.
- **ORNL DAAC TESViS** (MODIS MOD13Q1 NDVI, MOD11A2 LST, MCD12Q1 land cover; doi:10.3334/ORNLDAAC/1600) — vegetation, surface temperature and land/water.
- **DONKI** (CCMC; also via api.nasa.gov) — real space-weather events (flares, CMEs, SEPs, geomagnetic storms) on Landing and Base cards.
- **NASA OSDR** search API — studies on partial gravity, regolith and radiation.
- **OSDR RadLab** Data API — ISS dose rate shown against Earth's natural background.
- **Solar System Treks** — Mars Trek MOLA and Moon Trek tiles.
- **EONET** — natural events near each site.

**How it is used:**
- Measured values become suggested levels for the eight analog dimensions. Thresholds are published as project rules.
- `validateCoordinates()` checks any point: range, land, nearest known site, indicators and mission fit.
- A data check flags 32 conflicts between hand-entered site attributes and NASA data. These are shown on the cards for the team to decide.
- Results are pre-computed for offline demos and can be re-checked live.

## Space Agency Partner & Other Data

- **Cited (official challenge resources, not integrated):** CSA RADARSAT Constellation Mission and RADARSAT-1 open data; the CSA SAR Python tutorial; the Copernicus Data Space Ecosystem; the ESA Open Science Catalog; JAXA G-Portal.
- **Partner and regional agencies listed on #/sources (cited only):** AEB, INPE (Brazil Data Cube, CBERS), CONAE, ESA (Copernicus DEM, Sentinel-2) and USGS Astrogeology (Geologic Map of Mars SIM 3292, doi:10.3133/sim3292; unified geologic map of the Moon).
- **Other data:**
  - OpenStreetMap/CARTO fallback basemap;
  - Natural Earth 110m land polygons (public domain), used offline and as an ocean check;
  - UNSCEAR 2008 worldwide natural background dose (entered manually, cited).
- Peer-reviewed literature on Brazilian impact structures (Vargeão, Vista Alegre, Cerro do Jarau, Serra da Cangalha, Araguainha) supports the site descriptions. See References.

## Use of Artificial Intelligence

Following the Space Apps Participant FAQs, which require teams to describe how AI tools were used:
- **Code:** the website (HTML/CSS/JavaScript), the Python data scripts and the data-check logic were generated with an AI coding assistant (Claude Code, by Anthropic). The team directed, reviewed and tested them.
- **Text:** interface texts, documentation and first drafts of site descriptions were written with AI help. Unverified site attributes stay labelled "assumption".
- **Sample data:** leaderboard sample contributions (nicknames "Sample_…", labelled "Sample data (prototype)") and two example community submissions are AI-generated and fictional.
- **Research support:** AI agents searched for sources. Every reference and dataset listed was then checked against Crossref, NASA CMR or the official page; unverifiable items are labelled "unverified".
- **Not used:** no AI-generated images and no NASA logos. All imagery comes from NASA GIBS and Solar System Treks.

## References

Peer-reviewed literature (APA, generated from Crossref metadata in `data/references.json`; all DOIs verified 2026-11-14):

- Alsemgeest, J., Brouwer, F. M., Auqué, L. F., Hauser, N., & Reimold, W. U. (2021). Hydrothermal alteration at the basalt‐hosted Vista Alegre impact structure, Brazil. Meteoritics & Planetary Science, 56(12), 2155–2174. https://doi.org/10.1111/maps.13763
- Alsemgeest, J., Brouwer, F. M., Auqué, L. F., van Zuilen, K., Hauser, N., & Reimold, W. U. (2026). Impact Reactivation of a Hydrothermal System in Basalt in the Vargeão Dome Impact Structure, Brazil. Journal of Geophysical Research: Planets, 131(2), e2025JE008966. https://doi.org/10.1029/2025je008966
- Barker, M. K., Mazarico, E., Neumann, G. A., Smith, D. E., Zuber, M. T., Head, J. W., & Sun, X. (2023). A New View of the Lunar South Pole from the Lunar Orbiter Laser Altimeter (LOLA). The Planetary Science Journal, 4(9), 183. https://doi.org/10.3847/psj/acf3e1
- Boazman, S. J., Shah, J., Harish, Gawronska, A. J., Halim, S. H., Satyakumar, A. V., Gilmour, C. M., Bickel, V. T., Barrett, N., & Kring, D. A. (2022). The Distribution and Accessibility of Geologic Targets near the Lunar South Pole and Candidate Artemis Landing Sites. The Planetary Science Journal, 3(12), 275. https://doi.org/10.3847/psj/aca590
- Colaprete, A., Schultz, P., Heldmann, J., Wooden, D., Shirley, M., Ennico, K., Hermalyn, B., Marshall, W., Ricco, A., Elphic, R. C., Goldstein, D., Summy, D., Bart, G. D., Asphaug, E., Korycansky, D., Landis, D., & Sollitt, L. (2010). Detection of Water in the LCROSS Ejecta Plume. Science, 330(6003), 463–468. https://doi.org/10.1126/science.1186986
- Crósta, A. P., Kazzuo-Vieira, C., Pitarello, L., Koeberl, C., & Kenkmann, T. (2011). Geology and impact features of Vargeão Dome, southern Brazil. Meteoritics & Planetary Science, 47(1), 51–71. https://doi.org/10.1111/j.1945-5100.2011.01312.x
- Crósta, A. P., Koeberl, C., Furuie, R. A., & Kazzuo-Vieira, C. (2010). The first description and confirmation of the Vista Alegre impact structure in the Paraná flood basalts of southern Brazil. Meteoritics & Planetary Science, 45(2), 181–194. https://doi.org/10.1111/j.1945-5100.2010.01015.x
- Crósta, A. P., Lourenço, F. S., & Priebe, G. H. (2010). Cerro do Jarau, Rio Grande do Sul: A possible new impact structure in southern Brazil. In Large Meteorite Impacts and Planetary Evolution IV. Geological Society of America. https://doi.org/10.1130/2010.2465(12)
- Engelhardt, W. V., Matthäi, S. K., & Walzebuck, J. (1992). Araguainha impact crater, Brazil. I. The interior part of the uplift. Meteoritics, 27(4), 442–457. https://doi.org/10.1111/j.1945-5100.1992.tb00226.x
- Foucher, F., Hickman-Lewis, K., Hutzler, A., Joy, K. H., Folco, L., Bridges, J. C., Wozniakiewicz, P., Martínez-Frías, J., Debaille, V., Zolensky, M., Yano, H., Bost, N., Ferrière, L., Lee, M., Michalski, J., Schroeven-Deceuninck, H., Kminek, G., Viso, M., Russell, S., . . . Westall, F. (2021). Definition and use of functional analogues in planetary exploration. Planetary and Space Science, 197, 105162. https://doi.org/10.1016/j.pss.2021.105162
- Golombek, M., Grant, J., Kipp, D., Vasavada, A., Kirk, R., Fergason, R., Bellutta, P., Calef, F., Larsen, K., Katayama, Y., Huertas, A., Beyer, R., Chen, A., Parker, T., Pollard, B., Lee, S., Sun, Y., Hoover, R., Sladek, H., . . . Watkins, M. (2012). Selection of the Mars Science Laboratory Landing Site. Space Science Reviews, 170(1-4), 641–737. https://doi.org/10.1007/s11214-012-9916-y
- Grant, J. A., Golombek, M. P., Wilson, S. A., Farley, K. A., Williford, K. H., & Chen, A. (2018). The science process for selecting the landing site for the 2020 Mars rover. Planetary and Space Science, 164, 106–126. https://doi.org/10.1016/j.pss.2018.07.001
- Gruener, J. E., Lofgren, G. E., Bluethmann, W. J., & Abercromby, A. F. (2013). NASA Desert RATS 2010: Preliminary results for science operations conducted in the San Francisco Volcanic Field, Arizona. Acta Astronautica, 90(2), 406–415. https://doi.org/10.1016/j.actaastro.2011.12.006
- Hassler, D. M., Zeitlin, C., Wimmer-Schweingruber, R. F., Ehresmann, B., Rafkin, S., Eigenbrode, J. L., Brinza, D. E., Weigle, G., Böttcher, S., Böhm, E., Burmeister, S., Guo, J., Köhler, J., Martin, C., Reitz, G., Cucinotta, F. A., Kim, M.-H., Grinspoon, D., Bullock, M. A., . . . Moores, J. E. (2014). Mars’ Surface Radiation Environment Measured with the Mars Science Laboratory’s Curiosity Rover. Science, 343(6169), 1244797. https://doi.org/10.1126/science.1244797
- Kenkmann, T., Vasconcelos, M. A. R., Crósta, A. P., & Reimold, W. U. (2011). The complex impact structure Serra da Cangalha, Tocantins State, Brazil. Meteoritics & Planetary Science, 46(6), 875–889. https://doi.org/10.1111/j.1945-5100.2011.01199.x
- Lana, C., Romano, R., Reimold, U., & Hippertt, J. (2006). Collapse of large complex impact craters: Implications from the Araguainha impact structure, central Brazil. Geology, 34(1), 9. https://doi.org/10.1130/g21952.1
- Léveillé, R. (2009). Validation of astrobiology technologies and instrument operations in terrestrial analogue environments. Comptes Rendus Palevol, 8(7), 637–648. https://doi.org/10.1016/j.crpv.2009.03.005
- Martins, Z., Cottin, H., Kotler, J. M., Carrasco, N., Cockell, C. S., de la Torre Noetzel, R., Demets, R., de Vera, J.-P., d’Hendecourt, L., Ehrenfreund, P., Elsaesser, A., Foing, B., Onofri, S., Quinn, R., Rabbow, E., Rettberg, P., Ricco, A. J., Slenzka, K., Stalport, F., . . . Westall, F. (2017). Earth as a Tool for Astrobiology—A European Perspective. Space Science Reviews, 209(1-4), 43–81. https://doi.org/10.1007/s11214-017-0369-1
- Preston, L. J., & Dartnell, L. R. (2014). Planetary habitability: lessons learned from terrestrial analogues. International Journal of Astrobiology, 13(1), 81–98. https://doi.org/10.1017/s1473550413000396
- Vasconcelos, M. A. R., Crósta, A. P., Reimold, W. U., Góes, A. M., Kenkmann, T., & Poelchau, M. H. (2013). The Serra da Cangalha impact structure, Brazil: Geological, stratigraphic and petrographic aspects of a recently confirmed impact structure. Journal of South American Earth Sciences, 45, 316–330. https://doi.org/10.1016/j.jsames.2013.03.007
- Yingst, R. A., Cohen, B. A., Ming, D. W., & Eppler, D. B. (2013). Comparing Apollo and Mars Exploration Rover (MER)/phoenix operations paradigms for human exploration during NASA Desert-RATS science operations. Acta Astronautica, 90(2), 311–317. https://doi.org/10.1016/j.actaastro.2011.10.001
- Yokoyama, E., Nédélec, A., Baratoux, D., Trindade, R. I. F., Fabre, S., & Berger, G. (2015). Hydrothermal alteration in basalts from Vargeão impact structure, south Brazil, and implications for recognition of impact-induced hydrothermalism on Mars. Icarus, 252, 347–365. https://doi.org/10.1016/j.icarus.2015.02.001
- Zeitlin, C., Hassler, D. M., Cucinotta, F. A., Ehresmann, B., Wimmer-Schweingruber, R. F., Brinza, D. E., Kang, S., Weigle, G., Böttcher, S., Böhm, E., Burmeister, S., Guo, J., Köhler, J., Martin, C., Posner, A., Rafkin, S., & Reitz, G. (2013). Measurements of Energetic Particle Radiation in Transit to Mars on the Mars Science Laboratory. Science, 340(6136), 1080–1084. https://doi.org/10.1126/science.1235989

Datasets with DOIs (verified via CMR/DataCite, `data/datasources.json`):

- NASA Shuttle Radar Topography Mission Global 1 arc second V003 — NASA (LP DAAC). https://doi.org/10.5067/MEASURES/SRTM/SRTMGL1.003
- NASADEM Merged DEM Global 1 arc second V001 — NASA (LP DAAC). https://doi.org/10.5067/MEASURES/NASADEM/NASADEM_HGT.001
- ASTER Global Digital Elevation Model V003 — NASA (LP DAAC). https://doi.org/10.5067/ASTER/ASTGTM.003
- EMIT L2B Estimated Mineral Identification and Band Depth and Uncertainty 60 m V001 — NASA (LP DAAC). https://doi.org/10.5067/EMIT/EMITL2BMIN.001
- EMIT L2B Estimated Mineral Identification and Band Depth and Uncertainty 60 m V002 — NASA (LP DAAC). https://doi.org/10.5067/EMIT/EMITL2BMIN.002
- HLS Landsat Operational Land Imager Surface Reflectance and TOA Brightness Daily Global 30m v2.0 v2.0 — NASA (LP DAAC). https://doi.org/10.5067/HLS/HLSL30.002
- HLS Sentinel-2 Multi-spectral Instrument Surface Reflectance Daily Global 30m v2.0 v2.0 — NASA (LP DAAC). https://doi.org/10.5067/HLS/HLSS30.002
- MODIS/Terra Vegetation Indices 16-Day L3 Global 250m SIN Grid V061 — NASA (LP DAAC). https://doi.org/10.5067/MODIS/MOD13Q1.061
- MODIS/Terra Land Surface Temperature/Emissivity 8-Day L3 Global 1km SIN Grid V061 — NASA (LP DAAC). https://doi.org/10.5067/MODIS/MOD11A2.061
- MODIS/Terra+Aqua Land Cover Type Yearly L3 Global 500m SIN Grid V061 — NASA (LP DAAC). https://doi.org/10.5067/MODIS/MCD12Q1.061
- Terrestrial Ecology Subsetting & Visualization Services (TESViS) — NASA (ORNL DAAC). https://doi.org/10.3334/ORNLDAAC/1600
- Geologic map of Mars (SIM 3292) — USGS. https://doi.org/10.3133/sim3292
