import subprocess, sys, os
from PIL import Image, ImageDraw, ImageFont, ImageFilter
D = sys.argv[1]; os.chdir(D)
W, H = 1080, 1920
NAVY = (40, 48, 68); CLAY = (150, 78, 52); CREAM = (251, 239, 227); BROWN = (139, 120, 109)

def font(name, size, wght):
    f = ImageFont.truetype(name, size)
    try: f.set_variation_by_axes([wght])
    except Exception as e: print('var fail', e)
    return f

def center(d, y, text, f, fill):
    w = d.textlength(text, font=f)
    d.text(((W - w) / 2, y), text, font=f, fill=fill)

def scrim():
    g = Image.new('L', (1, H), 0)
    for y in range(H):
        t = y / 760
        a = 235 if t < 0.45 else max(0, int(235 * (1 - (t - 0.45) / 0.55)))
        g.putpixel((0, y), a)
    s = Image.new('RGBA', (W, H), CREAM + (0,))
    s.putalpha(g.resize((W, H)))
    return s

def title(out, l1, l2):
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    f = font('Baloo2.ttf', 92, 800)
    center(d, 170, l1, f, NAVY + (255,))
    center(d, 278, l2, f, CLAY + (255,))
    im.save(out)

scrim().save('scrim.png')
title('tA.png', 'Evin hep böyle', 'huzurlu olsa?')
title('tB.png', 'Ev işleri artık', 'keyifli bir rutin')
title('tC.png', 'Her gün küçük bir adım,', 'kocaman bir huzur')

# end card
bg = Image.new('RGB', (W, H), CREAM)
glow = Image.new('L', (W, H), 0)
ImageDraw.Draw(glow).ellipse((90, 330, 990, 1230), fill=150)
glow = glow.filter(ImageFilter.GaussianBlur(190))
bg.paste(Image.new('RGB', (W, H), (245, 214, 190)), (0, 0), glow)
bg.save('endbg.png')
fg = Image.new('RGBA', (W, H), (0, 0, 0, 0))
S = 440; x0 = (W - S) // 2; y0 = 440
ic = Image.open('icon.png').convert('RGB').resize((S, S), Image.LANCZOS)
m = Image.new('L', (S * 4, S * 4), 0)
ImageDraw.Draw(m).rounded_rectangle((0, 0, S * 4 - 1, S * 4 - 1), radius=int(S * 0.225 * 4), fill=255)
m = m.resize((S, S), Image.LANCZOS)
sh = Image.new('RGBA', (W, H), (0, 0, 0, 0))
sm = Image.new('L', (W, H), 0); sm.paste(m, (x0, y0 + 26))
sm = sm.filter(ImageFilter.GaussianBlur(34))
sh.paste(Image.new('RGBA', (W, H), NAVY + (255,)), (0, 0), sm.point(lambda v: int(v * 0.38)))
fg = Image.alpha_composite(fg, sh)
fg.paste(ic, (x0, y0), m)
lg = Image.open('logo-yatay.png').convert('RGBA')
lw = 700; lg = lg.resize((lw, int(lg.height * lw / lg.width)), Image.LANCZOS)
fg.alpha_composite(lg, ((W - lw) // 2, 940))
d = ImageDraw.Draw(fg)
center(d, 1192, 'Evin, Moka’yla daha keyifli', font('Nunito.ttf', 56, 700), NAVY + (255,))
pf = font('Nunito.ttf', 42, 800); pt = 'App Store  ·  Google Play'
pw = d.textlength(pt, font=pf) + 110; px = (W - pw) / 2; py = 1320
d.rounded_rectangle((px, py, px + pw, py + 96), radius=48, fill=NAVY + (255,))
center(d, py + 19, pt, pf, (251, 239, 227, 255))
fg.save('endfg.png')

# timeline
FADE = 0.4
dA, dB, dP, dC, dE = 4.0, 3.0, 14.7, 3.0, 3.6
o1 = dA - FADE; o2 = o1 + dB - FADE; o3 = o2 + dP - FADE; o4 = o3 + dC - FADE
total = o4 + dE
px = "980*min(7\\,floor(max(t-0.4\\,0)/1.8)+(3-2*clip((mod(max(t-0.4\\,0)\\,1.8)-1.3)/0.5\\,0\\,1))*pow(clip((mod(max(t-0.4\\,0)\\,1.8)-1.3)/0.5\\,0\\,1)\\,2))"

def clip(i, s, t, d):
    return (f"[{i}:v]trim=0:{d},setpts=PTS-STARTPTS,fps=30,scale={W}:{H}:flags=lanczos,setsar=1[v{i}];"
            f"[{s}:v]format=rgba,fade=t=in:st=0.15:d=0.5:alpha=1[s{i}];"
            f"[{t}:v]format=rgba,fade=t=in:st=0.35:d=0.5:alpha=1[t{i}];"
            f"[v{i}][s{i}]overlay=0:0[vs{i}];"
            f"[vs{i}][t{i}]overlay=x=0:y='-26*pow(1-clip((t-0.35)/0.6\\,0\\,1)\\,3)',format=yuv420p[c{i}];")

fc = (clip(0, 3, 4, dA) + clip(1, 3, 5, dB) + clip(2, 3, 6, dC) +
      f"[7:v]fps=30,crop={W}:{H}:x='{px}':y=50,setsar=1,format=yuv420p[p];"
      f"[9:v]format=rgba,fade=t=in:st=0.3:d=0.6:alpha=1[ef];"
      f"[8:v][ef]overlay=x=0:y='-40*pow(1-clip((t-0.3)/0.8\\,0\\,1)\\,3)',fps=30,format=yuv420p,fade=t=out:st={dE-0.5}:d=0.5:color=0xFBEFE3[e];"
      f"[c0][c1]xfade=transition=fade:duration={FADE}:offset={o1}[x1];"
      f"[x1][p]xfade=transition=smoothup:duration={FADE}:offset={o2}[x2];"
      f"[x2][c2]xfade=transition=fade:duration={FADE}:offset={o3}[x3];"
      f"[x3][e]xfade=transition=fade:duration={FADE}:offset={o4}[vout];"
      f"[10:a]atrim=0:{total},afade=t=in:d=0.5,afade=t=out:st={total-2.0}:d=2.0,volume=1.0[m];"
      f"[11:a]adelay={int((o3+0.2)*1000)}:all=1,volume=0.45[fx];"
      f"[m][fx]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95[aout]")
L = lambda f, d: ['-loop', '1', '-framerate', '30', '-t', str(d), '-i', f]
cmd = (['ffmpeg', '-v', 'error', '-y', '-i', 'a.mp4', '-i', 'b.mp4', '-i', 'c.mp4']
       + L('scrim.png', 4.1) + L('tA.png', 4.1) + L('tB.png', 4.1) + L('tC.png', 4.1)
       + L('pano.jpg', dP) + L('endbg.png', dE) + L('endfg.png', dE)
       + ['-i', 'lofi.mp3', '-i', 'done.wav', '-filter_complex', fc, '-map', '[vout]', '-map', '[aout]',
          '-t', str(total), '-r', '30', '-c:v', 'libx264', '-preset', sys.argv[2] if len(sys.argv) > 2 else 'medium',
          '-crf', '17', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-c:a', 'aac', '-b:a', '192k',
          '-movflags', '+faststart', 'homezy-tanitim.mp4'])
print('total', total)
subprocess.run(cmd, check=True)
