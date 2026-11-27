# Moka'nın bahçesi: görsel geliştirme planı (ChatGPT ile)

Kaynak (sadece okundu, kod değişmedi): `src/app/bahce.tsx` (582 satır), `src/domain/garden.ts`, `src/components/GardenArt.tsx`, `GardenScene.tsx`, `gardenFx.tsx`, `HouseGarden.tsx`, `House3D.tsx` (`gardenParts`), `src/domain/items.ts` (`DECOR`, `PERSONAS`). Dal: integration/tum-pr. Biçim: `docs/3d-ev-gorsel-gelistirme.md` ile aynı.

Görseller (yerleşim ve akış şemaları, `docs/img/bahce-plan/`):

| Dosya | Ne gösterir |
|---|---|
| `bahce-1-ekran-yerlesimi.png` | Yeni ekranın çizimi ve numaralı notlar |
| `bahce-2-katmanlar.png` | 9 katman, dosya adı ve boyutlar |
| `bahce-3-asamalar-mevsim.png` | 6 büyüme aşaması, 4 mevsim, 3 zaman |
| `bahce-4-akis-etkilesim.png` | İş → puan → su → çiçek → ev akışı, Moka etkileşimleri |

## 1. Mevcut durum

- Ekran: cam kartlar + `GardenScene` (kodla çizili canlı gökyüzü: güneş/ay, bulut, yağmur, kar, tepeler, ateş böceği) + **düz kare saksı ızgarası** (6 ücretsiz, 9 Premium) + liste sekmeleri (Tohum, Gübre, Süs, Kişilik, Albüm).
- Bitki: `GardenArt.tsx` SVG ile çiziyor, 6 aşama ve 8 çiçek şekli (`daisy/tulip/spike/rose/star/cup/big/bell`), 16 çiçek (`FLOWERS`). Güzel çalışıyor ama "vektör oyuncak": iki boyutlu, tüm çiçekler aynı gövdeyi paylaşıyor, saksıdan başka zemin yok.
- Süsler (`DECOR`): sulama kabı, uğur böceği evi, hamak, sera. Şimdi sadece emoji simgesi olarak sahnenin altında diziliyor, yerine oturmuyor.
- Moka: tek duruş (`MokaMascot`, pose `plants/party/rest/cozy_plant`), sahnede gezmiyor, bahçeyle etkileşmiyor.
- 3B ev yanındaki bahçe (`HouseGarden`): küçük saksı sırası. `assets/ev3d/bahce/` altında ağaç, çit, havuz, çim dokusu gibi hazır sprite'lar **var** (3D ev planından); bu plan onları yeniden kullanır.
- Kural katmanı (büyüme, gübre, albüm, ruh hali, solma) sağlam. **Kurallar değişmiyor**; sadece görünüm, ödül anı ve Moka büyüyor.

## 2. Hedef görsel seviye

"Bambaşka seviye" = tablo gibi duran, her gün açınca gülümseten **bir diorama**:

