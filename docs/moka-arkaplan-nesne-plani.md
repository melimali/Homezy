# Moka odası: arka plan + ayrı nesneler planı (2026-11-16)

Hedef: oda tek resim değil, **her nesnesi ayrı saydam katman**. Her nesne kendi animasyonunu alır, hava ve saat odayı değiştirir. Bu belge `docs/moka-kozmetik-plani.md` (Moka katmanları) ve `docs/moka-oda-animasyon-plani.md` (MokaBrain, ışık, paralaks) ile birlikte okunur. Otomasyon promptu: `gpt-arkaplan-nesne-v6.md` (proje dosyaları `moka-kozmetik/`).

## 1. Dosya haritası (v6)
```
moka-oda/v6/
  arka_oda_bos_gun.png        # taban: duvar+zemin, NESNESİZ, pencere camı şeffaf
  arka_oda_bos_aksam.png      # aynı taban, gün batımı ışığı
  arka_oda_bos_gece.png       # aynı taban, gece
  arka_oda_tam_gun.png        # referans: bütün nesneler yerinde (sadece kontrol)
  arka_pencere_<hava>.png     # pencere manzarası (10 adet, 1170x1400)
  nesne_<ad>.png              # 36 nesne, hepsi 1170x2532 saydam tuval, kendi yerinde
  parcacik_<ad>.png           # sprite sayfaları (9)
  kontrol/kontrol_*.png       # birleştirme kontrolleri
  MANIFEST.txt, ../v6.zip
```
Kural: **nesneler 1170×2532 tam tuvalde, tabandaki yerinde** çizilir (kırpma ve çapa kutusunu ben betikle çıkarırım, `scripts/slice-oda-nesne.py` yazılacak). Yani hiza hatası çıkmaz, çapa = kutu merkezi.
Taban **boş** olmalı: nesne kalkınca arkasında duvar/zemin çizili görünür (gizli alan dolgusu). Kontrol: taban + tüm nesneler = `arka_oda_tam_gun.png`.

## 2. Taban varyantları
| Dosya | İçerik |
|---|---|
| arka_oda_bos_gun | sıcak gün ışığı, mint-krem duvar, ahşap lambri, zemin, halısız (halı ayrı nesne) |
| arka_oda_bos_aksam | şeftali/pembe sıcak ışık, uzun yumuşak gölgeler |
| arka_oda_bos_gece | lacivert, ay ışığı kenarı, sıcak lamba kovukları (nesneler gece ışığını kodla alır) |
Nesneler **gündüz ışığıyla** çizilir; akşam/gece için kodda renk tonu (multiply) ve parlayan nesnelere (lamba, ışık zinciri, mum, makine) `isik_maske_*` verilir (aşağıda).

