#!/usr/bin/env python3
"""
Pre-computes NASA data for every site in src/data/sites.json and writes:
  data/nasa-cache/<siteId>.json   one ValidationReport per site (+ media, studies, events, raw values)
  data/nasa-cache/index.json      all sites in one file (the front loads this at start → works offline)
  data/nasa-cache/space-weather.json, data/nasa-cache/radiation.json
  src/data/sites.json             adds/updates  site.dataCheck = { conflicts: [...], checkedAt }
  DATA-CHECK.md                   human-readable list of conflicts (the team decides; nothing is auto-changed)

Usage (Python 3.9+, standard library only):
  python scripts/fetch_nasa_cache.py                  # all sites
  python scripts/fetch_nasa_cache.py --site vargeao   # one site
  python scripts/fetch_nasa_cache.py --point -27.13 -52.13 --mission rover   # print a report, write nothing

Keys (never commit them): env NASA_API_KEY (api.nasa.gov; falls back to DEMO_KEY).
Earthdata Login sources (AppEEARS / Harmony) are NOT implemented: no credentials were available when this
was written (see data/nasa-endpoints.json → status "failed").

Thresholds come from data/nasa-endpoints.json (the browser uses the same file) — project rules, not consensus.
Same indicator logic as src/services/nasa/validate.js; keep both in sync.
"""
import argparse
import concurrent.futures as cf
import datetime as dt
import json
import math
import os
import statistics
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE_DIR = os.path.join(ROOT, "data", "nasa-cache")
UA = "AnalogAtlas-prototype/0.3 (NASA Space Apps 2026)"
TODAY = dt.date.today()


def load(path):
    with open(os.path.join(ROOT, path), encoding="utf-8") as f:
        return json.load(f)


EP = load("data/nasa-endpoints.json")
SRC = EP["sources"]
TREK = load("data/trek-features.json")
CRITERIA = load("src/data/criteria.json")
DIM = EP["indicatorDimensions"]


# ---------------------------------------------------------------- http
def http(url, timeout=8, retries=1, headers=None, raw=False):
    """GET with timeout and retry 1× (same policy as the browser clients). Returns (body, headers)."""
    last = None
    for attempt in range(retries + 1):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, **(headers or {})})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                body = r.read()
                return (body if raw else body.decode("utf-8")), dict(r.headers)
        except Exception as e:  # noqa: BLE001
            last = e
            if attempt < retries:
                # 429 = rate limited (seen on NASA POWER when many sites run in parallel): back off longer
                time.sleep(20 * (attempt + 1) if getattr(e, "code", None) == 429 else 1.5)
    raise last


def get_json(url, **kw):
    body, _ = http(url, **kw)
    return json.loads(body)


def source_ref(key, extra_name=None):
    s = SRC[key]
    ref = {"name": extra_name or s["name"], "agency": s["agency"], "url": s.get("baseUrl", "")}
    if s.get("doi"):
        ref["doi"] = s["doi"]
    return ref


def level_num(v, th):
    if v is None:
        return "nodata"
    if th["direction"] == "higher":
        return "strong" if v >= th["strong"] else "partial" if v >= th["partial"] else "weak"
    return "strong" if v < th["strong"] else "partial" if v < th["partial"] else "weak"


def ind(key, value, unit, level, source, status, details=None):
    out = {"key": key, "dimension": DIM[key], "value": value, "unit": unit, "suggestedLevel": level, "source": source, "status": status}
    if details:
        out["details"] = details
    return out


# ---------------------------------------------------------------- sources
import threading

POWER_LOCK = threading.Lock()
MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]


