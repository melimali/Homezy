from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "store-listing"
OUT.mkdir(parents=True, exist_ok=True)
W, H = 1290, 2796
BG, NAVY, MINT, CREAM, MUTED, BLUE = "#FBF4EA", "#3B3345", "#FCE8DC", "#FFFBF5", "#7A6F80", "#C57F8D"
HEAD = ImageFont.truetype(str(ROOT / "node_modules/@expo-google-fonts/baloo-2/700Bold/Baloo2_700Bold.ttf"), 100)
BODY = ImageFont.truetype(str(ROOT / "node_modules/@expo-google-fonts/nunito/700Bold/Nunito_700Bold.ttf"), 43)
SMALL = ImageFont.truetype(str(ROOT / "node_modules/@expo-google-fonts/nunito/800ExtraBold/Nunito_800ExtraBold.ttf"), 29)

items = [
    ("1-evin-tek-yerde.png", "1-ana-ekran.png", "moka_home_seated.png", "Evin senin gibi", "sıcak olsun.", "Odaların, işlerin ve Moka tek yumuşak ekranda."),
    ("2-gunluk-rutin.png", "4-bugun.png", "moka_checklist.png", "Küçük işler,", "büyük huzur.", "Bugün sadece sana yetecek kadar; gerisi bekleyebilir."),
    ("3-oda-rutinleri.png", "3-odalar-mutfak.png", "moka_sweeping.png", "Her oda için", "kendi rutini.", "İşleri odalara göre takip et, tamamladıkça işaretle."),
    ("4-ev-bakimi.png", "6-ev-bakimi.png", "moka_handyman.png", "Evin sağlığı", "takipte kalsın.", "Bakım işleri, faturalar ve garantiler için hatırlatmalar."),
    ("5-odul-ve-evin.png", "5-magaza.png", "moka_party.png", "Evini kendine", "göre süsle.", "Temalar, eşyalar ve Moka için aksesuarlar."),
    ("6-evine-gore.png", "7-evim-sorular.png", "moka_wink.png", "Ruhuna da", "bak.", "Nasıl hissettiğini söyle, Moka günü sana göre planlasın."),
]
SCREEN_DIR = ROOT / "proje-dosyalari" / "ekranlar-2026-10-22"

def rr(draw, box, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)

def centered(draw, text, y, font, fill):
    box = draw.textbbox((0, 0), text, font=font)
    draw.text(((W - (box[2] - box[0])) / 2, y), text, font=font, fill=fill)

for filename, screen, pose, line1, line2, sub in items:
    im = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(im)
    # Soft brand shapes add depth without competing with the real interface.
    d.ellipse((920, -300, 1570, 350), fill="#E2ECE3")
    d.ellipse((-320, 1820, 220, 2360), fill="#E4ECE5")
    # Brand mark and label.
    logo = Image.open(ROOT / "assets" / "logo-kare.png").convert("RGBA")
    logo.thumbnail((120, 120), Image.Resampling.LANCZOS)
    im.paste(logo, (76, 64), logo)
    d = ImageDraw.Draw(im)
    d.text((211, 88), "Homezy", font=ImageFont.truetype(str(ROOT / "node_modules/@expo-google-fonts/baloo-2/700Bold/Baloo2_700Bold.ttf"), 52), fill=NAVY)
    # Headline and a small Moka sticker.
    d.text((78, 206), line1, font=HEAD, fill=NAVY, stroke_width=0)
    d.text((78, 314), line2, font=HEAD, fill=NAVY, stroke_width=0)
    rr(d, (80, 463, 370, 520), 28, "#DDE8E1")
    d.text((105, 474), "MOKA YANINDA", font=SMALL, fill="#52675C")
    moka = Image.open(ROOT / "assets" / "moka" / pose).convert("RGBA")
    moka.thumbnail((300, 300), Image.Resampling.LANCZOS)
    im.paste(moka, (900, 180), moka)
    # Supporting line, wrapped only as needed.
    subfont = BODY
    words, lines, current = sub.split(), [], ""
    for word in words:
        trial = (current + " " + word).strip()
        if d.textbbox((0, 0), trial, font=subfont)[2] > 1120 and current:
            lines.append(current); current = word
        else:
            current = trial
    if current: lines.append(current)
    for i, line in enumerate(lines[:2]):
        d.text((82, 545 + i * 54), line, font=subfont, fill=MUTED)
    # Authentic app screen in a quiet device frame.
    scr = Image.open(SCREEN_DIR / screen).convert("RGB")
    sw, sh = 886, 1918
    scr = scr.resize((sw, sh), Image.Resampling.LANCZOS)
    x, y = (W - sw) // 2, 790
    shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle((x-5, y+16, x+sw+5, y+sh+25), radius=64, fill=(40, 48, 68, 75))
    shadow = shadow.filter(ImageFilter.GaussianBlur(24))
    im = Image.alpha_composite(im.convert("RGBA"), shadow)
    d = ImageDraw.Draw(im)
    rr(d, (x-11, y-11, x+sw+11, y+sh+11), 70, CREAM, outline="#FFFFFF", width=8)
    im.paste(scr, (x, y), Image.new("L", (sw, sh), 255))
    # Restore rounded screen corners.
    mask = Image.new("L", (sw, sh), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, sw-1, sh-1), radius=54, fill=255)
    im.paste(scr, (x, y), mask)
    # Footer label for a consistent series system.
    d = ImageDraw.Draw(im)
    centered(d, "EVİNİN RİTMİNE UYAN BİR PLAN", 2740, SMALL, "#7B887E")
    im.convert("RGB").save(OUT / filename, quality=96, optimize=True)

# Contact sheet for quick review and sharing.
thumb_w, thumb_h = 322, 698
sheet = Image.new("RGB", (thumb_w * 3, thumb_h * 2), "#DFE8DF")
for i, (filename, *_rest) in enumerate(items):
    thumb = Image.open(OUT / filename).convert("RGB").resize((thumb_w, thumb_h), Image.Resampling.LANCZOS)
    sheet.paste(thumb, ((i % 3) * thumb_w, (i // 3) * thumb_h))
sheet.save(OUT / "onizleme.png", optimize=True)
print(OUT)
