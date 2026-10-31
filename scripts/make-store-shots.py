"""Homezy store screenshot mockups, EN + TR (1290x2796, fits Apple 6.7" and Play).
Usage: python3 scripts/make-store-shots.py [FONT_DIR]
FONT_DIR must hold the @expo-google-fonts/baloo-2 and nunito packages
(default: node_modules/@expo-google-fonts). Output: docs/magaza/<lang>/NN-*.png
"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
FD = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "node_modules/@expo-google-fonts"

def find(name):
    return str(next(FD.rglob(name)))

W, H = 1290, 2796
BG, NAVY, CREAM, MUTED = "#FBF4EA", "#283044", "#FFFBF5", "#7A6F80"
BLUE, CLAY, BROWN, RED, GREEN = "#78A1BB", "#BFA89E", "#8B786D", "#B8584C", "#6FA58A"
F_H = lambda s: ImageFont.truetype(find("Baloo2_700Bold.ttf"), s)
F_B = lambda s: ImageFont.truetype(find("Nunito_700Bold.ttf"), s)
F_X = lambda s: ImageFont.truetype(find("Nunito_800ExtraBold.ttf"), s)

# (file, scene, bg tint, caption lines {lang}, sub {lang}, rows {lang}: (text, chip, chip color))
SLIDES = [
 ("01-home", "home_moka_sofa", "#E2ECE3",
  {"en": ("Don't let chores", "pile up."), "tr": ("Ev işleri", "birikmesin.")},
  {"en": "Draw your home, do a little each day, keep your streak.", "tr": "Evini çiz, her gün biraz yap, seriyi koru."},
  {"en": [("Kitchen", "2 tasks", RED), ("Living room", "Today", BROWN), ("Bedroom", "All done", GREEN)],
   "tr": [("Mutfak", "2 iş", RED), ("Salon", "Bugün", BROWN), ("Yatak odası", "Tamam", GREEN)]}),
 ("02-today", "moka_checklist", "#F3E6DA",
  {"en": ("Know what to", "do today."), "tr": ("Bugün ne yapacağını", "bil.")},
  {"en": "Only today's tasks. Tap Done, collect points.", "tr": "Sadece bugünün işleri. Tamamla, puanı kap."},
  {"en": [("Wipe the counters", "Overdue", RED), ("Water the plants", "Today", BROWN), ("Take out the trash", "Tomorrow", BLUE)],
   "tr": [("Tezgahı sil", "Gecikti", RED), ("Çiçekleri sula", "Bugün", BROWN), ("Çöpü çıkar", "Yarın", BLUE)]}),
 ("03-rooms", "room_moka_kitchen", "#E4ECE5",
  {"en": ("Every room has", "its own routine."), "tr": ("Her odanın", "kendi rutini.")},
  {"en": "Routines arrive automatically for each room.", "tr": "Rutinler her oda için kendiliğinden gelir."},
  {"en": [("Clean the stovetop", "Every 3 days", BLUE), ("Mop the floor", "Every 7 days", BLUE), ("Empty the fridge shelf", "Every 14 days", BLUE)],
   "tr": [("Ocağı temizle", "3 günde bir", BLUE), ("Zemini sil", "7 günde bir", BLUE), ("Buzdolabı rafını boşalt", "14 günde bir", BLUE)]}),
 ("04-wardrobe", "moka_laundry", "#EBE3EE",
  {"en": ("We tell you when", "it's laundry time."), "tr": ("Çamaşır zamanını", "biz söyleyelim.")},
  {"en": "Mark clothes Clean, Dirty or To iron.", "tr": "Kıyafetleri Temiz, Kirli ya da Ütülenecek işaretle."},
  {"en": [("White T-shirt", "Dirty", RED), ("Blue jeans", "Clean", GREEN), ("Linen shirt", "To iron", BROWN)],
   "tr": [("Beyaz tişört", "Kirli", RED), ("Mavi kot", "Temiz", GREEN), ("Keten gömlek", "Ütülenecek", BROWN)]}),
 ("05-fridge", "moka_analyzing", "#E1EBF1",
  {"en": ("Snap a photo,", "we write the list."), "tr": ("Fotoğrafı çek,", "listeyi biz yazalım.")},
  {"en": "AI reads your fridge. Missing items hit your shopping list.", "tr": "Yapay zekâ buzdolabını okur, eksikler listeye düşer."},
  {"en": [("Milk", "Low", BROWN), ("Eggs", "Out", RED), ("Yogurt", "In stock", GREEN)],
   "tr": [("Süt", "Az", BROWN), ("Yumurta", "Bitti", RED), ("Yoğurt", "Var", GREEN)]}),
 ("06-build", "moka_party", "#F6E7D8",
  {"en": ("Keep your streak,", "build your home."), "tr": ("Seriyi koru,", "evini inşa et.")},
  {"en": "Spend points on furniture and watch your house grow.", "tr": "Puanlarınla eşya al, evin kat kat yükselsin."},
  {"en": [("Streak", "12 days", GREEN), ("Points", "340", BLUE), ("New floor", "Unlocked", BROWN)],
   "tr": [("Seri", "12 gün", GREEN), ("Puan", "340", BLUE), ("Yeni kat", "Açıldı", BROWN)]}),
 ("07-moka", "moka_plants", "#E4ECE5",
  {"en": ("Meet Moka,", "your home buddy."), "tr": ("Moka ile tanış,", "ev arkadaşın.")},
  {"en": "Chat, focus timer, garden and lofi, all with Moka.", "tr": "Sohbet, odak sayacı, bahçe ve lofi, hepsi Moka ile."},
  {"en": [("Focus 25 min", "Start", BLUE), ("Garden", "3 plants", GREEN), ("Lofi", "Play", BROWN)],
   "tr": [("Odak 25 dk", "Başla", BLUE), ("Bahçe", "3 bitki", GREEN), ("Lofi", "Çal", BROWN)]}),
 ("08-care", "moka_handyman", "#F3E6DA",
  {"en": ("Bills and upkeep,", "never forgotten."), "tr": ("Fatura ve bakım", "unutulmasın.")},
  {"en": "Boiler service, bills, warranties, seasonal chores.", "tr": "Kombi bakımı, faturalar, garantiler, mevsimlik işler."},
  {"en": [("Boiler service", "in 12 days", BROWN), ("Electric bill", "in 3 days", RED), ("TV warranty", "in 90 days", BLUE)],
   "tr": [("Kombi bakımı", "12 gün kaldı", BROWN), ("Elektrik faturası", "3 gün kaldı", RED), ("TV garantisi", "90 gün kaldı", BLUE)]}),
]

def rr(d, box, r, fill, outline=None, w=1):
    d.rounded_rectangle(box, radius=r, fill=fill, outline=outline, width=w)

def center(d, text, y, font, fill):
    b = d.textbbox((0, 0), text, font=font)
    d.text(((W - (b[2] - b[0])) / 2, y), text, font=font, fill=fill)

def wrap(d, text, font, maxw):
    words, lines, cur = text.split(), [], ""
    for w in words:
        t = (cur + " " + w).strip()
        if d.textlength(t, font=font) <= maxw: cur = t
        else: lines.append(cur); cur = w
    return lines + [cur]

for lang in ("en", "tr"):
    out = ROOT / "docs/magaza" / lang
    out.mkdir(parents=True, exist_ok=True)
    for fn, scene, tint, cap, sub, rows in SLIDES:
        im = Image.new("RGB", (W, H), BG)
        d = ImageDraw.Draw(im)
        d.ellipse((880, -320, 1580, 380), fill=tint)
        d.ellipse((-340, 2000, 260, 2600), fill=tint)
        logo = Image.open(ROOT / "assets/logo-kare.png").convert("RGBA")
        logo.thumbnail((110, 110)); im.paste(logo, (76, 70), logo); d = ImageDraw.Draw(im)
        d.text((210, 92), "Homezy", font=F_H(60), fill=NAVY)
        center(d, cap[lang][0], 280, F_H(112), NAVY)
        center(d, cap[lang][1], 400, F_H(112), BROWN)
        y = 570
        for ln in wrap(d, sub[lang], F_B(46), 1000):
            center(d, ln, y, F_B(46), MUTED); y += 66
        # phone-like panel
        px0, py0, px1, py1 = 130, 760, 1160, 2440
        rr(d, (px0 + 8, py0 + 14, px1 + 8, py1 + 14), 90, "#E3D9CC")
        rr(d, (px0, py0, px1, py1), 90, CREAM, NAVY, 10)
        sc = Image.open(ROOT / f"assets/scenes/{scene}.jpg").convert("RGB").resize((930, 698))
        mask = Image.new("L", sc.size, 0); ImageDraw.Draw(mask).rounded_rectangle((0, 0, 930, 698), 50, fill=255)
        im.paste(sc, (180, 830), mask); d = ImageDraw.Draw(im)
        ry = 1600
        for text, chip, col in rows[lang]:
            rr(d, (180, ry, 1110, ry + 150), 40, "#FFFFFF", "#E9DFD3", 3)
            d.ellipse((215, ry + 50, 265, ry + 100), outline=col, width=8)
            d.text((300, ry + 38), text, font=F_X(46), fill=NAVY)
            cw = d.textlength(chip, font=F_X(32)) + 56
            rr(d, (1075 - cw, ry + 40, 1075, ry + 110), 35, col)
            d.text((1075 - cw + 28, ry + 52), chip, font=F_X(32), fill="#FFFFFF")
            ry += 175
        rr(d, (350, 2190, 940, 2300), 55, NAVY)
        label = {"en": "Done", "tr": "Tamamladım"}[lang]
        center(d, label, 2208, F_H(64), "#FFFFFF")
        im.save(out / f"{fn}.png", optimize=True)
print("ok")
