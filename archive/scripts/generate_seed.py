"""Generate src/data/seedRuns.json — ~200 fictional simulation runs.

Deterministic (fixed seed), so the file can be regenerated after editing the
other JSON files:   python scripts/generate_seed.py

Only sites that are a star or green for a mission receive runs for that mission
(same rule as src/services/status.js).
"""
import json
import random
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "src" / "data"
SEED = 2026
N_RUNS = 200


def load(name):
    return json.loads((DATA / f"{name}.json").read_text(encoding="utf-8"))


def is_viable(site, mission_id):
    used = any(h["mission"] == mission_id for h in site.get("history", []))
    return used or site["suitability"][mission_id]["ok"]


def main():
    rng = random.Random(SEED)
    missions = load("missions")
    sites = load("sites")
    researchers = load("researchers")

    # Fixed "popularity" weights so the stats are not uniform.
    vehicle_w = {v["id"]: rng.uniform(0.5, 3) for m in missions for v in m["vehicles"]}
    researcher_w = {r["id"]: rng.uniform(0.3, 3) for r in researchers}
    option_w = {
        (m["id"], g["id"], o["id"]): rng.uniform(0.5, 3)
        for m in missions for g in m["conditions"] for o in g["options"]
    }

    runs = []
    for i in range(N_RUNS):
        mission = rng.choice(missions)
        mid = mission["id"]
        candidates = [s for s in sites if is_viable(s, mid)]
        site = rng.choice(candidates)

        vehicles = mission["vehicles"]
        vehicle = rng.choices(vehicles, weights=[vehicle_w[v["id"]] for v in vehicles])[0]

        size = rng.randint(mission["teamSize"]["min"], mission["teamSize"]["max"])
        pool = list(researchers)
        team = []
        for _ in range(size):
            # Favour researchers with a role the mission needs, and from the site's continent.
            role_ids = {r["id"] for r in mission["roles"]}
            weights = [
                researcher_w[r["id"]]
                * (2.5 if role_ids & set(r["roles"]) else 0.4)
                * (1.8 if r["continent"] == site["continent"] else 1)
                for r in pool
            ]
            pick = rng.choices(pool, weights=weights)[0]
            team.append(pick["id"])
            pool.remove(pick)

        conditions = {}
        for g in mission["conditions"]:
            opts = g["options"]
            o = rng.choices(opts, weights=[option_w[(mid, g["id"], x["id"])] for x in opts])[0]
            conditions[g["id"]] = o["id"]

        runs.append({
            "id": f"seed-{i + 1:04d}",
            "seed": True,
            "mission": mid,
            "siteId": site["id"],
            "vehicleId": vehicle["id"],
            "researcherIds": team,
            "conditions": conditions,
        })

    out = DATA / "seedRuns.json"
    out.write_text(json.dumps(runs, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"Wrote {len(runs)} runs to {out}")


if __name__ == "__main__":
    main()
