"""Katmanlı Moka (MokaRig) resimlerini üretir. Girdi: ChatGPT parçaları (1254x1254, aynı tuval).
Kullanım: python3 scripts/make-moka-rig.py <moka-oda klasörü: v3/ v4/ v5/> 
Çıktı: assets/moka/rig/<katman>.webp (512 px), assets/moka/rig/fur/<ton>/<katman>.webp, assets/moka/esya/<ad>.webp
Katmanlar: govde kuyruk bas gozler gaga kanat_a kanat_b. Kürk tonu sadece tüy katmanlarında değişir."""
import os, sys, glob, importlib.util
import numpy as np
from PIL import Image

src = sys.argv[1]
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out = f'{root}/assets/moka/rig'
SZ = 512
W = 1254
os.makedirs(out, exist_ok=True)
L = lambda p: Image.open(os.path.join(src, p)).convert('RGBA')
def save(im, path, q=88):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    im.resize((SZ, SZ), Image.LANCZOS).save(path, quality=q, method=6)

# Eşyalar. ChatGPT iki dosyanın adını ters vermiş (hasir_sapka <-> yilbasi); burada düzeltilir.
SWAP = {'bas_hasir_sapka': 'bas_yilbasi', 'bas_yilbasi': 'bas_hasir_sapka'}
def esya():
    n = 0
    for f in sorted(glob.glob(os.path.join(src, 'v5', 'esya_*.png'))):
        name = os.path.basename(f)[5:-4]
        name = SWAP.get(name, name)
        im = Image.open(f).convert('RGBA')
        # Küçük kalan baş eşyalarını büyüt (alt orta nokta sabit): genişlik < 300 px ise 1,4 kat.
        if name.startswith('bas_'):
            bb = im.getchannel('A').point(lambda v: 255 if v > 20 else 0).getbbox()
            if bb and bb[2] - bb[0] < 300:
                k = 1.4; cx, by = (bb[0] + bb[2]) / 2, bb[3] - 25
                big = im.resize((int(W * k), int(W * k)), Image.LANCZOS)
                canvas = Image.new('RGBA', (W, W), (0, 0, 0, 0))
                canvas.alpha_composite(big, (int(cx - cx * k), int(by - by * k)))
                im = canvas
        # El eşyaları: tutulduğu yerde biraz daha okunur olsun (kutu merkezi sabit, 1,2 kat).
        if name.startswith('el_'):
            bb = im.getchannel('A').point(lambda v: 255 if v > 20 else 0).getbbox()
            if bb:
                k = 1.2; cx, cy = (bb[0] + bb[2]) / 2, (bb[1] + bb[3]) / 2
                big = im.resize((int(W * k), int(W * k)), Image.LANCZOS)
                canvas = Image.new('RGBA', (W, W), (0, 0, 0, 0))
                canvas.alpha_composite(big, (int(cx - cx * k), int(cy - cy * k)))
                im = canvas
        save(im, f'{root}/assets/moka/esya/{name}.webp', 85); n += 1
    print('eşya', n)
if '--esya' in sys.argv:
    esya(); sys.exit()

govde, kuyruk, bas = L('v3/moka_govde.png'), L('v4/kuyruk.png'), L('v4/bas_kel.png')
gozler, ka, kb = L('v3/moka_gozler.png'), L('v3/moka_kanat_sol.png'), L('v3/moka_kanat_sag.png')
bas_tam = L('v3/moka_bas.png')

# Gaga: tam baştaki ile kel baştaki fark, gözler hariç, yüzün ortasında
a = np.asarray(bas_tam).astype(int); b = np.asarray(bas).astype(int)
diff = np.abs(a[..., :3] - b[..., :3]).sum(2)
mask = np.zeros(diff.shape, bool); mask[330:560, 480:760] = True
mask &= (diff > 55) & (np.asarray(gozler)[..., 3] < 30) & (a[..., 3] > 128)
import scipy.ndimage as ndi
mask = ndi.binary_closing(mask, iterations=6); mask = ndi.binary_fill_holes(mask); mask = ndi.binary_opening(mask, iterations=3)
lab, n = ndi.label(mask)
if n:
    sizes = ndi.sum(mask, lab, range(1, n + 1)); mask = lab == (1 + int(np.argmax(sizes)))
