#!/usr/bin/env python3
"""Generates src/data/seedContributions.json — ~30 SAMPLE contributions for the leaderboard demo.
Fixed seed (2026). Every item has seed: true and the UI labels it "Sample data (prototype)".
Nicknames are obviously fictional ("Sample_…"). Scores are illustrative, not computed from NASA data."""
import json, os, random, datetime as dt

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
rng = random.Random(2026)
sites = json.load(open(os.path.join(ROOT, "src/data/sites.json"), encoding="utf-8"))
DIMS = ["geology", "terrain", "atmosphere", "temperature", "water", "biology", "subsurface", "operational"]
LEVELS = ["strong", "partial", "weak", "nodata"]
NICKS = ["Sample_Regolith", "Sample_Crater7", "Sample_Dune", "Sample_Basalt", "Sample_Orbiter", "Sample_Lander",
         "Sample_Rille", "Sample_Mesa", "Sample_Caldera", "Sample_Tharsis", "Sample_Mare"]
EVIDENCE = {"temperature": ("NASA POWER", "https://power.larc.nasa.gov/"), "biology": ("MODIS NDVI (ORNL DAAC)", "doi:10.3334/ORNLDAAC/1600"),
            "terrain": ("SRTMGL1", "https://cmr.earthdata.nasa.gov/search/concepts/C2763266360-LPCLOUD.html"),
            "geology": ("EMIT L2B minerals", "https://cmr.earthdata.nasa.gov/search/concepts/C2408034484-LPCLOUD.html")}
PROPOSALS = [("Sample proposal — Piauí sandstone plateau", "Brazil", -8.9, -42.6), ("Sample proposal — Catamarca salt flat", "Argentina", -26.6, -66.9),
             ("Sample proposal — Bahia dunes", "Brazil", -10.7, -42.9), ("Sample proposal — Atacama north rim", "Chile", -21.9, -68.6)]
LACKS = ["Earth gravity and atmosphere", "No Martian radiation environment", "Vegetation in parts of the area", "Seasonal rain"]

start = dt.datetime(2026, 10, 1, 9, 0, tzinfo=dt.timezone.utc)
out = []
for i in range(30):
    nick = NICKS[i % len(NICKS)] if i < 22 else rng.choice(NICKS)
    created = start + dt.timedelta(hours=rng.randint(0, 40 * 24))
    mission = rng.choice(["landing", "rover", "base"])
    planet = rng.choice(["moon", "mars"])
    dims = {}
    for d in DIMS:
        ds, url = EVIDENCE.get(d, ("", ""))
        use = rng.random() < 0.45 and url
        dims[d] = {"level": rng.choice(LEVELS), "dataset": ds if use else "", "url": url if use else "", "note": ""}
    c = {"id": f"seed-{i+1:02d}", "seed": True, "label": "Sample data (prototype)", "nickname": nick,
         "createdAt": created.isoformat().replace("+00:00", "Z"), "planet": planet, "mission": mission,
         "mirrorFeature": "", "dimensions": dims, "lacks": rng.sample(LACKS, 2), "requirements": {}}
    if i % 7 == 3:
        name, country, lat, lon = PROPOSALS[(i // 7) % len(PROPOSALS)]
        c.update(mode="proposal", siteId="", site={"lat": lat, "lon": lon, "name": name, "country": country, "environment": "sample"})
    else:
        s = rng.choice(sites)
        c.update(mode="existing", siteId=s["id"], site={"lat": None, "lon": None, "name": "", "country": "", "environment": ""})
    c["score"] = rng.randint(35, 92)
    c["status"] = "auto-checked" if c["score"] >= 60 else "needs-review"
    c["scoreLines"] = [{"label": "Sample data (prototype)", "points": c["score"], "note": "Illustrative score, not computed."}]
    out.append(c)
out.sort(key=lambda c: c["createdAt"])
with open(os.path.join(ROOT, "src/data/seedContributions.json"), "w", encoding="utf-8", newline="\n") as f:
    json.dump(out, f, indent=2, ensure_ascii=False); f.write("\n")
print(len(out), "seed contributions")
