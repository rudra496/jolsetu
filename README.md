# JolSetu — জলসেতু

**The people's bridge to safe tubewell water.**
AI reads a $1 arsenic test kit by photo, QR-stamps every tubewell into a tamper-proof live map,
learns where to test next, and walks every family to the nearest verified safe well — offline, in
Bangla, with voice.

> Xylem Global Student Innovation Challenge 2026 · **Water Quality** problem statement · University track prototype

## Why

- **20 million** Bangladeshis drink water above the national arsenic standard (50 µg/L); **45 million**
  above the WHO guideline (10 µg/L) — Flanagan et al., *Bull WHO* 2012 (2009 national survey).
- **24,000+** adult deaths every year are attributed to arsenic (>50 µg/L), plus up to 19,000 more from
  10–50 µg/L; US$13B productivity loss over 20 years — same source.
- *"The largest poisoning of a population in history."* — Smith et al., *Bull WHO* 2000.
- 10M+ tubewells were tested in national campaigns (BAMWSP 2000–2005, ARRMP 2021–23), but testing is
  **once-in-decades**, readings are **human color-chart guesses**, and families have **no way to find
  the nearest verified safe well** when their well fails.

## What it does (4 pillars)

1. **Test Kit AI** — photograph the Gutzeit reaction pad next to the white strip; on-device color
   science (white-reference normalization + CIELAB matching) reads the chart and speaks the verdict
   in Bangla. Validated approach: mobile-phone photometry of field kits (Haque et al., *Sci Total
   Environ* 2018). On 943 real kit-vs-lab comparisons in this repo's dataset, human reading caught
   99.3% of unsafe wells but wrongly condemned 37% of safe ones — standardized AI reading attacks
   exactly that.
2. **QR-stamped live map** — every check-in is HMAC-signed, GPS-geofenced (30 m pass / flag / reject
   at 2× radius), duplicate-checked per day, and reviewable — so the public map can be trusted.
3. **Predict & prioritize (active learning)** — a logistic risk model trained on real wells
   (AUC 0.67 on held-out data, disclosed) flags where model and map disagree; the crowd tests there
   next. Every verified test updates the picture.
4. **Safe-well routing** — distance, compass direction and walking time to the nearest verified safe
   wells; works offline (service worker + cached tiles), in Bangla, with text-to-speech.

## Built on real data

All 6,593 wells in this prototype are **real measurements** from the Araihazar upazila survey
(Narayanganj, Bangladesh): CUAHSI HydroShare, DOI `10.4211/hs.8e1373d87419447c945625af13f0a2ea`.
52.9% exceed the national standard — and the depth gradient is the life-saving lesson:
**76.2% of 50–100 ft wells are unsafe vs 10.6% below 150 ft** (the app teaches this before a family
drills a new well).

## Run

```bash
npm install && npm test     # 23 unit tests
python -m http.server 8123 --directory site   # or: npm run serve
# open http://localhost:8123  (HTTPS not required locally; needed for camera/GPS on phones)
```

Live demo: **https://rudra496.github.io/jolsetu/**

## Honest limitations

- Demo risk model is logistic on one upazila; production target is a gradient-boosted national model
  (Podgorski & Berg, *Science* 2020 approach) refreshed by verified crowd tests.
- Demo pad colors approximate the standard chart; production needs per-batch scanned calibration.
- Ledger is local (localStorage) for the demo; production uses a server with officer review.

## Evidence

See `docs/EVIDENCE.md` (claim → source map, every DOI verified live) and `docs/MODEL_CARD.md`.
