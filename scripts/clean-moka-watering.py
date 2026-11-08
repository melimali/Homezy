"""moka_watering: bitki çevresindeki/yaprak aralarındaki açık mavi/beyaz artıkları siler (assets-src PNG yerinde),
WebP üretir. Sonra sahneyi yenile: python3 scripts/make-scenes.py build"""
import numpy as np
from PIL import Image
from scipy import ndimage as nd
src = 'assets-src/moka/moka_watering.png'
a = np.array(Image.open(src).convert('RGBA')).astype(int)
r, g, b, al = a[..., 0], a[..., 1], a[..., 2], a[..., 3]
h, w = al.shape
mn, mx = np.minimum(np.minimum(r, g), b), np.maximum(np.maximum(r, g), b)
# açık + düşük doygunluk (beyaz / açık mavi / gri); yaprak parlaması yeşil olduğu için elenmez
light = (al > 0) & (mn > 135) & ((mx - mn) < 70) & (b >= r - 15)
zone = np.zeros_like(light); zone[:int(h * 0.85), int(w * 0.58):] = True   # bitki bölgesi
cut = light & zone
# artıkların 1 px çevresindeki yarı-açık kenar halesi de gitsin
cut = nd.binary_dilation(cut, iterations=1) & (mn > 110) & (al > 0) & zone
lab, n = nd.label(cut)
for i in range(1, n + 1):
    if (lab == i).sum() >= 3:
        a[lab == i, 3] = 0
# dış kenar halesi
al2 = a[..., 3] > 0
edge = al2 & ~nd.binary_erosion(al2)
fr = edge & (np.minimum(np.minimum(a[..., 0], a[..., 1]), a[..., 2]) > 140) & (a[..., 2] >= a[..., 0] - 12)
fr[:, :int(w * 0.58)] = False
a[fr, 3] = 0
im = Image.fromarray(a.astype(np.uint8), 'RGBA')
im.save(src, optimize=True)
im.save('assets/moka/moka_watering.webp', 'WEBP', quality=90, alpha_quality=100, method=6)
