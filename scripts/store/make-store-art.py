"""Homezy mağaza görselleri (TR + EN). Gerçek uygulama ekranlarını telefon çerçevesine koyar.

Önce ham ekranlar yakalanmalı (bkz. scripts/store/README.md):  docs/magaza/ham/<lang>/<ad>.png  (1290x2796)
Kullanım:  python3 scripts/store/make-store-art.py [RAW_DIR] [FONT_DIR]
Çıktı:     docs/magaza/<lang>/{play,ios-6.7,ios-6.5,ios-5.5}/NN-ad.png, feature-graphic.png, play-icon-512.png
"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[2]
RAW = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "docs/magaza/ham"
FD = Path(sys.argv[2]) if len(sys.argv) > 2 else ROOT / "node_modules/@expo-google-fonts"
OUT = ROOT / "docs/magaza"
MOKA = ROOT / "assets/moka"

NAVY, MUTED = (40, 48, 68), (92, 85, 104)

def font(name, size):
    return ImageFont.truetype(str(next(FD.rglob(name))), size)

H_FONT = lambda s: font("Baloo2_700Bold.ttf", s)
B_FONT = lambda s: font("Nunito_700Bold.ttf", s)

def hexrgb(h):
    h = h.lstrip("#"); return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))

# ad, moka pozu, moka tarafı, gradyan (üst, alt), ikinci satır rengi
SLIDES = [
    ("01-moka", "happy", "R", ("#FDEBDD", "#F6D2BD"), "#A5543E"),
    ("02-plan", "checklist", "L", ("#E4F1E8", "#CBE3D3"), "#3F7A5A"),
    ("03-bugun", "thumbs_up", "R", ("#E0ECF4", "#C4DAEA"), "#3F6F94"),
    ("04-yemek", "chef", "L", ("#FCF0D2", "#F4DDA6"), "#A0701F"),
    ("05-ev", "home_seated", "R", ("#E9E2F3", "#D6CBEA"), "#6B4FA0"),
    ("06-bahce", "watering", "L", ("#DDEFE0", "#BFE0C6"), "#3B7A47"),
    ("07-sohbet", "laptop", "R", ("#FDE6E1", "#F6CBC3"), "#B0493F"),
    ("08-dolap", "mirror", "L", ("#E1EEF2", "#C3DDE5"), "#2F7488"),
]
SHOT = {"01-moka": "home", "02-plan": "tanisma", "03-bugun": "bugun", "04-yemek": "yemek",
        "05-ev": "ev3d", "06-bahce": "bahce", "07-sohbet": "moka", "08-dolap": "dolap"}

TEXT = {
    "tr": {
        "01-moka": ("Moka seni her gün", "biraz daha tanıyor", "Bütün ev hayatında yanında."),
        "02-plan": ("Evine göre", "kişisel plan", "Birkaç soru, sana özel rutinler."),
        "03-bugun": ("Bugün sadece", "bir küçük adım", "Sıradaki işi Moka seçer, sen tamamla."),
        "04-yemek": ("Bu akşam ne yesek?", "Moka bilir", "Dolabındakilerle sağlıklı, cebe dostu tarifler."),
        "05-ev": ("Yaptığın her iş", "evini büyütür", "Moka evinde dolaşır, evin kat kat yükselir."),
        "06-bahce": ("Moka'nın bahçesi", "seninle çiçek açar", "Her iş bir saksıyı büyütür."),
        "07-sohbet": ("Sor, Moka", "halletsin", "İş ekle, not al, günü planla. Sohbet etmek yeter."),
        "08-dolap": ("Gardırobun da", "cebinde", "Çamaşır uyarısı ve kombin önerisi."),
    },
    "en": {
        "01-moka": ("Moka gets to know", "you every day", "Your whole home life, together."),
        "02-plan": ("A plan made", "for your home", "A few questions, routines just for you."),
        "03-bugun": ("Just one small", "step today", "Moka picks the next task. You tick it off."),
        "04-yemek": ("What's for dinner?", "Moka has ideas", "Healthy, budget-friendly recipes from what you have."),
        "05-ev": ("Every task helps", "your home grow", "Moka roams your house. Your home rises floor by floor."),
        "06-bahce": ("Moka's garden", "blooms with you", "Every task helps a flower grow."),
        "07-sohbet": ("Just ask Moka", "and it's done", "Add tasks, take notes, plan your day by chatting."),
        "08-dolap": ("Your wardrobe,", "in your pocket", "Laundry alerts and outfit ideas."),
    },
}

# (klasör, genişlik, yükseklik)
SIZES = [("play", 1080, 1920), ("ios-6.7", 1290, 2796), ("ios-6.5", 1284, 2778), ("ios-5.5", 1242, 2208)]


def gradient(w, h, top, bot):
    t, b = hexrgb(top), hexrgb(bot)
    col = Image.new("RGB", (1, h))
    for y in range(h):
        k = y / (h - 1)
        col.putpixel((0, y), tuple(round(t[i] + (b[i] - t[i]) * k) for i in range(3)))
    return col.resize((w, h))


def blobs(img, tint):
    w, h = img.size
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    c = (255, 255, 255, 90)
    d.ellipse((w * 0.55, -h * 0.07, w * 1.25, h * 0.14), fill=c)
    d.ellipse((-w * 0.35, h * 0.62, w * 0.35, h * 0.80), fill=c)
    d.ellipse((w * 0.70, h * 0.52, w * 1.30, h * 0.66), fill=(255, 255, 255, 60))
    return Image.alpha_composite(img.convert("RGBA"), layer)


def fit_font(draw, text, maker, max_w, start):
    s = start
    while s > 20 and draw.textlength(text, font=maker(s)) > max_w:
        s -= 2
    return maker(s)


def wrap(draw, text, f, max_w):
    words, lines, cur = text.split(), [], ""
    for w in words:
        t = (cur + " " + w).strip()
        if draw.textlength(t, font=f) <= max_w: cur = t
        else: lines.append(cur); cur = w
    return lines + [cur]


def phone(shot, pw):
    """Gerçek ekran görüntüsünü yuvarlak köşeli, lacivert çerçeveli telefona koyar (alt kısım taşabilir)."""
    bez = round(pw * 0.022)
    sw = pw - 2 * bez
    sh = round(sw * shot.height / shot.width)
    scr = shot.convert("RGB").resize((sw, sh), Image.LANCZOS)
    r_out, r_in = round(pw * 0.125), round(pw * 0.125) - bez
    ph = sh + 2 * bez
    body = Image.new("RGBA", (pw, ph), (0, 0, 0, 0))
    ImageDraw.Draw(body).rounded_rectangle((0, 0, pw - 1, ph - 1), r_out, fill=NAVY + (255,))
    mask = Image.new("L", (sw, sh), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, sw - 1, sh - 1), r_in, fill=255)
    body.paste(scr, (bez, bez), mask)
    # ince iç parıltı
    ImageDraw.Draw(body).rounded_rectangle((1, 1, pw - 2, ph - 2), r_out, outline=(255, 255, 255, 40), width=2)
    return body


def make(lang, name, pose, side, grad, accent, W, H, shot_name):
    img = gradient(W, H, *grad)
    img = blobs(img, grad)
    d = ImageDraw.Draw(img)
    l1, l2, sub = TEXT[lang][name]
    maxw = W * 0.84
    f = min((fit_font(d, t, H_FONT, maxw, int(W * 0.108)) for t in (l1, l2)), key=lambda x: x.size)
    y = int(H * 0.058)
    lh = int(f.size * 0.98)
    for t, colr in ((l1, NAVY), (l2, hexrgb(accent))):
        w = d.textlength(t, font=f)
        d.text(((W - w) / 2, y), t, font=f, fill=colr)
        y += lh
    y += int(H * 0.022)
    sf = fit_font(d, max(sub.split(), key=len), B_FONT, 9999, int(W * 0.046))
    sf = B_FONT(int(W * 0.046))
    for ln in wrap(d, sub, sf, W * 0.84):
        w = d.textlength(ln, font=sf)
        d.text(((W - w) / 2, y), ln, font=sf, fill=MUTED)
        y += int(sf.size * 1.28)
    # Moka telefonun üst kenarında oturur
    mk_w = int(W * 0.27)
    gap = int(mk_w * 0.80)
    top = y + int(H * 0.012) + gap
    pw = int(W * 0.80)
    shot = Image.open(RAW / lang / f"{shot_name}.png")
    body = phone(shot, pw)
    px = (W - pw) // 2
    # gölge
    sh = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle((px + 8, top + 22, px + pw + 8, H + 400), round(pw * 0.125), fill=(40, 48, 68, 90))
    sh = sh.filter(ImageFilter.GaussianBlur(int(W * 0.022)))
    img = Image.alpha_composite(img, sh)
    img.alpha_composite(body, (px, top))
    mk = Image.open(MOKA / f"moka_{pose}.png").convert("RGBA")
    mk = mk.resize((mk_w, mk_w), Image.LANCZOS)
    mx = px + pw - mk_w - int(pw * 0.06) if side == "R" else px + int(pw * 0.06)
    img.alpha_composite(mk, (mx, top - int(mk_w * 0.80)))
    return img.convert("RGB")


def feature(lang):
    W, H = 1024, 500
    img = blobs(gradient(W, H, "#FDEBDD", "#F3CDB6"), None)
    d = ImageDraw.Draw(img)
    logo = Image.open(ROOT / "assets/icon.png").convert("RGBA").resize((96, 96))
    m = Image.new("L", (96, 96), 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, 95, 95), 24, fill=255)
    img.paste(logo, (56, 44), m)
    d.text((170, 40), "Homezy", font=H_FONT(72), fill=NAVY)
    head = {"tr": ("Moka ile ev hayatı", "daha kolay"), "en": ("Home life is easier", "with Moka")}[lang]
    sub = {"tr": "Rutinler, yemek, bahçe ve 3B ev. Hepsi tek yerde.", "en": "Routines, meals, garden and a 3D home. All in one place."}[lang]
    f = fit_font(d, head[0], H_FONT, 560, 74)
    y = 175
    d.text((56, y), head[0], font=f, fill=NAVY)
    y += int(f.size * 1.02)
    d.text((56, y), head[1], font=f, fill=(165, 84, 62))
    y += int(f.size * 1.02) + 14
    sf = B_FONT(26)
    for ln in wrap(d, sub, sf, 500):
        d.text((56, y), ln, font=sf, fill=MUTED); y += 34
    pw = 300
    body = phone(Image.open(RAW / lang / "home.png"), pw)
    img.alpha_composite(body, (690, 70))
    mk = Image.open(MOKA / "moka_happy.png").convert("RGBA").resize((190, 190), Image.LANCZOS)
    img.alpha_composite(mk, (545, 330))
    return img.convert("RGB").crop((0, 0, W, H))


def main():
    for lang in ("tr", "en"):
        base = OUT / lang
        for folder, W, H in SIZES:
            (base / folder).mkdir(parents=True, exist_ok=True)
            for name, pose, side, grad, accent in SLIDES:
                make(lang, name, pose, side, grad, accent, W, H, SHOT[name]).save(base / folder / f"{name}.png", optimize=True)
        feature(lang).save(base / "feature-graphic-1024x500.png", optimize=True)
        Image.open(ROOT / "assets/icon.png").convert("RGBA").resize((512, 512), Image.LANCZOS).save(base / "play-icon-512.png", optimize=True)
        print(lang, "ok")


if __name__ == "__main__":
    main()
