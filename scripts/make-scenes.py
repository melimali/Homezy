"""Moka sahneleri: arka plan + Moka stickerı birleşik görseller.

1) Arka plan sayfasını kes (adlar scripts/scenes.json > sheets içinde):
     python3 scripts/make-scenes.py slice <sayfa.png> <sayfa_adı>
   Kareler assets/arkaplan/<ad>.jpg olur. Tek bir arka plan da doğrudan assets/arkaplan/<ad>.jpg
   (ya da .png) olarak konabilir.
2) Sahneleri üret:
     python3 scripts/make-scenes.py build
   scenes.json > poses (her poz bir arka planda) ve rooms (oda kartları) okunur, assets/scenes/ altına
   JPEG yazılır, src/constants/scenes.ts baştan üretilir. Arka planı olmayan sahneler atlanır ve listelenir;
   arka plan gelince build yeniden çalıştırılır.

Gerekli: pip install pillow numpy scipy
"""
import json, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage as nd

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CFG = json.load(open(os.path.join(ROOT, 'scripts/scenes.json'), encoding='utf-8'))
BG_DIR = os.path.join(ROOT, 'assets/arkaplan')
OUT_DIR = os.path.join(ROOT, 'assets/scenes')
MOKA_DIR = os.path.join(ROOT, 'assets/moka')
TS = os.path.join(ROOT, 'src/constants/scenes.ts')
W, H = 640, 480  # 4:3
ROOM_TYPES = ['yatak', 'mutfak', 'banyo', 'salon', 'calisma', 'cocuk', 'antre', 'balkon', 'camasir']


def inner_rect(mask):
    """Yuvarlak köşeli sticker şeklinin içinde kalan en büyük dikdörtgene yakın kutu."""
    ys, xs = np.nonzero(mask)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    for _ in range(400):
        sub = mask[y0:y1, x0:x1]
        edges = [sub[0].mean(), sub[-1].mean(), sub[:, 0].mean(), sub[:, -1].mean()]
        if min(edges) >= 0.995:
            break
        i = int(np.argmin(edges))
        if i == 0: y0 += 1
        elif i == 1: y1 -= 1
        elif i == 2: x0 += 1
        else: x1 -= 1
    return x0, y0, x1, y1


def slice_sheet(path, key):
    sh = CFG['sheets'][key]
    R, C, names = sh['rows'], sh['cols'], sh['names']
    im = Image.open(path).convert('RGB')
    a = np.asarray(im).astype(np.int16)
    # Beyaz zemin ve stickerın beyaz kenarı dışarıda kalsın.
    fg = nd.binary_fill_holes(nd.binary_opening(a.min(2) < 225, iterations=2))
    lab, _ = nd.label(fg)
    sizes = nd.sum(fg, lab, range(lab.max() + 1))
    ch, cw = a.shape[0] / R, a.shape[1] / C
    os.makedirs(BG_DIR, exist_ok=True)
    for i, name in enumerate(names):
        r, c = divmod(i, C)
        cell = lab[int(r * ch):int((r + 1) * ch), int(c * cw):int((c + 1) * cw)]
        ids, counts = np.unique(cell[cell > 0], return_counts=True)
        j = ids[np.argmax(counts)]
        assert sizes[j] > ch * cw * 0.3, name
        x0, y0, x1, y1 = inner_rect(lab == j)
        # Kenardaki koyu çizgi de girmesin.
        m = 4
        im.crop((x0 + m, y0 + m, x1 - m, y1 - m)).save(os.path.join(BG_DIR, f'{name}.jpg'), quality=95)
        print(name, (x0, y0, x1, y1))


def load_bg(name):
    for ext in ('jpg', 'png', 'jpeg', 'webp'):
        p = os.path.join(BG_DIR, f'{name}.{ext}')
        if os.path.exists(p):
            return Image.open(p).convert('RGB')
    return None


