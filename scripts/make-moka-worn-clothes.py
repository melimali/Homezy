"""Giyilen gövde kıyafetlerinden içte kalan koyu yüzleri (yaka içi, kol ağzı içi, arka etek astarı) siler.

Kıyafet Moka'nın üstüne konunca bu yüzler giysinin arkası/içi gibi görünüyor; silinince altından
Moka'nın tüyü görünür. Düğmeler, cepler, desenler ve dış çizgi kalır.

Kullanım: python scripts/make-moka-worn-clothes.py <kaynak_klasör> src/assets/moka/clothing
Kaynak: kesilmemiş kıyafetler (git: e1b63b6 sürümündeki src/assets/moka/clothing).

Her kıyafet için:
  regions: koyu çizgilerle ayrılmış bölgelerden silinecekler (numaralar `segment()` sırasıyla).
  seeds:   (x, y, tolerans) 512'lik tuvalde bir noktadan renk benzerliğiyle yayılıp silinecek alan
           (gölge yüzü kumaşla aynı bölgede kalan kıyafetler için).
"""
import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

LUM_TH = 95  # dış çizgi bundan koyu

CUTS = {
    'govde_balikci_yelegi': {'regions': [1, 5, 6]},
    'govde_battaniye': {'regions': [2, 6, 7, 8]},
    'govde_dev_cicek': {'regions': [2, 9, 10]},
    'govde_hirka': {'regions': [4]},
    'govde_kaplan': {'regions': [2, 3]},
    'govde_kazak': {'seeds': [(125, 330, 18), (395, 330, 18)]},
    'govde_kimono': {'seeds': [(115, 330, 10), (407, 330, 10)]},
    'govde_kral_pelerini': {'seeds': [(255, 270, 40)]},
    'govde_mont': {'seeds': [(257, 262, 18), (120, 335, 18), (400, 335, 18)]},
    'govde_pelerin': {'regions': [2]},
    'govde_pijama': {'regions': [2, 5, 6]},
    'govde_pilot': {'regions': [5, 7]},
    'govde_pizza': {'regions': [1, 11, 12]},
    'govde_sef_ceketi': {'regions': [1, 5, 6]},
    'govde_sporcu': {'seeds': [(255, 265, 18), (140, 325, 18), (380, 325, 18)]},
    'govde_tisort_kahve': {'regions': [1, 4, 5]},
    'govde_yagmurluk': {'regions': [2], 'seeds': [(125, 345, 18), (395, 345, 18)]},
    'govde_yelek': {'seeds': [(255, 280, 16)]},
}


def segment(a):
    rgb, al = a[..., :3], a[..., 3]
    lum = 0.299 * rgb[..., 0] + 0.587 * rgb[..., 1] + 0.114 * rgb[..., 2]
    fill = (al > 100) & (lum > LUM_TH)
    lab, _ = ndi.label(fill)
    return lab, fill


def flood(a, x, y, tol):
    rgb, al = a[..., :3], a[..., 3]
    ref = rgb[y - 2:y + 3, x - 2:x + 3].reshape(-1, 3).mean(0)
    ok = (al > 100) & (np.sqrt(((rgb - ref) ** 2).sum(-1)) < tol)
    lab, _ = ndi.label(ok)
    k = lab[y, x]
    return lab == k if k else np.zeros(ok.shape, bool)


def cut(a, spec):
    lab, fill = segment(a)
    gone = np.zeros(fill.shape, bool)
    for k in spec.get('regions', []):
        gone |= lab == k
    for x, y, tol in spec.get('seeds', []):
        gone |= flood(a, x, y, tol)
    gone = ndi.binary_closing(gone, iterations=1)
    kept = (a[..., 3] > 100) & ~gone & fill
    near = ndi.binary_dilation(kept, iterations=4)
    around = ndi.binary_dilation(gone, iterations=8)
    out = a.copy()
    # Silinen yüz + onun kenarında kalıp artık hiçbir kumaşa değmeyen çizgiler gider.
    drop = gone | ((a[..., 3] > 0) & ~fill & ~near & around)
    out[..., 3][drop] = 0
    # Silinen yüzün kenarındaki yarı saydam pikseller için 1 px yumuşatma.
    edge = ndi.binary_dilation(drop, iterations=1) & ~drop & ~fill
    out[..., 3][edge] *= 0.6
    return out


def main(src, dst):
    for name, spec in CUTS.items():
        a = np.array(Image.open(os.path.join(src, name + '.webp')).convert('RGBA')).astype(float)
        Image.fromarray(cut(a, spec).clip(0, 255).astype('uint8')).save(os.path.join(dst, name + '.webp'), quality=90, method=6, alpha_quality=100)
        print('ok', name)


if __name__ == '__main__':
    main(*sys.argv[1:3])
