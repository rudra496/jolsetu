"""JolSetu data pipeline: Araihazar real well data -> app assets + model.

Inputs (CUAHSI HydroShare, DOI 10.4211/hs.8e1373d87419447c945625af13f0a2ea):
  Dataset2.csv — 6,604 real tubewell measurements (Well_ID, Union, Village,
                 As_ppb, Latitude, Longitude, Depth, Year)
  Dataset1.csv — 943 samples: kit category vs laboratory-measured As

Outputs (site/js/): wells_data.js, model_data.js, kit_table.js
Run: python build/prepare_data.py
"""
import csv
import json
import math
import statistics

HERE = __file__.rsplit("\\", 1)[0] if "\\" in __file__ else "build"
IN = "build"
OUT = "site/js"

# ---------- Load wells ----------
wells = []
with open(f"{IN}/Dataset2.csv", newline="", encoding="utf-8-sig") as f:
    for r in csv.DictReader(f):
        try:
            wells.append({
                "id": int(r["Well_ID"]),
                "union": r["Union"].strip(),
                "village": r["Village"].strip(),
                "as": float(r["As_ppb"]),
                "lat": float(r["Latitude"]),
                "lon": float(r["Longitude"]),
                "dep": float(r["Depth"]) if r["Depth"] else None,
                "yr": int(r["Year"]) if r["Year"] else None,
            })
        except (ValueError, KeyError):
            continue

n_all = len(wells)
wells = [w for w in wells if -90 <= w["lat"] <= 90 and 88 <= w["lon"] <= 93 and w["as"] >= 0]
n_geo = len(wells)

above50 = [w for w in wells if w["as"] >= 50]
above10 = [w for w in wells if w["as"] >= 10]
pct50 = 100.0 * len(above50) / n_geo
pct10 = 100.0 * len(above10) / n_geo

# Depth bands (ft) — prevalence of As>=50 per band
bands = [(0, 50), (50, 100), (100, 150), (150, 250), (250, 700)]
depth_prior = []
for lo, hi in bands:
    grp = [w for w in wells if w["dep"] is not None and lo <= w["dep"] < hi]
    if grp:
        depth_prior.append({
            "lo": lo, "hi": hi, "n": len(grp),
            "p50": round(100.0 * sum(1 for w in grp if w["as"] >= 50) / len(grp), 1),
        })

# ---------- Kit vs lab table (Dataset1) ----------
# "Kit category" = the human visual color-chart reading in ppb (0..1000; 999 = above chart).
kit_rows = []
with open(f"{IN}/Dataset1.csv", newline="", encoding="utf-8-sig") as f:
    for r in csv.DictReader(f):
        try:
            kit_rows.append({"cat": int(r["Kit category"]), "lab": float(r["Laboratory measured As (ppb)"])})
        except (ValueError, KeyError):
            continue
kit_table = []
for cat in sorted({r["cat"] for r in kit_rows}):
    grp = [r["lab"] for r in kit_rows if r["cat"] == cat]
    kit_table.append({
        "cat": cat, "n": len(grp),
        "lab_med": round(statistics.median(grp), 1),
        "lab_pct50": round(100.0 * sum(1 for v in grp if v >= 50) / len(grp), 1),
        "lab_min": round(min(grp), 1), "lab_max": round(max(grp), 1),
    })

# Human kit reading vs lab: binary agreement at the 50 ug/L national standard.
def kit_perf(cut):
    tp = fp = tn = fn = 0
    for r in kit_rows:
        pred = r["cat"] >= cut
        act = r["lab"] >= 50
        tp += pred and act; fp += pred and not act
        tn += (not pred) and (not act); fn += (not pred) and act
    sens = tp / (tp + fn) if tp + fn else 0
    spec = tn / (tn + fp) if tn + fp else 0
    acc = (tp + tn) / len(kit_rows)
    return {"cut": cut, "sens": round(100*sens, 1), "spec": round(100*spec, 1), "acc": round(100*acc, 1)}

kit_perf_50 = kit_perf(50)  # human chart reading thresholded at 50 vs lab truth
kit_perf_25 = kit_perf(25)  # more cautious threshold

# ---------- Logistic model: P(As>=50) from lat/lon/depth ----------
# Standardize features; L2-free simple gradient descent (demo-grade, disclosed).
xs = [w["lat"] for w in wells]; ys = [w["lon"] for w in wells]
ds = [w["dep"] for w in wells if w["dep"] is not None]
mu = {"x": statistics.mean(xs), "y": statistics.mean(ys),
      "d": statistics.mean(ds), "s": statistics.stdev(ds)}
sd = {"x": statistics.stdev(xs), "y": statistics.stdev(ys)}

