import pickle, json
from PIL import Image
import numpy as np, cv2
V6='/mnt/user-data/uploads/moka-oda/v6/'; D=V6+'teslim/'; O='/tmp/claude-0/v6/w/'; OUT='/tmp/claude-0/v6/out/'
F={'sabah':'01 taban-sabah.png','aksam':'02 taban-aksam.png','gece':'03 taban-gece.png'}
A={'sabah':np.array([[1,0,0],[0,1,0]],float),'aksam':np.load(O+'02_2.npy'),'gece':np.load(O+'03_2.npy')}
meta=json.load(open(OUT+'meta.json')); cam=json.load(open(OUT+'cam.json'))
out=pickle.load(open(O+'masks.pkl','rb'))
def tp(v,x,y):
  M=A[v]; return [round(M[0,0]*x+M[0,1]*y+M[0,2]),round(M[1,0]*x+M[1,1]*y+M[1,2])]
def tbx(v,b):
  x,y,w,h=b; p=tp(v,x,y); q=tp(v,x+w,y+h); return [p[0],p[1],q[0]-p[0],q[1]-p[1]]
# sabah reference points
PTS={'seat':(400,1330),'lamp':(785,850),'chemex':(466,452),'mug':(553,503),'moon':(0,0)}
HIT={'lamba':(690,770,162,170),'kupa':(462,610,190,135),'surahi':(405,430,115,145),'bitki':(560,880,180,170),'pencere':(0,300,215,710)}
res={}
for v in F:
  rgb=np.asarray(Image.open(D+F[v]).convert('RGB'))
  m,_=out[v]
  # leaf: lowest tip of hanging plant
  am=m['asma']; ys,xs=np.where(am>0); yb=ys.max(); sel=ys>yb-46; cx=int(np.median(xs[sel]))
  x0,x1,y0,y1=cx-30,cx+30,yb-46,yb+2
  sub=am[y0:y1,x0:x1].copy()
  n,l,st,_=cv2.connectedComponentsWithStats(sub,8); i=1+np.argmax(st[1:,4]); sub=(l==i).astype(np.uint8)
  a=cv2.GaussianBlur(sub*255,(0,0),0.8).astype(np.uint8); yy,xx=np.where(a>8)
  lx0,lx1,ly0,ly1=xx.min(),xx.max()+1,yy.min(),yy.max()+1
  Image.fromarray(np.dstack([rgb[y0:y1,x0:x1],a])[ly0:ly1,lx0:lx1],'RGBA').save(OUT+f'{v}_yaprak.webp',quality=90)
  pts={k:tp(v,*p) for k,p in PTS.items()}
  if v=='gece':
    # moon: brightest blob in pane
    g=cv2.cvtColor(rgb,cv2.COLOR_RGB2GRAY); w=np.zeros_like(g); w[300:1000,0:220]=g[300:1000,0:220]
    yy,xx=np.where(w>215); pts['moon']=[int(xx.mean()),int(yy.mean())]
  else: pts.pop('moon')
  res[v]={'parts':meta[v],'cam':cam[v],'pts':pts,'hit':{k:tbx(v,b) for k,b in HIT.items()},
          'yaprak':[int(lx1-lx0),int(ly1-ly0)],'chain':[tp(v,330,392),tp(v,690,392)]}
json.dump(res,open(OUT+'oda.json','w'),indent=1)
# particles
def cell(f,c,r,n,sz):
  im=Image.open(V6+f).convert('RGBA'); w,h=im.size; cw,ch=w//n[0],h//n[1]
  t=im.crop((c*cw,r*ch,(c+1)*cw,(r+1)*ch)); t=t.crop(t.getbbox()); t.thumbnail((sz,sz)); return t
cell('parcacik_kar.png',3,0,(4,4),48).save(OUT+'p_kar.webp',quality=92)
cell('parcacik_damla_cam.png',3,0,(4,4),48).save(OUT+'p_damla.webp',quality=92)
b=Image.open(V6+'parcacik_buhar.png').convert('RGBA'); b=b.crop((0,0,b.size[0]//3+20,b.size[1])); b=b.crop(b.getbbox()); b.thumbnail((60,160)); b.save(OUT+'p_buhar.webp',quality=92)
y=Image.open(V6+'parcacik_yildiz.png').convert('RGBA'); y=y.crop(y.getbbox()); y.thumbnail((64,64)); y.save(OUT+'p_yildiz.webp',quality=92)
r=Image.open(V6+'parcacik_yagmur_cizgi.png').convert('RGBA'); r=r.crop(r.getbbox()); r.thumbnail((16,128)); r.save(OUT+'p_yagmur.webp',quality=92)
c=cell('parcacik_bulut.png',0,0,(4,1),220); c.save(OUT+'p_bulut.webp',quality=92)
for f in ['p_kar','p_damla','p_buhar','p_yildiz','p_yagmur','p_bulut']: print(f, Image.open(OUT+f+'.webp').size)
print(json.dumps({v:(res[v]['pts'],res[v]['yaprak']) for v in res}))
