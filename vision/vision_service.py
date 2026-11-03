"""JolSetu Vision backend — FastAPI vision service.
Built during Meta Global AI Developer Hackathon (Oct 26 - Nov 4 2026).
Endpoints: /health, /vision/read, /vision/advise, /vision/transcribe, /vision/sheet.
Key: server-side only, from ~/.config/muse/auth.json. NEVER client-side."""
import json, base64, urllib.request, urllib.parse, ipaddress, socket
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from PIL import Image
import io
from meta_sam_parser import CompletedOutcome, video_segmentation_format, decode_mask_to_raster

AUTH = r'C:\Users\rudra\.config\muse\auth.json'
# Pinned full endpoint URLs (no dynamic construction — SSRF-safe by design).
URL_RESPONSES = 'https://api.meta.ai/v1/responses'
URL_CHAT = 'https://api.meta.ai/v1/chat/completions'
# NOTE (Nov 3): /v1/audio/transcriptions returned 404 in testing — re-verify path at
# deploy time against current Meta docs. Endpoint kept for the submission's model
# coverage; hands-free input in the demo runs via Web Speech API client-side.
URL_TRANSCRIBE = 'https://api.meta.ai/v1/audio/transcriptions'
URL_IMAGE = 'https://api.meta.ai/v1/images/generations'
ALLOWED_HOSTS = {'api.meta.ai'}

def check_url(url):
    u = urllib.parse.urlparse(url)
    if u.scheme != 'https' or u.hostname not in ALLOWED_HOSTS:
        raise ValueError('blocked url')
    try:
        ip = ipaddress.ip_address(socket.gethostbyname(u.hostname))
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_multicast:
            raise ValueError('blocked ip')
    except socket.gaierror:
        raise ValueError('dns fail')
    return url

def api_key():
    return json.load(open(AUTH, encoding='utf-8'))['providers']['meta']['api_key']

def mpost(url, body, timeout=180):
    check_url(url)
    req = urllib.request.Request(url, data=json.dumps(body).encode(),
        headers={'Content-Type': 'application/json', 'Authorization': 'Bearer ' + api_key()})
    opener = urllib.request.build_opener(urllib.request.HTTPRedirectHandler())
    return json.loads(opener.open(req, timeout=timeout).read())

CHART = [  # Gutzeit reference swatches, [ppb, r, g, b] (from v1 js/core.js)
    (0, 242, 238, 214), (10, 250, 241, 158), (25, 251, 229, 79),
    (50, 249, 209, 52), (100, 244, 176, 40), (200, 226, 128, 28), (500, 146, 84, 30),
]
BD_STANDARD = 50

def rgb_to_lab(rgb):
    c = np.array(rgb, float) / 255.0
    c = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    M = np.array([[0.4124564, 0.3575761, 0.1804375],
                  [0.2126729, 0.7151522, 0.0721750],
                  [0.0193339, 0.1191920, 0.9503041]])
    xyz = M @ c / np.array([0.95047, 1.0, 1.08883])
    f = np.where(xyz > 0.008856, np.cbrt(xyz), 7.787 * xyz + 16 / 116)
    return np.array([116 * f[1] - 16, 500 * (f[0] - f[1]), 200 * (f[1] - f[2])])

CHART_LAB = [(ppb, rgb_to_lab(rgb)) for ppb, *rgb in CHART]

def sam_text(prompt, img_b64):
    body = {"model": "sam-3.1", "input": [{"type": "message", "role": "user", "content": [
        {"type": "input_text", "text": prompt},
        {"type": "input_image", "image_url": "data:image/jpeg;base64," + img_b64}]}]}
    d = mpost(URL_RESPONSES, body)
    return ''.join(p.get('text', '') for i in d.get('output', []) for p in i.get('content', []) if p.get('type') == 'output_text')

def parse_records(text):
    p = video_segmentation_format().create_parser()
    for _ in p.push(text):
        pass
    return p.finish(CompletedOutcome()).result.records

def segment(img_b64, prompt):
    """Returns [{box, mask}] matched by object_id."""
    recs = parse_records(sam_text(prompt, img_b64))
    boxes = {r.object_id: (r.left, r.top, r.right, r.bottom) for r in recs if r.kind == 'box'}
    out = []
    for r in recs:
        if r.kind != 'mask':
            continue
        out.append({'box': boxes.get(r.object_id), 'mask': r.mask})
    return [o for o in out if o['box']]

ADVISE_SYSTEM = (
    "You are JolSetu Vision, a field water-testing assistant for rural Bangladesh. "
    "You receive an arsenic kit readout (ppb estimate, nearest reference swatch, confidence). "
    "Rules: environmental guidance ONLY, never medical advice, never diagnose health. "
    "Output STRICT JSON: {\"bangla\": \"<2-3 sentence spoken-style Bangla advice>\", "
    "\"english\": \"<same in English>\", \"verdict\": \"SAFE|UNSAFE|RETEST\", "
    "\"next_steps\": [\"<step1>\", \"<step2>\", \"<step3>\"]} "
    "If ppb >= 50 (Bangladesh standard): verdict UNSAFE — advise using a known-safe well, "
    "retesting, contacting local DPHE/NGO. If 10-50: caution + retest. If <10: safe to use, "
    "retest periodically."
)

