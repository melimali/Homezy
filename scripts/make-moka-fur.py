"""Moka kürk renkleri: yeşil kürk tüylerinin tonunu kaydırır (yüz, gaga, kontur, fincan aynı kalır).
Kullanım: python3 scripts/make-moka-fur.py  → assets/moka/fur/<ton>/moka_<poz>.png"""
import os, colorsys
import numpy as np
from PIL import Image

POSES = ['happy', 'wink', 'sipping', 'thumbs_up', 'love']
# ton: (renk kaydırma derece, doygunluk çarpanı, parlaklık çarpanı)
TONES = {'kahve': (-48, 0.95, 1.0), 'gri': (0, 0.12, 1.08), 'mavi': (135, 0.85, 1.05), 'mor': (205, 0.65, 1.08), 'pembe': (265, 0.6, 1.2), 'turuncu': (-62, 1.15, 1.1), 'kirmizi': (-80, 0.95, 1.0)}

def rgb2hsv(a):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mx, mn = a.max(-1), a.min(-1); d = mx - mn
    h = np.zeros_like(mx)
    m = d > 1e-6
    rc = (g - b) / np.where(m, d, 1) % 6; gc = (b - r) / np.where(m, d, 1) + 2; bc = (r - g) / np.where(m, d, 1) + 4
    h = np.where(mx == r, rc, np.where(mx == g, gc, bc)); h = np.where(m, h, 0) * 60
    s = np.where(mx > 0, d / np.where(mx > 0, mx, 1), 0)
    return h, s, mx

def hsv2rgb(h, s, v):
    h = (h % 360) / 60; i = np.floor(h).astype(int) % 6; f = h - np.floor(h)
    p, q, t = v * (1 - s), v * (1 - f * s), v * (1 - (1 - f) * s)
    cols = [(v, t, p), (q, v, p), (p, v, t), (p, q, v), (t, p, v), (v, p, q)]
    out = np.zeros(h.shape + (3,))
    for k in range(6):
        mk = i == k
        for c in range(3): out[..., c] = np.where(mk, cols[k][c], out[..., c])
    return out

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
for tone, (dh, sm, vm) in TONES.items():
    os.makedirs(f'{root}/assets/moka/fur/{tone}', exist_ok=True)
    for p in POSES:
        im = Image.open(f'{root}/assets/moka/moka_{p}.webp').convert('RGBA')
        a = np.asarray(im).astype(float) / 255
        h, s, v = rgb2hsv(a[..., :3])
        fur = (h > 40) & (h < 140) & (s > 0.18) & (v < 0.88) & (a[..., 3] > 0.05)
        # kürkün kenarını yumuşat
        w = fur.astype(float)
        nh = np.where(fur, h + dh, h); ns = np.where(fur, np.clip(s * sm, 0, 1), s); nv = np.where(fur, np.clip(v * vm, 0, 1), v)
        rgb = hsv2rgb(nh, ns, nv)
        out = np.concatenate([rgb, a[..., 3:]], -1)
        Image.fromarray((out * 255).round().astype('uint8'), 'RGBA').save(f'{root}/assets/moka/fur/{tone}/moka_{p}.webp', quality=90, method=3)
print('ok')
