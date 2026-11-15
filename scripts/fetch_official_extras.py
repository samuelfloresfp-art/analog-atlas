#!/usr/bin/env python3
"""
Adds data from two OFFICIAL challenge resources that the main cache script does not cover, and writes
data/nasa-cache/official-extras.json (loaded by the front at start, like index.json):

  1. LRO Diviner (NASA PDS Geosciences Node) — Polar Resource Product, south pole (DLRE_PRP_SOUTH).
     Annual average / maximum surface temperature and depth to ice-stable permafrost, from thermal-model fits
     to Diviner observations. Gives the MEASURED lunar side of the temperature dimension for the Moon Base target
     (lunar south pole). No login.
  2. NASA Earthdata (LP DAAC) via AppEEARS — SRTM GL1 (30 m) and ASTER GDEM v3 elevation at a 3x3 stencil around
     every site, at two scales (~60 m and ~1 km), so we get elevation, slope and local relief from the same
     catalogue the Earthdata Search app shows. Needs a (free) Earthdata Login.

It is a separate file on purpose: scripts/fetch_nasa_cache.py rewrites index.json, and would drop these keys.

Usage (Python 3.9+, standard library only):
  python scripts/fetch_official_extras.py --diviner                     # downloads the PDS label + table (~hundreds of MB, streamed)
  python scripts/fetch_official_extras.py --diviner --diviner-file dlre_prp_south.tab --diviner-label dlre_prp_south.lbl
  python scripts/fetch_official_extras.py --appeears                    # needs credentials, see below
  python scripts/fetch_official_extras.py --appeears --appeears-task <task_id>   # resume a submitted task
  python scripts/fetch_official_extras.py --appeears --appeears-csv results.csv  # parse a bundle CSV you downloaded

Earthdata Login (never commit it): env EARTHDATA_USERNAME + EARTHDATA_PASSWORD, or env APPEEARS_TOKEN,
or a ~/.netrc entry for urs.earthdata.nasa.gov. Free account: https://urs.earthdata.nasa.gov

If the Diviner label has column names this script does not recognise, it stops and prints them; pass
--diviner-columns lat=NAME,lon=NAME,tavg=NAME,tmax=NAME,ice=NAME to map them.
"""
import argparse
import base64
import csv
import datetime as dt
import io
import json
import math
import netrc
import os
import re
import statistics
import sys
import time
import urllib.error
import urllib.request
from array import array

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "data", "nasa-cache", "official-extras.json")
UA = "AnalogAtlas-prototype/0.4 (NASA Space Apps 2026)"

DIVINER_BASE = "https://pds-geosciences.wustl.edu/lro/lro-l-dlre-4-rdr-v1/lrodlr_1001/data/prp/"
DIVINER_TAB = DIVINER_BASE + "dlre_prp_south.tab"
DIVINER_LBL = DIVINER_BASE + "dlre_prp_south.lbl"
DIVINER_PAGE = "https://pds-geosciences.wustl.edu/missions/lro/diviner.htm"
COLD_TRAP_K = 110.0  # surfaces below ~110 K can cold-trap water ice over geologic time (Diviner team, Williams et al. 2019)

APPEEARS = "https://appeears.earthdatacloud.nasa.gov/api"
DEM_LAYERS = [
    {"product": "SRTMGL1_NC.003", "layer": "SRTMGL1_DEM", "key": "srtm", "label": "SRTM GL1 v3 (30 m)"},
    {"product": "ASTGTM_NC.003", "layer": "ASTER_GDEM_DEM", "key": "aster", "label": "ASTER GDEM v3 (30 m)"},
]
# stencil spacing in arc-seconds: 2" ≈ 62 m (local, rover scale) and 30" ≈ 0.9 km (site / landing-zone scale)
SCALES = {"local": 2.0, "site": 30.0}


def load(path):
    with open(os.path.join(ROOT, path), encoding="utf-8") as f:
        return json.load(f)


def write_json(path, obj):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        json.dump(obj, f, indent=2, ensure_ascii=False)
        f.write("\n")


def now_iso():
    return dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")


def request(url, method="GET", headers=None, data=None, timeout=60):
    req = urllib.request.Request(url, method=method, data=data, headers={"User-Agent": UA, **(headers or {})})
    return urllib.request.urlopen(req, timeout=timeout)


