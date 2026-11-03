"""Generate a synthetic Gutzeit-kit test image with known ground truth.
Vial with arsenic-reacted yellow liquid + white reference card with swatches.
Hackathon fixture generator (Oct 30 2026) — used until real kit photos arrive."""
from PIL import Image, ImageDraw
import random, sys

random.seed(42)
W, H = 1280, 960
img = Image.new('RGB', (W, H), (86, 74, 62))  # dark wooden table
d = ImageDraw.Draw(img)
# table grain
for _ in range(240):
    x, y = random.randint(0, W), random.randint(0, H)
    d.line([(x, y), (x + random.randint(-40, 40), y)], fill=(76 + random.randint(-8, 8), 64, 52), width=1)
# lighting gradient (brighter top-left)
grad = Image.new('L', (W, H), 0)
gd = ImageDraw.Draw(grad)
for i in range(60):
    gd.ellipse([200 - i * 20, 120 - i * 15, 200 + i * 22, 120 + i * 18], fill=max(0, 26 - i // 2))
img = Image.composite(Image.new('RGB', (W, H), (150, 140, 125)), img, grad)
d = ImageDraw.Draw(img)

# reference color card (white card, 5 swatches: 0 / 10 / 25 / 50 / 100 ppb equivalents)
cx, cy, cw, ch = 690, 330, 420, 260
d.rectangle([cx - 8, cy - 8, cx + cw + 8, cy + ch + 8], fill=(238, 236, 230))
d.text((cx + 10, cy + 8), "ARSENIC  0   10   25   50   100 ppb", fill=(30, 30, 30))
sw_colors = [(246, 244, 238), (250, 236, 170), (247, 219, 108), (240, 196, 76), (222, 168, 52)]
sw_w = (cw - 20) // 5
for i, c in enumerate(sw_colors):
    d.rectangle([cx + 10 + i * sw_w, cy + 40, cx + 10 + (i + 1) * sw_w - 6, cy + ch - 20], fill=c)

# glass vial with reacting liquid (yellow = positive reaction), held region center-left
vx, vy, vw, vh = 320, 300, 150, 400
d.rectangle([vx - 14, vy - 30, vx + vw + 14, vy + vh + 20], fill=(60, 60, 66))  # holder shadow
d.rectangle([vx, vy, vx + vw, vy + vh], fill=(206, 208, 214))                   # glass body
d.rectangle([vx + 8, vy + 8, vx + vw - 8, vy + vh - 10], fill=(232, 236, 240))  # glass inner
# liquid column (target: pale yellow, matches ~25-50 ppb)
d.rectangle([vx + 10, vy + 120, vx + vw - 10, vy + vh - 12], fill=(243, 224, 122))
# meniscus
d.ellipse([vx + 10, vy + 108, vx + vw - 10, vy + 132], fill=(247, 232, 150))
# glass highlight
d.rectangle([vx + 18, vy + 14, vx + 26, vy + vh - 16], fill=(248, 250, 252))

img.save(sys.argv[1] if len(sys.argv) > 1 else 'kit_test_1.jpg', quality=88)
print('saved synthetic kit image:', sys.argv[1] if len(sys.argv) > 1 else 'kit_test_1.jpg')
print('GROUND TRUTH: vial liquid rgb ~(243,224,122); card swatches', sw_colors)
