"""Moka kürk renkleri: yeşil kürk tüylerinin tonunu kaydırır (yüz, gaga, kontur, fincan aynı kalır).
Kullanım: python3 scripts/make-moka-fur.py  → assets/moka/fur/<ton>/moka_<poz>.webp
Odadaki mimikli Moka için de: assets/moka/mimik/<n>.webp → assets/moka/fur/<ton>/mimik_<n>.webp"""
import os, colorsys
import numpy as np
from PIL import Image

POSES = ['happy', 'wink', 'sipping', 'thumbs_up', 'love', 'home_seated']
# ton: (renk kaydırma derece, doygunluk çarpanı, parlaklık çarpanı)
# Hedef ton (derece) mutlak: her kaynak resmin yeşili biraz farklı, renk adı her yerde aynı görünsün.
TARGET = {'kahve': 30, 'gri': None, 'mavi': 190, 'mor': 262, 'pembe': 325, 'turuncu': 24, 'kirmizi': 4}
TONES = {'kahve': (-48, 1.0, 0.95), 'gri': (0, 0.12, 1.08), 'mavi': (135, 0.85, 1.05), 'mor': (205, 0.65, 1.08), 'pembe': (265, 0.6, 1.2), 'turuncu': (-62, 1.5, 1.18), 'kirmizi': (-80, 0.95, 1.0)}

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
import sys
ONLY_MIMIK = '--mimik' in sys.argv
# --seated: sadece oturan yüzlü Moka (scripts/make-moka-seated-face.py çıktısı) → fur/<ton>/seated_<n>.webp
ONLY_SEATED = '--seated' in sys.argv
SEATED = [(f'{root}/assets/moka/seated/{n}.webp', f'seated_{n}', 84) for n in range(1, 9)]
MIMIKS = [(f'{root}/assets/moka/mimik/{n}.webp', f'mimik_{n}', 82) for n in range(1, 9)]
JOBS = SEATED if ONLY_SEATED else MIMIKS if ONLY_MIMIK else [(f'{root}/assets/moka/moka_{p}.webp', f'moka_{p}', 90) for p in POSES] + MIMIKS + SEATED
for tone, (dh, sm, vm) in TONES.items():
    os.makedirs(f'{root}/assets/moka/fur/{tone}', exist_ok=True)
    for src, name, q in JOBS:
        im = Image.open(src).convert('RGBA')
        a = np.asarray(im).astype(float) / 255
        h, s, v = rgb2hsv(a[..., :3])
        fur = (h > 40) & (h < 140) & (s > 0.18) & (v < 0.88) & (a[..., 3] > 0.05)
        # kürkün kenarını yumuşat
        w = fur.astype(float)
        shift = dh
        if TARGET[tone] is not None:
            shift = TARGET[tone] - float(np.median(h[fur]))
        nh = np.where(fur, h + shift, h); ns = np.where(fur, np.clip(s * sm, 0, 1), s); nv = np.where(fur, np.clip(v * vm, 0, 1), v)
        rgb = hsv2rgb(nh, ns, nv)
        out = np.concatenate([rgb, a[..., 3:]], -1)
        Image.fromarray((out * 255).round().astype('uint8'), 'RGBA').save(f'{root}/assets/moka/fur/{tone}/{name}.webp', quality=q, method=4)
print('ok')
