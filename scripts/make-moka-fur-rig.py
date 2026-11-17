"""Katmanlı Moka kürk tonları. assets/moka/rig/<katman>.webp -> assets/moka/rig/fur/<ton>/<katman>.webp
Kullanım: python3 scripts/make-moka-fur-rig.py
Maske yumuşaktır (ton, doygunluk, parlaklık eşikleri kademeli): karın kreminin gölgesine, kontura ve ayağa renk taşmaz.
Yalnız zeytin tüy boyanır; ton farkı korunur (tüy gölgeleri bozulmaz)."""
import os
import numpy as np
from PIL import Image

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
R = f'{root}/assets/moka/rig'
LAYERS = ['govde', 'kuyruk', 'bas', 'kanat_a', 'kanat_b']
# ton: (hedef renk tonu °, doygunluk çarpanı, parlaklık çarpanı, ton farkını koruma 0..1)
TONES = {
    'kahve': (27, 1.05, 0.9, 0.6),
    'gri': (None, 0.13, 1.12, 1.0),
    'mavi': (207, 0.78, 1.12, 0.45),
    'mor': (268, 0.6, 1.14, 0.45),
    'pembe': (338, 0.5, 1.3, 0.45),
    'turuncu': (23, 1.45, 1.2, 0.6),
    'kirmizi': (356, 0.9, 1.0, 0.45),
}
def ramp(x, a, b):  # a'dan b'ye 0->1 (b<a ise ters)
    return np.clip((x - a) / (b - a), 0, 1)
def rgb2hsv(c):
    r, g, b = c[..., 0], c[..., 1], c[..., 2]
    mx, mn = c.max(-1), c.min(-1); d = mx - mn; nz = d > 1e-6; ds = np.where(nz, d, 1)
    h = np.where(mx == r, ((g - b) / ds) % 6, np.where(mx == g, (b - r) / ds + 2, (r - g) / ds + 4)) * 60
    return np.where(nz, h, 0), np.where(mx > 0, d / np.where(mx > 0, mx, 1), 0), mx
def hsv2rgb(h, s, v):
    h = (h % 360) / 60; i = np.floor(h).astype(int) % 6; f = h - np.floor(h)
    p, q, t = v * (1 - s), v * (1 - f * s), v * (1 - (1 - f) * s)
    cols = [(v, t, p), (q, v, p), (p, v, t), (p, q, v), (t, p, v), (v, p, q)]
    o = np.zeros(h.shape + (3,))
    for k in range(6):
        for c in range(3): o[..., c] = np.where(i == k, cols[k][c], o[..., c])
    return o
def fur_weight(h, s, v, a):
    w = ramp(h, 41, 48) * ramp(v, 0.88, 0.80) * ramp(s, 0.14, 0.26) * ramp(h, 150, 120)
    return w * a
imgs = {k: np.asarray(Image.open(f'{R}/{k}.webp').convert('RGBA')).astype(float) / 255 for k in LAYERS}
# Referans tüy tonu (medyan)
hs = []
for a in imgs.values():
    h, s, v = rgb2hsv(a[..., :3]); w = fur_weight(h, s, v, a[..., 3]); hs.append(h[w > 0.9])
med = float(np.median(np.concatenate(hs)))
print('tüy tonu', round(med, 1))
for tone, (tgt, sm, vm, keep) in TONES.items():
    os.makedirs(f'{R}/fur/{tone}', exist_ok=True)
    for k, a in imgs.items():
        h, s, v = rgb2hsv(a[..., :3]); w = fur_weight(h, s, v, a[..., 3])[..., None]
        nh = h if tgt is None else tgt + (h - med) * keep
        rgb = hsv2rgb(nh, np.clip(s * sm, 0, 1), np.clip(v * vm, 0, 1))
        out = a[..., :3] * (1 - w) + rgb * w
        Image.fromarray((np.concatenate([out, a[..., 3:]], -1) * 255).round().astype('uint8'), 'RGBA').save(f'{R}/fur/{tone}/{k}.webp', quality=88, method=6)
    print(tone)
