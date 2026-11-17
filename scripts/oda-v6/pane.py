from PIL import Image
import numpy as np, cv2, json
D='/mnt/user-data/uploads/moka-oda/v6/teslim/'; OUT='/tmp/claude-0/v6/out/'
F={'sabah':'01 taban-sabah.png','aksam':'02 taban-aksam.png','gece':'03 taban-gece.png'}
res={}
viz=[]
for v,f in F.items():
  rgb=np.asarray(Image.open(D+f).convert('RGB')); hsv=cv2.cvtColor(rgb,cv2.COLOR_RGB2HSV)
  H,S,V=[hsv[...,i].astype(int) for i in range(3)]
  g=cv2.cvtColor(rgb,cv2.COLOR_RGB2GRAY)
  win=np.zeros(g.shape,np.uint8); win[150:1020,0:240]=1
  dk=(g<{'sabah':70,'aksam':65,'gece':16}[v]).astype(np.uint8)
  wood=((H>=3)&(H<=22)&(S>80)).astype(np.uint8)
  free=((1-cv2.dilate(dk,np.ones((3,3),np.uint8)))&(1-wood)&win).astype(np.uint8)
  seed=((((H>=80)&(H<=130)&(S>25))|((S<40)&(V>200)))&(win>0)).astype(np.uint8)
  n,l,st,_=cv2.connectedComponentsWithStats(free,4)
  ids=set(np.unique(l[(seed>0)&(free>0)]))-{0}
  pane=np.isin(l,list(ids)).astype(np.uint8)
  pane=cv2.morphologyEx(pane,cv2.MORPH_CLOSE,np.ones((5,5),np.uint8))
  # remove sprite overlaps (leaves) are excluded already by outlines
  ys,xs=np.where(pane>0); x0,x1,y0,y1=xs.min(),xs.max()+1,ys.min(),ys.max()+1
  a=cv2.GaussianBlur(pane*255,(0,0),0.8).astype(np.uint8)
  Image.fromarray(np.dstack([np.full((y1-y0,x1-x0,3),255,np.uint8),a[y0:y1,x0:x1]]),'RGBA').save(OUT+f'{v}_cam.webp',lossless=True)
  # pane cells (rects) for particles: connected comps of pane, bbox
  n2,l2,st2,_=cv2.connectedComponentsWithStats(pane,8)
  cells=[[int(a) for a in st2[i,:4]] for i in range(1,n2) if st2[i,4]>1500]
  res[v]={'box':[int(x0),int(y0),int(x1-x0),int(y1-y0)],'cells':cells}
  vz=rgb.copy(); vz[pane>0]=(vz[pane>0]*0.3+np.array([255,0,255])*0.7).astype(np.uint8)
  viz.append(Image.fromarray(vz[100:1100,0:400]))
json.dump(res,open(OUT+'cam.json','w'))
print(json.dumps(res))
S=Image.new('RGB',(1200,1000))
for i,im in enumerate(viz): S.paste(im,(i*400,0))
S.resize((600,500)).save('/tmp/claude-0/v6/w/pane.png')
