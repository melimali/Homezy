import os, re, glob, shutil
from PIL import Image
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
tot0=tot1=0
"""Moka sticker kaynaklarını (assets-src/moka/*.png) uygulamaya giren WebP'ye çevirir (assets/moka/*.webp)."""
for src in glob.glob('assets-src/moka/**/*.png', recursive=True):
    dst = src.replace('assets-src/moka', 'assets/moka', 1)[:-4] + '.webp'
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    Image.open(src).save(dst, 'WEBP', quality=90, alpha_quality=100, method=6)
    tot0 += os.path.getsize(src); tot1 += os.path.getsize(dst)
print(tot0 // 1024, 'KB ->', tot1 // 1024, 'KB')