## 3. Pencere manzarası (hava)
10 dosya: `arka_pencere_gunduz_acik, gunduz_bulutlu, yagmur, kar, firtina, sis, aksam, gece_acik, gece_yagmur, gece_kar` (1170×1400, aynı ufuk %60, aynı çatılar+ağaç). Yağmur/kar/şimşek/bulut kodla (parçacık sprite'ları). Geçiş: çapraz solma 800 ms. Hava: Open-Meteo (konum izni = yerli modül, yeni derleme) ya da saat+mevsim.

## 4. Nesneler (36)
Tuval 1170×2532, konum ve boyut **yaklaşık** (ChatGPT'nin çıkardığı gerçek kutuyu betik ölçer; güvenli bölge: orta %55 genişlik × %42-86 yükseklik BOŞ, Moka oturur).
| Dosya | Çizim | Kutu (tahmini) | Animasyon |
|---|---|---|---|
| `nesne_pencere_cerceve.png` | round-cornered window frame with mullions (glass area transparent) | x70 y260 520×640 | cam yansıması kayar, çerçeve sabit |
| `nesne_pencere_cam.png` | glass layer: faint reflection streak only | x90 y280 480×600 | yağmur damlası, buğu, dokununca silinir |
| `nesne_perde_sol.png` | left cream curtain tied back with a clay ribbon | x20 y230 200×700 | rüzgârda hafif sallanır (üstten pivot) |
| `nesne_perde_sag.png` | right cream curtain tied back | x430 y230 200×700 | rüzgârda hafif sallanır, sola ters faz |
| `nesne_pencere_denizlik.png` | small windowsill with two tiny pots and a cup | x60 y880 540×120 | bitki yaprakları rüzgârla titrer |
| `nesne_raf_ust.png` | upper wall shelf, wood, empty (items are separate) | x640 y330 470×50 | yok (sabit) |
| `nesne_raf_alt.png` | lower wall shelf, wood, empty | x640 y560 470×50 | yok (sabit) |
| `nesne_kupa_1.png` | mint mug | x680 y230 120×100 | buhar yok, dokununca hafif sallanır |
| `nesne_kupa_2.png` | clay mug with a heart | x830 y240 110×100 | dokununca sallanır |
| `nesne_kitap_yigin.png` | stack of 3 books, pastel spines | x960 y255 150×80 | yok |
| `nesne_raf_bitki.png` | small trailing plant in a clay pot | x690 y430 150×200 | yapraklar rüzgârla dalgalanır, sarkan dal sallanır |
| `nesne_raf_mum.png` | small candle in a jar | x900 y480 80×100 | alev titrer + sıcak hale |
| `nesne_kahve_kavanozu.png` | glass jar of coffee beans with a wooden lid | x1010 y470 100×130 | yok |
| `nesne_tablo_1.png` | small framed picture (coffee cup drawing, no text) | x300 y100 160×200 | dokununca hafif eğilir |
| `nesne_tablo_2.png` | small framed picture (plant drawing, no text) | x500 y110 140×170 | dokununca hafif eğilir |
| `nesne_saat.png` | round wall clock without numbers text, simple hands | x920 y100 150×150 | akrep yelkovan gerçek saati gösterir |
| `nesne_isik_zinciri.png` | string of fairy lights with 10 bulbs, draped along the top | x40 y40 1090×120 | ampuller sırayla/dalga parlar, akşam-gece yanar |
| `nesne_asma_sarmasik.png` | trailing ivy hanging from the upper left | x30 y140 240×520 | rüzgârla sallanır (üstten pivot) |
| `nesne_monstera.png` | large potted monstera, lower left | x0 y1500 360×650 | yapraklar tek tek hafif sallanır, rüzgâr dalgası |
| `nesne_sepet.png` | woven basket with a folded blanket inside | x240 y1980 250×200 | yok |
| `nesne_katlanmis_battaniye.png` | folded plaid blanket (separate piece) | x260 y1930 230×110 | yok |
| `nesne_masa_lamba.png` | table lamp with cream shade and wooden base | x930 y1500 200×300 | aç/kapa, hale, hafif titreşim |
| `nesne_kahve_makinesi.png` | small round espresso machine | x830 y1620 230×240 | ışığı yanıp söner, buhar çıkar |
| `nesne_kahve_tezgah.png` | small wooden counter with cup row and grinder | x800 y1800 370×350 | yok (fincanlar ayrı) |
| `nesne_tezgah_fincan_sira.png` | three cups on the counter | x860 y1760 200×80 | sürahi buharı |
| `nesne_hali.png` | round cream-and-clay rug, center-bottom (flat, perspective-free) | x180 y1900 810×300 | yok (Moka gölgesi üstüne biner) |
| `nesne_minder.png` | round cushion where Moka sits | x380 y1750 410×160 | Moka oturunca hafif çöker |
| `nesne_kucuk_bitki_yer.png` | small floor plant in a pot, right side | x1010 y2050 150×260 | yapraklar hafif sallanır |
| `nesne_terlik.png` | pair of cozy slippers near the edge | x120 y2300 230×100 | yok |
| `nesne_kedi_yatagi.png` | small round pet bed, empty | x860 y2250 260×110 | yok |
| `nesne_yerde_kitap.png` | open book lying near the edge | x500 y2380 200×100 | yok |
| `nesne_duvar_kancasi.png` | wall hook rack with a scarf and a bag | x60 y1180 200×260 | eşarp rüzgârla hafif sallanır |
| `nesne_ayna_oval.png` | small oval mirror with wooden frame | x700 y820 180×260 | ışık parlaması geçer |
| `nesne_pencere_isik_huzmesi.png` | slanted soft sunbeam from the window to the floor, warm, translucent | x100 y380 900×1600 | saate göre kayar, yağmurda kapanır, toz sadece içinde |
| `nesne_pencere_isik_leke.png` | window-shaped light patch on the floor | x180 y1950 600×260 | huzmeyle birlikte kayar |
| `nesne_on_plan_yaprak_sol.png` | blurred foreground leaves bottom-left corner | x0 y2200 330×332 | paralaks en hızlı, yavaş sallanır |
| `nesne_on_plan_yaprak_sag.png` | blurred foreground leaves top-right corner | x840 y0 330×300 | paralaks, sallanır |

Katman sırası (arkadan öne): pencere manzarası → taban → pencere_cam → perdeler → duvar nesneleri (tablo, saat, raf, raf eşyaları, ayna, kanca) → ışık zinciri → mobilya/bitkiler → halı, minder → **Moka** → ön plan yaprakları → ışık huzmesi + leke (üstte, screen) → parçacıklar (toz sadece huzmede, buhar, kıvılcım).

## 5. Işık ve parlama
- `isik_maske_gece.png` (tek gri tuval): beyaz = geceleri parlayacak yerler (lamba gölgeliği, ışık zinciri, mum alevi, makine ışığı, pencere çerçevesi). Kodla bulanık parlama.
- Lamba aç/kapa oda loşluğunu 500 ms'de geçirir. Mum + zincir aynı kanaldan.
- Yağmurda iç ışık hafif mavi, huzme kapalı; kar'da beyazımsı ve yumuşak; fırtınada şimşek anında oda aydınlanır.

## 6. Animasyon atama özeti
| Tür | Nesneler | Teknik |
|---|---|---|
| Rüzgâr (sallanma) | perdeler, sarmaşık, monstera, raf bitkisi, eşarp, küçük bitkiler | üstten pivot ±1-3°, sin, farklı faz; rüzgâr gücü havadan |
| Parlama/ışık | lamba, zincir, mum, makine ışığı, saat camı | opaklık + ölçek, gece açık |
| Buhar/duman | kahve makinesi, fincanlar, çay | 3 katman sprite, yukarı akış |
| Saat | saat | akrep/yelkovan döner (resim yerine kodla çizilen iki çubuk) |
| Dokunma | tablolar, kupalar, ayna, minder | squish/sallanma + ses |
| Cam | pencere_cam | damla, buğu, silme |
| Paralaks | arka manzara 0.2×, taban 0.5×, nesneler 1×, ön plan 1.6× | eğim/süzülme |
Bütçe: ~40 katman, hepsi `transform/opacity`, native driver; parça sayısı düşük cihazda yarıya. Hareketi azalt: rüzgâr ve parçacık kapalı, ışık ve saat kalır.

## 7. Kod fazları
| Faz | İş | Süre |
|---|---|---|
| B0 | `scripts/slice-oda-nesne.py`: kırp, kutu/çapa JSON, hiza testi (taban+nesneler = tam) | 0,5 gün |
| B1 | `OdaSahne` bileşeni: katman ağacı, paralaks, nesne JSON (`src/constants/odaNesne.ts`) | 1 gün |
| B2 | Rüzgâr, parlama, buhar, saat, dokunma tepkileri | 1 gün |
| B3 | Pencere manzarası + hava + yağmur/kar/şimşek/cam damlası/silme | 1,5 gün |
| B4 | Işık huzmesi, saat/akşam/gece geçişi, lamba maskesi | 1 gün |
| B5 | Performans, hareketi azalt, düşük cihaz | 0,5 gün |
Toplam ~5,5 gün. Yeni native modül: sadece gerçek hava için konum (expo-location).

## 8. Riskler
1. ChatGPT nesneyi tabanda **farklı yerde** çizer → tek sohbet, taban referans ekli, betik hiza ölçer, kayıksa o nesne yeniden.
2. Tabanın "boş" olması: ChatGPT bazen eşyayı geri koyar → kontrol listesi (taban içinde nesne var mı).
3. 36 nesne × 1170×2532 PNG büyük → kırpıp WebP, toplam < 6 MB hedef.
4. Stil sapması: 10 nesnede bir çapa yeniden yapıştır.
