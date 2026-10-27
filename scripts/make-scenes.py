"""Moka sahneleri: arka plan + Moka stickerı birleşik görseller.

1) Arka plan sayfasını kes (adlar scripts/scenes.json > sheets içinde):
     python3 scripts/make-scenes.py slice <sayfa.png> <sayfa_adı>
   Kareler assets/arkaplan/<ad>.png olur (upscale sonrası .jpg). Tek bir arka plan da doğrudan assets/arkaplan/<ad>.jpg
   (ya da .png) olarak konabilir.
2) Sahneleri üret:
     python3 scripts/make-scenes.py build
   scenes.json > poses (her poz bir arka planda) ve rooms (oda kartları) okunur, assets/scenes/ altına
   JPEG yazılır, src/constants/scenes.ts baştan üretilir. Arka planı olmayan sahneler atlanır ve listelenir;
   arka plan gelince build yeniden çalıştırılır.

Netleştirme (sayfadan kesilen kareler ~200 px, büyütülünce bulanık): slice ile build arasında
     python3 scripts/make-scenes.py upscale <model_klasörü>
   assets/arkaplan içinde 600 px'ten küçük her arka planı Real-ESRGAN (x4plus-anime) ile 4 kat büyütür.
   Model: https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.5.0/realesrgan-ncnn-vulkan-20220424-ubuntu.zip
   içindeki models/realesrgan-x4plus-anime.param ve .bin (zip'i açıp models klasörünü ver). pip install ncnn
   Model yoksa ya da ncnn kurulamazsa Lanczos ile büyütüp keskinleştirir. Büyük (≥ 1024 px) arka plan
   gönderilirse bu adım gerekmez.

Gerekli: pip install pillow numpy scipy (upscale için ayrıca ncnn)
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
W, H = 1280, 960  # 4:3 (Ev ekranında büyük gösterildiği için yüksek)
UPSCALE_MIN = 600  # bundan küçük arka planlar upscale ile büyütülür
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
        im.crop((x0 + m, y0 + m, x1 - m, y1 - m)).save(os.path.join(BG_DIR, f'{name}.png'))
        print(name, (x0, y0, x1, y1))


def esrgan(model_dir):
    """Real-ESRGAN x4 (çizim modeli) ncnn ile, işlemcide. Görüntüyü parça parça işler."""
    import ncnn
    net = ncnn.Net()
    net.opt.use_vulkan_compute = False
    net.load_param(os.path.join(model_dir, 'realesrgan-x4plus-anime.param'))
    net.load_model(os.path.join(model_dir, 'realesrgan-x4plus-anime.bin'))

    def run(im, tile=128, pad=10):
        a = np.asarray(im.convert('RGB')).astype(np.float32) / 255
        h, w, _ = a.shape
        out = np.zeros((h * 4, w * 4, 3), np.float32)
        for y in range(0, h, tile):
            for x in range(0, w, tile):
                y0, x0 = max(0, y - pad), max(0, x - pad)
                y1, x1 = min(h, y + tile + pad), min(w, x + tile + pad)
                part = np.ascontiguousarray(a[y0:y1, x0:x1].transpose(2, 0, 1))
                ex = net.create_extractor()
                ex.input('data', ncnn.Mat(part))
                _, r = ex.extract('output')
                r = np.array(r).transpose(1, 2, 0)
                ty, tx = (y - y0) * 4, (x - x0) * 4
                th, tw = (min(h, y + tile) - y) * 4, (min(w, x + tile) - x) * 4
                out[y * 4:y * 4 + th, x * 4:x * 4 + tw] = r[ty:ty + th, tx:tx + tw]
        return Image.fromarray((np.clip(out, 0, 1) * 255 + 0.5).astype(np.uint8))
    return run


def upscale(model_dir=None):
    run = None
    try:
        if model_dir:
            run = esrgan(model_dir)
    except Exception as e:  # ncnn ya da model yoksa Lanczos'a düş
        print('Real-ESRGAN kullanılamadı, Lanczos ile büyütülüyor:', e)
    for f in sorted(os.listdir(BG_DIR)):
        p = os.path.join(BG_DIR, f)
        im = Image.open(p).convert('RGB')
        if im.width >= UPSCALE_MIN:
            continue
        big = run(im) if run else im.resize((im.width * 4, im.height * 4), Image.LANCZOS).filter(ImageFilter.UnsharpMask(2, 60, 2))
        big.save(os.path.splitext(p)[0] + '.jpg', quality=90, optimize=True, progressive=True)
        if not p.endswith('.jpg'):
            os.remove(p)
        print(f, im.size, '->', big.size)


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
    return im.crop((l, t, l + w, t + h)).filter(ImageFilter.UnsharpMask(1.6, 45, 3))


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
    ImageDraw.Draw(sh).ellipse((left + moka.width / 2 - ew, bottom - 24, left + moka.width / 2 + ew, bottom + 9), fill=(60, 40, 20, 90))
    scene = Image.alpha_composite(scene, sh.filter(ImageFilter.GaussianBlur(10)))
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
        compose(bg, pose, v.get('x', 0.5), v.get('h', 0.62), v.get('flip', False)).save(os.path.join(OUT_DIR, out), quality=80, optimize=True, progressive=True)
        made[kind].append((key, out))
    req = lambda f: f"require('../../assets/scenes/{f}')"
    lines = [
        "import type { ImageSourcePropType } from 'react-native';",
        '',
        "import type { MokaPose } from '@/constants/moka';",
        "import type { RoomType } from '@/domain/types';",
        '',
        '/**',
        ' * Moka sahneleri: arka plan + Moka stickerı tek görselde (1280×960). Bu dosya',
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
    elif sys.argv[1:2] == ['upscale']:
        upscale(sys.argv[2] if len(sys.argv) > 2 else None)
    elif sys.argv[1:2] == ['build']:
        build()
    else:
        print(__doc__)