def fetch_power(lat, lon):
    q = urllib.parse.urlencode({
        "parameters": "T2M,T2M_MAX,T2M_MIN,T2M_RANGE,PRECTOTCORR,ALLSKY_SFC_SW_DWN,WS10M,RH2M",
        "community": "RE", "longitude": f"{lon:.4f}", "latitude": f"{lat:.4f}", "format": "JSON"})
    with POWER_LOCK:  # one POWER call at a time (it rate-limits bursts with HTTP 429)
        j = get_json(f"{SRC['power']['baseUrl']}?{q}", timeout=30, retries=4)
        time.sleep(1)
    p = j["properties"]["parameter"]
    return {
        "t2mAnn": p["T2M"]["ANN"],
        "tempRange": max(p["T2M_MAX"][m] for m in MONTHS) - min(p["T2M_MIN"][m] for m in MONTHS),
        "tMaxMonth": max(p["T2M_MAX"][m] for m in MONTHS),
        "tMinMonth": min(p["T2M_MIN"][m] for m in MONTHS),
        "precipMmYr": p["PRECTOTCORR"]["ANN"] * 365,
        "solar": p["ALLSKY_SFC_SW_DWN"]["ANN"],
        "wind": p["WS10M"]["ANN"],
        "rh": p["RH2M"]["ANN"],
        "elevation": j["geometry"]["coordinates"][2] if len(j["geometry"]["coordinates"]) > 2 else None,
    }


def tesvis(product, band, lat, lon, start, end):
    q = urllib.parse.urlencode({"latitude": lat, "longitude": lon, "band": band, "startDate": start, "endDate": end,
                                "kmAboveBelow": 0, "kmLeftRight": 0})
    j = get_json(f"https://modis.ornl.gov/rst/api/v1/{product}/subset?{q}", timeout=150, retries=2,
                 headers={"Accept": "application/json"})
    scale = j.get("scale")
    try:
        scale = float(scale)
    except (TypeError, ValueError):
        scale = None
    return [(s["calendar_date"], s["data"][0]) for s in j["subset"]], scale


def fetch_ndvi(lat, lon):
    vals = []
    for a, b in (("A2024001", "A2024145"), ("A2024161", "A2024305")):
        rows, scale = tesvis("MOD13Q1", "250m_16_days_NDVI", lat, lon, a, b)
        vals += [v * (scale or 0.0001) for _, v in rows if v > -2000]  # fill = -3000
    if not vals:
        return None
    return {"mean": statistics.mean(vals), "min": min(vals), "max": max(vals), "n": len(vals), "period": "2024 (MOD13Q1 16-day composites)"}


def fetch_lst(lat, lon):
    vals = []
    for a, b in (("A2024001", "A2024073"), ("A2024185", "A2024257")):
        rows, scale = tesvis("MOD11A2", "LST_Day_1km", lat, lon, a, b)
        vals += [v * (scale or 0.02) - 273.15 for _, v in rows if v > 0]  # fill = 0
    if not vals:
        return None
    return {"meanC": statistics.mean(vals), "minC": min(vals), "maxC": max(vals), "n": len(vals), "period": "2024 Jan–Mar + Jul–Sep (MOD11A2 8-day)"}


IGBP = {1: "Evergreen needleleaf forest", 2: "Evergreen broadleaf forest", 3: "Deciduous needleleaf forest",
        4: "Deciduous broadleaf forest", 5: "Mixed forest", 6: "Closed shrubland", 7: "Open shrubland",
        8: "Woody savanna", 9: "Savanna", 10: "Grassland", 11: "Permanent wetland", 12: "Cropland",
        13: "Urban and built-up", 14: "Cropland/natural vegetation mosaic", 15: "Permanent snow and ice",
        16: "Barren", 17: "Water bodies"}


def fetch_landcover(lat, lon):
    rows, _ = tesvis("MCD12Q1", "LC_Type1", lat, lon, "A2022001", "A2022365")
    vals = [v for _, v in rows if v != 255]
    if not vals:
        return None
    c = vals[-1]
    return {"class": c, "label": IGBP.get(c, f"class {c}"), "year": 2022}


CMR_SHORT = ["EMITL2BMIN", "SRTMGL1", "ASTGTM", "HLSL30"]


def fetch_cmr(lat, lon):
    out = {}
    for s in CMR_SHORT:
        _, h = http(f"{SRC['cmr']['baseUrl']}?short_name={s}&point={lon},{lat}&page_size=1", timeout=20)
        hits = {k.lower(): v for k, v in h.items()}.get("cmr-hits")
        out[s] = int(hits) if hits is not None else 0
    return out