# =============================================================== Diviner (PDS)
def parse_pds3_label(text):
    """Minimal PDS3 label reader: returns {'rows', 'row_bytes', 'columns': [{name,start,bytes,type,unit,missing,desc}]}."""
    cols, cur, depth_col = [], None, False
    meta = {}
    # join multi-line quoted values (e.g. DESCRIPTION = "....\n ....")
    lines, buf = [], None
    for raw in text.splitlines():
        if buf is not None:
            buf += " " + raw.strip()
            if raw.count('"') % 2 == 1:
                lines.append(buf)
                buf = None
            continue
        if raw.count('"') % 2 == 1:
            buf = raw.strip()
            continue
        lines.append(raw)
    for raw in lines:
        line = raw.strip()
        if not line or line.startswith("/*"):
            continue
        m = re.match(r"^([A-Z0-9_^:]+)\s*=\s*(.*)$", line)
        if not m:
            continue
        key, val = m.group(1), m.group(2).strip().strip('"').strip()
        if key == "OBJECT" and val == "COLUMN":
            cur, depth_col = {}, True
            continue
        if key == "END_OBJECT" and val == "COLUMN" and depth_col:
            cols.append(cur)
            cur, depth_col = None, False
            continue
        if depth_col:
            cur[key] = val
        elif key in ("ROWS", "ROW_BYTES", "FILE_RECORDS", "RECORD_BYTES", "INTERCHANGE_FORMAT"):
            meta[key] = val

    def num(v):
        try:
            return float(re.sub(r"<.*?>", "", v).strip())
        except (TypeError, ValueError):
            return None

    out = []
    for c in cols:
        out.append({
            "name": c.get("NAME", "").strip(),
            "start": int(num(c.get("START_BYTE")) or 0) or None,
            "bytes": int(num(c.get("BYTES")) or 0) or None,
            "type": c.get("DATA_TYPE"),
            "unit": c.get("UNIT"),
            "missing": num(c.get("MISSING_CONSTANT")) if c.get("MISSING_CONSTANT") else None,
            "desc": c.get("DESCRIPTION", "")[:200],
        })
    return {"rows": int(num(meta.get("ROWS")) or 0) or None, "columns": out}


ROLE_PATTERNS = {
    "lat": [r"LAT"],
    "lon": [r"LON"],
    "tavg": [r"(AVG|AVERAGE|MEAN).*T(EMP|EMPERATURE)?", r"T.*(AVG|AVERAGE|MEAN)"],
    "tmax": [r"MAX.*T(EMP|EMPERATURE)?", r"T.*MAX"],
    "ice": [r"ICE", r"DEPTH"],
}


def map_columns(columns, override=None):
    names = [c["name"].upper() for c in columns]
    role = {}
    if override:
        for part in override.split(","):
            k, v = part.split("=", 1)
            role[k.strip()] = names.index(v.strip().upper())
        return role
    for r, pats in ROLE_PATTERNS.items():
        for i, n in enumerate(names):
            if i in role.values():
                continue
            if r in ("tavg", "tmax") and "ERR" in n:
                continue
            if any(re.search(p, n) for p in pats):
                if r in ("lat", "lon") and any(x in n for x in ("MIN", "MAX")):
                    continue
                role[r] = i
                break
    return role


def stream_lines(path_or_url):
    if re.match(r"^https?://", path_or_url):
        r = request(path_or_url, timeout=300)
        for b in r:
            yield b.decode("ascii", "replace")
    else:
        with open(path_or_url, encoding="ascii", errors="replace") as f:
            yield from f


def read_text(path_or_url):
    if re.match(r"^https?://", path_or_url):
        return request(path_or_url).read().decode("ascii", "replace")
    with open(path_or_url, encoding="ascii", errors="replace") as f:
        return f.read()


def haversine_km(lat1, lon1, lat2, lon2, r=1737.4):
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(min(1, math.sqrt(a)))


def summarize(vals_tavg, vals_tmax, vals_ice, n):
    def s(a):
        if not a:
            return None
        a = sorted(a)
        return {"min": round(a[0], 1), "median": round(statistics.median(a), 1), "max": round(a[-1], 1)}

    cold = sum(1 for v in vals_tmax if v < COLD_TRAP_K)
    return {
        "elements": n,
        "tavgK": s(vals_tavg),
        "tmaxK": s(vals_tmax),
        "iceDepthM": s(vals_ice),
        "shareTmaxBelow110K": round(cold / len(vals_tmax), 4) if vals_tmax else None,
        "shareWithIceDepth": round(len(vals_ice) / n, 4) if n else None,
    }


