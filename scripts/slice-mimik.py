"""Moka mimik sayfasını (4 sütun x 2 satır, 8 mimik) dilimler: assets/moka/mimik/1..8.png.

  python3 scripts/slice-mimik.py [sayfa.png]      (varsayılan assets/moka/mimik-sayfa.png)

Sıra: 1 nötr, 2 mutlu, 3 çok neşeli, 4 şaşkın, 5 üzgün, 6 uykulu, 7 göz kırpan, 8 konuşan.
Sayfa saydamsa olduğu gibi, zemin beyazsa beyaz saydamlığa çevrilir (kenar yumuşatmalı).
Her hücre içerik sınırına kırpılır, aynı ölçekle (en büyük kare) 512×512 alta hizalı saydam kareye konur;
böylece mimikler arası geçişte Moka yerinde durur.
Gerekli: pip install pillow numpy scipy
"""
import os, sys
import numpy as np
from PIL import Image
from scipy import ndimage as nd

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'assets/moka/mimik-sayfa.png')
OUT = os.path.join(ROOT, 'assets/moka/mimik')
N = 512

im = Image.open(SRC).convert('RGBA')
a = np.array(im).astype(np.float32)
W, H = im.size

if (a[..., 3] > 250).mean() > 0.95:
    # Opak sayfa: zemin kenardan başlayan beyaza yakın bölge. Koyu çizgiye dokunmadan yumuşak alfa.
    white = (a[..., :3].min(2) > 235)
    lab, _ = nd.label(white)
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    bg = np.isin(lab, list(edge))
    # Zemin 0, içerik 255; zemin sınırında hafif bulanıklık yumuşak kenar verir, koyu çizgi korunur.
    soft = nd.gaussian_filter(np.where(bg, 0.0, 255.0), 0.8)
    a[..., 3] = np.where(bg, 0, np.where(soft < 255, soft, 255))
    a[..., 3] = np.maximum(a[..., 3], np.where(bg, 0, 255))
a[..., 3] = np.where(a[..., 3] < 8, 0, a[..., 3])

# Hücre sınırları: sütunlar arası boşluk ve alt kenardaki artefakt şeridi (son ~12 px) atılır.
xs = [0, round(W * 0.2505), round(W * 0.5), round(W * 0.7505), W]
ys = [0, H // 2, H - round(H * 0.0135)]
cells = []
for r in range(2):
    for c in range(4):
        sub = a[ys[r]:ys[r + 1], xs[c]:xs[c + 1]]
        m = sub[..., 3] > 20
        lab, n = nd.label(m)
        if n > 1:  # küçük kırıntıları at, en büyük bileşenleri tut
            sizes = nd.sum(m, lab, range(1, n + 1))
            keep = [i + 1 for i, s in enumerate(sizes) if s > sizes.max() * 0.02]
            sub = sub.copy()
            sub[..., 3] = np.where(np.isin(lab, keep), sub[..., 3], 0)
            m = sub[..., 3] > 20
        yy, xx = np.where(m)
        cells.append(sub[yy.min():yy.max() + 1, xx.min():xx.max() + 1])

side = max(max(c.shape[0], c.shape[1]) for c in cells)
os.makedirs(OUT, exist_ok=True)
for i, c in enumerate(cells, 1):
    h, w = c.shape[:2]
    canvas = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    canvas.paste(Image.fromarray(c.astype(np.uint8)), ((side - w) // 2, side - h))
    canvas.resize((N, N), Image.LANCZOS).save(os.path.join(OUT, f'{i}.png'), optimize=True)
print('ok', side, '->', OUT)