def gibs_thumb(lat, lon):
    z = SRC["gibs"]["params"]["z"]
    n = 2 ** z
    lat_c = max(min(lat, 85), -85)
    col = int((lon + 180) / 360 * n)
    row = int((1 - math.asinh(math.tan(math.radians(lat_c))) / math.pi) / 2 * n)
    p = SRC["gibs"]["params"]
    url = f"https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/{p['layer']}/default/{p['time']}/{p['TileMatrixSet']}/{z}/{row}/{col}.jpeg"
    try:
        body, _ = http(url, timeout=20, raw=True)
        ok = len(body) > 2000
    except Exception:  # noqa: BLE001
        ok = False
    return {"url": url, "layer": p["layer"], "time": p["time"], "status": "verified" if ok else "failed",
            "credit": "NASA GIBS — Landsat WELD annual true colour"}


def trek_tile(planet, feature_key):
    f = TREK["features"][planet][feature_key]
    L = TREK["layers"][planet]
    z = L["z"]
    d = 180 / 2 ** z
    row, col = int((90 - f["lat"]) // d), int((f["lon"] + 180) // d)
    row = min(row, 2 ** z - 1)
    url = f"https://trek.nasa.gov/tiles/{L['body']}/EQ/{L['layer']}/1.0.0/default/default028mm/{z}/{row}/{col}.jpg"
    try:
        body, _ = http(url, timeout=20, raw=True)
        ok = len(body) > 3000
    except Exception:  # noqa: BLE001
        ok = False
    return {"url": url, "feature": f["name"], "featureKey": feature_key, "lat": f["lat"], "lon": f["lon"],
            "layer": L["label"], "status": "verified" if ok else "failed", "confidence": TREK["confidence"]}


def fetch_eonet(lat, lon):
    bbox = f"{lon-2:.2f},{lat+2:.2f},{lon+2:.2f},{lat-2:.2f}"
    j = get_json(f"{SRC['eonet']['baseUrl']}?bbox={bbox}&status=all&days=365&limit=5", timeout=20)
    return [{"id": e["id"], "title": e["title"], "category": (e.get("categories") or [{}])[0].get("title"),
             "date": (e.get("geometry") or [{}])[-1].get("date"), "link": e.get("link")} for e in j.get("events", [])]


# --------------------------------------------- shared (computed once)
def fetch_space_weather():
    key = os.environ.get("NASA_API_KEY") or "DEMO_KEY"
    end = TODAY.isoformat()
    start30 = (TODAY - dt.timedelta(days=30)).isoformat()
    startYear = (TODAY - dt.timedelta(days=365)).isoformat()
    out = {"generatedAt": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
           "window30d": [start30, end], "window365d": [startYear, end], "counts30d": {}, "counts365d": {},
           "recent": [], "host": None, "errors": []}

    api_ok = [True]

    def get(kind, a, b):
        if api_ok[0]:
            try:
                j = get_json(f"https://api.nasa.gov/DONKI/{kind}?startDate={a}&endDate={b}&api_key={key}", timeout=30, retries=0)
                out["host"] = out["host"] or "api.nasa.gov"
                return j or []
            except Exception as e:  # noqa: BLE001
                api_ok[0] = False  # e.g. DEMO_KEY 429: stop trying api.nasa.gov for this run
                out["errors"].append(f"api.nasa.gov {kind}: {e} → using the CCMC host")
        j = get_json(f"https://ccmc.gsfc.nasa.gov/DONKI-API/get/{kind}?startDate={a}&endDate={b}", timeout=60)
        out["host"] = "ccmc.gsfc.nasa.gov/DONKI-API" if out["host"] in (None, "ccmc.gsfc.nasa.gov/DONKI-API") else "mixed"
        return j or []

    def get_year(kind):
        # the CCMC host rejects ranges > 60 days ("Date range cannot exceed 60 days") → 60-day chunks
        events, a = [], TODAY - dt.timedelta(days=365)
        while a < TODAY:
            b = min(a + dt.timedelta(days=59), TODAY)
            events += get(kind, a.isoformat(), b.isoformat())
            a = b + dt.timedelta(days=1)
        return events

    for kind in ("FLR", "CME", "SEP", "GST"):
        last = get(kind, start30, end)
        year = get_year(kind)
        out["counts30d"][kind] = len(last)
        out["counts365d"][kind] = len(year)
        for e in last[-3:]:
            out["recent"].append({"type": kind, "id": e.get("flrID") or e.get("activityID") or e.get("sepID") or e.get("gstID"),
                                  "time": e.get("peakTime") or e.get("startTime") or e.get("eventTime") or e.get("beginTime"),
                                  "class": e.get("classType"), "link": e.get("link")})
    out["total30d"] = sum(out["counts30d"].values())
    out["source"] = source_ref("donki")
    return out


def fetch_radiation():
    day0 = dt.date(2020, 1, 1)
    vals = []
    for i in range(3):
        a, b = day0 + dt.timedelta(days=i), day0 + dt.timedelta(days=i + 1)
        # "columns+=" must stay literal (an encoded "%2B" is rejected as "Invalid key: columns+")
        q = urllib.parse.urlencode({"query": f"instrument_id==DosTel2 AND timestamp>={a} AND timestamp<{b}", "format": "tsv"})             + "&columns+=absorbed_dose_rate"
        body, _ = http(f"{SRC['radlab']['baseUrl']}?{q}", timeout=60)
        for line in body.splitlines()[1:]:
            parts = line.split("\t")
            try:
                vals.append(float(parts[2]))
            except (IndexError, ValueError):
                pass
    if not vals:
        raise RuntimeError("RadLab returned no DosTel2 rows")
    ref = SRC["radlab"]["earthBackgroundReference"]
    return {"instrument": "DosTel2 (DOSTEL, ISS Columbus — DORELI project)", "quantity": "absorbed dose rate",
            "meanUGyPerH": round(statistics.mean(vals), 2), "medianUGyPerH": round(statistics.median(vals), 2),
            "n": len(vals), "period": f"{day0} to {day0 + dt.timedelta(days=3)} (UTC)", "unit": "µGy/h",
            "query": "instrument_id==DosTel2, columns+=absorbed_dose_rate",
            "earthBackground": ref, "source": source_ref("radlab"), "status": "live",
            "generatedAt": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")}


def fetch_osdr():
    out = {"generatedAt": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"), "terms": {}, "byPlanet": {}}
    hits = {}
    for term in ("partial gravity", "regolith", "radiation", "analog"):
        q = urllib.parse.urlencode({"term": term, "type": "cgene", "size": 10})
        j = get_json(f"{SRC['osdr']['baseUrl']}?{q}", timeout=30)
        out["terms"][term] = j["hits"]["total"]
        hits[term] = [{"id": h["_source"].get("Accession"), "title": h["_source"].get("Study Title"),
                       "type": h["_source"].get("Project Type"),
                       "url": f"https://osdr.nasa.gov/bio/repo/data/studies/{h['_source'].get('Accession')}"}
                      for h in j["hits"]["hits"] if h["_source"].get("Accession")]
    for planet, words in (("moon", ("lunar", "moon", "apollo")), ("mars", ("mars", "martian"))):
        pick = []
        reg = [h for h in hits["regolith"] if any(w in (h["title"] or "").lower() for w in words)]
        for cand in (hits["partial gravity"][:1], reg[:1], hits["radiation"][:1]):
            for h in cand:
                if h["id"] not in [p["id"] for p in pick]:
                    pick.append({**h, "searchTerm": None})
        out["byPlanet"][planet] = pick[:3]
    out["source"] = source_ref("osdr")
    return out


# --------------------------------------------------------- inference
def veg_class(ndvi):
    t = SRC["tesvis"]["thresholds"]["vegetationClass"]
    if ndvi is None:
        return None
    return "none" if ndvi < t["noneMax"] else "sparse" if ndvi < t["sparseMax"] else "moderate" if ndvi < t["moderateMax"] else "dense"


def climate_class(power):
    if not power:
        return None
    t = SRC["power"]["thresholds"]["climateClass"]
    if power["t2mAnn"] < t["polarColdMaxT2M"]:
        return "polar-cold"
    if power.get("elevation") is not None and power["elevation"] >= t["highAltitudeMinElevation"]:
        return "high-altitude"
    p = power["precipMmYr"]
    return "hyper-arid" if p < t["hyperAridMaxMm"] else "arid" if p < t["aridMaxMm"] else "semi-arid" if p < t["semiAridMaxMm"] else "humid"


def rule_result(rule, value):
    return "pass" if value in rule["pass"] else "partial" if value in rule["partial"] else "fail"


def mission_fit(report, planet, mission):
    combo = CRITERIA["combos"][f"{planet}.{mission}"]
    inferred = report.get("inferred", {})
    failing, checked = [], []
    if report["basic"].get("onLand") is False:
        failing.append("On land")
    for rule in combo["rules"]:
        if not rule["required"] or rule["field"] not in inferred or inferred[rule["field"]] is None:
            continue
        r = rule_result(rule, inferred[rule["field"]])
        checked.append({"rule": rule["label"], "field": rule["field"], "inferred": inferred[rule["field"]], "result": r})
        if r == "fail":
            failing.append(rule["label"])
    return {"ok": not failing, "failingRequirements": failing, "checked": checked, "planet": planet}


def haversine(lat1, lon1, lat2, lon2):
    r = math.radians
    a = math.sin(r(lat2 - lat1) / 2) ** 2 + math.cos(r(lat1)) * math.cos(r(lat2)) * math.sin(r(lon2 - lon1) / 2) ** 2
    return 2 * 6371 * math.asin(math.sqrt(a))


def build_report(lat, lon, sites, shared, mission=None, planet="mars", site_id=None):
    errors = []
    raw = {}
    in_range = -90 <= lat <= 90 and -180 <= lon <= 180
    report = {"lat": lat, "lon": lon, "checkedAt": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
              "basic": {"inRange": in_range, "onLand": None, "nearestKnownSiteKm": None, "nearestKnownSiteId": None},
              "indicators": [], "errors": errors}
    if not in_range:
        errors.append("Coordinates out of range.")
        return report, raw
    others = [s for s in sites if s["id"] != site_id]
    if others:
        best = min(others, key=lambda s: haversine(lat, lon, s["lat"], s["lon"]))
        report["basic"]["nearestKnownSiteKm"] = round(haversine(lat, lon, best["lat"], best["lon"]), 1)
        report["basic"]["nearestKnownSiteId"] = best["id"]

    def attempt(name, fn):
        try:
            return fn(), "live"
        except Exception as e:  # noqa: BLE001
            errors.append(f"{name} failed ({type(e).__name__}: {str(e)[:120]})")
            return None, "failed"

    with cf.ThreadPoolExecutor(6) as ex:
        futs = {k: ex.submit(attempt, k, fn) for k, fn in {
            "NASA POWER": lambda: fetch_power(lat, lon),
            "TESViS NDVI": lambda: fetch_ndvi(lat, lon),
            "TESViS LST": lambda: fetch_lst(lat, lon),
            "TESViS land cover": lambda: fetch_landcover(lat, lon),
            "CMR": lambda: fetch_cmr(lat, lon),
            "EONET": lambda: fetch_eonet(lat, lon),
        }.items()}
        res = {k: f.result() for k, f in futs.items()}
    (power, ps), (ndvi, ns), (lst, ls), (lc, lcs), (cmr, cs), (eonet, es) = (res[k] for k in
        ("NASA POWER", "TESViS NDVI", "TESViS LST", "TESViS land cover", "CMR", "EONET"))
    raw.update(power=power, ndvi=ndvi, lst=lst, landCover=lc, cmr=cmr)

    th_p = SRC["power"]["thresholds"]
    pw = power or {}
    rnd = lambda v, n=1: None if v is None else round(v, n)  # noqa: E731
    report["indicators"] += [
        ind("temp_range", rnd(pw.get("tempRange")), "°C", level_num(pw.get("tempRange"), th_p["temp_range"]), source_ref("power"), ps,
            {"tMaxMonthC": rnd(pw.get("tMaxMonth")), "tMinMonthC": rnd(pw.get("tMinMonth")), "t2mAnnC": rnd(pw.get("t2mAnn")),
             "lstDayMeanC": rnd((lst or {}).get("meanC")), "lstPeriod": (lst or {}).get("period"),
             "lstSource": {**source_ref("tesvis", "MODIS MOD11A2 LST via ORNL DAAC TESViS"), "status": ls}}),
        ind("aridity", rnd(pw.get("precipMmYr"), 0), "mm/yr", level_num(pw.get("precipMmYr"), th_p["aridity"]), source_ref("power"), ps,
            {"rh2mPct": rnd(pw.get("rh"))}),
        ind("elevation", rnd(pw.get("elevation"), 0), "m (grid-cell mean)", level_num(pw.get("elevation"), th_p["elevation"]), source_ref("power"), ps),
        ind("solar", rnd(pw.get("solar"), 2), "kWh/m²/day", level_num(pw.get("solar"), th_p["solar"]), source_ref("power"), ps),
        ind("wind", rnd(pw.get("wind"), 2), "m/s", level_num(pw.get("wind"), th_p["wind"]), source_ref("power"), ps),
    ]
    th_t = SRC["tesvis"]["thresholds"]
    nd = (ndvi or {}).get("mean")
    report["indicators"].append(ind("vegetation", rnd(nd, 3), "NDVI", level_num(nd, th_t["vegetation"]),
                                    source_ref("tesvis", "MODIS MOD13Q1 NDVI via ORNL DAAC TESViS"), ns,
                                    {"inferredClass": veg_class(nd), "n": (ndvi or {}).get("n"), "period": (ndvi or {}).get("period")}))
    lcl = th_t["land_cover"]
    if lc:
        c = lc["class"]
        lvl = "strong" if c in lcl["strongClasses"] else "partial" if c in lcl["partialClasses"] else "weak"
        report["basic"]["onLand"] = c != lcl["waterClass"]
    else:
        lvl = "nodata"
    report["indicators"].append(ind("land_cover", lc["label"] if lc else None, "IGBP class", lvl,
                                    source_ref("tesvis", "MODIS MCD12Q1 land cover via ORNL DAAC TESViS"), lcs,
                                    {"class": lc["class"], "year": lc["year"]} if lc else None))
    cov = sum(1 for v in (cmr or {}).values() if v > 0) if cmr else None
    report["indicators"].append(ind("data_coverage", cov, "of 4 collections", level_num(cov, SRC["cmr"]["thresholds"]["data_coverage"]),
                                    source_ref("cmr"), cs, {"granules": cmr} if cmr else None))
    rad = shared.get("radiation")
    report["indicators"].append(ind("radiation_gap", rad["medianUGyPerH"] if rad else None, "µGy/h on the ISS (DosTel2)",
                                    "weak" if rad else "nodata", source_ref("radlab"), "live" if rad else "failed",
                                    {"iss": {k: rad[k] for k in ("instrument", "period", "n", "meanUGyPerH", "medianUGyPerH")}, "valueIs": "median of DosTel2 readings (the mean is pulled up by South Atlantic Anomaly passes)", "earthBackground": rad["earthBackground"],
                                     "note": "No place on Earth's surface reproduces this radiation environment."} if rad else None))
    sw = shared.get("spaceWeather")
    report["indicators"].append(ind("space_weather", sw["total30d"] if sw else None, "DONKI events, last 30 days", "nodata",
                                    source_ref("donki"), "live" if sw else "failed",
                                    {"counts30d": sw["counts30d"], "counts365d": sw["counts365d"], "window30d": sw["window30d"]} if sw else None))
    report["inferred"] = {"vegetation": veg_class(nd), "climate": climate_class(power)}
    if eonet is not None:
        report["context"] = {"eonet": eonet}
    if mission:
        report["missionFit"] = mission_fit(report, planet, mission)
    return report, raw


# ------------------------------------------------------------ data check
def site_state(site, planet, mission):
    if any(h["planet"] == planet and h["mission"] == mission for h in site["history"]):
        return "validated"
    combo = CRITERIA["combos"][f"{planet}.{mission}"]
    a = abs(site["lat"])
    values = {**site["attributes"], "latitudeBand": "polar" if a > 60 else "mid" if a >= 30 else "low"}
    ok = all(not r["required"] or rule_result(r, values.get(r["field"])) != "fail" for r in combo["rules"])
    return "candidate" if ok else None


STATE_WORD = {"validated": "validated (green)", "candidate": "possible (grey)"}
PLANETS = ["moon", "mars"]
MISSIONS = ["landing", "rover", "base"]


def data_check(site, report):
    conflicts = []
    ind_by = {i["key"]: i for i in report["indicators"]}
    evidence = {"vegetation": lambda: f"NDVI {ind_by['vegetation']['value']}",
                "climate": lambda: f"{ind_by['aridity']['value']} mm/yr, mean {ind_by['temp_range']['details']['t2mAnnC']} °C, grid elevation {ind_by['elevation']['value']} m"}
    for planet in PLANETS:
        for mission in MISSIONS:
            state = site_state(site, planet, mission)
            fit = mission_fit(report, planet, mission)
            if state and not fit["ok"]:
                why = "; ".join(f"{c['rule']} — data suggests '{c['inferred']}' ({evidence[c['field']]()})" for c in fit["checked"] if c["result"] == "fail")
                if "On land" in fit["failingRequirements"]:
                    why = (why + "; " if why else "") + "land cover says water"
                conflicts.append({"type": "state-vs-data", "planet": planet, "mission": mission, "state": state,
                                  "failingRequirements": fit["failingRequirements"],
                                  "message": f"Shown as {STATE_WORD[state]} for {planet.capitalize()} · {mission.capitalize()}, but NASA data fails: {why}."})
    for field in ("vegetation", "climate"):
        declared, inferred = site["attributes"].get(field), report["inferred"].get(field)
        if inferred is None or declared == inferred:
            continue
        changed = []
        for planet in PLANETS:
            for mission in MISSIONS:
                for r in CRITERIA["combos"][f"{planet}.{mission}"]["rules"]:
                    if r["required"] and r["field"] == field and (rule_result(r, declared) == "fail") != (rule_result(r, inferred) == "fail"):
                        changed.append(f"{planet}.{mission}")
        if changed:
            conflicts.append({"type": "attribute-vs-data", "field": field, "declared": declared, "inferred": inferred, "affects": sorted(set(changed)),
                              "message": f"Declared {field} '{declared}', but NASA data suggests '{inferred}' ({evidence[field]()}). This would change the map in: {', '.join(sorted(set(changed)))}."})
    return conflicts


# --------------------------------------------------------------- main
def write_json(path, obj):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        json.dump(obj, f, indent=2, ensure_ascii=False)
        f.write("\n")


def shared_data():
    shared = {}
    for name, fn, fname in (("spaceWeather", fetch_space_weather, "space-weather.json"),
                            ("radiation", fetch_radiation, "radiation.json"),
                            ("osdr", fetch_osdr, "osdr.json")):
        try:
            shared[name] = fn()
            write_json(os.path.join(CACHE_DIR, fname), shared[name])
            print(f"[ok] {name}")
        except Exception as e:  # noqa: BLE001
            print(f"[FAILED] {name}: {e}")
            shared[name] = None
    return shared


def main():
    sys.stdout.reconfigure(line_buffering=True)
    ap = argparse.ArgumentParser()
    ap.add_argument("--site")
    ap.add_argument("--point", nargs=2, type=float)
    ap.add_argument("--mission", choices=MISSIONS)
    ap.add_argument("--planet", choices=PLANETS, default="mars")
    a = ap.parse_args()
    sites = load("src/data/sites.json")

    if a.point:
        shared = {"radiation": None, "spaceWeather": None}
        rep, raw = build_report(a.point[0], a.point[1], sites, shared, a.mission, a.planet)
        print(json.dumps({"report": rep, "raw": raw}, indent=2, ensure_ascii=False))
        return

    shared = shared_data()
    wanted = set(a.site.split(",")) if a.site else None
    todo = [s for s in sites if not wanted or s["id"] in wanted]
    results = {}

    idx_path0 = os.path.join(CACHE_DIR, "index.json")
    prev_idx = load("data/nasa-cache/index.json")["sites"] if os.path.exists(idx_path0) else {}

    def keep_previous(rep, prev):
        """A source that failed now keeps its previous value (status 'cached', original date) instead of losing it."""
        if not prev:
            return
        old = {i["key"]: i for i in prev["report"]["indicators"]}
        for n, i in enumerate(rep["indicators"]):
            o = old.get(i["key"])
            if i["status"] == "failed" and o and o["status"] in ("live", "cached") and o.get("value") is not None:
                rep["indicators"][n] = {**o, "status": "cached", "cachedFrom": o.get("cachedFrom") or prev["generatedAt"]}
        if rep["basic"]["onLand"] is None and prev["report"]["basic"].get("onLand") is not None:
            rep["basic"]["onLand"] = prev["report"]["basic"]["onLand"]
        by = {i["key"]: i for i in rep["indicators"]}
        if rep["inferred"].get("vegetation") is None and by["vegetation"].get("value") is not None:
            rep["inferred"]["vegetation"] = veg_class(by["vegetation"]["value"])
        if rep["inferred"].get("climate") is None:
            rep["inferred"]["climate"] = prev["report"].get("inferred", {}).get("climate")

    def one(site):
        t0 = time.time()
        rep, raw = build_report(site["lat"], site["lon"], sites, shared, site_id=site["id"])
        keep_previous(rep, prev_idx.get(site["id"]))
        rep["missionFitBy"] = {f"{p}.{m}": mission_fit(rep, p, m) for p in PLANETS for m in MISSIONS}
        trek = {p: trek_tile(p, k) for p, k in TREK["sites"].get(site["id"], {}).items()}
        entry = {"siteId": site["id"], "generatedAt": rep["checkedAt"], "report": rep, "raw": raw,
                 "media": {"gibs": gibs_thumb(site["lat"], site["lon"]), "trek": trek},
                 "osdr": (shared.get("osdr") or {}).get("byPlanet"),
                 "conflicts": data_check(site, rep)}
        write_json(os.path.join(CACHE_DIR, f"{site['id']}.json"), entry)
        print(f"[site] {site['id']}: {len(rep['errors'])} errors, {len(entry['conflicts'])} conflicts, {time.time()-t0:.0f}s", flush=True)
        return entry

    with cf.ThreadPoolExecutor(4) as ex:
        for entry in ex.map(one, todo):
            results[entry["siteId"]] = entry

    # merge into index.json (keeps entries of sites not refreshed this run)
    idx_path = os.path.join(CACHE_DIR, "index.json")
    idx = load("data/nasa-cache/index.json") if os.path.exists(idx_path) else {"sites": {}}
    idx["generatedAt"] = dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")
    idx["note"] = "Generated by scripts/fetch_nasa_cache.py — do not edit by hand."
    idx["shared"] = {k: shared.get(k) for k in ("spaceWeather", "radiation", "osdr")}
    idx["sites"].update(results)
    write_json(idx_path, idx)

    # dataCheck → sites.json (keeps the file's CRLF + 2-space style)
    sites_path = os.path.join(ROOT, "src", "data", "sites.json")
    with open(sites_path, encoding="utf-8", newline="") as f:
        text = f.read()
    nl = "\r\n" if "\r\n" in text else "\n"
    cur = json.loads(text)
    for s in cur:
        if s["id"] in idx["sites"]:
            e = idx["sites"][s["id"]]
            s["dataCheck"] = {"conflicts": e["conflicts"], "checkedAt": e["generatedAt"]}
    out = json.dumps(cur, indent=2, ensure_ascii=False).replace("\n", nl) + nl
    with open(sites_path, "w", encoding="utf-8", newline="") as f:
        f.write(out)

    # DATA-CHECK.md
    lines = ["# DATA-CHECK — hand-entered site data vs NASA data", "",
             f"Generated {idx['generatedAt']} by `scripts/fetch_nasa_cache.py`. **Nothing was changed automatically.** "
             "Each conflict is shown on the site card as \"Data conflict: …\"; the team decides whether to edit `src/data/sites.json`.", "",
             "- **state-vs-data**: the map shows the site (validated/possible) for a planet·mission, but a required rule fails with the NASA-inferred value.",
             "- **attribute-vs-data**: a hand-entered attribute differs from the NASA-inferred one, and the difference would change which maps show the site.",
             "- Inference thresholds: `data/nasa-endpoints.json` (project rules, not scientific consensus). Only vegetation (NDVI) and climate (POWER) can be inferred.", ""]
    total = 0
    for s in cur:
        e = idx["sites"].get(s["id"])
        if not e:
            continue
        cs = e["conflicts"]
        total += len(cs)
        lines.append(f"## {s['name']} (`{s['id']}`) — {len(cs)} conflict(s)")
        if not cs:
            lines.append("No conflict.")
        for c in cs:
            lines.append(f"- [{c['type']}] {c['message']}")
        failed = [x for x in e["report"]["errors"]]
        if failed:
            lines.append(f"- _Sources that failed for this site:_ {'; '.join(failed)}")
        lines.append("")
    lines.insert(2, f"**Total: {total} conflict(s) in {len(idx['sites'])} sites.**\n")
    with open(os.path.join(ROOT, "DATA-CHECK.md"), "w", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(lines) + "\n")
    print(f"done: {len(results)} sites, {total} conflicts")


if __name__ == "__main__":
    sys.exit(main())
