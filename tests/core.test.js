import { describe, it, expect } from "vitest";
import {
  haversine, bearing, nearestSafeWells, rgb2lab, labDist, CHART,
  readStrip, normalizeByWhite, riskProbability, idwRate, prioritySites,
  wellCode, verifyWellCode, geofenceVerdict, verdict, BD_STANDARD, WHO_GUIDELINE,
} from "../site/js/core.js";
import { readFileSync } from "node:fs";

// Load generated data files (plain const declarations) into this module scope.
const load = (p) => {
  const src = readFileSync(new URL(p, import.meta.url), "utf8");
  const obj = {};
  const body = src.replace(/^const (\w+) = /gm, "obj.$1 = ");
  new Function("obj", body + "\nreturn obj;")(obj);
  return obj;
};
const { WELLS } = load("../site/js/wells_data.js");
const { MODEL } = load("../site/js/model_data.js");
const { KIT } = load("../site/js/kit_table.js");

const wells = WELLS.map((r) => ({ id: r[0], lat: r[1], lon: r[2], as: r[3], dep: r[4], union: r[5], village: r[6], yr: r[7] }));

describe("geometry", () => {
  it("haversine Dhaka–Araihazar order-of-magnitude", () => {
    const d = haversine(23.81, 90.41, 23.795, 90.62);
    expect(d).toBeGreaterThan(15000);
    expect(d).toBeLessThan(25000);
  });
  it("haversine zero distance", () => {
    expect(haversine(23.8, 90.6, 23.8, 90.6)).toBe(0);
  });
  it("bearing cardinal directions", () => {
    expect(Math.round(bearing(0, 0, 1, 0))).toBe(0);    // north
    expect(Math.round(bearing(0, 0, 0, 1))).toBe(90);   // east
    expect(Math.round(bearing(0, 0, -1, 0))).toBe(180); // south
    expect(Math.round(bearing(0, 0, 0, -1))).toBe(270); // west
  });
});

describe("safe-well routing", () => {
  it("returns only wells below the BD standard, sorted by distance", () => {
    const res = nearestSafeWells(wells, 23.8021, 90.6402, 5);
    expect(res.length).toBe(5);
    for (const w of res) expect(w.as).toBeLessThan(BD_STANDARD);
    expect(res[0].dist).toBeLessThanOrEqual(res[1].dist);
    expect(res[0].walkMin).toBeGreaterThanOrEqual(0);
  });
});

describe("color science / kit reader", () => {
  it("white normalizes to near-white", () => {
    const rgb = normalizeByWhite([244, 244, 244], [244, 244, 244]);
    expect(rgb.every((v) => v > 240 && v <= 255)).toBe(true);
  });
  it("reads the exact chart colors back to their ppb", () => {
    for (const c of CHART) {
      const res = readStrip(c.rgb, [247, 247, 247]);
      expect(res.ppb).toBe(c.ppb);
      expect(res.confidence).toBeGreaterThan(0.9);
    }
  });
  it("classifies a brown 200+ pad as unsafe and a pale pad as safe", () => {
    expect(readStrip([146, 84, 30], [247, 247, 247]).safe).toBe(false);
    expect(readStrip([250, 241, 158], [247, 247, 247]).safe).toBe(true);
  });
  it("lab distance is symmetric and zero at the same color", () => {
    const a = rgb2lab(200, 150, 50), b = rgb2lab(200, 150, 50), c = rgb2lab(10, 10, 10);
    expect(labDist(a, b)).toBe(0);
    expect(labDist(a, c)).toBeCloseTo(labDist(c, a), 6);
  });
});

describe("risk model", () => {
  it("probabilities are within (0,1)", () => {
    for (const [lat, lon, d] of [[23.79, 90.61, 80], [23.85, 90.7, 30], [23.77, 90.65, 200]]) {
      const p = riskProbability(MODEL, lat, lon, d, true);
      expect(p).toBeGreaterThan(0);
      expect(p).toBeLessThan(1);
    }
  });
  it("beats a coin flip on real held-out geometry: reported AUC is honest metadata", () => {
    expect(MODEL.auc_test).toBeGreaterThan(0.6);
    expect(MODEL.auc_test).toBeLessThan(0.75);
  });
  it("deep wells are safer than shallow in the real dataset (depth prior)", () => {
    const dp = KIT.stats.depth_prior;
    const shallow = dp.find((d) => d.lo === 50 && d.hi === 100);
    const deep = dp.find((d) => d.lo === 150 && d.hi === 250);
    expect(shallow.p50).toBeGreaterThan(60);
    expect(deep.p50).toBeLessThan(20);
  });
});

