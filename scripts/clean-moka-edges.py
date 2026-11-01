"""Moka PNG'lerindeki beyaz/gri kenar halesini temizler (yerinde).
Kullanım: python3 scripts/clean-moka-edges.py [assets/moka]  (sonra: python3 scripts/make-scenes.py build)
Dış kenardaki açık, doygunluğu düşük pikselleri en fazla 6 tur soyar; koyu kontura gelince durur."""
import sys, glob, os
import numpy as np
from PIL import Image
from scipy import ndimage as nd

d = sys.argv[1] if len(sys.argv) > 1 else 'assets/moka'
for p in sorted(glob.glob(os.path.join(d, '*.png'))):
    a = np.array(Image.open(p).convert('RGBA')).astype(np.int16)
    al = a[..., 3] > 40
    rgb = a[..., :3]
    mx, mn = rgb.max(2), rgb.min(2)
    light = (mx > 140) & ((mx - mn) < 60)
    for _ in range(6):
        edge = al & ~nd.binary_erosion(al, border_value=0)
        kill = edge & light
        if not kill.any():
            break
        al &= ~kill
    lab, n = nd.label(al)
    if n > 1:
        sz = nd.sum(al, lab, range(1, n + 1))
        keep = np.isin(lab, [i + 1 for i, s in enumerate(sz) if s > 60])
        al &= keep
    # yumuşak kenar: 1 px erozyon + hafif bulanık alfa
    soft = nd.gaussian_filter(nd.binary_erosion(al, iterations=1).astype(float), 0.7)
    a[..., 3] = (soft * 255).astype(np.int16)
    a[..., :3][a[..., 3] == 0] = 0
    out = Image.fromarray(a.astype(np.uint8), 'RGBA').quantize(256, method=Image.FASTOCTREE, dither=Image.NONE)
    out.save(p, optimize=True)
    print(os.path.basename(p))
