# Moka odası: ChatGPT resim promptları (katmanlı, canlı, animasyona hazır)

2026-11-16. Amaç: oda "tek resim + titreyen katman" değil, **derin, atmosferik, yaşayan** bir yer olsun. Yeni resimler mevcut katman sistemine (`RoomBackdrop.tsx`, `RoomMoka.tsx`, `src/constants/oda.ts`) takılır. Promptlar İngilizce (ChatGPT daha iyi anlıyor), açıklamalar Türkçe.

Kaynaklar: `docs/moka-oda-usta-plan.md` (sec. 8), `docs/moka-oda-animasyon-plani.md` (sec. 4, 6), `docs/moka-oda-promptu.md` (eski oda promptu).

---

## 0. Önce şunu bil

Şu an oda: `assets/oda/` altında **852×1846** tek taban resmi + kesilmiş cam + 3 bitki + 256×256 `isik.webp`. Katman az olduğu için derinlik zayıf. Daha canlı hissettirmenin en ucuz yolu: **daha çok ayrı katman** (her biri ayrı hızda kayar/sallanır/parlar).

Hedef tuval (bütün oda katmanları için aynı): **1170×2532 px, 9:19,5 dikey**. Eski 852×1846 ile aynı oran; kod ölçekler, ben yeni boyuta uyarlarım.

Önemli: ChatGPT katmanları piksel piksel aynı hizada vermez. Bu yüzden **2 yol** var:

- **Yol A (güvenli, önce bunu yap):** Tam oda resmini üret. Katmanları sonra **aynı sohbette, "aynı resim, sadece şunu bırak" diye düzenleterek** çıkar (sec. 4). Hiza bozulursa ben `scripts/make-oda-layers.py` ile keserim.
- **Yol B (hızlı):** Sadece tam oda + gece + sprite'lar. Katmanları ben koddan keserim (şu anki yöntem).

---

## 1. Dosya haritası: hangi resim nereye gider

Hepsini Melih **proje dosyaları `moka-oda/v3/`** klasörüne atar (adlar aşağıdaki gibi, küçük harf, Türkçe karaktersiz). Ben WebP'ye çevirip koda bağlarım. **Sen kod klasörüne yazmayacaksın.**