describe("active learning", () => {
  it("priority sites are ranked by gap and located inside the bbox", () => {
    const sites = prioritySites(wells, MODEL, { s: 23.79, n: 23.82, w: 90.61, e: 90.65 }, 0.02);
    expect(sites.length).toBeGreaterThan(0);
    for (let i = 1; i < sites.length; i++) expect(sites[i - 1].gap).toBeGreaterThanOrEqual(sites[i].gap);
    for (const s of sites) {
      expect(s.lat).toBeGreaterThanOrEqual(23.79);
      expect(s.lat).toBeLessThanOrEqual(23.82);
    }
  });
});

describe("signed check-in codes", () => {
  const SECRET = "jolsetu-demo-2026";
  it("round-trips a valid code", async () => {
    const code = await wellCode(SECRET, 12345);
    const v = await verifyWellCode(SECRET, code);
    expect(v.ok).toBe(true);
    expect(v.wellId).toBe(12345);
  });
  it("rejects a tampered code", async () => {
    const code = await wellCode(SECRET, 12345);
    const tampered = code.slice(0, -1) + (code.endsWith("0") ? "1" : "0");
    const v = await verifyWellCode(SECRET, tampered);
    expect(v.ok).toBe(false);
  });
  it("rejects a valid-format code signed with the wrong secret", async () => {
    const code = await wellCode("other-secret", 12345);
    const v = await verifyWellCode(SECRET, code);
    expect(v.ok).toBe(false);
  });
  it("rejects malformed codes", async () => {
    expect((await verifyWellCode(SECRET, "hello")).reason).toBe("format");
    expect((await verifyWellCode(SECRET, "")).reason).toBe("format");
  });
});

describe("geofence + verdicts", () => {
  it("30 m geofence verdicts", () => {
    expect(geofenceVerdict(10, 30).verdict).toBe("pass");
    expect(geofenceVerdict(50, 30).verdict).toBe("flagged");
    expect(geofenceVerdict(500, 30).verdict).toBe("rejected");
  });
  it("reading verdicts respect both standards", () => {
    expect(verdict(5).level).toBe("safe");
    expect(verdict(25).level).toBe("caution");
    expect(verdict(60).level).toBe("unsafe");
    expect(verdict(60).who).toBe(true);
    expect(verdict(5).who).toBe(false);
  });
});

describe("data integrity (real dataset)", () => {
  it("has the expected number of real wells", () => {
    expect(wells.length).toBeGreaterThan(6500);
    expect(wells.length).toBeLessThan(6700);
  });
  it("all wells are inside Araihazar's bounding box", () => {
    for (const w of wells) {
      expect(w.lat).toBeGreaterThan(23.5);
      expect(w.lat).toBeLessThan(24.0);
      expect(w.lon).toBeGreaterThan(90.4);
      expect(w.lon).toBeLessThan(90.9);
    }
  });
  it("arsenic values are physically plausible", () => {
    for (const w of wells) expect(w.as).toBeGreaterThanOrEqual(0.1);
    expect(Math.max(...wells.map((w) => w.as))).toBeLessThan(1000);
  });
  it("dataset contamination is in the published range for Araihazar (~50%)", () => {
    const pct = (wells.filter((w) => w.as >= BD_STANDARD).length / wells.length) * 100;
    expect(pct).toBeGreaterThan(40);
    expect(pct).toBeLessThan(65);
  });
  it("kit table: human reading sensitivity stays >=95% (matches paper claims)", () => {
    expect(KIT.perf_at50.sens).toBeGreaterThanOrEqual(95);
    expect(KIT.perf_at50.spec).toBeLessThan(75); // the over-condemnation problem
  });
});
