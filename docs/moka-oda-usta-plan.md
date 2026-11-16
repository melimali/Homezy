# Moka'nın odası: usta plan (2026-11-16)

Bağımsız ikinci görüş. Okunanlar: `moka-oda-son-plan.md`, `moka-kahve-plani.md`, `moka-ortam-plani.md`, iki istem belgesi, `src/app/moka.tsx`, `RoomBackdrop`, `RoomMoka`, `roomState`, `useTilt`, `disiplin-arastirma.md`, `kahve-oyunu/`, iki önizleme (`moka-oda/oda-onizleme-p0-p2.png`, `-v2.png`).
Sadece plan. Kod yok. Bu belge çakıştığı yerde önceki iki planın yerine geçer; çakışmayan kısımları (cümle bankası, hata durumları, erişilebilirlik, test listesi) aynen geçerlidir.

## 0. Tek sayfada karar

1. **Oda bir ekran değil, bir yer.** Arayüz küçülür, resim konuşur. Ekranda aynı anda en çok 3 arayüz parçası: üst şerit, balon, alt sıra.
2. **Alt panel tek sıraya iner.** Şimdi 3 kat (buzlu panel + iki düğme + kilit satırı) ekranın %22'sini ve yastığı kapatıyor. Yeni: `[ Temizlik başlat ]  (＋)  (💬)`. Yazı çubuğu sadece 💬'ye basınca açılır. Kalıcı "hesap aç" reklam satırı kalkar.
3. **Kahve potu için yeni resim gerekmez.** Odanın rafında zaten dolu bir kahve sürahisi var. Seri = o sürahi. Buhar ondan çıkar, sayı üst şeritte `☕ 7` hapı. "Pot hep dolu" kuralı resimde zaten doğru.
4. **Canlı yüz çözüldü, yeni resim şart değil.** `4af040e` (12:51) mevcut 8 mimiği oturan gövdeye yapıştırıp çapraz geçişle canlandırdı; iyi duruyor. Melih'ten istenen 8 resim artık **isteğe bağlı kalite yükseltmesi** (fincansız sakin poz + gerçek uyuyan poz). Ayrıntı §5.
5. **Kürk puanla alınır.** İlk ziyaretteki bedava renk seçimi kalkar. Deneme serbest, sahiplenme puanla.
6. **Hafif 3B = katman kayması.** Bütün sahneyi poster gibi döndürmek kalkar; katmanlar farklı miktarda kayar.
7. **Kesilenler:** odada hafta tepsisi, dolan fincan, 24 kahvelik defter + tarifler, 8 oda eşyası, eşya yerleşim sayfası, kahve molası, kart oyunu, yüksek çözünürlüklü oda yeniden üretimi. Sebep §6.

## 1. Dürüst eleştiri

### 1.1 Şu anki arayüz (v2 önizleme)

| # | Sorun | Neden ucuz duruyor |
|---|---|---|
| 1 | Alt panel 3 kat, yastığın yarısını ve halıyı örtüyor | Odanın en sıcak yeri (Moka + yastık) arayüzün altında kalıyor. Oda "arka plan resmi" gibi okunuyor |
| 2 | Kilit satırı ("hesap aç" / "Premium'da") sürekli ekranda | Her girişte reklam. Sıcak oda hissini en çok bu bozuyor |
| 3 | Balon tam genişlik beyaz kart, içinde büyük harf "MOKA" etiketi | Konuşma balonu değil bildirim kartı. Üstte zaten "Moka" yazıyor, iki kez isim. Rafı (odanın en güzel kısmı) kapatıyor |
| 4 | Başlık "Moka · Seviye 1" | Bilgi taşımıyor. Seri (kahve) burada olmalı |
| 5 | Moka'nın yüzü hiç değişmiyor | Tek resim: hep gülüyor, hep fincan tutuyor. Üzgün dinlerken de, uyurken de gülüyor. "Canlı yüz" isteği karşılanmıyor |
| 6 | Saf beyaz yüzeyler (balon, "İş ekle") | Oda turuncu-kahve; saf beyaz üstünde yama gibi. Krem olmalı |
| 7 | Buzlu cam panel | Android'de `expo-blur` yoksa düz yarı saydam griye düşüyor; iki telefonda iki farklı görünüm |
| 8 | 3B eğim bütün sahneyi döndürüyor (`rotateX/Y` + `scale 1.06`) | Düz resim dönünce derinlik değil "sallanan poster" olur. Ayrıca %6 büyütme resmi yumuşatıyor |
| 9 | Dört köşede %38 koyu gölge + üstte ve altta koyu geçiş | Oda kirli ve dar görünüyor. Sıcaklık ışıktan gelir, karartmadan değil |
| 10 | Moka ile oda çizimi tam tutmuyor | Odada kalın kontur + turuncu ışık; Moka soluk ve düz. Altındaki gölge tek koyu oval |
| 11 | İngilizce önizlemede "Temizlik başlat", "İş ekle", "Kürk rengi", "Şimdilik geç" Türkçe | Çeviri satırı eksik ya da önizleme eski. Doğrulanmalı (F0) |
| 12 | Kahve potu yok, seri odada görünmüyor | Ürünün özü (her gün dönmek) odada temsil edilmiyor |

