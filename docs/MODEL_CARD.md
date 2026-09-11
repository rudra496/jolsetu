# MODEL_CARD.md — JolSetu demo risk model

- **Model**: logistic regression (scikit-learn 1.9, C=1.0), exported as plain coefficients to
  `site/js/model_data.js` and scored client-side.
- **Target**: P(well arsenic ≥ 50 µg/L) — the Bangladesh national standard.
- **Training data**: 5,274 real tubewell measurements, Araihazar upazila, Narayanganj, Bangladesh
  (HydroShare DOI 10.4211/hs.8e1373d87419447c945625af13f0a2ea). Surveys 1999–2003 era.
- **Features**: standardized latitude, longitude, lat², lon², lat·lon, depth (z-scored, ft),
  has-depth indicator. No other covariates.
- **Split**: random 80/20, seed 42. Test n=1,319.
- **Results**: AUC 0.672; accuracy 67.4% (majority baseline 53.1%).
- **Intended use**: demo/prioritization only — decide *where to test next*, never to declare a well
  safe without a chemical test. The app states this in-product.
- **Known limits**: single upazila; no geology/soil/season covariates; 20-year-old measurements;
  logistic capacity only. Production roadmap (in-app disclosure): gradient-boosted geospatial model
  à la Podgorski & Berg 2020, refreshed continuously by HMAC-verified crowd tests.
- **Kit-reader**: not an ML model — deterministic CIELAB nearest-neighbor against the standard
  Gutzeit chart with white-reference normalization. Human-baseline performance on the same data's
  943 kit-vs-lab rows: sens 99.3% / spec 63.0%.
