"""Oturan Moka'ya (moka_home_seated) mimik yüzlerini giydirir: assets/moka/seated/<mimik>.webp.

Her mimikten (assets/moka/mimik/1-8) krem yüz diski yumuşak kenarlı bir elipsle kesilir,
oturan Moka'nın yüz diskine ölçeklenip renk eşitlenerek yapıştırılır. Böylece odadaki tam boy Moka
göz kırpar, konuşur ve ruh haline göre yüz değiştirir. Kürk renkleri için make-moka-fur.py --seated.
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
BODY = ROOT / 'assets/moka/moka_home_seated.webp'
MIMIK = ROOT / 'assets/moka/mimik'
OUT = ROOT / 'assets/moka/seated'

# Ölçümler (krem disk, %2-%98): oturan x 242-583 y 145-368; mimik x 108-418 y 143-339.
SRC_C = (263, 238)     # mimik yüz merkezi
DST_C = (412, 246)     # oturan yüz merkezi
SCALE = 1.12
RX, RY = 172, 112      # kesilen elips (mimik pikseli)
FEATHER = 16
GAIN = np.array([1.075, 1.093, 1.03])  # mimik kremini oturanın kremine yaklaştırır


def face(src: Image.Image) -> tuple[Image.Image, tuple[int, int]]:
    w, h = src.size
    mask = Image.new('L', (w, h), 0)
    ImageDraw.Draw(mask).ellipse((SRC_C[0] - RX, SRC_C[1] - RY, SRC_C[0] + RX, SRC_C[1] + RY), fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(FEATHER))
    arr = np.array(src).astype(float)
    arr[..., :3] = np.clip(arr[..., :3] * GAIN, 0, 255)
    arr[..., 3] = arr[..., 3] * (np.array(mask).astype(float) / 255)
    img = Image.fromarray(arr.astype(np.uint8), 'RGBA')
    img = img.resize((round(w * SCALE), round(h * SCALE)), Image.LANCZOS)
    off = (round(DST_C[0] - SRC_C[0] * SCALE), round(DST_C[1] - SRC_C[1] * SCALE))
    return img, off


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    body = Image.open(BODY).convert('RGBA')
    for n in range(1, 9):
        src = Image.open(MIMIK / f'{n}.webp').convert('RGBA')
        f, off = face(src)
        out = body.copy()
        layer = Image.new('RGBA', body.size, (0, 0, 0, 0))
        layer.paste(f, off, f)
        # Yüz sadece gövdenin olduğu yere düşer (kenardan taşmaz).
        la = np.array(layer)
        la[..., 3] = np.minimum(la[..., 3], np.array(body)[..., 3])
        # Fincan önde kalır: açık ağız fincanın arkasına girer.
        cup = Image.new('L', body.size, 0)
        d = ImageDraw.Draw(cup)
        d.ellipse((364, 350, 526, 396), fill=255)
        d.rounded_rectangle((366, 372, 524, 508), 26, fill=255)
        d.ellipse((508, 380, 580, 474), fill=255)
        la[..., 3] = (la[..., 3] * (1 - np.array(cup.filter(ImageFilter.GaussianBlur(1.5))) / 255)).astype(np.uint8)
        out.alpha_composite(Image.fromarray(la, 'RGBA'))
        out.save(OUT / f'{n}.webp', 'WEBP', quality=84, method=4)
        if '--preview' in sys.argv:
            bg = Image.new('RGBA', body.size, (200, 200, 200, 255))
            bg.alpha_composite(out)
            bg.convert('RGB').save(Path(sys.argv[-1]) / f'seated-{n}.png')


if __name__ == '__main__':
    main()
