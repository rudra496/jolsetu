"""JolSetu Vision — core pipeline v0 END-TO-END proof (hackathon new work).
kit image -> SAM 3.1 ('liquid' + 'chart') -> official meta-sam-parser decode
-> mean RGB inside liquid mask -> Lab -> Delta-E vs reference swatches -> ppb estimate.
Standalone script; the deployed path is vision_service.py. API key server-side only."""
import json, base64, urllib.request, urllib.parse, sys
import numpy as np
from PIL import Image
from meta_sam_parser import (CompletedOutcome, video_segmentation_format,
                             decode_mask_to_raster)

AUTH = r'C:\Users\rudra\.config\muse\auth.json'
URL_RESPONSES = 'https://api.meta.ai/v1/responses'
ALLOWED_HOSTS = {'api.meta.ai'}

def safe_post(url, body, timeout=180):
    u = urllib.parse.urlparse(url)
    assert u.scheme == 'https' and u.hostname in ALLOWED_HOSTS, 'blocked url: ' + url
    key = json.load(open(AUTH))['providers']['meta']['api_key']
    req = urllib.request.Request(url, data=json.dumps(body).encode(),
        headers={'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key})
    return urllib.request.urlopen(req, timeout=timeout)

# Fixture truth values from make_synthetic_kit.py (synthetic-test only; the deployed
# chart lives in vision_service.py CHART, ported from v1 js/core.js).
SWATCHES = {
    '0 ppb': (246, 244, 238), '10 ppb': (250, 236, 170), '25 ppb': (247, 219, 108),
    '50 ppb': (240, 196, 76), '100 ppb': (222, 168, 52),
}

def sam(prompt, img_path):
    b64 = base64.b64encode(open(img_path, 'rb').read()).decode()
    body = {"model": "sam-3.1", "input": [{"type": "message", "role": "user", "content": [
        {"type": "input_text", "text": prompt},
        {"type": "input_image", "image_url": "data:image/jpeg;base64," + b64}]}]}
    d = json.loads(safe_post(URL_RESPONSES, body).read())
    return ''.join(p.get('text', '') for i in d['output'] for p in i['content'] if p.get('type') == 'output_text')

def parse_records(text):
    parser = video_segmentation_format().create_parser()
    for _ in parser.push(text):
        pass
    return parser.finish(CompletedOutcome()).result.records

def segment(img_path, prompt):
    """Returns list of dicts {box:(l,t,r,b), raster(H,W)}."""
    recs = parse_records(sam(prompt, img_path))
    boxes = {r.object_id: (r.left, r.top, r.right, r.bottom)
             for r in recs if r.kind == 'box'}
    out = []
    for r in recs:
        if r.kind != 'mask':
            continue
        l, t, rr, b = boxes.get(r.object_id, (0, 0, 0, 0))
        out.append({'box': (l, t, rr, b), 'raster': np.frombuffer(decode_mask_to_raster(r.mask), dtype=np.uint8).reshape(r.mask.height, r.mask.width)})
    return out

def rgb_to_lab(rgb):
    c = np.array(rgb, dtype=np.float64) / 255.0
    c = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    M = np.array([[0.4124564, 0.3575761, 0.1804375],
                  [0.2126729, 0.7151522, 0.0721750],
                  [0.0193339, 0.1191920, 0.9503041]])
    xyz = M @ c / np.array([0.95047, 1.0, 1.08883])
    f = np.where(xyz > 0.008856, np.cbrt(xyz), 7.787 * xyz + 16 / 116)
    return np.array([116 * f[1] - 16, 500 * (f[0] - f[1]), 200 * (f[1] - f[2])])

def main(img_path):
    image = Image.open(img_path).convert('RGB')
    W, H = image.size
    print(f'image {W}x{H}')

    liquid = segment(img_path, 'liquid')
    card = segment(img_path, 'chart')
    liq = max(liquid, key=lambda s: (s['box'][2] - s['box'][0]) * (s['box'][3] - s['box'][1]))
    cd = max(card, key=lambda s: (s['box'][2] - s['box'][0]) * (s['box'][3] - s['box'][1]))
    print('vial liquid box:', liq['box'], '| ref card box:', cd['box'])

    arr = np.array(image, dtype=np.float64)
    l, t, r, b = liq['box']
    mask = np.zeros((H, W), dtype=np.uint8)
    mask[t:b, l:r] = liq['raster'][:b - t, :r - l]
    px = arr[mask > 0]
    mean_rgb = px.mean(axis=0)
    print(f'liquid mask pixels: {px.shape[0]}, mean RGB: {mean_rgb.round(1)} (truth ~(243,224,122))')

    lab = rgb_to_lab(mean_rgb)
    best = None
    for label, rgb in SWATCHES.items():
        dE = float(np.linalg.norm(lab - rgb_to_lab(rgb)))  # Delta-E76 v0
        print(f'  dE76 vs {label:8} = {dE:.1f}')
        if best is None or dE < best[1]:
            best = (label, dE)
    print(f'RESULT: nearest swatch = {best[0]} (dE76 {best[1]:.1f}) | truth zone 25-50 ppb')

if __name__ == '__main__':
    import os
    arg = sys.argv[1] if len(sys.argv) > 1 else 'kit_test_1.jpg'
    # path-traversal guard: fixture scripts only read files inside the cwd
    p = os.path.realpath(os.path.join(os.getcwd(), arg))
    assert os.path.dirname(p) == os.getcwd() and p.lower().endswith(('.jpg', '.jpeg', '.png')), 'refusing path: ' + arg
    main(p)
