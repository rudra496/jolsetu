# EVIDENCE.md — claim → source map

Every DOI below was verified live (Crossref HTTP 200 + title match) or via PubMed E-utilities on
2026-09-11. Cached proof: `E:\zcode-data\state\citations_cache.json`.

| # | Claim used in materials | Source | Identifier | Verified |
|---|---|---|---|---|
| 1 | 20M exposed >50 µg/L; 45M >10 µg/L (2009 national survey) | Flanagan SV, Johnston RB, Zheng Y. *Bull World Health Organ* 2012;90(11):839–46 | DOI 10.2471/BLT.11.101253 · PMID 23226896 | ✅ abstract fetched, figures verbatim |
| 2 | 24,000 annual adult deaths (>50 µg/L) + up to 19,000 (10–50 µg/L); US$13B/20yr; US$11 per capita mitigation | Same as #1 | Same | ✅ |
| 3 | "largest poisoning of a population in history" | Smith AH, Lingas EO, Rahman M. *Bull WHO* 2000;78(9):1093–103 | PMID 11019458 | ✅ abstract verbatim |
| 4 | Phone-camera photometry of field kits quantifies arsenic (Bangladesh field settings) | Haque et al. *Sci Total Environ* 2018 | DOI 10.1016/j.scitotenv.2016.12.123 | ✅ Crossref |
| 5 | Field-kit accuracy limits → need standardized reading | Reddy et al. *Water Research* 2020 | DOI 10.1016/j.watres.2019.115325 | ✅ Crossref |
| 6 | Global arsenic hazard ~94M+ >10 µg/L; geospatial ML precedent | Podgorski J, Berg M. *Science* 2020;368:845–50 | DOI 10.1126/science.aba1510 | ✅ Crossref |
| 7 | Well labeling/switching effective over 18 years in Araihazar | Jamil NB, … van Geen A. *Environ Sci Technol* 2019;53:5596–604 | DOI 10.1021/acs.est.9b01375 | ✅ Crossref |
| 8 | 6,593 real wells (this app's dataset) + 943 kit-vs-lab rows | Groundwater arsenic measurements from Araihazar, Bangladesh. CUAHSI HydroShare 2021 | DOI 10.4211/hs.8e1373d87419447c945625af13f0a2ea | ✅ files downloaded 2026-09-11 |
| 9 | 10M+ wells tested via BAMWSP 2000–2005 + ARRMP 2021–23 (iArsenic article); iArsenic scope (3-input static screen, 84%, web-only) | Univ. of Portsmouth news | port.ac.uk URL (cached in citations cache) | ✅ fetched 2026-09-11 |
| 10 | Nolkup app + DPHE rollout interest | Khan M. *ACS ES&T Water* 2025 + AEA RCT registry | DOI 10.1021/acs.est.5c06441 · 10.1257/rct.15469 | ✅ Crossref |
| 11 | 2026 challenge rules/dates/judging | Xylem GSIC 2026 official landing (bit.ly/xylemchallenge) | xyleminnovationchallenge.bemyapp.com | ✅ fetched 2026-09-11 |
| 12 | 2024 winners (AR tool + gamified learning); 4,400 students/150 countries | Xylem press release | xylem.com URL | ✅ fetched 2026-09-11 |
| 13 | 2025: three Bangladeshi teams won $500 category awards (FloodSense AI, Flood Link, ResQMap) | The Daily Star | thedailystar.net/…-3949001 | ✅ fetched 2026-09-11 |

## Dataset-derived numbers (computed in this repo, reproducible via `build/prepare_data.py`)

- 6,593 valid wells; **52.9% ≥50 µg/L**; **74.2% ≥10 µg/L**.
- Unsafe share by depth: 0–50 ft **48.6%** · 50–100 ft **76.2%** · 100–150 ft **25.3%** · 150–250 ft **10.6%**.
- Human kit reading vs lab (n=943, threshold 50 µg/L): **sensitivity 99.3%, specificity 63.0%, accuracy 80.3%**
  (at 25 µg/L: 100% / 41.7% / 69.5%) — the over-condemnation problem the AI reader targets.
- Demo risk model: logistic on [lat, lon, lat², lon², lat·lon, depth, has-depth], 80/20 split (seed 42):
  **AUC 0.672, accuracy 67.4% vs 53.1% majority baseline** on 1,319 held-out real wells.