İyi olanlar, korunur: tek oda ve tek kamera, gündüz-gece karışımı, camda hava, cümle bankası, Moka'nın tuştan uçarak gelmesi, lamba nefesi, uzun arada uyuyan Moka, dokunulabilir nesneler, emoji güvenli yazma, döngülerin arka planda durması.

### 1.2 `moka-oda-son-plan.md`

- **Güçlü:** denetim doğru, cümle bankası, hata ve boş durumlar, erişilebilirlik, test listesi. P0-P2 iyi yapılmış.
- **Zayıf:**
  - Düzeni değiştirmiyor, cilalıyor. Üç katlı alt panel planın kendi çiziminde de duruyor. Melih'in "profesyonel değil" hissi tam buradan geliyor.
  - Melih'e 5 poz + 13 yüz + 9 eşya + 2 oda = 29 resim yüklüyor. Tek kişi için fazla; her biri tutarlılık riski.
  - Yüz yaması (OpenCV hizalama, fark kutusu, yumuşak kenar) kırılgan. Planın kendi yedeği (tam kare geçiş) zaten daha basit ve yeterli.
  - Eşya sistemi (6 yer, 8 eşya, yerleşim sayfası, Premium yer) ikinci bir oyun. Oda zaten dolu; boş duvar yok. Disipline katkısı dolaylı.
  - Kürk rengini bedava veriyor; Melih "puanla alınsın" dedi.

### 1.3 `moka-kahve-plani.md`

- **Güçlü:** ana fikir çok iyi (alev yerine hep dolu pot, "taze" dili, suçlamayan kopuş). Durum tablosu, rozet adları, 9 dil örnekleri hazır. Seri hesabına dokunmuyor.
- **Zayıf:**
  - Pot için yeni resim ve "lambanın yanında sehpa" istiyor. Orası Moka'nın arkası, dolu. Rafta zaten sürahi var.
  - Pot + fincan + tepsi + defter = dört ayrı kahve nesnesi. Kullanıcı hangisi seri, hangisi bugün, ayırt edemez.
  - Defter: 24 kahve × (ad + bilgi + tarif) × 9 dil ≈ 650 metin + 24 resim. Geri dönüş sebebi olarak zayıf, emek olarak en büyük kalem.
  - K0 (her yerde 🔥 → ☕) doğru ama 20+ dosya ve widget metni; tek başına ayrı bir iş olarak ele alınmalı.

## 2. Tasarım yönü

**Cümle:** "Moka'nın evine uğradım." Kullanıcı bir menü açmıyor, birinin yanına geliyor.

### 2.1 İlkeler
1. **Resim önce.** Hiçbir arayüz parçası Moka'yı, yastığı ya da rafı örtmez. Örtmesi gerekiyorsa geçicidir (balon, klavye).
2. **Tek malzeme: krem kâğıt.** Balon, düğmeler, menü, sayfa aynı krem yüzey. Cam, bulanıklık, saf beyaz yok.
3. **Tek ana eylem.** Ekranda dolu renkli tek düğme: Temizlik başlat. Diğer her şey ikincil.
4. **Sessizken sus.** Moka söyleyecek bir şeyi yokken balon kaybolur, oda görünür.
5. **Ödül nesnedir, sayı küçüktür.** Seri rafta tüten sürahi; rakam küçük bir hap.

### 2.2 Renk
Yeni renkler `src/theme/index.ts`'e `room` grubu olarak eklenir (bileşende renk kodu yok kuralı).

| Ad | Açık | Kullanım |
|---|---|---|
| `room.paper` | `#FFF6E8` | balon, ikincil düğmeler, menü, sayfa |
| `room.ink` | `#3B2A20` (espresso) | odadaki bütün yazı ve ikon. Lacivert yerine: sıcak sahnede daha yumuşak |
| `room.line` | `#E9D8C0` | 1 px kenar çizgisi |
| `room.glow` | `#FFC98A` | lamba halesi, buhar, parıltı |
| `room.shade` | `#2A1C12` | gölgeler, üst şerit düğme zemini (%34) |
| ana düğme | mevcut `accent` (adaçayı yeşili) | marka sürekliliği; bitkilerle uyumlu |

Koyu tema: oda resmi zaten gece/gündüz değişiyor, bu yüzden oda yüzeyleri temaya göre değil **geceye göre** değişir: gece `paper` → `#F3E3CC` (bir ton koyu, parlamasın).

