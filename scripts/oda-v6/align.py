import sys
from PIL import Image
import numpy as np, cv2
D='/mnt/user-data/uploads/moka-oda/v6/teslim/'
def gray(f):
  g=cv2.cvtColor(np.asarray(Image.open(D+f).convert('RGB')),cv2.COLOR_RGB2GRAY)
  g=cv2.createCLAHE(3,(8,8)).apply(g)
  e=cv2.Canny(cv2.GaussianBlur(g,(5,5),0),60,150)
  return cv2.GaussianBlur(e.astype(np.float32),(0,0),6)
s=gray('01 taban-sabah.png')
res={}
for f in ['02 taban-aksam.png','03 taban-gece.png']:
  x=gray(f)
  best=None
  for mode in [cv2.MOTION_AFFINE, cv2.MOTION_HOMOGRAPHY]:
    W=np.eye(3,dtype=np.float32)[:2 if mode!=cv2.MOTION_HOMOGRAPHY else 3]
    try:
      cc,W=cv2.findTransformECC(s,x,W,mode,(cv2.TERM_CRITERIA_EPS|cv2.TERM_CRITERIA_COUNT,300,1e-6),None,1)
    except Exception as e: print(f,mode,'fail',e); continue
    print(f, mode, cc, W.round(4).tolist())
    np.save(f'/tmp/claude-0/v6/w/{f[:2]}_{mode}.npy',W)
