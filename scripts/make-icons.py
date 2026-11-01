"""
Homezy logolarından uygulama görsellerini üretir.

    python scripts/make-icons.py "Homezy logo.png" "homezy yazi logo.png"

Çıktılar assets/ altına yazılır:
  logo-kare.png     saydam kare logo (açılış animasyonu, splash)
  icon.png          1024x1024, saydamlıksız (App Store / Play ikonu)
  adaptive-icon.png Android uyarlanır ikon ön katmanı (zemin app.json'da #0A1A34)
  favicon.png       web
  logo-yatay.png    Homezy yazısı (kenardaki silik pikseller temizlenir)
Gerekli: pip install pillow numpy
"""
import os
import sys

import numpy as np
from PIL import Image

ASSETS = os.path.join(os.path.dirname(__file__), '..', 'assets')
DARK = (10, 26, 52, 255)  # logonun dış çizgisi, ikonun zemini


def clean(path):
    # Neredeyse saydam pikseller koyu zeminde renkli kırıntı gibi görünüyor, sil.
    arr = np.array(Image.open(path).convert('RGBA'))
    arr[arr[..., 3] < 40] = 0
    return arr


def main(icon_src, wordmark_src):
    arr = clean(icon_src)
    ys, xs = np.where(arr[..., 3] > 128)
    logo = Image.fromarray(arr).crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    w, h = logo.size
    s = max(w, h)
    sq = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    sq.alpha_composite(logo, ((s - w) // 2, (s - h) // 2))

    def fit(size, scale, bg):
        out = Image.new('RGBA', (size, size), bg)
        k = int(size * scale)
        out.alpha_composite(sq.resize((k, k), Image.LANCZOS), ((size - k) // 2, (size - k) // 2))
        return out

    sq.resize((1024, 1024), Image.LANCZOS).save(os.path.join(ASSETS, 'logo-kare.png'), optimize=True)
    # Logonun yuvarlak köşeleri ikon zemininin dışında kalsın diye biraz büyütülür.
    fit(1024, 1.06, DARK).convert('RGB').save(os.path.join(ASSETS, 'icon.png'), optimize=True)
    # Android maskesi kenarları keser; Moka güvenli alanda kalsın.
    fit(1024, 0.74, (0, 0, 0, 0)).save(os.path.join(ASSETS, 'adaptive-icon.png'), optimize=True)
    fit(196, 1.06, DARK).convert('RGB').save(os.path.join(ASSETS, 'favicon.png'), optimize=True)
    Image.fromarray(clean(wordmark_src)).save(os.path.join(ASSETS, 'logo-yatay.png'), optimize=True)


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