def cover(im, w, h):
    s = max(w / im.width, h / im.height)
    im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    l, t = (im.width - w) // 2, (im.height - h) // 2
    return im.crop((l, t, l + w, t + h)).filter(ImageFilter.UnsharpMask(1.2, 40, 2))


def compose(bg, pose, x=0.5, h=0.62, flip=False):
    scene = cover(bg, W, H).convert('RGBA')
    moka = Image.open(os.path.join(MOKA_DIR, f'moka_{pose}.png')).convert('RGBA')
    moka = moka.crop(moka.getbbox())
    if flip:
        moka = moka.transpose(Image.FLIP_LEFT_RIGHT)
    s = H * h / moka.height
    moka = moka.resize((round(moka.width * s), round(moka.height * s)), Image.LANCZOS)
    cx, bottom = int(W * x), int(H * 0.975)
    left = max(0, min(W - moka.width, cx - moka.width // 2))
    # Ayağının altında yumuşak gölge.
    sh = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    ew = moka.width * 0.42
    ImageDraw.Draw(sh).ellipse((left + moka.width / 2 - ew, bottom - 16, left + moka.width / 2 + ew, bottom + 6), fill=(60, 40, 20, 90))
    scene = Image.alpha_composite(scene, sh.filter(ImageFilter.GaussianBlur(7)))
    scene.alpha_composite(moka, (left, bottom - moka.height))
    return scene.convert('RGB')


def build():
    os.makedirs(OUT_DIR, exist_ok=True)
    made, missing = {'pose': [], 'room': []}, {}
    jobs = [('pose', p, {'bg': b} if isinstance(b, str) else b) for p, b in CFG['poses'].items()]
    jobs += [('room', r, v) for r, v in CFG['rooms'].items()]
    for kind, key, v in jobs:
        bg = load_bg(v['bg'])
        if bg is None:
            missing.setdefault(v['bg'], []).append(f'{kind}:{key}')
            continue
        pose = key if kind == 'pose' else v['pose']
        out = f"{'moka' if kind == 'pose' else 'oda'}_{key}.jpg"
        compose(bg, pose, v.get('x', 0.5), v.get('h', 0.62), v.get('flip', False)).save(os.path.join(OUT_DIR, out), quality=84, optimize=True, progressive=True)
        made[kind].append((key, out))
    req = lambda f: f"require('../../assets/scenes/{f}')"
    lines = [
        "import type { ImageSourcePropType } from 'react-native';",
        '',
        "import type { MokaPose } from '@/constants/moka';",
        "import type { RoomType } from '@/domain/types';",
        '',
        '/**',
        ' * Moka sahneleri: arka plan + Moka stickerı tek görselde (640×480). Bu dosya',
        ' * `python3 scripts/make-scenes.py build` ile üretilir, elle değiştirme; eşleştirme scripts/scenes.json.',
        ' * Sahnesi olmayan poz ya da oda için ekranlar eski görünüme (sticker / emoji) döner.',
        ' */',
        'export const POSE_SCENES: Partial<Record<MokaPose, ImageSourcePropType>> = {',
        *[f'  {k}: {req(f)},' for k, f in made['pose']],
        '};',
        '',
        'export const ROOM_SCENES: Partial<Record<RoomType, ImageSourcePropType>> = {',
        *[f'  {k}: {req(f)},' for k, f in made['room']],
        '};',
        '',
    ]
    open(TS, 'w', encoding='utf-8', newline='\n').write('\n'.join(lines))
    print(f"{len(made['pose'])} poz sahnesi, {len(made['room'])} oda sahnesi")
    no_room = [r for r in ROOM_TYPES if r not in CFG['rooms']]
    if missing or no_room:
        print('Eksik arka planlar:')
        for b, users in missing.items():
            print(f'  {b}: {", ".join(users)}')
        for r in no_room:
            print(f'  (scenes.json > rooms içinde yok) {r}')


if __name__ == '__main__':
    if sys.argv[1:2] == ['slice']:
        slice_sheet(sys.argv[2], sys.argv[3])
    elif sys.argv[1:2] == ['build']:
        build()
    else:
        print(__doc__)