### 2.3 Yazı
| Yer | Yazı tipi | Boyut / satır |
|---|---|---|
| Balon | Nunito 700 | 17 / 25, en çok 4 satır, sonra balon içinde kayar |
| Ana düğme | Nunito 800 | 16 |
| Kahve hapı sayı | Baloo 2 700 | 16 |
| Küçük not (eylem rozeti, sayaç) | Nunito 700 | 12,5 |
| Sayfa başlığı | Baloo 2 700 | 20 |

Büyük harf etiket yok. `maxFontSizeMultiplier` 1,3. Arapça, Japonca, Korece'de satır yüksekliği +2.

### 2.4 Boşluk ve biçim
- Izgara 4 dp. Kenar boşluğu 16. Parçalar arası 12.
- Dokunma hedefi en az 48. Ana düğme yüksekliği 56, yuvarlak düğmeler 56.
- Köşe: düğmeler tam hap, balon 22, sayfa üst köşeler 28.
- Gölge tek tip: `room.shade`, %18, y 6, bulanıklık 16. Kenar çizgisi + gölge birlikte kullanılmaz; krem yüzeyde sadece gölge.

### 2.5 İkon
Mevcut çizgi ikon seti (`Icon`, 24'lük, çizgi 2,2, yuvarlak uç) korunur. Emoji sadece Moka'nın cümlesinde. Yeni ikonlar: `chat` (konuşma balonu), `pot` (sürahi), `snow` (ılık tutuldu). Düğmelerde emoji yok.

### 2.6 Hareket
| Kural | Değer |
|---|---|
| Giriş | Moka tuştan yastığa uçar, 420 ms (var). Balon +200 ms sonra |
| Arayüz belirişi | yay, 220 ms, ölçek 0,96 → 1 |
| Basma | `Squish` (var) |
| Yüz geçişi | 150 ms çapraz geçiş; göz kırpma 110 ms |
| Aynı anda dikkat çeken | tek şey. Balon yazılırken oda nesneleri tepki vermez |
| Döngüler | hepsi `useNativeDriver`, 4 sn'den yavaş; ekran odakta değilken durur (var) |
| Hareketi azalt | döngü yok, uçuş yok, sadece 200 ms geçiş |

### 2.7 Hafif 3B
Sahneyi döndürmek kalkar (`perspective`, `rotateX/Y`, `scale 1.06` silinir). Yerine katman kayması, aynı `useTilt` değeriyle:

| Katman | Kayma (x / y, dp) |
|---|---|
| Cam dışı (gökyüzü) | 2 / 1 |
| Oda tabanı | 0 (sabit; kenar boşluğu sorunu biter) |
| Asma bitkiler | 5 / 3 |
| Moka + gölgesi | 3 / 2 |
| Ön ışık lekeleri (5'ten 2'ye iner, %10) | 12 / 8 |

İvmeölçer yoksa bugünkü yavaş süzülme kalır. `expo-sensors` koruması aynen kalır; yeni yerel modül yok.
Köşe gölgeleri %38 → %14. Üst karartma sadece durum çubuğu kadar (%24). Alt karartma kalkar.

## 3. Ekranlar

Ölçüler 390×844 dp telefona göre; yüzdeler ekran yüksekliğidir.

### 3.1 Oda, sakin hâl

```
┌────────────────────────────┐
│ (‹)                ☕7  (⋯) │  %0-9   üst şerit
│                            │
│   raf, sürahi (buhar)      │  %12-34 oda görünür
│      ╭───────────────╮     │
│      │ Günaydın! …   │     │  balon: Moka'nın başının hemen üstü
│      ╰──────▽────────╯     │
│          (Moka)            │  %40-74
│        [ yastık ]          │
│                            │
│ [🧹 Temizlik başlat ] (＋)(💬)│  %88-96 alt sıra
└────────────────────────────┘
```

**Üst şerit** (güvenli alan + 6, yükseklik 44):
- Sol: geri, 44 daire, `room.shade` %34, krem ok.
- Sağ: kahve hapı + menü. Hap 36 yüksek, `room.paper`, içinde sürahi ikonu + sayı. Seri 0 ise sadece ikon. Dokun = kahve sayfası (§3.4).
- Ortada yazı yok. "Moka" başlığı ve seviye satırı kalkar. "Düşünüyor…" bilgisi balondaki üç noktada zaten var.

**Moka:** genişlik `min(ekran × 0,62, 300)`. Oturma noktası aynı (`SEAT`). Gölge iki katman: geniş yumuşak (`isik.webp`, `room.shade`, %22) + dar koyu temas gölgesi (%30). Gece üstüne %16 gece tonu (var).

**Balon:**
- Genişlik **metne sarılır**: en az 120, en çok ekran − 48. Kısa cümle küçük balon olur. İsim etiketi yok.
- Kuyruk Moka'nın gagasına bakar. Alt kenarı Moka'nın başının 8 dp üstünde.
- Ömür: açılış cümlesi 8 sn, dokunma repliği 3 sn, sohbet cevabı okunana kadar (boş yere dokununca ya da 25 sn). Sonra 200 ms'de söner. Moka'ya dokununca son cümle geri gelir.
- Eylem rozetleri ("✓ Cam silme eklendi", "Geri al") balonun altında, balona yapışık küçük haplar.
- Silme onayı balonda değil, alt sayfada sorulur.

**Alt sıra** (alt güvenli alan + 12, tek satır, panel yok):
- `Temizlik başlat`: esner, 56 yüksek, `accent` dolgu, süpürge ikonu + yazı. Uzun dillerde yazı %85'e küçülür, sığmazsa sadece ikon + "Başlat" kısa çevirisi.
- `＋` İş ekle: 56 daire, `room.paper`. Mevcut `AddSheet`'i açar.
- `💬` Moka'ya yaz: 56 daire, `room.paper`. Kilitliyse sağ üstünde 16'lık küçük rozet (misafir: kilit, ücretsiz: yıldız). Hak bittiyse ay ikonu.
- Arapça: sıra aynalanır (💬 solda, ana düğme sağda). Oda resmi aynalanmaz.

### 3.2 Yazma hâli (💬'ye basınca, Premium)

```
│ (‹)                ☕7  (⋯) │
│   ╭─────────────────╮      │  balon başlığın altına çıkar
│   │ Moka'nın cevabı │      │
│   ╰────────▽────────╯      │
│         (Moka %70)         │  küçülür, yukarı kayar (var)
│ (Geciken işler)(Bugün ne?) │  3 fikir hapı, sadece kutu boşken
│ [ Moka'ya yaz…         ➤ ] │  krem hap, klavyenin üstünde
│ ░░░░░░░ klavye ░░░░░░░░░░░ │
```

- Alt sıra kaybolur, yerine yazı kutusu gelir. Klavye kapanınca alt sıra geri döner.
- Kullanıcının mesajı gönderilince sağ altta 2,5 sn küçük yankı balonu (var), sonra söner.
- Sayaç sadece son 5 hakta, yazı kutusunun içinde sağda küçük "☕ 4".

### 3.3 Kilitli 💬 (misafir ve ücretsiz)

Dokununca klavye açılmaz. Moka balonda tek cümle söyler ve altında tek düğme çıkar:
- Misafir: "Konuşmak için beni tanıman lazım ☕" + `Hesap aç`.
- Ücretsiz: "Sohbetimiz Premium'da. İşlerde hep yanındayım 💛" + `Premium'a bak`.
- Hak bitti: "Bugünlük çok konuştuk, yarın devam ☕" (düğme yok).

8 sn sonra balon söner. Oturumda en çok bir kez kendiliğinden gösterilir; kullanıcı basmadıkça hiç çıkmaz. Oda, düğmeler, nesneler, cümle bankası herkese açık kalır.

### 3.4 Kahve sayfası (hap ya da rafındaki sürahiye dokununca)

Alttan açılan krem sayfa, ekranın %46'sı, tek ekran, kaydırma yok:

```
        ▁▁▁
   (sürahi, tüten)     7
                   gündür taze
  P  S  Ç  P  C  C  P        ← bu hafta: dolu fincan / ❄ / boş altlık
  ☕ ☕ ☕ ☕ ☕ ·  ·
  Sıradaki: French Press Ustası   ▓▓▓▓░░ 7/14
  Kahveyi ılık tut: 1 hak kaldı   (i)
```

- Sürahi çizimi kodla (SVG), durum §4.1'e göre.
- Hafta sırası: yapılan gün dolu fincan, dondurulan gün ❄, kaçan gün boş altlık (üzgün yüz yok), gelecek günler nokta.
- "Sıradaki" satırı bir sonraki kahve rozetine ilerleme.
- Başka hiçbir şey yok. Rozet listesi Profil'de kalır.

### 3.5 Menü (⋯)
Krem kart, 3 satır: Moka'nı tasarla, Notlarım, Diğer (alt satırlar: son cevabı bildir, sohbeti temizle). Altında yapay zekâ uyarısı (var). "Moka'nı tasarla" artık menüde de görünür; uzun basma gizli kısayol olarak kalır.

### 3.6 Moka'nı tasarla (kürk)

```
│ (‹)   Moka'nı tasarla   120⭐│  sağ üstte puan
│                            │
│       (oturan Moka, canlı) │  seçilen renk anında denenir
│                            │
│ ●   ●   ●   ●   ●   ●   ●   ●│  8 renk, 44'lük
│ ✓  80  80  120 120 120 160 160│  altında: sahipse ✓, değilse fiyat
│                            │
│ [   80 puana al   ]        │  denenen renk sende yoksa
```

- Deneme serbest. Sayfadan çıkınca sahip olunmayan renk geri alınır.
- Satın alma mevcut puan harcama yolundan (`owned` içine `kurk_<id>`; kişilik satın almayla aynı yol). Orman her zaman bedava.
- Puan yetmiyorsa düğme soluk: "40 puan daha" ve Moka: "Birkaç iş daha, sonra benim 💛".
- Fiyat önerisi (bahçe çiçekleri 20-50 puan): kahve 80, gri 80, mavi 120, turuncu 120, pembe 120, mor 160, kırmızı 160. Melih ayarlar.
- Daha önce bedava renk seçmiş kullanıcının rengi `owned`'a eklenir (kimse renk kaybetmez).
- Aksesuar bölümü zaten kaldırıldı; isim alanı isteğe bağlı kalır.

### 3.7 İlk ziyaret
3 adım (4'ten iner; renk adımı kalkar):
1. Moka uyuyor, küçük ipucu "Moka'ya dokun".
2. Uyanır: "Burası benim odam! Hoş geldin ☕".
3. Rafındaki sürahi bir kez parlar: "Bu kahve hep taze kalsın diye her gün küçük bir iş yeter." Sonra alt sıra belirir.

## 4. Kahve: seri yerine sürahi

### 4.1 Durumlar (kahve planı §2 aynen, yer değişti)

| Durum | Rafındaki sürahi | Hap | Moka cümlesi (ara sıra) |
|---|---|---|---|
| Taze (seri > 0, bugün iş var) | 3 buhar çizgisi, hafif sıcak hale | `☕ 7` | "Kahvemiz hâlâ taze ☕" |
| Tazelenmeyi bekliyor | 1 ince buhar | `☕ 7` soluk | "Bugün bir iş, kahve tazelenir ☕" |
| Ilık tutuldu (dondurma) | 1 ince buhar | `☕ 7 ❄` | "Kahveyi senin için ılık tuttum ❄️" |
| Soğumuş (seri 0, geçmiş var) | buhar yok | sadece ikon | "Kahve soğumuş, yeniden demleyelim ☕" |
| İlk gün | buhar yok | sadece ikon | "İlk kahveyi birlikte demleyelim ☕" |

- Sürahi **her zaman dolu** (resimde öyle). Fark sadece buhar ve hale. Resme dokunulmaz.
- Buhar şu an beyaz kupadan çıkıyor (`MUG`); sürahinin ağzına taşınır. Mevcut `kupa` dokunma kutusu sürahiyi de kapsıyor: sürahi için ayrı kutu açılır, kupa "Moka yudumlar" olarak kalır.
- "Taze" cümlesi sıklığı: odaya girişte açılış cümlesinden sonra bir kez; sonra en erken 4 dakikada bir; sürahiye dokununca hemen. Sayı ≥ 2 ise yarı yarıya "{} gündür taze ☕".
- Bugünün ilk işi bitince (uygulamanın neresinde olursa olsun) odaya sonraki girişte sürahi bir kez "fokurdar": 400 ms zıplama + buhar patlaması + hap sayısı bir artar (sayı yukarı kayarak değişir). Günde bir kez.
- Sayı tek kaynaktan: `progressOf()`. Yeni hesap yok, yeni veri alanı yok.

### 4.2 Uygulamanın geri kalanı
Kahve planı §3 tablosu geçerli: 🔥 → ☕, "seri" → "taze kahve", "Seri dondurma" → "Kahveyi ılık tut". Okuma serisi 📚 olduğu gibi kalır. Widget'ta sadece metin değişir (yeni derleme gerekmez). Bu, odadan bağımsız ayrı aşamadır (F4).

### 4.3 Rozetler
Kahve planı §6 tablosu aynen: İlk Demleme (3), Her Gün Taze Filtre (7), French Press Ustası (14), Barista (30), Altın Çekirdek (100) + yeni Cold Brew Sabrı (60) ve Kahve Efsanesi (365). Kimlikler ve koşullar değişmez. Resim gelene kadar tek renk çizgi ikon (kodla), emoji değil.

## 5. Canlı yüz, oturan Moka'da

**Güncelleme (aynı gün):** bu belge yazılırken yapım thread'i `4af040e` ile canlı yüzü mevcut resimlerden çözdü (`scripts/make-moka-seated-face.py`: mimik yüz diski oturan gövdeye yapıştırılır, fincan önde kalır; 8 kare × 8 kürk, `seated_1-8.webp`; önizleme `moka-oda/oda-oturan-yuz.png`). Sonuç yeterince iyi: **F6 ve A1 yayın için şart değil.**
Kalan iki kusur, sadece bunlar için A1 istenir: (1) Moka her duyguda fincan tutuyor, uyurken de; (2) yüz diski ile gövde arasında ton farkı yakından belli olabilir (emülatörde bakılacak). Aşağıdaki yöntem A1 resimleri gelirse geçerlidir; gelmezse mevcut 8 kare aynı duygu eşlemesiyle kullanılır.

**Yöntem:** aynı pozun 7 tam karesi üst üste durur, saydamlıkla geçilir. Gövde aynı olduğu için sadece yüz değişmiş görünür. Küçük kaymalar hareket gibi okunur (mevcut `MokaFace` 8 ayrı çizimle bunu zaten yapıyor ve iyi duruyor).

| Kare | Ne zaman |
|---|---|
| `sakin` (ana) | varsayılan |
| `kirp` (gözler kapalı) | 3-6 sn'de bir 110 ms; uykuya geçiş |
| `agiz` (gaga açık) | balon yazılırken `sakin` ile 130-170 ms ritim |
| `mutlu` (^ ^) | iş bitti, dokunma, olumlu cevap |
| `saskin` | pencere/hava cümlesi, yeni rozet |
| `uzgun` | kullanıcı üzgün yazdıysa dinlerken |
| `dusunen` (gözler yukarı) | cevap beklenirken |
| `uyuyan` (ayrı poz) | 3+ gün ara, gece boşta |
| mevcut `moka_home_seated` (fincanlı, gülen) | kupaya dokununca ve "kahve tazelendi" anında 2,5 sn |

- Aynı anda en çok 2 kare çizilir (giden + gelen). Bellekte seçili kürkün 9 karesi, 768 px WebP ≈ 0,6 MB.
- Hizalama: `scripts/make-moka-face.py` her kareyi saydam olmayan alanın alt-orta noktasına göre ana kareye oturtur (Pillow yeter, OpenCV yok). Fark 6 pikselden büyükse uyarı verir, o kare yeniden istenir.
- Kürk: `make-moka-fur.py` 9 kareye uygulanır (7 renk × 9). Paket +≈4 MB; sadece seçili renk yüklenir.
- Gövde hareketi (nefes, konuşurken sekme, baş eğme, z'ler) `RoomMoka`'da var, kalır.
- Resimler gelmeden: bugünkü tek resim kalır; F1-F2 bundan bağımsız ilerler.

## 6. Kesilenler

| Kesilen | Neden | Ne zaman geri gelebilir |
|---|---|---|
| Odada hafta tepsisi ve dolan fincan | Oda dolu; sürahi ile aynı şeyi söyler. Hafta sırası kahve sayfasında | gelmez |
| Kahve defteri (24 kahve, tarifler, 12 Premium) | ≈650 çeviri + 24 resim; dönüş sebebi zayıf | Yayından sonra, veriyle |
| Oda eşyaları, 6 yer, yerleşim sayfası, Premium yer | İkinci oyun; odada boş yer yok; 9 resim | Tek istisna aşağıda |
| Kahve molası (odak bağlantısı) | Odak ekranı zaten var, Moka sohbetinden açılıyor | gelmez |
| Kart oyunu, Moka Café | Ayrı proje, bu işin parçası değil | ayrı karar |
| 1170 px oda yeniden üretimi | "Aynısını üret" isteği nesneleri kaydırır, bütün katman ve koordinat işi baştan. Yerine: mevcut resim yerel büyütme aracıyla 2 kat (F5, isteğe bağlı) | F5 |
| Yüz yaması (OpenCV) | Tam kare geçiş yeter | gelmez |
| İlk ziyarette bedava kürk | Melih: puanla | gelmez |
| Başlıkta ad + seviye, balonda "MOKA" etiketi, buzlu panel, kalıcı kilit satırı | §1.1 | gelmez |

**Tek eşya istisnası (resimsiz):** uzun seri ödülü olarak rafın üstüne kodla çizilen ışık zinciri (7 küçük sıcak nokta, 7 gün seride yanar). Resim gerekmez, yerleşim yok, "oda büyüyor" hissini verir. F3'te, yarım saatlik iş.

## 7. Yapım sırası

Her aşama ayrı commit; sonunda `npm run typecheck`, `npm run lint`, testler. Dal push edilir, emülatör thread'i çeker. Hiçbir aşamada yeni yerel modül yok, yeni derleme gerekmez. Sunucu değişikliği yok.

| # | İş | Sahibi | Resim | Süre |
|---|---|---|---|---|
| F0 | Emülatörde mevcut dalı dene; EN'de Türkçe kalan 4 metni doğrula ve düzelt; `room` renkleri temaya | thread | yok | 0,25 gün |
| F1 | **Yeni düzen:** üst şerit (geri, hap yeri, menü), metne sarılan ömürlü balon, tek satır alt sıra, 💬 ile açılan yazı kutusu, kilitli 💬 davranışı, buzlu panel ve karartmalar kalkar, iki katman gölge | thread | yok | 1 gün |
| F2 | **Katman kayması** (döndürme kalkar), ön ışık 2'ye iner, köşe gölgesi %14 | thread | yok | 0,25 gün |
| F3 | **Kahve odada:** sürahi dokunma kutusu, buhar durumları, hale, "taze" cümleleri (9 dil), fokurdama, üst şerit hapı, kahve sayfası, ışık zinciri, ilk ziyaret 3 adım | thread | yok | 1 gün |
| F4 | **Kahve her yerde:** 🔥 → ☕ (Ev, Bugün, Profil, takvim, kartlar, bildirim, ayar, widget metni), rozet adları ve grup adı, "Kahveyi ılık tut", 9 dil | thread | yok (ikonlar kodla) | 0,75 gün |
| F5 | **Kürk puanla:** fiyatlar, `owned`, deneme, eski seçimlerin korunması, menüde "Moka'nı tasarla" | thread | yok | 0,5 gün |
| A1 | Oturan ana poz + 6 yüz + uyuyan poz (§8, 8 resim). **İsteğe bağlı**; en değerlisi tek resim: uyuyan poz | **Melih** | 1-8 | 0,5-2 saat |
| F6 | Canlı yüz zaten var (`4af040e`). A1 gelirse: kareleri değiştir, hizalama, kürk üretimi | thread | A1 | 0,5 gün |
| A2 | 7 rozet ikonu + fincan kaldıran Moka (§8) | **Melih**, isteğe bağlı | 8 | 1 saat |
| F7 | Rozet resimleri, kutlama, mağaza ekran görüntüsü; isteğe bağlı oda 2 kat büyütme | thread | A2 | 0,5 gün |

Sıra önerisi: F0 → F1 → F2 → F3 bir arada gösterilir (yaklaşık 2,5 gün, Melih'in "profesyonel cozy" isteğinin cevabı). Sonra F4, F5. A1 bu sırada Melih'te; gelince F6.
Sahiplik: kod "Perfect Moka's room plan and build" thread'inde (dal `claude/project-thread-jb6lt2`); entegrasyon dalına sadece emülatör thread'i çeker.

**Melih'in vereceği 4 karar:**
1. Alt sıra tek satır + 💬 arkasında yazı (önerim) uygun mu?
2. Kürk fiyatları (80 / 120 / 160) uygun mu?
3. 60 ve 365 günlük iki yeni kahve rozeti eklensin mi (önerim evet)?
4. Kesilenler listesi (§6) tamam mı, özellikle kahve defteri?

## 8. Melih'in üreteceği resimler

Hepsi için: aynı sohbet, saydam PNG, 1024×1024. Düzenlemelerde önce Gemini'yi dene (gövdeyi daha az kaydırıyor); olmazsa ChatGPT. Teslim: proje dosyaları `moka-oda/`.

### A1. Oturan Moka (isteğe bağlı kalite yükseltmesi; önce sadece 8. resim, uyuyan poz, yeter)

**1) Ana poz** — ekle: `moka_happy.png`, `moka_home_seated.png` (boyut ve oturuş için), oda resmi (ışık için).
```
Ekteki Moka maskotunu birebir aynı stil, renk ve kontur kalınlığıyla çiz. İkinci görseldeki gibi TAM BOY oturuyor: ayakları öne doğru, görünür; aynı boyut, tuvalde aynı yer. Farklar: elinde fincan YOK, iki kanadı karnının yanında rahat duruyor; yüz sakin: gözler açık ve parlak, gaga kapalı, hafif gülümseme. Işık üçüncü görseldeki oda gibi: sağdan sıcak lamba ışığı, sağ kenarda hafif turuncu parlama, solda yumuşak gölge. Yastık, zemin, gölge zemini, yazı, ek nesne yok. Tamamen saydam arka plan, PNG, 1024x1024, Moka ortada, altta 60 piksel boşluk.
```
Ad: `moka_oda_sakin.png`. Beğenene kadar düzelt; sonrakiler buna bağlı.

**2-7) Yüzler** — her biri ayrı mesaj, her seferinde `moka_oda_sakin.png` ekli:
```
Bu görselin AYNISI: gövde, kanatlar, ayaklar, renkler, ışık, boyut ve tuvaldeki yer hiç değişmesin. Sadece yüzü değiştir: [DEĞİŞİKLİK]. Saydam arka plan, 1024x1024.
```
| Ad | [DEĞİŞİKLİK] |
|---|---|
| `moka_oda_kirp` | gözler tamamen kapalı, iki yumuşak kavis; gaga kapalı |
| `moka_oda_agiz` | gözler açık; gaga yarı açık, konuşuyor gibi |
| `moka_oda_mutlu` | gözler mutlu kıvrık (^ ^), gaga açık gülüyor, yanaklar hafif pembe |
| `moka_oda_saskin` | gözler kocaman açık, kaşlar yukarıda, gaga küçük "o" |
| `moka_oda_uzgun` | kaşlar düşük, gözler nemli ve aşağı bakıyor, gaga kapalı; üzgün ama sevimli |
| `moka_oda_dusunen` | gözler sağ yukarı bakıyor, gaga kapalı hafif yana, düşünceli |

**8) Uyuyan** — `moka_oda_sakin.png` ekli:
```
Aynı Moka, aynı stil, aynı boyut ve tuvalde aynı yer. Poz: uyuyor; gözler kapalı, baş hafif öne ve yana düşmüş, kanatlar karnında, huzurlu. Fincan, yastık, battaniye, "z" harfi, yazı yok. Aynı ışık. Saydam arka plan, 1024x1024.
```
Ad: `moka_oda_uyuyan.png`.

Düzeltme cümleleri: boyut değiştiyse "Boyutu ve yeri ilk görselle birebir aynı yap." · Yüz farklıysa "Yüz şekli ve gaga `moka_happy` ile aynı olsun." · Arka plan doluysa "Arka planı tamamen saydam yap."

### A2. Rozetler ve kutlama (öncelik 2, isteğe bağlı, 8 resim)

İlk mesaj — ekle: `moka_happy.png` + mevcut bir rozet resmi:
```
Ekteki maskotun ve rozetin çizim stilini birebir kullan: tombul, yuvarlak, yumuşak koyu kontur, düz renk + tek kademe gölge, sıcak pastel (krem, kil, kahve). Bundan sonra istediğim her nesneyi yuvarlak rozetin içinde, ortada, tek başına çiz. Yazı yok. Saydam arka plan, 1024x1024. Anladıysan "hazır" yaz.
```
Sonra tek tek: `bakır cezve, ağzında köpük` (seri-3) · `cam filtre kahve sürahisi, üstünde kâğıt filtre` (seri-7) · `french press, yarısı dolu` (seri-14) · `latte fincanı, köpükte kalp deseni, yanında barista önlüğü` (seri-30) · `cam cold brew şişesi, içinde buz` (seri-60) · `parlayan altın kahve çekirdeği` (seri-100) · `küçük taç takmış kahve sürahisi` (seri-365).
Adlar: `rozet_seri_3.png` … `rozet_seri_365.png`.

Kutlama — `moka_oda_sakin.png` ekli: `Aynı Moka, aynı boyut ve yer. Bir kanadıyla krem bir kahve fincanını havaya kaldırmış, gözler mutlu kıvrık, gaga açık gülüyor. Saydam arka plan, 1024x1024.` → `moka_oda_serefe.png`.

**Gerekmeyenler:** kahve potu, fincan, tepsi, 24 kahve, oda eşyaları, yeni oda, kıyafet, aksesuar.

## 9. Riskler

| Risk | Olasılık | Önlem |
|---|---|---|
| Yüz düzenlemelerinde gövde kayar, geçişte titrer | orta | Hizalama scripti + 6 px eşiği; tutmayan kare yeniden istenir; en kötü hâlde sadece `kirp` + `agiz` + `mutlu` kullanılır (3 kare yeter) |
| 💬 arkasına alınan yazı kutusu Premium kullanıcıda sohbeti azaltır | düşük-orta | Premium'da ilk 3 girişte 💬 bir kez hafifçe zıplar; kullanım düşerse Premium'da kutu açık gelebilir (tek satır ayar) |
| Tek satır alt sırada uzun diller (DE, FR, PT) taşar | orta | Yazı küçülme + kısa çeviri + son çare sadece ikon; 320 dp genişlikte 9 dilde ekran testi |
| Arapça aynalama: balon kuyruğu, alt sıra, hap | orta | Oda ve Moka aynalanmaz, sadece arayüz; F1 sonunda AR ekran görüntüsü |
| Sürahiden buhar küçük ekranda fark edilmez | orta | Hale + giriş cümlesi + hap birlikte taşır; buhar tek başına sinyal değil |
| 🔥 → ☕ kullanıcıyı şaşırtır (seri nereye gitti?) | düşük | İlk açılışta bir kez Moka: "Serin artık benim kahvem ☕ {} gündür taze"; ayarlarda "Kahve serisi" adı |
| Kürk fiyatı eski bedava seçeni kızdırır | düşük | Mevcut seçim `owned`'a yazılır |
| Paket +4 MB (kürk kareleri) | düşük | 768 px, WebP 82; gerekirse 640 px |
| Pil | düşük | Döngü sayısı azalıyor (ön ışık 5 → 2, döndürme yok, buhar duruma bağlı); 10 dk açık oda profili F3 sonunda |
| Yerel modül sürprizi | düşük | Yeni modül yok; `expo-blur` odadan çıkıyor; `expo-sensors` koruması duruyor |
| Dalın `integration/tum-pr`'dan uzaklaşması | orta | F1'den önce entegrasyon dalı bu dala alınır; her aşama sonunda emülatör thread'i çeker |

## 10. Başarı ölçütü

- Odada ilk bakışta arayüz ekranın %15'inden azını kaplar (şimdi ≈%35).
- Moka, yastık, raf ve sürahi sakin hâlde hiçbir arayüz parçasının altında değil.
- Kullanıcı seriyi sorulmadan "kahve" olarak anlatabiliyor (Melih'in kendi testi).
- 720×1280 ekranda, 9 dilde taşma yok.
- Ölçülecek: odaya günlük giriş oranı, kaçırma sonrası 3 gün içinde dönüş, Temizlik başlat'a odadan basma oranı.
