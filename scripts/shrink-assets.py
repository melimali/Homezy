"""Uygulama boyutunu dusurur: ses (mono/dusuk bitrate), JPG yeniden kodlama, buyuk PNG kucultme.
Dosya adlari ayni kalir, kod degismez. Kullanim: python scripts/shrink-assets.py"""
import glob, os, subprocess, sys
from PIL import Image
A = os.path.join(os.path.dirname(__file__), '..', 'assets')
def keep_if_smaller(src, tmp):
    if os.path.getsize(tmp) < os.path.getsize(src): os.replace(tmp, src)
    else: os.remove(tmp)
# ses: ortam sesleri mono 48k, muzik stereo 64k
MUSIC = {'lofi', 'piano-calm', 'emotional', 'emotional-roma'}
for f in glob.glob(f'{A}/sounds/*.mp3'):
    n = os.path.basename(f)[:-4]
    ch, br = ('2', '64k') if n in MUSIC else ('1', '48k')
    tmp = f + '.tmp.mp3'
    subprocess.run(['ffmpeg','-y','-loglevel','error','-i',f,'-ac',ch,'-ar','44100','-b:a',br,tmp], check=True)
    keep_if_smaller(f, tmp)
# jpg
for d, maxw in (('scenes', 960), ('arkaplan', 1000), ('rooms', 740), ('bahce', 853)):
    for f in glob.glob(f'{A}/{d}/*.jpg'):
        im = Image.open(f).convert('RGB')
        if im.width > maxw: im = im.resize((maxw, round(im.height*maxw/im.width)), Image.LANCZOS)
        tmp = f + '.tmp.jpg'
        im.save(tmp, 'JPEG', quality=78, optimize=True, progressive=True)
        keep_if_smaller(f, tmp)
# png: buyuk olanlari kucult / paletle
def png(name, maxw=None, colors=None):
    f = f'{A}/{name}'; im = Image.open(f)
    if maxw and im.width > maxw: im = im.resize((maxw, round(im.height*maxw/im.width)), Image.LANCZOS)
    if colors:
        im = im.convert('RGBA').quantize(colors, method=Image.FASTOCTREE, dither=Image.FLOYDSTEINBERG)
    tmp = f + '.tmp.png'; im.save(tmp, 'PNG', optimize=True); keep_if_smaller(f, tmp)
png('splash-moka.png', 700, 256); png('logo-kare.png', 1024, 256); png('logo-yatay.png', 900, 256)
png('meikai-mark.png', 512, 256)
for f in glob.glob(f'{A}/badges/*.png'): png('badges/'+os.path.basename(f), 256, 256)
