"""Moka parçalarını kodla keser (prototip). Kullanım:
python scripts/slice-moka-parts.py <girdi_klasoru: moka_oda_sakin/govde/bas.png> <cikti_klasoru>
Aynı tuvalde (girdi boyutu) tam hizalı katmanlar üretir: govde, bas_kel, goz_sol/sag, gaga, kanat_sol/sag, onizleme.
"""
import sys, os
import numpy as np, cv2
from PIL import Image

src, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
rgba = lambda n: np.array(Image.open(os.path.join(src, n)).convert('RGBA'))
S, G, H = rgba('moka_oda_sakin.png'), rgba('moka_govde.png'), rgba('moka_bas.png')
h, w = S.shape[:2]

def over(a, b):  # b üstte
    A = Image.fromarray(a); A.alpha_composite(Image.fromarray(b)); return np.array(A)
def save(n, a): Image.fromarray(a).save(os.path.join(out, n))
def cut(img, mask):
    o = img.copy(); o[..., 3] = np.where(mask > 0, img[..., 3], 0); return o

# 1) kanatlar: yeşil/koyu (krem karın değil) pikseller, kanat kutusunda; delikler doldurulur
from scipy import ndimage as ndi
hsvS = cv2.cvtColor(S[..., :3], cv2.COLOR_RGB2HSV)
greenish = (((hsvS[..., 0] > 22) & (hsvS[..., 0] < 50)) | (hsvS[..., 2] < 120)) & (S[..., 3] > 128)   # OpenCV hue 0-179
boxes = {'kanat_sol': (150, 600, 600, 1080), 'kanat_sag': (660, 600, 1080, 1060)}
wing_masks = []
for nm, (x0, y0, x1, y1) in boxes.items():
    m = np.zeros((h, w), np.uint8); m[y0:y1, x0:x1] = greenish[y0:y1, x0:x1]
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (31, 31)))
    m = ndi.binary_fill_holes(m).astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((9, 9), np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats(m)
    k = max(range(1, n), key=lambda i: st[i, 4]); m = (lab == k).astype(np.uint8)
    wing_masks.append(m); save(nm + '.png', cut(S, m)); print(nm, st[k].tolist())

# 2) gözler: yüz bölgesindeki koyu kahve yuvarlaklar
hsv = cv2.cvtColor(H[..., :3], cv2.COLOR_RGB2HSV)
dark = ((hsv[..., 2] < 110) & (H[..., 3] > 200)).astype(np.uint8)
dark[: int(h * .08)] = 0; dark[int(h * .45):] = 0
dark = cv2.morphologyEx(dark, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
n, lab, st, cen = cv2.connectedComponentsWithStats(dark)
cand = [(i, st[i]) for i in range(1, n) if 2000 < st[i, 4] < 9000 and st[i, 2] < 200 and .6 < st[i, 2] / st[i, 3] < 1.6]
print('göz adayları', [(i, s.tolist()) for i, s in cand])
cand = sorted(cand, key=lambda t: -t[1][4])[:2]
cand = sorted(cand, key=lambda t: t[1][0])
eye_all = np.zeros((h, w), np.uint8)
for k, (i, s) in enumerate(cand):
    em = cv2.dilate((lab == i).astype(np.uint8), np.ones((9, 9), np.uint8))
    save(['goz_sol', 'goz_sag'][k] + '.png', cut(H, em)); eye_all |= em

# 3) kel baş: gözleri çevreden doldur (inpaint). Gaga/ağız ayrı kalır, bu sürümde başta.
fill = cv2.dilate(eye_all, np.ones((11, 11), np.uint8))
bald = cv2.inpaint(np.ascontiguousarray(H[..., :3]), fill, 9, cv2.INPAINT_TELEA)
Hb = H.copy(); Hb[..., :3] = np.where(fill[..., None] > 0, bald, H[..., :3])
save('bas_kel.png', Hb); save('govde.png', G)

# 4) önizleme: parçalar tekrar birleşir; yeşil = kel baş + gözler (gözler 6 px kayık, kayma testi)
rec = over(over(G, Hb), np.where(eye_all[..., None] > 0, H, 0).astype(np.uint8))
for wm in wing_masks: rec = over(rec, cut(S, wm))
bg = np.zeros((h, w, 4), np.uint8); bg[:] = (235, 245, 238, 255)
shift = np.roll(np.where(eye_all[..., None] > 0, H, 0).astype(np.uint8), 6, axis=1)
shifted = over(over(over(G, Hb), shift), np.zeros_like(S))
save('onizleme_birlesik.png', over(bg, rec)); save('onizleme_kayik_goz.png', over(bg, shifted))
save('onizleme_kel_bas.png', over(bg, Hb))
