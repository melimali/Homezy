import json
from PIL import Image
OUT='/tmp/claude-0/v6/out/'
meta=json.load(open(OUT+'meta.json'))
DEG={'asma':1.4,'rafbitki':1.2,'pencerebitki':3,'sehpabitki':2.5,'kupa1':4,'kupa2':-4,'kitapust':1.5}
rows=[]
for v in ['sabah','aksam','gece']:
  for sgn in [1,-1]:
    im=Image.open(OUT+f'{v}_taban.webp').convert('RGBA')
    for k,mt in meta[v].items():
      sp=Image.open(OUT+f'{v}_{k}.webp').convert('RGBA')
      x,y,w,h=mt['box']; px,py=mt['pivot']
      L=Image.new('RGBA',im.size,(0,0,0,0)); L.paste(sp,(x,y))
      L=L.rotate(DEG[k]*sgn,resample=Image.BICUBIC,center=(px,py))
      im.alpha_composite(L)
    rows.append(im.convert('RGB').crop((0,80,852,1200)))
S=Image.new('RGB',(852*6,1120))
for i,r in enumerate(rows): S.paste(r,(i*852,0))
S.resize((852*6//3,1120//3)).save('/tmp/claude-0/v6/w/chk.png')
rows[0].save('/tmp/claude-0/v6/w/chk_full.png')
