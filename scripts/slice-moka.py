"""Moka sticker sayfalarını (4x3, soldan sağa, yukarıdan aşağı) tek tek saydam PNG'lere böler.

Kullanım: python3 scripts/slice-moka.py <ifadeler.png> <temizlik.png> assets/moka
Gerekli: pip install pillow numpy scipy
"""
import sys, numpy as np
from PIL import Image
from scipy import ndimage as nd

EXPRESSIONS='happy sleepy shocked analyzing sassy party cozy_plant chef wink panicked begging blanket'
CHORES='sweeping dusting laundry mirror dishes maintenance plants trash rest checklist vacuuming sparkling_complete'
SHEETS={sys.argv[1]: EXPRESSIONS, sys.argv[2]: CHORES}
out=sys.argv[3]; S=512; PAD=10
for path,names in SHEETS.items():
    names=names.split()
    a=np.asarray(Image.open(path).convert('RGB')).astype(np.int16)
    H,W,_=a.shape; ch,cw=H/3,W/4
    mn=a.min(2)
    white=mn>=238
    lab,n=nd.label(white)
    border=set(np.unique(np.concatenate([lab[0],lab[-1],lab[:,0],lab[:,-1]])))-{0}
    bg=np.isin(lab,list(border))
    fg=~bg
    fg=nd.binary_opening(fg,iterations=1)
    alpha=np.where(fg,255,np.clip((250-mn)*10,0,255)).astype(np.uint8)
    alpha[~nd.binary_dilation(fg,iterations=2)]=0
    grp,k=nd.label(nd.binary_dilation(fg,iterations=4))
    cells={i:np.zeros_like(fg) for i in range(12)}
    for j,sl in enumerate(nd.find_objects(grp),1):
        m=(grp[sl]==j)&fg[sl]
        if m.sum()<30: continue
        ys,xs=np.nonzero(m); cy=ys.mean()+sl[0].start; cx=xs.mean()+sl[1].start
        i=int(cy//ch)*4+int(cx//cw)
        assert (sl[0].stop-sl[0].start)<ch*1.1 and (sl[1].stop-sl[1].start)<cw*1.1
        cells[i][sl]|= (grp[sl]==j)
    rgba=np.dstack([a.astype(np.uint8),alpha])
    for i,name in enumerate(names):
        ys,xs=np.nonzero(cells[i]&(alpha>0))
        y0,y1,x0,x1=ys.min(),ys.max()+1,xs.min(),xs.max()+1
        crop=rgba[y0:y1,x0:x1].copy()
        crop[...,3]=np.where(cells[i][y0:y1,x0:x1],crop[...,3],0)
        im=Image.fromarray(crop,'RGBA')
        s=(S-2*PAD)/max(im.size); im=im.resize((max(1,round(im.width*s)),max(1,round(im.height*s))),Image.LANCZOS)
        c=Image.new('RGBA',(S,S),(0,0,0,0)); c.paste(im,((S-im.width)//2,S-PAD-im.height))
        # Düz renkli çizim: 256 renge indirmek boyutu ~5 kat küçültür.
        c.quantize(256,method=Image.Quantize.FASTOCTREE,dither=Image.Dither.NONE).save(f'{out}/moka_{name}.png',optimize=True)
        print(name,(x0,y0,x1,y1))