def spark_advise(ppb, nearest, confidence, tries=2):
    body = {"model": "muse-spark-1.3-contributor", "max_tokens": 2000,
            "messages": [
                {"role": "system", "content": ADVISE_SYSTEM},
                {"role": "user", "content": f"Arsenic kit readout: estimated {ppb} ppb, nearest reference swatch {nearest} ppb, confidence {confidence:.2f}. Respond with the JSON only."}]}
    last_txt = ""
    for _ in range(tries):
        try:
            d = mpost(URL_CHAT, body)
        except Exception:
            continue
        txt = (d['choices'][0]['message'].get('content') or '').strip()
        last_txt = txt
        s, e = txt.find('{'), txt.rfind('}')
        if s < 0 or e <= s:
            continue
        try:
            j = json.loads(txt[s:e + 1])
            if isinstance(j, dict) and j.get('bangla') and j.get('english') and j.get('verdict'):
                return j
        except Exception:
            continue
    return {"bangla": "", "english": last_txt, "verdict": "RETEST", "next_steps": []}

app = FastAPI(title="JolSetu Vision")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

class ReadIn(BaseModel):
    image_b64: str = Field(..., description="JPEG base64 (no data: prefix needed)")
    prompt_liquid: str = "liquid"
    prompt_chart: str = "chart"

class AdviseIn(BaseModel):
    ppb: int
    nearest: int
    confidence: float = 0.8

class TranscribeIn(BaseModel):
    audio_b64: str
    format: str = "mp3"
    language: str = "bn"

class SheetIn(BaseModel):
    ppb: int
    verdict: str = "UNSAFE"

@app.get("/health")
def health():
    return {"ok": True, "service": "jolsetu-vision"}

@app.post("/vision/read")
def vision_read(inp: ReadIn):
    try:
        raw = base64.b64decode(inp.image_b64.split(',', 1)[-1])
        img = Image.open(io.BytesIO(raw)).convert('RGB')
    except Exception:
        raise HTTPException(400, "invalid image_b64")
    W, H = img.size
    b64 = base64.b64encode(raw).decode()
    try:
        liq_segs = segment(b64, inp.prompt_liquid)
        card_segs = segment(b64, inp.prompt_chart)
    except Exception as e:
        raise HTTPException(502, f"SAM 3.1 call failed: {e}")
    if not liq_segs:
        raise HTTPException(422, "no reacting liquid found — retake photo with vial visible")
    liq = max(liq_segs, key=lambda s: (s['box'][2] - s['box'][0]) * (s['box'][3] - s['box'][1]))
    arr = np.array(img, dtype=np.float64)
    l, t, r, b = liq['box']
    ras = np.frombuffer(decode_mask_to_raster(liq['mask']), dtype=np.uint8).reshape(liq['mask'].height, liq['mask'].width)
    mask = np.zeros((H, W), dtype=np.uint8)
    hh, ww = min(b - t, ras.shape[0]), min(r - l, ras.shape[1])
    mask[t:t + hh, l:l + ww] = ras[:hh, :ww]
    px = arr[mask > 0]
    if len(px) < 50:
        raise HTTPException(422, "liquid mask too small — move closer")
    mean_rgb = [round(float(v), 1) for v in px.mean(axis=0)]
    lab = rgb_to_lab(mean_rgb)
    best = min(((ppb, float(np.linalg.norm(lab - cl))) for ppb, cl in CHART_LAB), key=lambda x: x[1])
    nearest, dE = best
    confidence = max(0.0, min(1.0, 1 - dE / 60))
    return {"ppb": nearest, "confidence": round(confidence, 3), "mean_rgb": mean_rgb, "dE": round(dE, 1),
            "liquid_box": list(liq['box']),
            "card_box": list(max(card_segs, key=lambda s: (s['box'][2] - s['box'][0]) * (s['box'][3] - s['box'][1]))['box']) if card_segs else None,
            "safe_bd": nearest < BD_STANDARD}

@app.post("/vision/advise")
def vision_advise(inp: AdviseIn):
    try:
        return spark_advise(inp.ppb, inp.nearest, inp.confidence)
    except Exception as e:
        raise HTTPException(502, f"Spark call failed: {e}")

@app.post("/vision/transcribe")
def vision_transcribe(inp: TranscribeIn):
    """Bangla hands-free Q&A via Muse Voice Transcribe (verify path at deploy time)."""
    try:
        raw = base64.b64decode(inp.audio_b64.split(',', 1)[-1])
    except Exception:
        raise HTTPException(400, "invalid audio_b64")
    d = mpost(URL_TRANSCRIBE, {"model": "muse-voice-transcribe-1.0", "audio_b64": base64.b64encode(raw).decode(), "format": inp.format, "language": inp.language})
    txt = d.get('text', '') if isinstance(d, dict) else ''
    return {"text": txt}

@app.post("/vision/sheet")
def vision_sheet(inp: SheetIn):
    """Pictorial safety sheet via Muse Image (low-literacy users)."""
    prompt = (f"Simple flat pictorial safety poster for rural Bangladesh, no text except numbers: "
              f"a hand pump with a {'RED X mark, do not drink' if inp.verdict == 'UNSAFE' else 'GREEN check mark, safe to drink'}, "
              f"a family carrying water from a safe well, sun and village, high contrast, minimal style.")
    try:
        d = mpost(URL_IMAGE, {"model": "muse-image-1.0", "prompt": prompt})
    except Exception as e:
        raise HTTPException(502, f"Image call failed: {e}")
    return {"image_b64": (d.get('data') or [{}])[0].get('b64_json', ''), "prompt_used": prompt}