1. Liste yerine **tam ekran sahne**; sekmeler alta çekilen sayfaya iner.
2. Düz saksı yerine **tombul izometrik bahçe adası** + yükseltilmiş ahşap yataklar (3×3).
3. Her çiçek **kendi resmiyle** (16 sprite), büyüme aşamaları yaylanarak geçer.
4. **Moka sahnede yaşar**: yürür, sular, koklar, uyur.
5. **Mevsim ve gün ışığı**: ada 4 mevsim, ışık gündüz/akşam/gece; hava durumu mevcut `GardenScene` ile.
6. **Süsler yerine oturur** ve seri arttıkça bahçe zenginleşir.
7. Stil: Moka sahneleriyle birebir (tombul, lacivert kontur #283044, tek kademe yumuşak gölge, sıcak pastel, cozy, çocuk basitliği, yazı yok).

## 3. Ekran yerleşimi

Bkz. `bahce-1-ekran-yerlesimi.png`.

- **Üst bar** (cam hap, mevcut `Glass`): Geri, ⭐ puan, 🔥 seri.
- **Sahne** ekranın %70'i: gökyüzü (kod) → uzak tepe → orta tepe → ada + yataklar + bitkiler + süsler → Moka → ön plan çimi.
- **Konuşma balonu** Moka'nın üstünde (mevcut mesaj mantığı: açtı / büyüyor / ayın hikayesi / solma).
- **Alt sayfa** sürüklenir (kapalı: sadece sekme çipleri; açık: kartlar). Sekmeler aynı: Tohum, Gübre, Süs, Albüm (Kişilik Süs içine girebilir, sekme sayısı 4).
- **Yatak dokunuşları:** dokun = seç (altta eylem çubuğu: 💧 su, 🧺 gübre, 🌸 albüme al); uzun bas = tohum seç; sürükle sulama kabı = elle su.
- Albüm sekmesi **vitrin**: kart başına büyük çiçek resmi, tarih, Moka cümlesi. 16/16 altın çerçeve.

## 4. Katmanlar ve parallax

Bkz. `bahce-2-katmanlar.png`. Alttan üste: gökyüzü (kod) → uzak tepe → orta tepe → ada → yataklar+süsler → bitkiler → ön plan → Moka+böcekler → hava efekti. Parallax çarpanları 0 / 0,2 / 0,4 / 1 / 1,3 (cihaz eğimi için `expo-sensors` zaten ev odasında planlı; yoksa sürükleme). "Hareketi azalt" açıksa sabit.

## 5. Bitki sistemi

Bkz. `bahce-3-asamalar-mevsim.png`.

- 6 aşama (`stageOf`) aynı: 0 tohum, 1 çimlendi, 2 filiz, 3 fide, 4 tomurcuk, 5 açtı.
- **Ortak aşamalar** (0–3): tek gövde serisi, her çiçek paylaşır. **Tomurcuk** (4): 6 renk grubu (kırmızı, sarı, mor, pembe, beyaz, mavi). **Açan çiçek** (5): 16 çiçeğe özel. Toplam bitki görseli: 4 + 6 + 16 = **26**, 96 yerine.
- Aşama geçişi: kod, iki resmi çapraz soldurur + `Squish` yaylanması + toprak kabarması + kıvılcım (`Burst`).
- Solma (seri koptu): kod yapar (hafif eğilme, %40 soluk renk), ek görsel yok. Canlanma: yaylanıp doğrulur.
- Gübre: altın toz parçacığı (fx). Su: damla sprite.
- Yatağın toprağı: kuru / ıslak (günlük sevgi/su verildi mi, `isPlotLovedToday`) iki sürüm.

## 6. Dekor, hava, mevsim

**Dekor (satın alınan, adaya yerleşir):** her süs sabit bir "yuva" noktasına oturur (ada köşeleri). Mevcut 4 + yeni öneri (yeni `DECOR` kalemleri ayrı karar, fiyat Melih'te):

| Süs | Yuva | Not |
|---|---|---|
| Sulama kabı (var) | sağ ön köşe | Moka bunu kullanır |
| Uğur böceği evi (var) | sol arka | böcekler çıkar |
| Moka'nın hamağı (var) | arka, iki ağaç | gece Moka burada uyur |
| Sera camı (var, Premium) | yatakların üstü, yarı saydam | kışın bahçe yeşil kalır |
| Çit (yeni, seriyle açılır) | ada kenarı | 7/30/100 gün seride 3 çit seviyesi |
| Gül kemeri (yeni) | giriş | 30 gün seri |
| Fener zinciri (yeni) | ada çevresi | gece yanar, Premium |
| Kuş evi, bank, çeşme (yeni) | köşeler | `assets/ev3d/bahce` ile ortak |

**Hava:** mevcut `GardenScene`/`useSky` kalır (yağmur, kar, bulut). Yeni: yağmurda çiçekler başını kaldırır, Moka şemsiye açar; kışın kar örtüsü ada sürümü; fırtınada çiçekler hafif sallanır (`Sway`).
**Mevsim:** ada 4 sürüm (cihaz ayı, kuzey yarımküre), ayın çiçeği (`monthFlower`) adada hafif parıltılı yatak. **Gün ışığı:** aynı sahne, kod renk bindirmesi (akşam turuncu, gece lacivert + ateş böceği + fener).

## 7. Moka etkileşimi

Bkz. `bahce-4-akis-etkilesim.png`. Yeni Moka pozları (ChatGPT, bölüm 9, M1–M8): sulama, gübre serpme, çiçek koklama, hamakta uyku, şemsiyeli, çiçek taşıma, alkış, üzgün sulama kabı. Mevcut `plants/party/rest/cozy_plant` pozları yedek kalır (görsel gelene kadar). Hareket kod: `Wander` (yatak ile yatak arası), mevcut `MokaMascot` sahneye `absolute` konur. Dokun = balon, sürükle sulama kabı = elle su, gece uyku, yağmur şemsiye.

## 8. Puan ve seri bağı

Kural aynı (`GROW_PER_DAY = 3`, gübre kısıtı). Görünür bağlar:
- **İş bitince** "💧 Bahçeye su" çipi (Bugün ekranı ve iş bitirme kutlaması): dokununca bahçe açılır, Moka sular. Bahçeye girme alışkanlığı = çekirdek değer (günlük kullanım).
- **Seri → ada zenginliği:** seri 7/30/100 gün: çit, kemer, fener zinciri açılır (ücretsiz, satın alma değil). Seri kopunca süsler kalır, **sadece çiçekler solar**; ceza yok.
- **Albüm → 3B ev:** albümdeki çiçekler evin yanında aynı sprite ile (HouseGarden).
- Ayın çiçeği: ay boyu yatakta parıltı + Moka'nın aylık cümlesi, ay sonunda albüme "ayın çiçeği" rozeti.
- Puan harcama anı: tohum alınca paket açılma animasyonu (tohum paketi resmi, 16 adet UI).

## 9. ChatGPT görsel üretim planı

Genel kural: `docs/3d-ev-gorsel-gelistirme.md` 3.0 başlangıç mesajı aynen (Moka stili, palet, saydam PNG). Her mesajda `moka_happy.png` ve `assets/arkaplan/kahve_kosesi.jpg` ekle. Işık sağ üstten. Yazı yok. Ham PNG'ler projede `bahce-ham/` klasörüne konur, ben `scripts/make-bahce.py` (Pillow, `quality=82, method=6`) ile küçültüp WebP yaparım.

### Öncelik A (en çok fark yaratır, 14 görsel)

| # | Dosya | Amaç | Ham boyut → uygulama | Saydam | Yol |
|---|---|---|---|---|---|
| A1 | `ada_ilkbahar.png` | Bahçe adası, izometrik, çim + toprak kenar, 3×3 yatak yuvaları BOŞ | 1080×1080 → 540 | evet | `assets/bahce/ada/` |
| A2 | `yatak.png`, `yatak_islak.png` | Tek yükseltili ahşap yatak, kuru ve ıslak toprak | 1:1; 512 → 160 | evet | `assets/bahce/ada/` |
| A3 | `govde_0..3.png` | Ortak büyüme aşamaları: tohum tepeciği, filiz, fide, uzun fide | 512×768 → 160×240 | evet | `assets/bahce/bitki/` |
| A4 | `cicek_papatya.png`, `_lale`, `_aycicegi`, `_lavanta`, `_gul`, `_menekse` | En ucuz 6 çiçek, açık hal | 512×768 | evet | `assets/bahce/bitki/` |
| A5 | `moka_sulama.png` | Moka sulama kabıyla su veriyor | 768² → 192 | evet | `assets/bahce/moka/` |
| A6 | `on_plan.png` | Ekran altı çim şeridi + minik çiçekler | 1080×360 | evet | `assets/bahce/sahne/` |
| A7 | `tepe_uzak.png`, `tepe_orta.png` | İki tepe katmanı (ağaçlı) | 1080×600 | evet | `assets/bahce/sahne/` |

### Öncelik B (çiçek ve süs, ~24 görsel)

| # | Dosya | Amaç | Boyut | Saydam |
|---|---|---|---|---|
| B1 | `cicek_<ad>.png` kalan 10 çiçek (kardelen, nergis, sümbül, yasemin, krizantem, kasımpatı, begonvil, orkide, nilüfer, atatürk) | Açık hal | 512×768 | evet |
| B2 | `tomurcuk_kirmizi/sari/mor/pembe/beyaz/mavi.png` | Tomurcuk aşaması | 512×768 | evet |
| B3 | `dekor_sulama`, `_ugurbocegi_evi`, `_hamak` (ağaçlı), `_sera` (yarı saydam cam), `_cit_1..3`, `_kemer`, `_fener_zinciri`, `_kus_evi`, `_bank`, `_cesme` | Adaya oturan süsler, aynı izometrik açı | 512²; hamak/sera 768² | evet |
| B4 | `moka_gubre`, `_koklama`, `_hamak_uyku`, `_semsiye`, `_cicek_tasima`, `_alkis`, `_uzgun_kap` | Moka pozları | 768² → 192 | evet |
| B5 | `paket_<ad>.png` (16) | Tohum paketi simgesi (kart ve satın alma animasyonu) | 256² → 96 | evet |

### Öncelik C (mevsim ve efekt, ~14 görsel)

`ada_yaz`, `ada_sonbahar`, `ada_kis` (A1 ile aynı tuval, sadece mevsim); `fx/kelebek_1..3`, `fx/ari_1..2`, `fx/yaprak_1..3` (sonbahar), `fx/polen`, `fx/su_damla`, `fx/altin_toz`; albüm `cerceve_altin.png` (16/16 çerçeve).

Toplam ~52 görsel (A: 14, B: 24, C: 14).

### Promptlar (3.0 başlangıçtan sonra)

**Ortak ön ek (adaya ve süslere):**
```
Aşağıdakini tombul oyuncak stilinde, 2:1 izometrik görünüşle (yukarıdan sağ-önden bakış) çiz. Tek nesne, tuvalin ortasında, kenarlara 60 piksel boşluk. Arka plan TAMAMEN SAYDAM PNG. Zemin gölgesi nesnenin içinde olsun, tuvale taşmasın. Yazı yok.
```
- **A1:** `Konu: tombul bir bahçe adası. İzometrik kare çim levha, kenarları kalın kahverengi toprak ve hafif taş sınır. Üstünde 3×3 düzenli, BOŞ yataklık yuvası için hafif toprak izi olacak şekilde yumuşak çim; yataklar ayrı çizileceği için üstüne bitki, ev, ağaç koyma. Çimde birkaç minik beyaz çiçek ve tombul çim tutamı. İlkbahar rengi (#A8DCA0). 1080x1080.`
  - C: `Aynı adanın AYNISI, sadece mevsim: yaz (koyu yeşil, sarı çiçek), sonbahar (altın çim, turuncu yaprak serpintisi), kış (kar örtüsü, mavi gölgeler).` **Tuval, ada köşeleri ve boyut birebir aynı.**
- **A2:** `Konu: tek bir yükseltilmiş ahşap bahçe yatağı, 3/4 izometrik, içi taze koyu toprak dolu. İkinci görselde aynısı ama toprak ıslak, koyu ve parlak, üstünde 2 damla.`
- **A3:** (düz yandan değil, hafif yukarıdan 3/4, saydam) `Konu: toprak tepeciği üstünde bitkinin büyüme aşaması. 1: sadece kabarık toprak ve içinde yarı görünen küçük tohum. 2: iki minik yaprak çıkmış çimlenme. 3: ince gövde, 4 yaprak. 4: daha uzun gövde, 6 yaprak, henüz çiçek yok. Dört ayrı görsel, aynı boyut, toprak noktası her birinde tuvalin alt-ortasında (y=700), 512x768.`
- **A4 (her çiçek için):** `Konu: <çiçek adı> bitkisi, tam açmış, tombul. Yaprak ve gövde A3 serisiyle aynı yeşil, aynı toprak noktası (alt-ortada y=700). Petal rengi <hex>, merkez <hex>. 512x768.` Renkler `garden.ts` `FLOWERS` listesindeki `petal`/`center`: papatya #FFFFFF/#F2C46D, lale #E0605A/#F2C46D, ayçiçeği #F4C430/#7A5236, lavanta #A98BD6, gül #E26D8A/#C24D6C, menekşe #8E6CC4/#F2C46D. Kalan 10 için aynı kalıp, değerler dosyadan.
- **A5 / B4 Moka pozları:** `Ekteki Moka'yı (aynı yüz, aynı tüy rengi) bu pozda çiz: <poz>. Tam karşıdan 3/4, tuval 768x768, saydam.` Pozlar: sulama kabıyla bahçeye su veriyor / avucundan gübre serpiyor / eğilmiş çiçek kokluyor, gözleri kapalı mutlu / hamakta uyuyor, yanında minik kahve fincanı / küçük sarı şemsiye altında / kucağında çiçek saksısı taşıyor / kanatlarıyla alkışlıyor, kafasında minik parti şapkası / üzgün, boş sulama kabını tutuyor (hafif, ceza hissi yok).
- **A6:** `Konu: ekranın en altı için yatay çim şeridi, tombul çim tutamları ve birkaç minik çiçek (papatya, lale). Üst kenarı dalgalı, alt kenarı tuvale kadar dolu. 1080x360, saydam.`
- **A7:** `Konu: 1080x600 yatay tepe silüeti. Uzak: yumuşak açık yeşil-mavi, ağaçsız. Orta: daha koyu yeşil, tombul 3 ağaç ve bir küçük kulübe. Alt kenarı tuvale kadar dolu, üstü saydam.`
- **B3:** `Konu: ahşap iki ağaç arasında gerili kıvrık kumaş hamak` / `cam sera: yarı saydam mavi-beyaz camlı, ahşap iskeletli, 3×3 yatağı örtecek genişlikte, içinde hiçbir şey yok` / `beyaz ahşap çit, 1 (7 gün), 2 (30), 3 (100): giderek daha süslü` / `gül kemeri, pembe güllü` / `ince ipli fener zinciri, 7 sıcak sarı fener` / `uğur böceği evi: kırmızı benekli minik ev`.
- **B5:** `Konu: <çiçek adı> tohum paketi, tombul krem kese, önünde çiçeğin resmi, kenarı dikiş. Yazı yok. 256x256, saydam.`
- **C fx:** `3 kare kelebek: kanatlar yukarı, orta, aşağı (aynı boyut ve yer)` / `tombul arı 2 kare` / `3 çeşit sonbahar yaprağı` / `tek altın toz parçacığı` ve su damlası (3D ev planı B6 ile ortak, mevcut `assets/ev3d/hava/yagmur_damla.webp` yeniden kullanılabilir).

**Düzeltme mesajları:** `docs/3d-ev-gorsel-gelistirme.md` 3.6 ile aynı. Ek: "Toprak noktasını tuvalin alt-ortasına (y=700) taşı, tüm aşamalarda aynı olsun."

## 10. Kod tarafı entegrasyon notu (şimdi kod yazılmıyor)

1. `src/domain/bahceArt.ts`: tüm `require()` haritası tek yerde (çiçek → sprite, aşama → sprite, mevsim → ada). Bayrak `BAHCE_ART = true`; görsel yoksa ya da yüklenemezse **mevcut SVG** (`GardenArt.tsx`, `GardenScene`) çizilir. Aynı model `ev3dArt.ts` (EV3D_ART).
2. `GardenScene.tsx`: `ana-sahne` katmanları (`tepe_uzak/orta`, `ada`, `on_plan`) eklenir; gökyüzü + hava kodla kalır.
3. `bahce.tsx`: ızgara `PlotCard` listesi yerine ada üzerinde mutlak konumlu 9 yuva (sabit koordinat tablosu `PLOT_SLOTS`, 0–1 oranında); alt sayfa (`bottom sheet`) yeni, `expo-router` ekran yapısı değişmez. Sekme içerikleri (`SeedRow`, `FertRow`, `Album`) aynı kalır, kart resmi `paket_<ad>`.
4. `GardenArt.PlantArt`: `stageOf` → sprite seçimi; geçiş çapraz solma (`Animated.Value`, native driver). Solma kod.
5. Moka: `MokaMascot` yerine sahneye `absolute` Image (poz → dosya); `Wander` ile yatak koordinatları arası.
6. `HouseGarden.tsx` ve `House3D.gardenParts`: aynı çiçek sprite'ları (küçük ölçek); albüm listesi kaynağı `gardenPlants()` değişmez.
7. Native modül yok. Parallax eğimi `expo-sensors` ise `requireOptionalNativeModule` ile korunur (CLAUDE.md native modül kuralı); yoksa sadece sürükleme.
8. Boyut bütçesi: tek dosya ≤ 60 KB (ada/tepe ≤ 120 KB), tüm bahçe paketi ≤ 3 MB WebP. Sunucudan inmez; paketle gelir, OTA ile güncellenir.
9. Performans: ekranda en çok 9 bitki + 1 Moka + 3 böcek + 30 parçacık; eski Android'de FPS düşerse parçacıklar azalır, parallax kapanır.
10. Her değişiklikten sonra `npm run typecheck && npm run lint`. Telefon testi Melih'in emülatör thread'inde (C:\w).
11. Yasal/envanter: yeni SDK ya da veri yok; seri ödülü yeni alan istemez (seri zaten `HouseProgress`'ta).

## 11. Sıra (her adımdan sonra tek ekran görüntüsüyle Melih onaylar)

1. **A1, A2, A3, A4 (6 çiçek), A6, A7**: ada + yatak + büyüme + ilk çiçekler. Tek başına bahçeyi "oyuncak" olmaktan çıkarır.
2. **A5 + B4 Moka pozları** ve sahneye yerleştirme: bahçe yaşar.
3. **B1, B2** kalan çiçekler ve tomurcuk renkleri.
4. **B3 süsler** + seri bağı (çit, kemer, fener) + **B5 tohum paketleri**.
5. **C mevsim adaları** ve fx (kelebek, yaprak, altın toz).

Karar bekleyen (Melih): yeni süs fiyatları, seri ödülü eşikleri (7/30/100), sekmeleri 4'e indirme.
