from PIL import Image
import numpy as np, cv2, json, sys
D='/mnt/user-data/uploads/moka-oda/v6/teslim/'; O='/tmp/claude-0/v6/w/'
F={'sabah':'01 taban-sabah.png','aksam':'02 taban-aksam.png','gece':'03 taban-gece.png'}
A={'sabah':np.array([[1,0,0],[0,1,0]],float),'aksam':np.load(O+'02_2.npy'),'gece':np.load(O+'03_2.npy')}
def tb(M,b,pad=0):
  xs=[];ys=[]
  for x,y in [(b[0],b[1]),(b[2],b[1]),(b[0],b[3]),(b[2],b[3])]:
    xs.append(M[0,0]*x+M[0,1]*y+M[0,2]); ys.append(M[1,0]*x+M[1,1]*y+M[1,2])
  return (max(0,int(min(xs))-pad),max(0,int(min(ys))-pad),min(852,int(max(xs))+pad),min(1846,int(max(ys))+pad))
def fill_holes(m):
  m=m.astype(np.uint8); h,w=m.shape; ff=m.copy(); mask=np.zeros((h+2,w+2),np.uint8)
  cv2.floodFill(ff,mask,(0,0),1); return (m | (1-ff)).astype(np.uint8)
def boxm(shape,b):
  m=np.zeros(shape,np.uint8); m[b[1]:b[3],b[0]:b[2]]=1; return m
def green(hsv):
  H,S,V=[hsv[...,i].astype(int) for i in range(3)]
  return ((H>=22)&(H<=55)&(S>70)&(V>40)).astype(np.uint8)
def green2(hsv,night=False):
  H,S,V=[hsv[...,i].astype(int) for i in range(3)]
  if night: return ((H>=19)&(H<=60)&(S>60)&(V>22)).astype(np.uint8)
  return ((H>=22)&(H<=55)&(S>70)&(V>40)).astype(np.uint8)
DK=60
def dark(rgb,th=None):
  g=cv2.cvtColor(rgb,cv2.COLOR_RGB2GRAY); return (g<(th or DK)).astype(np.uint8)
def plant(rgb,hsv,b,grow=5,night=False,minx=-1,fr=0.3):
  g=green2(hsv,night)*boxm(g_shape,b)
  g=cv2.morphologyEx(g,cv2.MORPH_OPEN,np.ones((3,3),np.uint8))
  # keep components of reasonable size
  n,l,st,_=cv2.connectedComponentsWithStats(g,8); keep=np.zeros_like(g)
  dk=dark(rgb,DK)
  for i in range(1,n):
    if st[i,4]<=60 or st[i,0]<minx: continue
    x,y,w,h=st[i,:4]; X0,Y0=max(0,x-4),max(0,y-4)
    c=(l[Y0:y+h+4,X0:x+w+4]==i).astype(np.uint8)
    ring=cv2.dilate(c,np.ones((7,7),np.uint8))-c
    q=dk[Y0:y+h+4,X0:x+w+4][ring>0].mean() if ring.sum() else 0
    if q>fr: keep[l==i]=1
  m=cv2.dilate(keep,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(2*grow+1,2*grow+1)))
  m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(9,9)))
  return fill_holes(m)*boxm(g_shape,b)
def outlined(rgb,b,seed_pad=3,cl=7):
  # object = region in box not reachable from box border without crossing dark outline
  x0,y0,x1,y1=b; sub=rgb[y0:y1,x0:x1]
  dk=dark(sub); dk=cv2.morphologyEx(dk,cv2.MORPH_CLOSE,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(cl,cl)))
  free=(1-dk).astype(np.uint8); h,w=free.shape
  reach=np.zeros((h+2,w+2),np.uint8); ff=free.copy()
  for (x,y) in [(i,0) for i in range(0,w,4)]+[(i,h-1) for i in range(0,w,4)]+[(0,j) for j in range(0,h,4)]+[(w-1,j) for j in range(0,h,4)]:
    if ff[y,x]==1: cv2.floodFill(ff,reach,(x,y),2)
  obj=(ff!=2).astype(np.uint8)
  obj=cv2.morphologyEx(obj,cv2.MORPH_OPEN,np.ones((3,3),np.uint8))
  m=np.zeros(rgb.shape[:2],np.uint8); m[y0:y1,x0:x1]=obj
  return m
def colorm(hsv,b,lo,hi,smin=80):
  H,S,V=[hsv[...,i].astype(int) for i in range(3)]
  c=(((H>=lo)&(H<=hi))|((lo<0)&(H>=180+lo)))&(S>smin)
  return c.astype(np.uint8)*boxm(g_shape,b)

def ofill(rgb,b,cl=9,center=True):
  x0,y0,x1,y1=b; sub=rgb[y0:y1,x0:x1]
  dk=dark(sub); dk=cv2.morphologyEx(dk,cv2.MORPH_CLOSE,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(cl,cl)))
  n,l,st,_=cv2.connectedComponentsWithStats(dk,8)
  i=1+np.argmax(st[1:,4]); o=fill_holes((l==i).astype(np.uint8))
  o=cv2.morphologyEx(o,cv2.MORPH_OPEN,np.ones((3,3),np.uint8))
  m=np.zeros(rgb.shape[:2],np.uint8); m[y0:y1,x0:x1]=o; return m

def gcut(rgb,b,pad=14,it=6):
  x0,y0,x1,y1=b; X0,Y0,X1,Y1=max(0,x0-pad),max(0,y0-pad),min(852,x1+pad),min(1846,y1+pad)
  sub=np.ascontiguousarray(rgb[Y0:Y1,X0:X1][...,::-1])
  gm=np.full(sub.shape[:2],cv2.GC_BGD,np.uint8)
  gm[y0-Y0:y1-Y0,x0-X0:x1-X0]=cv2.GC_PR_FGD
  bg=np.zeros((1,65),np.float64); fg=np.zeros((1,65),np.float64)
  cv2.grabCut(sub,gm,None,bg,fg,it,cv2.GC_INIT_WITH_MASK)
  o=((gm==cv2.GC_FGD)|(gm==cv2.GC_PR_FGD)).astype(np.uint8)
  n,l,st,_=cv2.connectedComponentsWithStats(o,8)
  if n>1: i=1+np.argmax(st[1:,4]); o=fill_holes((l==i).astype(np.uint8))
  m=np.zeros(rgb.shape[:2],np.uint8); m[Y0:Y1,X0:X1]=o; return m