| Dosya adı | Boyut / biçim | Neyi değiştirir / besler | Arka plan |
|---|---|---|---|
| `oda_gunduz.png` | 1170×2532 | `assets/oda/gunduz_taban.webp` (ana oda) | dolu |
| `oda_aksam.png` | 1170×2532 | yeni: gün batımı varyantı (`odaOfHour`'a 3. durum) | dolu |
| `oda_gece.png` | 1170×2532 | `assets/oda/gece_taban.webp` | dolu |
| `oda_pencere_disi_gunduz.png` | 1170×1400 | yeni katman: pencere ardı manzara (en arka, en yavaş kayar) | dolu |
| `oda_pencere_disi_gece.png` | 1170×1400 | aynısı, gece | dolu |
| `oda_orta_mobilya.png` | 1170×2532 | yeni: orta katman (raf, kanepe kenarı, kahve köşesi) | **saydam** |
| `oda_on_plan.png` | 1170×2532 | yeni: ön plan (alt köşe bitkisi, sarkan sarmaşık, kenar yaprakları; hafif bulanık) | **saydam** |
| `isik_huzme.png` | 1024×2048 | yeni: pencere ışık huzmesi (`isik.webp`'in yerine, eğik şerit) | **saydam** |
| `isik_leke.png` | 1024×512 | yeni: yerdeki pencere şeklinde ışık lekesi | **saydam** |
| `lamba_hale.png` | 1024×1024 | `isik.webp` (lamba halesi; yumuşak, sıcak) | **saydam** |
| `parlama.png` | 256×256 | yeni: 4 köşeli ışıltı sprite'ı | **saydam** |
| `parcacik_sprite.png` | 1024×1024 (4×4 tabaka, 16 hücre) | toz, kıvılcım, yaprak, kalp, konfeti, kar, yağmur damlası | **saydam** |
| `buhar.png` | 512×1024 | yeni: 3 katmanlı buhar için kıvrımlı duman şeridi | **saydam** |
| `moka_oda_sakin.png` | 1024×1024 | `assets-src/moka/moka_home_seated.png` (800×800) kalite yükseltmesi, tüm parçaların kaynağı | **saydam** |
| `moka_govde.png` | 1024×1024 | yeni: gövde (boyunsuz kafa kökü ile, ayaklar dahil) | **saydam** |
| `moka_bas.png` | 1024×1024 | yeni: yüzsüz baş | **saydam** |
| `moka_kulak_sol.png`, `moka_kulak_sag.png` | 1024×1024 | yeni: kafa tüyü tutamları | **saydam** |
| `moka_kuyruk.png` | 1024×1024 | yeni: kuyruk | **saydam** |
| `moka_kanat_kupa.png` | 1024×1024 | yeni: kupa tutan kanat + kupa | **saydam** |
| `moka_oda_uyuyan.png` | 1024×1024 | yeni: uyuyan Moka (en öncelikli poz) | **saydam** |
| `moka_oda_serefe.png` | 1024×1024 | yeni: kutlama pozu | **saydam** |

**Parça dosyaları (Moka) kuralı:** hepsi **aynı 1024×1024 tuvalde, aynı konumda**; üst üste koyunca `moka_oda_sakin.png` ile birebir aynı görünmeli. (Şu an 8 yüz `mimik_1-8` ayrı; yüz parçası zaten var, baş yüzsüz olunca yüzü üstüne biner.)

Ödüller/rozetler bu belgede yok; onlar `moka-oda-usta-plan.md` sec. 8 A2'de.

---

## 2. Stil çapası: HER sohbetin İLK mesajı (bunu hep kullan)

Her yeni ChatGPT sohbetinde ilk mesaj olarak yapıştır. **Ekle:** `moka_happy.png`, `moka_home_seated.png`, bir de uygulamadan oda ekran görüntüsü (renk için).

```
STYLE ANCHOR — remember this for every image in this chat.
Match the attached mascot "Moka" (a kakapo parrot) EXACTLY in style: chubby, round, soft and slightly puffy forms; soft fuzzy/feathery surfaces; consistent medium-thick soft dark navy outline (#283044), never black; flat colors with ONE soft shading tier and a gentle warm rim light; sticker-illustration look, hand-painted, NOT photorealistic, NOT 3D-render, NOT flat vector. Cozy "coffee shop meets home" mood.
Palette ONLY (pastel, warm, low saturation): navy #283044, mint #EBF5EE, soft blue #78A1BB, clay #BFA89E, coffee brown #8B786D, cream, warm amber light (#F2B866) for lamp/sun glow. No neon, no pure black, no saturated cold colors.
Camera: straight-on, eye level, almost no perspective, one fixed viewpoint, floor line at about 86% of image height.
Never add: text, letters, logos, watermarks, frames or borders, people, animals or characters (unless I ask for Moka).
Always render at the exact size and aspect ratio I request, edge to edge, no letterboxing.
If you understood, reply only "ready".
```

Kural: stil sapmaya başlarsa **yeni sohbet aç, çapayı yeniden yapıştır**. Uzun sohbette stil kayar.

---

## 3. Tam oda arka planları (en önemli üç resim)

Yeni sohbet. Çapayı yapıştır, "ready" gelince:

### 3.1 Gündüz (ana)

```
Create the full vertical phone background of Moka's living room, empty of any character. Size 1170x2532 (9:19.5), edge to edge.

Make it RICH, LAYERED and ATMOSPHERIC with real depth, not a flat room. Include many small charming details, but keep the center clear:
- Back wall: soft mint and cream, wood wainscoting at the bottom, subtle wallpaper pattern, a few small framed pictures (no text, cup icons or plants only), a small shelf with mugs, jars, a coffee-bean jar, little candle.
- Upper left: ONE big round-cornered window with cream curtains tied back. Through the glass: a beautiful soft daytime sky, layered pastel clouds, distant rooftops and a tree, a hint of a hanging plant outside.
- Upper right: two wooden wall shelves with cups, books, small plants, a string of fairy lights draped along the shelf (unlit in daytime).
- Lower right corner near the wall: a cozy mini coffee corner — tiny round espresso machine, grinder, cup row on a small counter, a warm table lamp. Stays in the corner.
- Lower left: big potted monstera + a woven basket + a folded blanket; a trailing vine hangs from the upper left.
- Floor: warm wood planks, a round cream-and-clay rug in the middle, soft shadows under furniture, a few tiny floor details (a slipper, a book) near the edges only.
- Light: warm sun from the window, soft light shafts crossing the wall and floor, a soft window-shaped light patch on the floor, gentle dust-friendly atmosphere (but NO visible dust dots painted in).
SAFE ZONES (vertical %): top 0-12% calm wall. 12-38% only the window on the left side; center-right wall calm (a speech bubble sits here). 42-86%: the central ~55% width MUST be EMPTY floor and wall (Moka sits here): no furniture, plant or object inside it. 86-100%: plain wood floor strip (buttons sit here).
No character, no animal, no text.
```

### 3.2 Akşam (gün batımı), gündüz beğenilince aynı sohbette

```
Use the previous image as the exact base: same room, same composition, nothing moved, added or removed. Only change the time of day to golden hour sunset: window sky in peach, rose and soft lavender gradient with long glowing clouds, long low orange light shafts across the wall and floor, longer warmer shadows, the table lamp and string lights just turning on with a soft warm glow, the room slightly warmer and dimmer overall. Same style, same palette feel, same safe zones, 1170x2532, no character, no text.
```

### 3.3 Gece

```
Use the previous daytime image as the exact base: same room, same composition, nothing moved, added or removed. Only change to a cozy night: deep navy window sky with a crescent moon, many soft small stars and a thin cloud, the room lit by warm amber light from the table lamp, wall lamp and the string lights (clearly lit, glowing), soft pools of warm light, walls and floor darker and warmer, soft blue moonlight rim on the window frame, long soft shadows. Still pastel and cozy, not gloomy. Same style, same safe zones (center empty), 1170x2532, no character, no text.
```

**Düzeltmeler (çıkmazsa aynen yapıştır):**
- Ortada nesne: `The central 55% width x 42-86% height region must be COMPLETELY empty. Remove everything in it; push side objects to the edges.`
- Düz kaldı / derinlik yok: `Add depth: a softly blurred foreground leaf cluster in the bottom-left and top-right corners, a clearly lighter far-away window view, and darker corners (vignette). Keep the center the same.`
- Gerçekçi/3D oldu: `Not photographic: hand-painted sticker illustration with the same soft navy outline and one-tier shading as the attached Moka.`
- Kalabalık: `Half as many objects. Keep it airy.`
- Gece/akşam farklı oda çıktı: önceki resmi yükle + `This exact image. Do not move or change any object. Only lighting changes.`
- Oran yanlış: `Same image as 9:19.5 vertical 1170x2532, filled edge to edge.`

---

## 4. Derinlik katmanları (aynı sohbette, gündüz oda resmi referans)

Her biri **aynı sohbette, `oda_gunduz.png` ekli**, bir mesaj = bir katman. Her katmanda ilk cümle sabit: `Same canvas 1170x2532, every pixel position identical to the attached image, nothing moved or resized.`

### 4.1 Pencere ardı manzara (en arka katman)

```
Same style. Create ONLY what is seen outside the window: a wide, tall soft daytime scene that extends beyond the window frame on all sides (so it can slowly slide behind the window): layered pastel sky with cloud bands, far hills, tiny rooftops, a tree, a distant hanging garden, a thin bird or two (small silhouettes), soft haze. No window frame, no curtains, no interior. 1170x1400, edge to edge.
```
Sonra gece: `Same image, night version: deep navy gradient, crescent moon, soft stars, a few lit distant windows, thin clouds. Same size.`

### 4.2 Orta katman: mobilya (saydam)

```
Same canvas 1170x2532, every pixel position identical to the attached image, nothing moved or resized. Keep ONLY the mid-ground objects: wall shelves with their items, the coffee corner with counter and lamp, the monstera pot and basket, picture frames. REMOVE the wall, floor, rug, window, curtains and everything else, leaving those areas fully transparent. Transparent PNG with alpha, soft anti-aliased edges, no background color.
```

### 4.3 Ön plan (saydam, hafif bulanık)

```
Same canvas 1170x2532 as the attached image. Create ONLY a foreground layer: big soft leaves and a trailing vine in the top-left and top-right corners, a few big plant leaves peeking up at the bottom-left and bottom-right corners, slightly out of focus (soft blur) and slightly darker, to give depth. The center 55% width must be completely transparent. Transparent PNG, no background, same style and palette.
```

### 4.4 Ayrı bitkiler (sallanma için)

```
Same canvas as the attached image, positions identical. Keep ONLY the [hanging vine in the upper-left / monstera plant / right-shelf trailing plant] fully intact (including parts that were hidden behind other objects: complete the leaves). Everything else transparent. Transparent PNG, soft edges.
```
Her bitki için ayrı mesaj. Dosya: `bitki_a.png`, `bitki_b.png`, `bitki_c.png` (kodda a: sarkan sarmaşık, b: sağ raf, c: monstera).

---

## 5. Işık ve atmosfer (saydam, çok önemli, büyük fark yaratır)

Çapa + `oda_gunduz.png` ekli, aynı sohbet.

### 5.1 Işık huzmesi

```
Create ONE soft diagonal sunlight beam coming from the upper-left window, as a transparent PNG 1024x2048. Three soft parallel bands (like light through a window grid), warm cream-gold (#FFE9B8), very soft feathered edges, brightest near the window and fading out toward the lower right, semi-transparent (alpha up to about 45%), no hard edges, no dust dots, no background. It should be tall, slightly slanted at about 20 degrees.
```

### 5.2 Yerdeki ışık lekesi

```
Create the sunlight patch that lands on the floor: a soft warm-gold parallelogram shaped like a window with 3 cross bars, perspective-flattened (wider than tall), soft blurred edges, alpha up to 40%, transparent PNG, 1024x512, no background.
```

### 5.3 Lamba halesi

```
Create a soft round warm lamp glow: cream-amber (#F2B866) radial gradient from a bright center to fully transparent at the edge, perfectly round, very smooth (no banding), transparent PNG 1024x1024, no object, only the glow.
```
Ek: `Make a second version a bit larger and more orange, 1024x1024` (`lamba_hale2.png`, dış halka).

### 5.4 Parlama sprite'ı

```
A single 4-point sparkle star (like a twinkle) in warm cream-white with a soft gold glow, symmetrical, thin long points, centered, transparent PNG 256x256, no background, no other elements.
```

### 5.5 Parçacık tabakası (4×4, 16 hücre)

```
A 4x4 sprite sheet on a transparent background, 1024x1024, each cell 256x256, one item centered per cell, in the same style: (1) tiny glowing dust mote, (2) bigger soft dust mote, (3) golden sparkle dot, (4) small 4-point twinkle, (5) heart red-clay, (6) heart pink, (7) green leaf, (8) tiny falling leaf, (9) confetti square, (10) confetti strip, (11) confetti circle, (12) steam curl, (13) snowflake, (14) raindrop, (15) tiny star, (16) soft round bokeh blob. Clean grid, nothing crosses cell borders, no text.
```

### 5.6 Buhar

```
Three wispy steam curls (thin line, medium curl, soft smoke) rising in an S shape, warm white with soft edges, semi-transparent, transparent PNG 512x1024, no cup, no background.
```

---

## 6. Moka: animasyon parçaları + uyuyan + kutlama

Yeni sohbet. Çapayı yapıştır. Ekle: `moka_happy.png`, `moka_home_seated.png`.

### 6.1 Ana poz (diğer her şeyin kaynağı)

```
Draw the attached Moka EXACTLY in the same style, colors and outline. FULL BODY seated, as in the second image: legs forward, visible; same size and position on the canvas. Changes: NO cup; both wings resting by the belly; calm face with bright open eyes, closed beak, slight smile. Lighting: warm lamp from the right with a soft orange rim light on the right edge, gentle shadow on the left. No cushion, floor, shadow, text or extra objects. Fully transparent background, PNG, 1024x1024, Moka centered with 60 px free space at the bottom.
```
Beğenene kadar düzelt: `Make the size and position identical to the first image.` Ad: `moka_oda_sakin.png`.

### 6.2 Parçalara ayır (hepsi `moka_oda_sakin.png` ekli, ayrı mesaj)

Önek (hepsinde): `Use the attached image as the exact reference. Same canvas 1024x1024, every pixel position identical, nothing moved, resized or redrawn differently.`

| Dosya | Mesaj sonu |
|---|---|
| `moka_govde.png` | `Remove the head and the crest feathers, tail and wings; keep the body, belly and feet. Complete the neck as a clean rounded stump with the plumage continuing under where the head was (the head will be placed on top). Everything else transparent.` |
| `moka_bas.png` | `Keep ONLY the head, but with NO face: remove eyes and beak details, leave a smooth head (face will be added later). Include the full round head shape and neck base. Everything else transparent.` |
| `moka_kulak_sol.png` / `moka_kulak_sag.png` | `Keep ONLY the left [right] feather tuft/crest on the head, complete and intact even where it overlapped the head. Everything else transparent.` |
| `moka_kuyruk.png` | `Keep ONLY the tail, complete even where hidden behind the body. Everything else transparent.` |
| `moka_kanat_kupa.png` | `Same pose but now the right wing holds a cream coffee cup near the beak. Keep ONLY that wing and cup. Everything else transparent.` |

Parçalar 2-5 piksel binmeli (üst üste); ince boşluk görünürse: `Extend this part 12 px further into the body so overlaps hide any seam.`

**Uyarı (dürüst):** ChatGPT parçaları zaman zaman hizadan kaydırır. Hizalı çıkmazsa Gemini'yi dene ("move nothing" çok daha iyi uyuyor). İkisi de olmazsa tek resimle devam ederiz; o durumda ben bedeni koddan maskelerim (animasyon planı faz A-E görselsiz çalışıyor).

### 6.3 Uyuyan Moka (en değerli tek resim)

```
Same Moka, same style, size and position on the canvas as the attached image. Pose: asleep: eyes closed with soft curves, head drooped slightly forward and to the side, wings folded on the belly, very peaceful. No cup, no pillow, no blanket, no "z" letters, no text. Same warm lighting. Transparent background, 1024x1024.
```
Ad: `moka_oda_uyuyan.png`. İsteğe bağlı ek: `Same image but breathing in: belly and chest slightly larger, shoulders up by 2%` → `moka_oda_uyuyan_nefes.png` (iki kare arasında nefes için).

### 6.4 Kutlama

```
Same Moka, same size and place. One wing holds a cream coffee cup raised high, eyes happy-curved (^ ^), beak open smiling, small cheek blush. Transparent background, 1024x1024.
```
Ad: `moka_oda_serefe.png`.

---

## 7. Çalışma akışı ve ipuçları

**Sıra (ChatGPT kredisi azsa bu önceliği izle):**
1. Çapa + **gündüz oda** (3.1) → beğenene kadar.
2. **Gece** (3.3) + **akşam** (3.2).
3. **Işık huzmesi, leke, hale, parlama** (5.1-5.4): küçük ve kolay, büyük fark.
4. **Uyuyan Moka** (6.3, önce 6.1).
5. **Ön plan** + **orta katman** + **pencere ardı** (4.x).
6. Parçacık tabakası, buhar (5.5-5.6).
7. **Moka parçaları** (6.2): en zoru, en son.

**Teknik:**
- Saydam gerekenlerde prompt'a ya da mesaja: `transparent PNG`. Gri-beyaz damalı çıkıyorsa (sahte saydam): `Make the background truly transparent (alpha), not a checkerboard.` Olmazsa: `Put it on flat pure magenta #FF00FF` (ben maskelerim).
- Boyut tutmuyorsa tek cümle: `Regenerate at exactly 1170x2532.` Kare gelirse oran cümlesini yaz (3.x düzeltmeleri).
- Her katman **ayrı mesaj**, hepsi **aynı sohbet** (hizayı korumak için). Ama 10 resimden sonra stil kayar: yeni sohbet + çapa + kaynak resmi tekrar ekle.
- ChatGPT bazen resmi tam yeniden çizer ve nesneleri oynatır. Öyle olunca: `Do not redraw. Only edit: keep every existing pixel the same except what I asked.`
- Her şeyi indirdikten sonra `moka-oda/v3/` klasörüne at, bana ya da koordinatöre yaz; bağlamayı biz yaparız (kod klasörüne kendin yazma).
- Önce **PNG**, JPG değil (saydamlık, kenar kalitesi). Dosya adları küçük harf, ASCII.
- Hız: 1-2 beğenilen resmi hemen uygulamaya koyalım; hepsini bekleme.

**Beklenen kazanım (hangi resim animasyona ne katar):**

| Resim | Animasyon planı bölümü | Kazanç |
|---|---|---|
| Huzme + leke + toz sprite | 4.2 pencere ışığı | Saate göre kayan gerçek ışık, toz sadece huzmede |
| Ön plan katmanı | 4.2 paralaks 4 katman | Eğimde gerçek derinlik |
| Pencere ardı | 4.2 pencere dışı | Bulut/kuş kayması, gün batımı |
| Ayrı bitkiler | 4.2 bitkiler | Rüzgâr dalgası |
| Parlama + buhar | 4.2 sürahi | 4 köşeli ışıltı, 3 katmanlı buhar |
| Parçacık tabakası | 4.3 kutlama | Konfeti ve kalp yağmuru |
| Moka parçaları | 4.1 | Baş/kulak/kuyruk/kol ayrı hareket |
| Uyuyan Moka | 4.1 uyku | Gerçek uyku pozu |
