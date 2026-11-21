# 3D ev: görsel geliştirme planı (ChatGPT ile)

Kaynak: `src/components/House3D.tsx` (2410 satır), `HouseFloors.tsx`, `HouseGarden.tsx`, `MokaPet.tsx`, `src/domain/look.ts` (dal integration/tum-pr, a6ec4d2/3e6057f). Sadece okundu, kod değişmedi.

## 1. Şu anki durum ve zayıf noktalar

Ev, kullanıcının çizdiği bloklardan üretilen **tek bir SVG**: 2:1 izometrik, blok başına A=34, B=14 birim, tavan yok (arka duvar 42, iç duvar 22). Her şey düz renk çokgen (`box()` yüzleri `shade()` ile koyulaştırılır). Resim dosyası kullanılmıyor, `require(` yok. Bu yüzden dosya boyutu sıfır ama görünüm "vektör oyuncak" kalıyor; Moka sahnelerinin (tombul, kabarık, yumuşak gölgeli) yanında soğuk duruyor.

| Parça | Şimdi | Zayıf nokta |
|---|---|---|
| Çatı | Sıra başına tek beşik çatı, düz renk (6 renk: kiremit, gri, kahve, yosun, mavi, pudra), kış beyaz | Dokusu yok, kiremit/saçak/baca ayrıntısı yok, kocaman düz yüzey |
| Duvar / cephe | Düz renk, aralıklı pencere (duvar yüksekliğinin 0,35'i), tek ön kapı | Pencere ve kapı çok basit (cam + çerçeve çizgisi); sıva/tuğla/ahşap yok |
| Zemin (oda) | Düz renk + halı kutuları | Parke, fayans, halı dokusu yok |
| Kat | Dubleks: ▲/▼ ile kayma animasyonu | Üst kat dış görünümü alt kata benziyor, balkon/merdiven ayrıntısı az |
| Mobilya | `furniture()` / `itemShape()` ile kutulardan yapılmış minik eşyalar (yatak, koltuk, buzdolabı, bitki, kedi/köpek...) | Kutu yığını gibi, 2-3 yüzlü; Moka stilinden en uzak parça |
| Gökyüzü | Hava durumuna göre iki renkli gradyan | Güneş/ay, yıldız, gün batımı yok |
| Bulut | 3 elips birleşimi, `Drift` ile kayar | Çok geometrik |
| Kuş | Basit çizgi V | Cansız |
| Duman | Baca üstünde daireler, yukarı kayıp solar | Küçük, düz |
| Yağmur / kar | Çizgi ve daire parçacıkları, iki katman | Fena değil ama tek tip |
| Moka | `MokaPet`: SVG ile çizilmiş minik Moka (yürür, oturur, uyur, zıplar) | Marka maskotu ile birebir aynı değil, sahnelerdeki Moka'dan sadeleşmiş |
| Bahçe | Çim halkaları, çiçek, çit, havuz, gül, kemer, çeşme, ağaç, kuş evi (`gardenParts`), 7 tema renk paleti | Çoğu daire/elips; ağaç ve çalı yapay |

Teknik sınırlar: ev her kullanıcıda farklı şekil, bu yüzden **tüm ev tek resim olamaz**. Resimler ancak (a) tekrarlanan doku, (b) tek başına duran çıkartma (sprite) veya (c) arka/ön katman olarak kullanılabilir. Boş ev planı seçimi ve dönüş (`projectionAngle`) de sprite'ları sınırlar: **sadece dönmeyen / tek açıdan bakılan şeyler** resim olmalı (gökyüzü, bulut, kuş, duman, bahçe süsleri, mobilya); duvar/çatı dokusu SVG `Pattern` ile çokgenin içine basılır.

## 2. Üretilecek görseller

Genel kural (hepsi için): Moka sahneleriyle aynı stil. Tombul, yumuşak lacivert kontur (#283044 civarı), düz renk + tek kademe yumuşak gölge, sıcak pastel, "cozy", çocuk basitliği. Yazı yok. Tuval hep kare, **saydam arka plan** (doku ve gökyüzü hariç). Işık sağ üstten sıcak. Her görsel ChatGPT'den 1024×1024 PNG gelir; ben scriptle küçültüp WebP yaparım (bkz. bölüm 4).

Paleti sabitle: lacivert #283044, mint #EBF5EE, mavi #78A1BB, kil #BFA89E, kahve #8B786D, sıcak sarı #F2C46D, mercan #E58C7E, yaprak #7FB28A.

### Öncelik A (en çok fark yaratır)

| # | Dosya | Amaç | Oran / boyut (ham → uygulama) | Saydam | Yol |
|---|---|---|---|---|---|
| A1 | `cati_kiremit.png` | Çatı dokusu (tekrarlı kiremit, yatay sıralı, yumuşak) | kare, kusursuz döşenir; 1024 → 256 | hayır (döşeme) | `assets/ev3d/doku/cati_kiremit.webp` |
| A2 | `cati_gri.png`, `cati_yosun.png` | Aynı doku diğer 2 temel renkte (diğerleri renk filtresiyle) | aynı | hayır | `.../doku/` |
| A3 | `duvar_siva.png` | Sıcak sıva/boya dokusu, hafif tanecik (renk üstüne bindirme, gri tonlu) | kare, döşenir; 1024 → 256 | hayır | `.../doku/duvar_siva.webp` |
| A4 | `zemin_parke.png`, `zemin_fayans.png` | İç zemin dokuları, gri tonlu bindirme | kare, döşenir; 1024 → 256 | hayır | `.../doku/` |
| A5 | `ev_kapi.png` | Ön kapı: yuvarlak tepeli ahşap kapı, küçük fener, paspas | 1:1.4 dikey; 768×1075 → 192×270 | evet | `.../parca/ev_kapi.webp` |
| A6 | `ev_pencere.png` + `ev_pencere_gece.png` | Pencere: çerçeve, perde ucu, çiçekli saksı kutusu; gece sürümünde sıcak sarı ışık | 1:1; 1024 → 160 | evet | `.../parca/` |
| A7 | `ev_baca.png` | Tuğla baca + üst başlık | 1:1.3 | evet | `.../parca/` |
| A8 | `duman_1..3.png` | Tombul duman bulutu 3 kare (animasyon için) | 1:1; 512 → 96 | evet | `.../hava/` |

### Öncelik B (gökyüzü ve hava)

| # | Dosya | Amaç | Boyut | Saydam |
|---|---|---|---|---|
| B1 | `bulut_1..4.png` | Tombul beyaz bulut (güneşli, 4 farklı şekil) | 2:1; 1024×512 → 256×128 | evet |
| B2 | `bulut_yagmur.png`, `bulut_firtina.png` | Gri yağmur ve fırtına bulutu | 2:1 | evet |
| B3 | `gok_gunduz.png`, `gok_gece.png`, `gok_aksam.png` | Gökyüzü arka planı: yumuşak gradyan, gece yıldızlı/ay, akşam pembe-turuncu | 9:16 dikey; 1080×1920 → 360×640 JPG/WebP | hayır |
| B4 | `gunes.png`, `ay.png` | Tombul gülen olmayan güneş / hilal ay, hafif parıltı | 1:1 | evet |
| B5 | `kus_1..3.png` | Tombul minik kuş: kanat yukarı, ortada, aşağı (3 kare) | 1:1; 512 → 64 | evet |
| B6 | `yagmur_damla.png`, `kar_tanesi.png` | Tek damla / 3 çeşit kar tanesi sprite (parçacıklarda yineleme) | 1:1; 256 → 32 | evet |

### Öncelik C (bahçe ve eşya)

| # | Dosya | Amaç | Boyut | Saydam |
|---|---|---|---|---|
| C1 | `agac_yuvarlak.png`, `agac_cam.png`, `agac_meyve.png` | Bahçe ağaçları (yuvarlak taçlı, çam, elmalı) | 1:1.3 dikey; 1024 → 192 | evet |
| C2 | `calı_1..2.png`, `cicek_tarlasi.png` | Çalı ve çiçek öbeği | 1:1 | evet |
| C3 | `cit.png`, `kemer.png`, `havuz.png`, `cesme.png`, `kus_evi.png`, `bank.png` | Bahçe parçaları (şimdiki daire/elips yerine) | 1:1; 512 → 128 | evet |
| C4 | `cim_dokusu.png`, `kar_cim.png`, `sonbahar_cim.png` | Zemin dokusu (tema başına) | kare, döşenir; 1024 → 256 | hayır |
| C5 | `mobilya_yatak.png`, `_koltuk.png`, `_buzdolabi.png`, `_masa.png`, `_banyo.png`, `_bitki.png`, `_kitaplik.png`, `_kedi.png`, `_kopek.png` | Oda eşyaları (üstten-yandan, izometriğe yakın 3/4 görünüm); odanın türüne göre `furniture()` yerine | 1:1; 768 → 128 | evet |
| C6 | `ev_golge.png` | Evin altına yumuşak oval gölge | 2:1 | evet |

### Öncelik D (isteğe bağlı)

- D1 `moka_ev_*.png`: evin içinde dolaşan Moka'nın 4 durumu (ayakta, yürüyüş iki adım, oturma, uyku); yan görünüş. Şu an `MokaPet` SVG; marka uyumu için sonraya.
- D2 `balkon_korkuluk.png`, `merdiven.png`: üst kat ayrıntıları.
- D3 Mevsim süsleri: kış kardan adam, sonbahar yaprak yığını, Noel çelengi (`docs/moka-oda-son-plan.md` bölüm 13 C ile ortak).

## 3. ChatGPT promptları (kopyala-yapıştır)

Aynı sohbette sırayla ilerle. Her mesajda ekle: `moka_happy.png` (stil referansı) ve oda görseli `assets/arkaplan/kahve_kosesi.jpg`. Yeni sohbet açarsan 3.0'ı baştan yapıştır.

### 3.0 Başlangıç mesajı (bir kez)
```
Ekteki Moka maskotunun çizim stilini birebir kullan: tombul, yuvarlak hatlı, hafif kabarık, yumuşak lacivert kontur (#283044), düz renk + tek kademe yumuşak gölge, sıcak pastel renkler, cozy ve çocuk gibi basit. Bundan sonra istediğim her görseli bu stille çizeceksin. Kurallar: yazı yok, çerçeve yok, ışık sağ üstten sıcak, 1024x1024 tuval. Aksini söylemediğim sürece arka plan TAMAMEN SAYDAM PNG ve nesne tuvalin ortasında, kenarlara 60 piksel boşluk bırakarak. Palet: lacivert #283044, mint #EBF5EE, mavi #78A1BB, kil #BFA89E, kahve #8B786D, sıcak sarı #F2C46D, mercan #E58C7E, yaprak yeşili #7FB28A. Anladıysan "hazır" yaz.
```

### 3.1 Doku (A1-A4, A8: döşenen dokular)
Önek, her doku için:
```
Aşağıdaki dokuyu KUSURSUZ DÖŞENEN (seamless tileable) kare olarak çiz: sol kenar sağ kenarla, üst kenar alt kenarla birebir birleşsin. Yukarıdan düz bakış, perspektif yok, gölge ve vinyet yok, ortada nesne yok, tek tip yumuşak desen. Bu sefer arka plan saydam OLMASIN, dokunun kendisi tuvali doldursun. 1024x1024.
```
Sonra tek tek:
- A1: `Konu: yumuşak yuvarlak uçlu terracotta (#C8826B) kiremit çatı, yatay sıralı, her kiremit hafif kabarık, ince koyu kontur.`
- A2 gri: `Aynısı, renk gri-mavi (#8E96A3).` / yosun: `Aynısı, renk yosun yeşili (#7E9F85).`
- A3: `Konu: açık krem boya/sıva duvar, çok hafif tanecikli, neredeyse düz, GRİ TONLU (renksiz) olsun ki sonra renk bindireyim.`
- A4: `Konu: sıcak açık ahşap parke, geniş tahtalar, ince koyu aralıklar.` ve `Konu: krem ve mint küçük kare banyo fayansı, ince derz.`
- C4: `Konu: yumuşak yeşil çim, tombul minik çim tutamları ve birkaç minik beyaz çiçek.` (kış: `kar örtüsü, hafif mavi gölgeler`; sonbahar: `altın sarı ve turuncu yaprak serpintisi çimde`)

### 3.2 Ev parçaları (A5-A7)
- A5: `Konu: evin ön kapısı. Yuvarlak tepeli koyu kahve ahşap kapı, küçük yuvarlak pencereli, yanında minik sıcak sarı bir fener, önünde krem bir paspas. Tam karşıdan görünüş. Tuval 768x1075 dikey, saydam arka plan.`
- A6: `Konu: ev penceresi. Beyaz kalın çerçeveli, dörtlü camlı, iki yanda kısa mint perde ucu, altında içinde minik çiçekler olan ahşap saksı kutusu. Tam karşıdan, cam açık mavi.` Sonra: `Aynı pencerenin AYNISI, tek fark: cam içi sıcak sarı ışıkla dolu, gece pencere.`
- A7: `Konu: çatı bacası. Tombul tuğla (#DDA48C) baca, üstünde krem başlık. Hafif yandan 3/4 görünüş.`
- A8: `Konu: bacadan çıkan tombul beyaz duman bulutu, yuvarlak, yumuşak, hafif şeffaf kenarlı. 3 ayrı poz ver: küçük, orta, büyük (ayrı ayrı 3 görsel).`

### 3.3 Hava (B1-B6)
- B1: `Konu: tombul beyaz gündüz bulutu, yumuşak mavi-gri alt gölge, 2:1 yatay tuval (1024x512). 4 farklı şekil ver, her biri ayrı görsel.`
- B2: `Aynı bulut stili, ama gri-mavi yağmur bulutu, altında 3 minik damla. Ve fırtına bulutu: koyu gri, altında küçük sarı şimşek.`
- B3: `Konu: telefon ekranı için dikey gökyüzü arka planı, 9:16 (1080x1920), içinde nesne yok, bulut yok. Gündüz: açık mavi yukarıdan krem-beyaza yumuşak gradyan. Bu sefer saydam OLMASIN.` Gece: `Aynısı, koyu lacivert (#283044) yukarıdan mora, küçük sarı yıldızlar ve çok az, tombul.` Akşam: `Aynısı, gün batımı: şeftali, pembe ve lavanta gradyan.`
- B4: `Konu: tombul sarı güneş, yumuşak turuncu ışınlar yuvarlak uçlu, yüzsüz.` / `Konu: tombul krem hilal ay, iki minik yıldız.`
- B5: `Konu: tek minik tombul kuş yandan, kanatlar yukarı. Sonra aynısı kanatlar ortada, sonra kanatlar aşağıda (3 görsel, aynı boyut ve yer).`
- B6: `Konu: tek bir tombul mavi yağmur damlası.` / `Konu: 3 çeşit tombul beyaz kar tanesi, her biri ayrı görsel.`

### 3.4 Bahçe (C1-C3, C6)
- C1: `Konu: tombul yuvarlak taçlı ağaç, kahverengi kısa gövde, yaprak yeşili taç, hafif parlak vurgu. Dikey 1024x1331.` Çam ve elmalı (kırmızı küçük elmalar) için aynısı.
- C2: `Konu: tombul yuvarlak yeşil çalı, üstünde minik pembe çiçekler.` / `Konu: renkli çiçek öbeği (pembe, sarı, beyaz) minik toprak yamasında.`
- C3: `Konu: beyaz-krem ahşap bahçe çiti, 3 tahta, yan görünüş, yatay` / `gül kemeri` / `küçük mavi su havuzu, taş kenarlı, tepeden 3/4` / `minik taş çeşme` / `ahşap kuş evi direkli` / `ahşap bahçe bankı`.
- C6: `Konu: yumuşak oval zemin gölgesi, lacivert-gri, çok saydam kenarlı, 2:1 yatay (1024x512). Gölge dışında hiçbir şey yok.`

### 3.5 Mobilya (C5)
Önek: `Aşağıdaki eşyayı tombul oyuncak stilinde, izometrik 3/4 görünüşle (yukarıdan sağ-önden bakış, 2:1 izometrik) çiz; tek eşya, ortada, yumuşak zemin gölgesi tuvalde yok.`
- `Konu: tek kişilik yatak, krem yorgan, mavi yastık, ahşap başlık.`
- `Konu: iki kişilik mercan renkli koltuk, bir yastık.`
- `Konu: açık mavi-gri buzdolabı, kolu ve küçük mıknatıslar.`
- `Konu: ahşap çalışma masası, üstünde laptop ve lamba.`
- `Konu: küvet, köpüklü, sarı ördek.`
- `Konu: büyük monstera saksı bitkisi, kil saksıda.`
- `Konu: ahşap kitaplık, renkli kitaplar.`
- `Konu: turuncu uyuyan kedi minderde.` / `Konu: kahverengi küçük köpek oturuyor.`

### 3.6 Düzeltme mesajları
- Saydam değil: `Arka planı tamamen saydam PNG olarak ver.`
- Döşenmiyor: `Kenarlar birleşmiyor; sol-sağ ve üst-alt kenarları birebir aynı yap.`
- Stil kaçtı: `Çizgi kalınlığı ve renkler ekteki moka_happy ile aynı olsun, daha tombul.`
- Boyut tutarsız: `Aynı kuş/duman serisinin boyutunu ve tuvaldeki yerini ilk görsel ile birebir aynı yap.`

## 4. Koda bağlama ve MB bütçesi

Klasör: `assets/ev3d/{doku,parca,hava,bahce,mobilya}/*.webp`. Tüm görseller, tuvale dokunmadan, benim scriptle (`scripts/make-ev3d.py`, Pillow, `quality=82, method=6, alpha_quality=90`) küçültülür; Melih ham PNG'leri proje dosyalarında `ev3d-ham/` klasörüne bırakır.

| Grup | Adet | Hedef boyut | Toplam |
|---|---|---|---|
| Dokular (çatı 3, duvar 1, zemin 2, çim 3) | 9 | 256×256, ~12-25 KB | ~0,2 MB |
| Parçalar (kapı, pencere x2, baca, duman x3) | 7 | 96-270 px, ~5-20 KB | ~0,1 MB |
| Hava (bulut 6, kuş 3, güneş, ay, damla, kar) | 13 | 64-256 px, ~3-15 KB | ~0,1 MB |
| Gökyüzü (3 adet) | 3 | 360×640, ~25-40 KB | ~0,1 MB |
| Bahçe (ağaç 3, çalı 3, parça 6, gölge) | 13 | 128-192 px, ~8-20 KB | ~0,2 MB |
| Mobilya (9) | 9 | 128 px, ~8-15 KB | ~0,1 MB |
| **Toplam** | **~54** | | **≈0,8-1,0 MB** |

Bütçe kuralı: tek dosya ≤ 40 KB (gökyüzü hariç), tüm 3D ev paketi ≤ 1,5 MB. Şimdiki `assets` 61 MB, yani sorun değil. Hiçbiri sunucudan inmez; pakete gömülür (OTA ile de güncellenebilir).

Bağlama (react-native-svg `Image`, `Pattern`, yeni native modül yok):
1. `src/domain/ev3dArt.ts`: tüm `require()` haritası tek yerde (tür/tema → dosya).
2. **Dokular:** `<Defs><Pattern id="roof" patternUnits="userSpaceOnUse" width=… height=…><Image href=… /></Pattern></Defs>`; çatı yüzü önce düz renkle (`roofBase`), üstüne `fill="url(#roof)"` `fillOpacity` 0,35-0,5 ile bindirme: renk seçimi (6 çatı rengi, premium) bozulmaz. Duvar/zemin gri tonlu bindirme aynı yöntemle.
3. **Kapı/pencere/baca:** `renderFace` yerine mevcut yerlerinde `<Image>` (`doorCell`, `glassD` konumları); gece (`isNight`) pencere görseli.
4. **Gökyüzü:** SVG gradyan yerine alttaki `<Image>` katmanı; mevcut hava mantığı (`useSky`, `cloud()`) seçer: gündüz/gece/akşam. Eski gradyan yedek.
5. **Bulut, kuş, duman:** mevcut `Drift` katmanları içindeki elips kümeleri `<Image>` ile değişir; konum ve hız aynı kalır. Kuş 3 kare: `air.birds` içinde `wings` fazına göre kare seçimi. "Hareketi azalt" açıksa tek kare.
6. **Yağmur/kar:** `drops()`/`flakes()` içindeki çizgi/daire yerine `damla` ve `kar` sprite'ı; parçacık sayısı aynı (performans).
7. **Bahçe/mobilya:** `gardenParts` ve `furniture()` içinde, ilgili görsel yüklüyse `<Image>`, değilse mevcut SVG (güvenli geri dönüş). Dönüş açısı (`projectionAngle`) ≠ 0 iken sprite'lar yatay çevrilmez; sadece konum güncellenir.
8. **Güvenli yükleme:** görsel yoksa ya da yüklenemezse eski SVG çizimi; böylece ham görseller yarım gelse de uygulama kırılmaz. Bayrak: `EV3D_ART = true` (tek yerde kapatılır).
9. Performans: `Image` düğümleri düşük sayıda tut (kapı 1, pencere ≤ 12, baca 1, bulut ≤ 6, kuş ≤ 3, yağmur ≤ 30). Eski Android'de FPS düşerse yağmur/kar eski çizime döner.
10. Her değişiklikten sonra `npm run typecheck && npm run lint`; telefon testi Melih'in emülatör thread'inde (C:\w).

## 5. Öncelik sırası

1. **A1-A4 dokular** (çatı, duvar, zemin): ev tek bakışta "oyuncak" olmaktan çıkar; en az iş, en büyük fark. Önce 3 görsel (A1, A3, A4 parke) ile dene.
2. **A5-A7 kapı, pencere, baca** + **A8 duman**: eve karakter verir.
3. **B3 gökyüzü + B1 bulut + B4 güneş/ay**: ilk açılışta herkes görür.
4. **C1-C3, C4 bahçe** (ağaç, çalı, çim): bahçe thread'iyle bağlı, Premium temalarla uyumlu.
5. **C5 mobilya**: en çok görsel, en çok kod değişikliği; B ve C sonrası.
6. **B5 kuş, B6 yağmur/kar, B2** : küçük parlaklık.
7. D (Moka evde, balkon, mevsim süsleri).

Her adımdan sonra tek ekran görüntüsüyle Melih onaylar; beğenilmeyen grup eski SVG'ye döner (bayrak). Beklenen toplam üretim: ~54 görsel (öncelik 1-3 = 20 görsel).