mask = ndi.binary_dilation(mask, iterations=3)
gaga = bas_tam.copy(); g = np.asarray(gaga).copy(); g[..., 3] = np.where(mask, g[..., 3], 0); gaga = Image.fromarray(g)

LAYERS = {'govde': govde, 'kuyruk': kuyruk, 'bas': bas, 'gozler': gozler, 'gaga': gaga, 'kanat_a': ka, 'kanat_b': kb}
for k, im in LAYERS.items(): save(im, f'{out}/{k}.webp')

# Kürk tonları (scripts/make-moka-fur.py ile aynı kural)
TONES = {'kahve': (-48, 1.0, 0.95), 'gri': (0, 0.12, 1.08), 'mavi': (135, 0.85, 1.05), 'mor': (205, 0.65, 1.08), 'pembe': (265, 0.6, 1.2), 'turuncu': (-62, 1.5, 1.18), 'kirmizi': (-80, 0.95, 1.0)}
TARGET = {'kahve': 30, 'gri': None, 'mavi': 190, 'mor': 262, 'pembe': 325, 'turuncu': 24, 'kirmizi': 4}
import colorsys
def rgb2hsv(a):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mx, mn = a.max(-1), a.min(-1); d = mx - mn; m = d > 1e-6
    rc = (g - b) / np.where(m, d, 1) % 6; gc = (b - r) / np.where(m, d, 1) + 2; bc = (r - g) / np.where(m, d, 1) + 4
    h = np.where(mx == r, rc, np.where(mx == g, gc, bc)); h = np.where(m, h, 0) * 60
    s = np.where(mx > 0, d / np.where(mx > 0, mx, 1), 0)
    return h, s, mx
def hsv2rgb(h, s, v):
    h = (h % 360) / 60; i = np.floor(h).astype(int) % 6; f = h - np.floor(h)
    p, q, t = v * (1 - s), v * (1 - f * s), v * (1 - (1 - f) * s)
    cols = [(v, t, p), (q, v, p), (p, v, t), (p, q, v), (t, p, v), (v, p, q)]
    o = np.zeros(h.shape + (3,))
    for k in range(6):
        mk = i == k
        for c in range(3): o[..., c] = np.where(mk, cols[k][c], o[..., c])
    return o
# Referans ton: gövde+baş+kanat birlikte (her katmanda aynı kayma uygulansın)
ref = np.concatenate([np.asarray(im).astype(float)[..., :4].reshape(-1, 4) for im in (govde, bas, ka, kb)]) / 255
rh, rs, rv = rgb2hsv(ref[:, :3]); rf = (rh > 40) & (rh < 140) & (rs > 0.18) & (rv < 0.88) & (ref[:, 3] > 0.05)
med = float(np.median(rh[rf]))
for tone, (dh, sm, vm) in TONES.items():
    shift = dh if TARGET[tone] is None else TARGET[tone] - med
    for k in ('govde', 'kuyruk', 'bas', 'kanat_a', 'kanat_b'):
        a_ = np.asarray(LAYERS[k]).astype(float) / 255
        h, s, v = rgb2hsv(a_[..., :3]); fur = (h > 40) & (h < 140) & (s > 0.18) & (v < 0.88) & (a_[..., 3] > 0.05)
        rgb = hsv2rgb(np.where(fur, h + shift, h), np.where(fur, np.clip(s * sm, 0, 1), s), np.where(fur, np.clip(v * vm, 0, 1), v))
        save(Image.fromarray((np.concatenate([rgb, a_[..., 3:]], -1) * 255).round().astype('uint8'), 'RGBA'), f'{out}/fur/{tone}/{k}.webp')

esya()
