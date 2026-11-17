import pickle, json
from PIL import Image
import numpy as np, cv2
D='/mnt/user-data/uploads/moka-oda/v6/teslim/'; O='/tmp/claude-0/v6/w/'; OUT='/tmp/claude-0/v6/out/'
F={'sabah':'01 taban-sabah.png','aksam':'02 taban-aksam.png','gece':'03 taban-gece.png'}
out=pickle.load(open(O+'masks.pkl','rb'))
meta={}
for v,(m,bb) in out.items():
  rgb=np.asarray(Image.open(D+F[v]).convert('RGB'))
  U=np.zeros(rgb.shape[:2],np.uint8)
  for k,mm in m.items(): U|=mm
  U=cv2.dilate(U,np.ones((5,5),np.uint8))
  base=cv2.inpaint(np.ascontiguousarray(rgb[...,::-1]),U*255,9,cv2.INPAINT_TELEA)[...,::-1]
  Image.fromarray(base).save(OUT+f'{v}_taban.webp',quality=84,method=6)
  meta[v]={}
  for k,mm in m.items():
    a=cv2.GaussianBlur((mm*255).astype(np.uint8),(0,0),1.0)
    a=np.maximum(a,(cv2.erode(mm,np.ones((3,3),np.uint8))*255).astype(np.uint8))
    ys,xs=np.where(a>8); x0,x1,y0,y1=int(xs.min()),int(xs.max())+1,int(ys.min()),int(ys.max())+1
    rgba=np.dstack([rgb[y0:y1,x0:x1],a[y0:y1,x0:x1]])
    Image.fromarray(rgba,'RGBA').save(OUT+f'{v}_{k}.webp',quality=90,method=6)
    my,mx=np.where(mm>0)
    if k=='asma': t=my.min(); px=float(mx[my<t+6].mean()); py=float(t)
    elif k in('kupa1','kupa2'): t=my.min(); px=float(mx[my<t+6].mean()); py=float(t)
    elif k=='pencerebitki': t=my.min(); px=float(mx[my<t+10].mean()); py=float(t)
    elif k=='rafbitki': px=float(x0+(x1-x0)*0.6); py=float(y0+(y1-y0)*0.18)
    elif k=='sehpabitki': px=float((x0+x1)/2); py=float(y1)
    elif k=='kitapust': px=float(x0+8); py=float(y1)
    meta[v][k]={'box':[x0,y0,x1-x0,y1-y0],'pivot':[round(px),round(py)]}
json.dump(meta,open(OUT+'meta.json','w'),indent=1)
print(json.dumps(meta))
