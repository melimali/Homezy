exec(open('/tmp/claude-0/v6/w/masks.py').read())
import pickle
B={'asma':(0,120,330,750),'rafbitki':(600,280,852,780),'pencerebitki':(40,840,315,1160),'sehpabitki':(560,875,740,995),
 'kupa1':(462,622,562,745),'kupa2':(552,622,650,745),'kitapust':(548,420,700,574),'kitapalt':(652,622,775,754),'battaniye':(440,1170,845,1580)}
out={}
for v,f in F.items():
  rgb=np.asarray(Image.open(D+f).convert('RGB')); hsv=cv2.cvtColor(rgb,cv2.COLOR_RGB2HSV)
  g_shape=rgb.shape[:2]; globals()['g_shape']=g_shape; globals()['DK']={'sabah':60,'aksam':55,'gece':42}[v]
  M=A[v]; m={}
  bb={k:tb(M,b) for k,b in B.items()}
  m['asma']=plant(rgb,hsv,bb['asma'],night=(v=='gece'))
  # ropes + hook: dark lines in upper triangle
  x0,y0,x1,y1=bb['asma']; top=y0; 
  rope=dark(rgb)*boxm(g_shape,(x0+60,y0,x0+240,y0+170)); rope=cv2.dilate(rope,np.ones((7,7),np.uint8))
  n,l,st,_=cv2.connectedComponentsWithStats(rope,8); keep=np.zeros_like(rope)
  for i in range(1,n):
    if st[i,4]>400: keep[l==i]=1
  m['asma']=m['asma']|keep
  m['rafbitki']=plant(rgb,hsv,bb['rafbitki'],night=(v=='gece'))
  pb=plant(rgb,hsv,bb['pencerebitki'],night=(v=='gece'),minx=25,fr=0.75 if v=='aksam' else 0.6)
  sy=int(tb(M,(0,1008,10,1008))[1]); pb[:sy]=0; m['pencerebitki']=pb
  m['sehpabitki']=plant(rgb,hsv,bb['sehpabitki'],grow=4,night=(v=='gece'))
  for k in ['kupa1','kupa2','kitapust','kitapalt']: m[k]=gcut(rgb,bb[k])
  mug=gcut(rgb,tb(M,(505,490,604,576)))
  m['kitapust']=m['kitapust']&(1-cv2.dilate(mug,np.ones((17,17),np.uint8)))
  for k in ['kupa1','kupa2']:
    mm=cv2.dilate(m[k],cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(13,13)))
    ys,xs=np.where(m[k]>0); cx=int(xs.mean()); top=ys.min()
    hk=dark(rgb)*boxm(g_shape,(cx-22,top-34,cx+22,top+4)); hk=cv2.dilate(hk,np.ones((5,5),np.uint8))
    m[k]=fill_holes(mm|hk)
  m['rafbitki']=m['rafbitki']&(1-cv2.erode(m['kitapust']|m['kitapalt'],np.ones((9,9),np.uint8)))
  del m['kitapalt']
  for k in list(m):
    n,l,st,_=cv2.connectedComponentsWithStats(m[k],8)
    if n>2:
      big=st[1:,4].max(); keep=np.zeros_like(m[k])
      for i in range(1,n):
        if st[i,4]>=0.03*big: keep[l==i]=1
      m[k]=keep
  out[v]=(m,bb)
  # viz
  col=rgb.copy().astype(float)
  pal=[(255,0,0),(0,0,255),(255,0,255),(0,255,255),(255,128,0),(0,255,0),(255,255,0),(128,0,255),(0,128,128)]
  for (k,mm),c in zip(m.items(),pal):
    col[mm>0]=col[mm>0]*0.45+np.array(c)*0.55
  Image.fromarray(col.astype(np.uint8)).save(O+f'mk_{v}.png')
pickle.dump(out,open(O+'masks.pkl','wb'))
T=[]
for v,(m,bb) in out.items():
  rgb=np.asarray(Image.open(D+F[v]).convert('RGB'))
  row=[]
  for k,mm in m.items():
    ys,xs=np.where(mm>0); x0,x1,y0,y1=xs.min(),xs.max(),ys.min(),ys.max()
    c=np.full((y1-y0+1,x1-x0+1,3),(255,0,255),np.uint8); sub=mm[y0:y1+1,x0:x1+1]>0
    c[sub]=rgb[y0:y1+1,x0:x1+1][sub]
    im=Image.fromarray(c); im.thumbnail((200,300)); row.append(im)
  T.append(row)
S=Image.new('RGB',(200*7,300*3),(30,30,30))
for r,row in enumerate(T):
  for i,im in enumerate(row): S.paste(im,(i*200,r*300))
S.save(O+'cut.png')