def run_diviner(args):
    targets_doc = load("data/lunar-targets.json")
    targets = targets_doc["targets"]
    lbl_text = read_text(args.diviner_label or DIVINER_LBL)
    lbl = parse_pds3_label(lbl_text)
    cols = lbl["columns"]
    role = map_columns(cols, args.diviner_columns)
    missing_roles = [r for r in ("lat", "lon", "tmax") if r not in role]
    if missing_roles or not cols:
        print("[diviner] Could not map columns", missing_roles, "— label columns are:")
        for c in cols:
            print(f"   {c['name']!r} start={c['start']} bytes={c['bytes']} unit={c['unit']} :: {c['desc'][:90]}")
        print("Re-run with --diviner-columns lat=NAME,lon=NAME,tavg=NAME,tmax=NAME,ice=NAME")
        sys.exit(2)
    print("[diviner] columns:", {r: cols[i]["name"] for r, i in role.items()})
    fixed = all(c["start"] and c["bytes"] for c in cols)

    def getter(i):
        c = cols[i]
        miss = c["missing"]
        if fixed:
            a, b = c["start"] - 1, c["start"] - 1 + c["bytes"]

            def g(line, parts):
                try:
                    v = float(line[a:b])
                except ValueError:
                    return None
                return None if (miss is not None and v == miss) or not math.isfinite(v) else v
        else:
            def g(line, parts):
                try:
                    v = float(parts[i])
                except (ValueError, IndexError):
                    return None
                return None if (miss is not None and v == miss) or not math.isfinite(v) else v
        return g

    G = {r: getter(i) for r, i in role.items()}
    buckets = {t["id"]: {"tavg": array("f"), "tmax": array("f"), "ice": array("f"), "n": 0} for t in targets}
    n_rows = 0
    t0 = time.time()
    for line in stream_lines(args.diviner_file or DIVINER_TAB):
        parts = None if fixed else re.split(r"[,\s]+", line.strip())
        lat, lon = G["lat"](line, parts), G["lon"](line, parts)
        if lat is None or lon is None:
            continue
        n_rows += 1
        if lon > 180:
            lon -= 360
        tmax = G["tmax"](line, parts)
        tavg = G["tavg"](line, parts) if "tavg" in G else None
        ice = G["ice"](line, parts) if "ice" in G else None
        for t in targets:
            if t["kind"] == "cap":
                inside = lat <= t["maxLat"]
            else:
                inside = haversine_km(lat, lon, t["lat"], t["lon"]) <= t["radiusKm"]
            if not inside:
                continue
            b = buckets[t["id"]]
            b["n"] += 1
            if tmax is not None:
                b["tmax"].append(tmax)
            if tavg is not None:
                b["tavg"].append(tavg)
            if ice is not None and ice >= 0:
                b["ice"].append(ice)
        if n_rows % 500000 == 0:
            print(f"[diviner] {n_rows:,} rows, {time.time()-t0:.0f}s", flush=True)
    if not n_rows:
        print("[diviner] no rows parsed — check the file and the column mapping")
        sys.exit(3)
    results = []
    for t in targets:
        b = buckets[t["id"]]
        results.append({**{k: t[k] for k in t}, **summarize(list(b["tavg"]), list(b["tmax"]), list(b["ice"]), b["n"])})
    return {
        "generatedAt": now_iso(),
        "status": "cached",
        "source": {
            "name": "LRO Diviner Polar Resource Product, south pole (DLRE_PRP_SOUTH)",
            "agency": "NASA (PDS Geosciences Node)",
            "url": DIVINER_PAGE,
            "dataUrl": DIVINER_TAB,
            "datasetId": "LRO-L-DLRE-5-PRP-V2.0",
            "reference": "Paige et al. (2010), Science 330, 479-482",
        },
        "columnsUsed": {r: cols[i]["name"] for r, i in role.items()},
        "rowsRead": n_rows,
        "coldTrapThresholdK": COLD_TRAP_K,
        "targets": results,
        "note": "Values come from thermal-model fits to Diviner data over a Kaguya-derived mesh (one row per triangle). "
                "Target coordinates/radii are in data/lunar-targets.json (team-editable).",
    }


# =============================================================== AppEEARS (Earthdata)
def edl_credentials():
    u, p = os.environ.get("EARTHDATA_USERNAME"), os.environ.get("EARTHDATA_PASSWORD")
    if u and p:
        return u, p
    try:
        a = netrc.netrc().authenticators("urs.earthdata.nasa.gov")
        if a:
            return a[0], a[2]
    except (FileNotFoundError, netrc.NetrcParseError):
        pass
    return None


