"""Moka webp'lerinde bitki arkasında kalan beyaz/mavimsi arka plan lekelerini şeffaflaştırır (yerinde).
Kullanım: python3 scripts/clean-moka-bg-patches.py plants cozy_plant sunny_plant
Sadece şeffaf alana değen, açık ve soğuk tonlu bileşenler silinir; göz parıltısı gibi kapalı alanlar kalır."""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage as nd

for n in sys.argv[1:]:
    p = f'assets/moka/moka_{n}.webp'
    a = np.array(Image.open(p).convert('RGBA')).astype(int)
    r, g, b, al = a[..., 0], a[..., 1], a[..., 2], a[..., 3]
    solid = al > 40
    pale = solid & (r + g + b > 470) & (b >= r - 14)
    lab, k = nd.label(pale)
    touch = nd.binary_dilation(~solid, iterations=2)
    kill = np.isin(lab, [i for i in range(1, k + 1) if (touch & (lab == i)).any() or ((lab == i).sum() > 250 and nd.center_of_mass(lab == i)[1] > a.shape[1] * 0.62)])
    kill = nd.binary_dilation(kill, iterations=2) & solid & (r + g + b > 400) & (b >= r - 25)
    a[..., 3][kill] = 0
    soft = nd.gaussian_filter((a[..., 3] > 0).astype(float), 0.6)
    a[..., 3] = np.minimum(a[..., 3], (soft * 255).astype(int))
    Image.fromarray(a.astype(np.uint8), 'RGBA').save(p, lossless=True)
    print(n, int(kill.sum()))