data = []
for w in wells:
    x = (w["lat"] - mu["x"]) / sd["x"]
    y = (w["lon"] - mu["y"]) / sd["y"]
    d = ((w["dep"] - mu["d"]) / mu["s"]) if w["dep"] is not None else 0.0
    hasd = 1.0 if w["dep"] is not None else 0.0
    data.append(([x, y, x*x, y*y, x*y, d*hasd, hasd], 1.0 if w["as"] >= 50 else 0.0))

split = int(0.8 * len(data))
import random
random.Random(42).shuffle(data)
train, test = data[:split], data[split:]

# Fit with sklearn (stable, C=1.0 L2) and export plain coefficients for JS.
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score

Xtr = np.array([f for f, _ in train]); ytr = np.array([l for _, l in train])
Xte = np.array([f for f, _ in test]); yte = np.array([l for _, l in test])
clf = LogisticRegression(max_iter=2000, C=1.0)
clf.fit(Xtr, ytr)
auc_test = roc_auc_score(yte, clf.predict_proba(Xte)[:, 1])
acc_test = 100.0 * clf.score(Xte, yte)
acc_base = 100.0 * max(yte.mean(), 1 - yte.mean())
model = [float(clf.intercept_[0])] + [float(c) for c in clf.coef_[0]]

model_out = {
    "target": "P(As >= 50 ug/L)",
    "trained_on": f"{len(train)} real Araihazar wells (HydroShare 10.4211/hs.8e1373d87419447c945625af13f0a2ea)",
    "tested_on": f"{len(test)} held-out wells",
    "features": ["1", "x(lat sd)", "y(lon sd)", "x^2", "y^2", "x*y", "depth_z * has_depth", "has_depth"],
    "coef": [round(c, 5) for c in model],
    "mu": {"lat": round(mu["x"], 6), "lon": round(mu["y"], 6), "dep": round(mu["d"], 2), "dep_sd": round(mu["s"], 2)},
    "sd": {"lat": round(sd["x"], 6), "lon": round(sd["y"], 6)},
    "auc_test": round(auc_test, 3),
    "acc_test_pct": round(acc_test, 1),
    "acc_baseline_pct": round(acc_base, 1),
    "disclosure": "Demo-grade logistic model on 2000-2012 survey data. Production target: gradient-boosted geospatial model (Podgorski & Berg 2020 approach) refreshed by live crowd tests.",
}

# ---------- Export compact app data ----------
compact = [[w["id"], round(w["lat"], 5), round(w["lon"], 5), round(w["as"], 1),
            int(w["dep"]) if w["dep"] is not None else -1, w["union"], w["village"],
            w["yr"] if w["yr"] and 1900 <= w["yr"] <= 2003 else 0]
           for w in wells]

stats = {
    "n": n_geo, "pct50": round(pct50, 1), "pct10": round(pct10, 1),
    "depth_prior": depth_prior, "kit_table": kit_table,
    "kit_perf_at50": kit_perf_50, "kit_perf_at25": kit_perf_25,
    "n_kit": len(kit_rows),
    "year_min": min(w["yr"] for w in wells if w["yr"] and 1900 <= w["yr"] <= 2003),
    "year_max": max(w["yr"] for w in wells if w["yr"] and 1900 <= w["yr"] <= 2003),
    "unions": sorted({w["union"] for w in wells}),
}

def js_obj(name, obj):
    return f"const {name} = " + json.dumps(obj, ensure_ascii=False, separators=(",", ":")) + ";\n"

with open(f"{OUT}/wells_data.js", "w", encoding="utf-8") as f:
    f.write("// 6,604 real tubewell arsenic measurements, Araihazar upazila, Narayanganj, Bangladesh.\n")
    f.write("// Source: HydroShare DOI 10.4211/hs.8e1373d87419447c945625af13f0a2ea (van Geen / Columbia LDEO).\n")
    f.write("// Row: [id, lat, lon, As_ppb, depth_ft (-1=unknown), union, village, survey_year]\n")
    f.write(js_obj("WELLS", compact))
with open(f"{OUT}/model_data.js", "w", encoding="utf-8") as f:
    f.write("// Demo risk model trained on the real Araihazar dataset (80/20 split, disclosure in-app).\n")
    f.write(js_obj("MODEL", model_out))
with open(f"{OUT}/kit_table.js", "w", encoding="utf-8") as f:
    f.write("// Field-kit color-chart reading (human, ppb) vs laboratory measurement (Dataset1.csv, n=943).\n")
    f.write(js_obj("KIT", {"table": kit_table, "perf_at50": kit_perf_50, "perf_at25": kit_perf_25, "stats": stats}))

print(f"wells={n_geo} pct>=50={pct50:.1f}% pct>=10={pct10:.1f}%")
print("depth_prior:", depth_prior)
print("kit perf (human@50 vs lab):", kit_perf_50, " (@25):", kit_perf_25)
print(f"model AUC(test)={auc_test:.3f} acc={acc_test:.1f}% baseline={acc_base:.1f}%")
print(f"years {stats['year_min']}-{stats['year_max']}, unions={len(stats['unions'])}")