def appeears_token():
    tok = os.environ.get("APPEEARS_TOKEN")
    if tok:
        return tok
    cred = edl_credentials()
    if not cred:
        sys.exit("[appeears] No Earthdata Login. Set EARTHDATA_USERNAME/EARTHDATA_PASSWORD, APPEEARS_TOKEN or ~/.netrc.")
    basic = base64.b64encode(f"{cred[0]}:{cred[1]}".encode()).decode()
    r = request(f"{APPEEARS}/login", method="POST", headers={"Authorization": f"Basic {basic}", "Content-Length": "0"})
    return json.loads(r.read())["token"]


def stencil_points(site):
    """3x3 stencil at each scale. id = <siteId>__<scale>__<i>_<j>  (i: row north→south, j: col west→east)."""
    pts = []
    for scale, arcsec in SCALES.items():
        d = arcsec / 3600.0
        for i in (-1, 0, 1):
            for j in (-1, 0, 1):
                pts.append({
                    "id": f"{site['id']}__{scale}__{i}_{j}",
                    "category": site["id"],
                    "latitude": round(site["lat"] - i * d, 6),
                    "longitude": round(site["lon"] + j * d, 6),
                })
    return pts


def submit_task(token, sites):
    coords = [p for s in sites for p in stencil_points(s)]
    body = {
        "task_type": "point",
        "task_name": f"analog-atlas-dem-{dt.date.today().isoformat()}",
        "params": {
            # SRTM is dated 2000-02-11; ASTER GDEM v3 covers 2000-03-01..2013-11-30 → one static value each
            "dates": [{"startDate": "01-01-2000", "endDate": "12-31-2013"}],
            "layers": [{"product": L["product"], "layer": L["layer"]} for L in DEM_LAYERS],
            "coordinates": coords,
        },
    }
    r = request(f"{APPEEARS}/task", method="POST", data=json.dumps(body).encode(),
                headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"})
    tid = json.loads(r.read())["task_id"]
    print(f"[appeears] submitted task {tid} with {len(coords)} points")
    return tid


def wait_task(token, tid, timeout_min=90):
    t0 = time.time()
    while time.time() - t0 < timeout_min * 60:
        r = request(f"{APPEEARS}/task/{tid}", headers={"Authorization": f"Bearer {token}"})
        st = json.loads(r.read()).get("status")
        print(f"[appeears] task {tid}: {st} ({time.time()-t0:.0f}s)", flush=True)
        if st == "done":
            return
        if st in ("error", "expired"):
            sys.exit(f"[appeears] task ended with status {st}")
        time.sleep(30)
    sys.exit("[appeears] timed out; re-run later with --appeears-task " + tid)


def download_csvs(token, tid):
    r = request(f"{APPEEARS}/bundle/{tid}", headers={"Authorization": f"Bearer {token}"})
    files = json.loads(r.read())["files"]
    texts = []
    for f in files:
        if f["file_type"] == "csv" and "results" in f["file_name"].lower():
            body = request(f"{APPEEARS}/bundle/{tid}/{f['file_id']}", headers={"Authorization": f"Bearer {token}"}).read()
            texts.append(body.decode("utf-8", "replace"))
            print(f"[appeears] downloaded {f['file_name']} ({f['file_size']} bytes)")
    if not texts:
        sys.exit("[appeears] no results CSV in the bundle: " + ", ".join(x["file_name"] for x in files))
    return texts


def parse_results(csv_texts):
    """Returns {pointId: {layerKey: value}} from AppEEARS point-sample CSV(s)."""
    vals = {}
    for text in csv_texts:
        rd = csv.DictReader(io.StringIO(text))
        cols = rd.fieldnames or []
        lay_cols = {}
        for L in DEM_LAYERS:
            cand = [c for c in cols if c.endswith("_" + L["layer"]) or c == L["layer"]]
            if cand:
                lay_cols[L["key"]] = cand[0]
        id_col = next((c for c in cols if c.lower() == "id"), None)
        if not id_col or not lay_cols:
            raise SystemExit(f"[appeears] unexpected CSV columns: {cols[:12]}")
        for row in rd:
            for k, c in lay_cols.items():
                try:
                    v = float(row[c])
                except (TypeError, ValueError):
                    continue
                if v < -1000:  # fill values
                    continue
                vals.setdefault(row[id_col], {})[k] = v
    return vals


def terrain_from_stencil(site, vals, key):
    out = {}
    for scale, arcsec in SCALES.items():
        z = {}
        for i in (-1, 0, 1):
            for j in (-1, 0, 1):
                v = vals.get(f"{site['id']}__{scale}__{i}_{j}", {}).get(key)
                if v is not None:
                    z[(i, j)] = v
        if len(z) < 9:
            out[scale] = None
            continue
        d = arcsec / 3600.0
        dx = d * 111320.0 * math.cos(math.radians(site["lat"]))  # m per step east
        dy = d * 110574.0  # m per step north
        # Horn (1981): i=-1 is north row
        dzdx = ((z[(-1, 1)] + 2 * z[(0, 1)] + z[(1, 1)]) - (z[(-1, -1)] + 2 * z[(0, -1)] + z[(1, -1)])) / (8 * dx)
        dzdy = ((z[(-1, -1)] + 2 * z[(-1, 0)] + z[(-1, 1)]) - (z[(1, -1)] + 2 * z[(1, 0)] + z[(1, 1)])) / (8 * dy)
        slope = math.degrees(math.atan(math.hypot(dzdx, dzdy)))
        vs = list(z.values())
        out[scale] = {
            "spacingM": round(dy),
            "slopeDeg": round(slope, 2),
            "reliefM": round(max(vs) - min(vs), 1),
            "stdM": round(statistics.pstdev(vs), 1),
        }
    center = vals.get(f"{site['id']}__local__0_0", {}).get(key)
    return {"elevationM": None if center is None else round(center, 1), **out}


def run_appeears(args, sites):
    if args.appeears_csv:
        texts = [read_text(p) for p in args.appeears_csv]
        tid = None
    else:
        token = appeears_token()
        tid = args.appeears_task or submit_task(token, sites)
        wait_task(token, tid)
        texts = download_csvs(token, tid)
    vals = parse_results(texts)
    by_site = {}
    for s in sites:
        entry = {L["key"]: terrain_from_stencil(s, vals, L["key"]) for L in DEM_LAYERS}
        if any(entry[k]["elevationM"] is not None for k in entry):
            by_site[s["id"]] = entry
    print(f"[appeears] terrain for {len(by_site)}/{len(sites)} sites")
    return {
        "generatedAt": now_iso(),
        "status": "cached",
        "taskId": tid,
        "source": {
            "name": "NASA AppEEARS point samples (LP DAAC, NASA Earthdata)",
            "agency": "NASA (LP DAAC)",
            "url": "https://appeears.earthdatacloud.nasa.gov/",
            "layers": DEM_LAYERS,
        },
        "method": "3x3 stencil per site at two spacings (local ≈ 62 m, site ≈ 0.9 km); slope by Horn (1981) "
                  "finite differences; relief = max-min of the 9 samples. Elevation is the centre pixel.",
        "sites": by_site,
    }


# =============================================================== main
def main():
    sys.stdout.reconfigure(line_buffering=True)
    ap = argparse.ArgumentParser()
    ap.add_argument("--diviner", action="store_true")
    ap.add_argument("--diviner-file")
    ap.add_argument("--diviner-label")
    ap.add_argument("--diviner-columns")
    ap.add_argument("--appeears", action="store_true")
    ap.add_argument("--appeears-task")
    ap.add_argument("--appeears-csv", nargs="+")
    ap.add_argument("--site", help="comma-separated site ids (AppEEARS only)")
    a = ap.parse_args()
    if not (a.diviner or a.appeears):
        ap.error("choose --diviner and/or --appeears")

    sites = load("src/data/sites.json")
    if a.site:
        wanted = set(a.site.split(","))
        sites = [s for s in sites if s["id"] in wanted]

    out = load("data/nasa-cache/official-extras.json") if os.path.exists(OUT) else {}
    out["note"] = "Generated by scripts/fetch_official_extras.py — do not edit by hand."
    if a.diviner:
        out["diviner"] = run_diviner(a)
        print("[ok] diviner")
    if a.appeears:
        prev = (out.get("appeears") or {}).get("sites", {})
        res = run_appeears(a, sites)
        res["sites"] = {**prev, **res["sites"]}
        out["appeears"] = res
        print("[ok] appeears")
    out["generatedAt"] = now_iso()
    write_json(OUT, out)
    print("[written]", os.path.relpath(OUT, ROOT))


if __name__ == "__main__":
    main()
