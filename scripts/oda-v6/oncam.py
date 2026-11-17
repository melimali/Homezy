import pickle, json
from PIL import Image
import numpy as np, cv2
D='/mnt/user-data/uploads/moka-oda/v6/teslim/'; O='/tmp/claude-0/v6/w/'; OUT='/tmp/claude-0/v6/out/'
F={'sabah':'01 taban-sabah.png','aksam':'02 taban-aksam.png','gece':'03 taban-gece.png'}
out=pickle.load(open(O+'masks.pkl','rb')); cam=json.load(open(OUT+'cam.json'))
for v,f in F.items():
  rgb=np.asarray(Image.open(D+f).convert('RGB'))
  pane=np.asarray(Image.open(OUT+f'{v}_cam.webp').convert('RGBA'))[...,3]
  x,y,w,h=cam[v]['box']
  full=np.zeros(rgb.shape[:2],np.uint8); full[y:y+h,x:x+w]=pane
  m,_=out[v]; sp=np.zeros_like(full)
  for k,mm in m.items(): sp|=mm
  sp=cv2.dilate(sp,np.ones((5,5),np.uint8))
  # cover = everything in window box except pane and sprites, but only where it borders/overlaps panes (leaves, frame)
  cover=(255-full).astype(np.uint8); cover[sp>0]=0
  X0,Y0,X1,Y1=max(0,x-4),max(0,y-4),min(852,x+w+4),min(1846,y+h+4)
  rgba=np.dstack([rgb[Y0:Y1,X0:X1],cover[Y0:Y1,X0:X1]])
  Image.fromarray(rgba,'RGBA').save(OUT+f'{v}_oncam.webp',quality=90)
  print(v,[X0,Y0,X1-X0,Y1-Y0])
