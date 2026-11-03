"""moka_watering: bitki çevresindeki açık mavi/beyaz artıkları siler (assets-src PNG yerinde), sonra WebP üretir."""
import numpy as np
from PIL import Image
from scipy import ndimage as nd
src = 'assets-src/moka/moka_watering.png'
a = np.array(Image.open(src).convert('RGBA')).astype(int)
r, g, b, al = a[..., 0], a[..., 1], a[..., 2], a[..., 3]
light = (al > 0) & (np.minimum(np.minimum(r, g), b) > 170) & (b >= r - 12)
light[:, :int(a.shape[1] * 0.58)] = False
lab, n = nd.label(light)
for i in range(1, n + 1):
    if (lab == i).sum() >= 6:
        a[lab == i, 3] = 0
al2 = a[..., 3] > 0
edge = al2 & ~nd.binary_erosion(al2)
fr = edge & (np.minimum(np.minimum(a[..., 0], a[..., 1]), a[..., 2]) > 140) & (a[..., 2] >= a[..., 0] - 12)
fr[:, :int(a.shape[1] * 0.58)] = False
a[fr, 3] = 0
im = Image.fromarray(a.astype(np.uint8), 'RGBA')
im.save(src, optimize=True)
im.save('assets/moka/moka_watering.webp', 'WEBP', quality=90, alpha_quality=100, method=6)
