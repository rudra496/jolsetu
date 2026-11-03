# JolSetu Vision backend (Meta hackathon build, Oct 30 – Nov 3 2026)

FastAPI service. Run: `pip install -r requirements.txt && uvicorn vision_service:app --port 8010`
Key: reads `~/.config/muse/auth.json` (Meta Model API key, server-side only — never commit it).

Endpoints: `GET /health` · `POST /vision/read` (SAM 3.1 segment + CIELAB readout) ·
`POST /vision/advise` (Muse Spark Bangla guidance) ·
`POST /vision/transcribe` (Muse Voice Transcribe — verify at deploy time) ·
`POST /vision/sheet` (Muse Image safety sheet).

`core_pipeline_v0.py` = standalone end-to-end proof (SAM → mask decode → colorimetry → ppb).
`make_synthetic_kit.py` = synthetic Gutzeit-kit fixture generator with known ground truth.
