"""Moka odası canlı arka plan katmanları (ChatGPT'den gelen gündüz/gece oda resimlerinden).
Girdi: docs/moka-oda-referans/oda_{gece,gunduz}_chatgpt.png (852x1846, ikisi aynı yerleşim).
Çıktı: assets/oda/<varyant>_{taban,cam,bitki_a,bitki_b,bitki_c}.webp, lamba ve ay ışığı.
Bitkiler maskeyle kesilir, tabandan silinip (inpaint) boşluk doldurulur; böylece sallanınca hayalet çıkmaz."""
import os
import cv2
import numpy as np

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = lambda v: cv2.imread(f'{root}/docs/moka-oda-referans/oda_{v}_chatgpt.png')
out = f'{root}/assets/oda'
os.makedirs(out, exist_ok=True)
night = src('gece')
hsv = cv2.cvtColor(night, cv2.COLOR_BGR2HSV)
H, S, V = [hsv[..., i].astype(int) for i in range(3)]

def leaf_mask(box, grow=11):
    x0, y0, x1, y1 = box
    g = ((H >= 24) & (H <= 52) & (S > 85) & (V > 55)).astype('uint8')
    m = np.zeros_like(g); m[y0:y1, x0:x1] = g[y0:y1, x0:x1]
    m = cv2.dilate(m, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (grow, grow)))
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((25, 25), np.uint8))
    return m

def brown(box):
    x0, y0, x1, y1 = box
    b = ((H >= 4) & (H <= 22) & (S > 90) & (V > 60)).astype('uint8')
    m = np.zeros_like(b); m[y0:y1, x0:x1] = b[y0:y1, x0:x1]
    return cv2.dilate(m, np.ones((7, 7), np.uint8))

def rect(box):
    x0, y0, x1, y1 = box
    m = np.zeros(H.shape, 'uint8'); m[y0:y1, x0:x1] = 1; return m

# Üç bitki: A asma saksı (pot dahil), B sağ üst, C pencere önü.
A = leaf_mask((0, 235, 335, 760)) | brown((55, 330, 235, 460))
B = leaf_mask((625, 270, 852, 790)) & rect((625, 270, 852, 790))
C = (leaf_mask((60, 860, 320, 1170)) | rect((105, 955, 205, 1040)))
for m in (A, B, C):
    m[:] = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((15, 15), np.uint8))
    m[:] = cv2.dilate(m, np.ones((3, 3), np.uint8))
masks = {'a': A, 'b': B, 'c': C}
allm = (A | B | C).astype('uint8')

# Cam bölgesi: gece resmindeki mavi gökyüzü, kafes çıtalarını ve ay dahil doldurulmuş hali.
blue = ((H >= 100) & (H <= 135) & (S > 60)).astype('uint8')
reg = np.zeros_like(blue); reg[300:1000, 0:200] = 1
blue *= reg
blue = cv2.morphologyEx(blue, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
cn, _ = cv2.findContours(blue, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
glass = np.zeros_like(blue); cv2.drawContours(glass, cn, -1, 1, -1)
glass = cv2.erode(glass, np.ones((7, 7), np.uint8))
glass_plus = glass | (allm & reg)
glass_plus = cv2.erode(glass_plus, np.ones((3, 3), np.uint8))

def save(name, bgra, q=88):
    cv2.imwrite(f'{out}/{name}.webp', bgra, [cv2.IMWRITE_WEBP_QUALITY, q])

for v in ('gece', 'gunduz'):
    im = src(v)
    clean = cv2.inpaint(im, cv2.dilate(allm, np.ones((5, 5), np.uint8)) * 255, 7, cv2.INPAINT_TELEA)
    # Taban: bitkisiz ve cam bölgesi delik (altından animasyonlu cam görünür).
    base = cv2.cvtColor(clean, cv2.COLOR_BGR2BGRA)
    base[..., 3] = 255
    save(f'{v}_taban', cv2.cvtColor(clean, cv2.COLOR_BGR2BGRA), 85)
    # Cam katmanı: gökyüzü + bulut (taban üstünde kayar), kenarlar kıyılı.
    cam = cv2.cvtColor(clean, cv2.COLOR_BGR2BGRA)
    a = cv2.GaussianBlur(glass.astype('float32'), (0, 0), 1.0)
    cam[..., 3] = (a * 255).astype('uint8')
    # Kaydırınca kenar boşluğu çıkmasın: cam piksellerini yatayda yansıtarak 8 px genişlet.
    ys, xs = np.where(glass > 0)
    x0, x1, y0, y1 = max(xs.min() - 12, 0), xs.max() + 12, ys.min(), ys.max()
    cam = cam[y0:y1 + 1, x0:x1 + 1]
    save(f'{v}_cam', cam, 85)
    open(f'{out}/{v}_cam.json', 'w').write('{"x":%d,"y":%d,"w":%d,"h":%d}' % (x0, y0, x1 - x0 + 1, y1 - y0 + 1))
    for k, m in masks.items():
        ys, xs = np.where(m > 0)
        bx0, bx1, by0, by1 = xs.min(), xs.max(), ys.min(), ys.max()
        al = cv2.GaussianBlur(m.astype('float32'), (0, 0), 1.2)
        layer = cv2.cvtColor(im, cv2.COLOR_BGR2BGRA)
        layer[..., 3] = (al * 255).astype('uint8')
        save(f'{v}_bitki_{k}', layer[by0:by1 + 1, bx0:bx1 + 1], 88)
        open(f'{out}/{v}_bitki_{k}.json', 'w').write('{"x":%d,"y":%d,"w":%d,"h":%d}' % (bx0, by0, bx1 - bx0 + 1, by1 - by0 + 1))
print('ok')
