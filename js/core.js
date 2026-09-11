// JolSetu core logic — pure functions, no DOM. Unit-tested in /tests.
// Model + well data are trained/derived from real Araihazar measurements
// (HydroShare DOI 10.4211/hs.8e1373d87419447c945625af13f0a2ea).

export const BD_STANDARD = 50;  // Bangladesh national arsenic standard, ug/L
export const WHO_GUIDELINE = 10; // WHO guideline value, ug/L

// Great-circle distance in metres (haversine).
export function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000, toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Initial bearing in degrees 0..360 from point 1 to point 2.
export function bearing(lat1, lon1, lat2, lon2) {
  const toRad = (d) => (d * Math.PI) / 180, toDeg = (r) => (r * 180) / Math.PI;
  const dLon = toRad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

// K nearest safe wells (As < standard) to a point, with distance + walk time (5 km/h).
export function nearestSafeWells(wells, lat, lon, k = 3, standard = BD_STANDARD) {
  return wells
    .filter((w) => w.as < standard)
    .map((w) => ({ ...w, dist: haversine(lat, lon, w.lat, w.lon) }))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, k)
    .map((w) => ({ ...w, walkMin: Math.round((w.dist / 83.33) / 60) })); // 5 km/h
}

// sRGB -> CIELAB (D65). Inputs 0..255, outputs L*a*b*.
export function rgb2lab(r, g, b) {
  const f = (c) => {
    c /= 255;
    return c > 0.04045 ? Math.pow((c + 0.055) / 1.055, 2.4) : c / 12.92;
  };
  const [R, G, B] = [f(r), f(g), f(b)].map((v) => v * 100);
  const X = R * 0.4124 + G * 0.3576 + B * 0.1805;
  const Y = R * 0.2126 + G * 0.7152 + B * 0.0722;
  const Z = R * 0.0193 + G * 0.1192 + B * 0.9505;
  const g2 = (t) => (t > 0.008856 ? Math.cbrt(t) : (7.787 * t) + 16 / 116);
  const fx = g2(X / 95.047), fy = g2(Y / 100), fz = g2(Z / 108.883);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

export function labDist(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

// Gutzeit color-chart reference colors (0..500 ppb), [r,g,b] sampled from the
// standard kit chart palette. Production: per-batch scanned calibration.
export const CHART = [
  { ppb: 0, rgb: [242, 238, 214] },
  { ppb: 10, rgb: [250, 241, 158] },
  { ppb: 25, rgb: [251, 229, 79] },
  { ppb: 50, rgb: [249, 209, 52] },
  { ppb: 100, rgb: [244, 176, 40] },
  { ppb: 200, rgb: [226, 128, 28] },
  { ppb: 500, rgb: [146, 84, 30] },
];

// Normalize a sampled RGB by a white reference patch (auto white balance).
export function normalizeByWhite(rgb, white) {
  return rgb.map((v, i) => Math.min(255, Math.round((v / Math.max(1, white[i])) * 247)));
}

// Read a pad color against the chart. Returns ppb estimate, nearest chart
// entry, confidence 0..1 (1 = exact chart color).
export function readStrip(padRGB, whiteRGB = [247, 247, 247]) {
  const rgb = whiteRGB ? normalizeByWhite(padRGB, whiteRGB) : padRGB;
  const lab = rgb2lab(...rgb);
  let best = null;
  for (const c of CHART) {
    const d = labDist(lab, rgb2lab(...c.rgb));
    if (!best || d < best.d) best = { ...c, d };
  }
  const confidence = Math.max(0, 1 - best.d / 60);
  return { ppb: best.ppb, rgb, nearest: best, confidence, safe: best.ppb < BD_STANDARD };
}

// Logistic risk model (trained in build/prepare_data.py on real wells).
export function riskProbability(MODEL, lat, lon, depthFt, hasDepth = true) {
  const [b0, ...b] = MODEL.coef;
  const sd = MODEL.sd, mu = MODEL.mu;
  const x = (lat - mu.lat) / sd.lat;
  const y = (lon - mu.lon) / sd.lon;
  const d = hasDepth && depthFt != null ? (depthFt - mu.dep) / mu.dep_sd : 0;
  const hd = hasDepth && depthFt != null ? 1 : 0;
  const z = b0 + b[0] * x + b[1] * y + b[2] * x * x + b[3] * y * y + b[4] * x * y + b[5] * d + b[6] * hd;
  return 1 / (1 + Math.exp(-z));
}

// Inverse-distance-weighted observed contamination rate around a point.
export function idwRate(wells, lat, lon, radiusM = 1500, power = 2) {
  let wSum = 0, vSum = 0;
  for (const w of wells) {
    const d = haversine(lat, lon, w.lat, w.lon);
    if (d > radiusM) continue;
    const wt = 1 / Math.max(50, d) ** power;
    wSum += wt;
    vSum += wt * (w.as >= BD_STANDARD ? 1 : 0);
  }
  return wSum > 0 ? vSum / wSum : null;
}

// Active-learning priority queue: rank candidate sites by model-vs-observation
// disagreement (information gain proxy), so the crowd tests where it matters.
export function prioritySites(wells, MODEL, bbox, step = 0.01) {
  const sites = [];
  for (let lat = bbox.s; lat <= bbox.n; lat += step) {
    for (let lon = bbox.w; lon <= bbox.e; lon += step) {
      const near = wells.filter((w) => Math.abs(w.lat - lat) < 0.02 && Math.abs(w.lon - lon) < 0.02);
      if (near.length < 3) continue; // need local evidence to compare
      const pModel = riskProbability(MODEL, lat, lon, 80, true);
      const pObs = idwRate(wells, lat, lon);
      if (pObs == null) continue;
      sites.push({
        lat, lon,
        gap: Math.abs(pModel - pObs),
        localN: near.length,
      });
    }
  }
  return sites.sort((a, b) => b.gap - a.gap).slice(0, 8);
}

// Signed well check-in code (WebCrypto HMAC-SHA256, hex, first 10 chars).
export async function wellCode(secret, wellId) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode("JOL:" + wellId));
  const hex = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `JOL-${wellId}-${hex.slice(0, 10)}`;
}

export async function verifyWellCode(secret, code) {
  const m = /^JOL-(\d+)-([0-9a-f]{10})$/.exec(code || "");
  if (!m) return { ok: false, reason: "format" };
  const expect = await wellCode(secret, m[1]);
  return expect === code ? { ok: true, wellId: Number(m[1]) } : { ok: false, reason: "signature" };
}

// Geofence verdict for a check-in attempt.
export function geofenceVerdict(distM, radiusM) {
  if (distM <= radiusM) return { verdict: "pass", flag: "" };
  if (distM <= radiusM * 2) return { verdict: "flagged", flag: "outside-radius" };
  return { verdict: "rejected", flag: "far-outside-radius" };
}

// Verdict + messages for a ppb reading under both standards.
export function verdict(ppb) {
  if (ppb >= BD_STANDARD) return { level: "unsafe", standard: BD_STANDARD, who: ppb >= WHO_GUIDELINE };
  if (ppb >= WHO_GUIDELINE) return { level: "caution", standard: BD_STANDARD, who: true };
  return { level: "safe", standard: BD_STANDARD, who: false };
}
