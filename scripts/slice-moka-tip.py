"""Moka tip görsellerini (4x2 ızgara, saydam PNG) tek tek webp'e keser.
Kullanım: python3 scripts/slice-moka-tip.py <ızgara.png> assets/moka/tip
Sıra: planli atik sakin odakli dalgin hirsli tembel dengeli. Zemin gölgesi ve düşük alfalı artıklar temizlenir."""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage

NAMES = ['planli', 'atik', 'sakin', 'odakli', 'dalgin', 'hirsli', 'tembel', 'dengeli']
src, out = sys.argv[1], sys.argv[2]
im = Image.open(src).convert('RGBA')
W, H = im.size
cw, ch = W // 4, H // 2
for i, n in enumerate(NAMES):
    c = im.crop(((i % 4) * cw, (i // 4) * ch, (i % 4 + 1) * cw, (i // 4 + 1) * ch))
    a = np.array(c)
    al = a[..., 3]
    solid = al > 90
    lab, k = ndimage.label(ndimage.binary_closing(solid, iterations=3))
    if k:
        sizes = ndimage.sum(solid, lab, range(1, k + 1))
        keep = lab == (1 + int(np.argmax(sizes)))
        keep = ndimage.binary_dilation(keep, iterations=2)
    else:
        keep = solid
    a[..., 3] = np.where(keep, np.where(al > 90, 255, al), 0)
    a[~keep] = 0
    r = Image.fromarray(a)
    r = r.crop(r.getbbox())
    s = 480 / max(r.size)
    r = r.resize((round(r.width * s), round(r.height * s)), Image.LANCZOS)
    cv = Image.new('RGBA', (512, 512), (0, 0, 0, 0))
    cv.paste(r, ((512 - r.width) // 2, (512 - r.height) // 2), r)
    cv.save(f'{out}/moka_{n}.webp', quality=92)
    print(n, r.size)
