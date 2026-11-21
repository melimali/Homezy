"""ChatGPT'den gelen ham 3D ev PNG'lerini küçültüp WebP yapar ve src/domain/ev3dArt.gen.json yazar.
Kullanım: python scripts/make-ev3d.py <ham-klasör (ev3d-ham)>  (ham dosyalar repoya konmaz)"""
import sys, os, json, glob
from PIL import Image
src = sys.argv[1]
out = 'assets/ev3d'
DOKU = 256
MAXS = {'bahce': 192, 'hava': 256, 'mobilya': 160, 'parca': 192}
SMALL = {'kus_1': 80, 'kus_2': 80, 'kus_3': 80, 'yagmur_damla': 40, 'kar_tanesi': 48, 'duman_1': 128, 'duman_2': 128, 'duman_3': 128, 'ay': 128, 'gunes': 128}
man = {}
for f in sorted(glob.glob(os.path.join(src, '*', '*.png'))):
    grp = os.path.basename(os.path.dirname(f)); name = os.path.splitext(os.path.basename(f))[0]
    if name.startswith('gok_'): continue  # kenarları saydam bulanık leke, zemin olarak kullanılamaz
    im = Image.open(f).convert('RGBA')
    tile = grp == 'doku' or name in ('cim_dokusu', 'kar_cim', 'sonbahar_cim')
    if tile:
        im = im.resize((DOKU, DOKU), Image.LANCZOS)
    else:
        bb = im.getchannel('A').point(lambda v: 255 if v > 12 else 0).getbbox()
        if bb: im = im.crop(bb)
        m = SMALL.get(name, MAXS[grp])
        im.thumbnail((m, m), Image.LANCZOS)
    os.makedirs(os.path.join(out, grp), exist_ok=True)
    p = os.path.join(out, grp, name + '.webp')
    im.save(p, 'WEBP', quality=80, alpha_quality=85, method=6)
    man[name] = [grp, im.width, im.height, os.path.getsize(p)]
json.dump(man, open(os.path.join(out, 'manifest.json'), 'w'), indent=0)
print(len(man), sum(v[3] for v in man.values()) // 1024, 'KB')
