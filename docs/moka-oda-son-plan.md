# Moka'nın odası: son plan (2026-11-16)

Bu belge `moka-ortam-plani.md`'nin (bölüm 1-9) yerine geçen son plandır. Önceki belge geçmiş kayıt olarak kalır.
Hedef: alt menünün ortasındaki tuşa basınca açılan, Moka'nın yaşadığı, kullanıcının gününü yansıtan, her gün girilmek istenen sıcak bir oda.
Kural: hepsi JS. Yeni yerel modül yok (gerekirse `requireOptionalNativeModule` ile korunur ve Melih'e söylenir).

---

## 1. Dürüst denetim: şu an ne var, ne ucuz duruyor

Şu anki oda (`src/app/moka.tsx`, `RoomBackdrop.tsx`, `roomState.ts`) iyi bir ilk adım: gündüz-gece karışımı, camda hava, sallanan bitkiler, toz, buhar, dokunulabilir nesneler, boşta pozlar ve tek balonlu sohbet çalışıyor. Ama "en iyi sürüm" için şunlar sorunlu:

**Görsel olarak ucuz duranlar**
1. **Moka yastıkta oturmuyor.** Ayakta duran mimikli Moka (`MokaFace`, 512 px) yastığın önüne konmuş; ayakları yastığın alt kenarında, gölgesi yok. Oda "Moka'nın odası" değil, "odanın önünde duran çıkartma" gibi.
2. **Boşta pozlar zıplıyor.** Kitap, kahve, müzik pozları farklı çerçeveli ve farklı ölçekli çıkartmalar; çapraz geçişte Moka'nın boyu, yeri ve bakışı birden değişiyor.
3. **Lamba titremesi bozuk ampul gibi.** 9 adımlı sürekli titreme gerçek bir lambada olmaz; sıcak değil, gergin hissettiriyor.
4. **Tam ekran renk perdeleri.** `warm` turuncu ve `dust` lacivert perdeler bütün resmi boyuyor; ışık değil, filtre gibi duruyor.
5. **Alt kısım kalabalık.** Fikir hapları + iki büyük düğme + yazı çubuğu üç sıra; kısa ekranlarda (16:9) Moka'nın üstüne biniyor.
6. **Üst kısım kalabalık.** 📝 🚩 🧹 üç emoji düğme sürekli görünüyor; sorumluluk uyarısı her balonun içinde tekrar ediyor.
7. **Resim çözünürlüğü düşük.** Oda 852×1846; 1290 px genişlikli telefonlarda 1,5 kat büyütülüyor, yumuşak/bulanık görünüyor.
8. **Geçiş "odaya girme" gibi değil.** Bütün ekran (yazılar dahil) %18'den büyüyor, üstüne yığının `fade` animasyonu da biniyor.

**Hatalar ve teknik borç**
9. **Çeviri eksik.** "Temizlik başlat", "İş ekle", "Moka'ya yaz…", karşılama, 10 fikir hapı, sorumluluk uyarısı, "Moka düşünüyor…" gibi metinlerin çoğu çeviri tablosunda yok; Türkçe dışındaki 8 dilde Türkçe kalıyor.
10. **Harf harf yazma emojiyi bölüyor.** `text.slice(0, n)` vekil çiftleri (emoji, bazı Japonca/Korece karakterler) ortadan kesiyor, yazılırken kısa süre bozuk karakter görünüyor.
11. **Gece de gündüz de birlikte çiziliyor.** Gece tam açıkken bile gündüz katmanları ve animasyonları çalışıyor: iki tam ekran resim + iki kat bitki animasyonu (boşa GPU ve pil).
12. **Saat ilerlemiyor.** `nightMix()` ekran açılınca bir kez hesaplanıyor; oda açık kalırsa akşam olmuyor.
13. **Ücretsiz/misafir kullanıcı yazıp sonra reddediliyor.** Önce yazdırıp sonra "Premium gerekli" demek tuzak gibi hissettiriyor.
14. **Kişiselleştirme odada yok.** Kürk rengi odadaki Moka'ya uygulanmıyor (`MokaFace` mimikleri boyanmamış).
15. **Aksesuar katmanı** (`MokaAcc.tsx`, `moka-acc.ts`, `assets/moka/acc/`) beğenilmedi ama hâlâ Ev'deki Moka'da ve "Moka'nı tasarla"da çalışıyor; paketi de büyütüyor.
16. **`oda-demo` geçici ekranı** hâlâ rotada.

---

## 2. En iyi sürüm: 30 saniyelik deneyim

1. Kullanıcı ortadaki Moka tuşuna basar. Tuştaki küçük Moka **zıplayarak büyür ve yastığın üstüne konar**, arkasında oda yumuşakça açılır (≈420 ms).
2. Moka oturduğu yerden el sallar, balonda **o ana özel tek cümle**: sabahsa "Günaydın! Kahvem hazır ☕ Bugün 3 işin var.", hepsi bittiyse "Bugün harikaydın, oda pırıl pırıl ✨".
3. Oda canlı ama sakin: pencerede gerçek hava (yağmur, kar, bulut), bitkiler çok hafif sallanır, lamba yavaşça "nefes alır", kupadan buhar çıkar.
4. Oda kullanıcının gününü gösterir: iş yaptıkça ışık ısınır; birkaç gün gelmezse toz birikir, Moka battaniyesinin altında uyur; dönünce uyanıp sevinir, toz kalkar.
5. Altta iki büyük düğme: **🧹 Temizlik başlat** ve **➕ İş ekle**; üstlerinde Moka'ya yazma çubuğu. Fikir hapları sadece yazma çubuğuna dokununca çıkar (3 tane, duruma göre).
6. Moka'ya dokununca tepki verir, uzun basınca "Moka'nı tasarla" açılır. Lambaya dokununca lamba söner/yanar, kupaya dokununca Moka kahvesini yudumlar, pencereye dokununca havayı söyler.
7. Zamanla oda büyür: seri, rozet ve bahçeden kazanılan eşyalar odadaki yerlerine konur (duvarda çerçeve, pencere önünde bahçeden gelen çiçek vazosu, ışık zinciri...).

---

## 3. Sanat yönü

- **Tek oda, tek kamera.** Mevcut oda (pencere solda, raf ve lamba sağda, ortada yastık) korunur; Melih onu onayladı ve katmanlara ayrıldı. Yeni oda istenmez.
- **Çözünürlük:** odanın 1170×2532 sürümü istenir (bölüm 13, A). Gelene kadar mevcut 852×1846 kullanılır.
- **Moka yastıkta oturur.** 5 oturma pozu (1024×1024, saydam), hepsi aynı ölçek ve aynı oturma çizgisi. Kod Moka'yı yastığın oturma noktasına yerleştirir (oda koordinatı, yapımda ölçülür; yaklaşık x 360, y 1330), altına yumuşak oval gölge çizer.
- **Işık uyumu:** Moka resimlerinde ışık sağdan sıcak lamba (oda ile aynı). Gece Moka'nın üstüne çok hafif lacivert-mor bir "gece tonu" (sadece Moka'nın şeklinde, `tintColor` ile ikinci kopya, %18) bindirilir; böylece gündüz resmi gecede parlamaz.
- **Renk:** palet aynı (lacivert, mint, mavi, kil, kahve, krem). Balon krem (`#FFF8EE` benzeri tema rengi), %96 opak, yumuşak gölge, kuyruğu Moka'ya bakar.
- **Aksesuar/kıyafet yok.** Kişiselleştirme = kürk rengi + isim + oda eşyaları. Kıyafet fikri tamamen bırakılır (Melih: yapay duruyor).

---

## 4. Moka'nın canlanması (sadece yüz ve küçük gövde hareketi)

**Görseller:** 5 oturma pozu (sakin, kahve, selam, düşünen, uyuklayan) + her poz için yüz düzenlemeleri (göz kapalı, ağız açık; sakin pozda ek olarak mutlu göz, şaşkın, üzgün).

**Yüz yaması yöntemi:**
- Melih her düzenlemeyi "aynı görsel, sadece gözleri kapat" diye üretir. ChatGPT düzenlemede resmi birkaç piksel kaydırabilir; bu yüzden `scripts/make-moka-face.py` önce düzenlemeyi ana resme hizalar (OpenCV ECC), sonra iki resim arasındaki farkın kutusunu bulur, yumuşak kenarlı küçük bir yama (≈200×140 px) olarak keser.
- Uygulamada: gövde resmi sabit, üstünde yama `Animated` saydamlıkla açılır-kapanır. Göz kırpma 3-6 sn'de bir (120 ms), konuşurken ağız 120-180 ms ritimle, duygu değişince 250 ms çapraz geçiş.
- Yama kenarı belli olursa yedek yol: yamanın yerine tam resim çapraz geçişi (aynı gövde olduğu için zıplamaz, sadece daha çok bellek).

**Gövde hareketi (resim değişmeden):** nefes (alttan sabit, dikeyde %1,5 esneme, 3,6 sn), konuşurken minik sekme, dokununca zıplama, düşünürken başı yana eğik gibi hafif dönme (±2°, oturma noktası ekseninde).

**Boşta davranışlar (aynı pozlar arasında, zıplamadan):**
| Zaman | Davranış |
|---|---|
| 15-25 sn dokunulmadı | kahve pozuna geçer, yudum alır (buhar artar), geri döner |
| ara sıra | pencereye bakar (düşünen poz), havayla ilgili tek cümle söyler (ekran okuyucuya duyurulmaz) |
| gece, 45 sn dokunulmadı | uyuklayan poza geçer, balon "zzz" |
| 3+ gün gelinmedi | açılışta uyuklayan pozda; dokununca uyanır (selam pozu) |

Kitap, müzik, dizüstü gibi farklı çerçeveli eski çıkartmalar odada kullanılmaz.

**Kürk rengi:** `scripts/make-moka-fur.py` oturma pozlarına ve yüz yamalarına da uygulanır (7 renk × 5 poz + yamalar). Paket boyutu için kürk resimleri 768 px, yamalar küçük. Sadece seçili renk yüklenir.

---

## 5. Hareket tasarımı ve pil

İlke: aynı anda **tek bir şey dikkat çeker**, geri kalan her şey yavaş ve küçük.

| Öğe | Şimdi | Yeni |
|---|---|---|
| Lamba | sürekli titreme | 6 sn'lik yavaş nefes (%92-100); 40-90 sn'de bir minik tek titreşim |
| Cam | ±6 px kayma | aynı, 30 sn; gece bulut yerine yıldız göz kırpması |
| Bitkiler | 3 bitki, 2 kat (gündüz+gece) | 3 bitki, tek kat (geçiş anı hariç) |
| Toz | 12 zerre her yerde | 6 zerre, sadece ışık huzmesinde, gündüz pencere, gece lamba |
| Buhar | hep | sadece kupa doluyken (Moka kahve pozundayken ve sabah) |
| Gündüz/gece | açılışta bir kez | dakikada bir güncellenir, karışım sadece 06-08 ve 17:30-19:30 arası iki katman çizer |
| Gün ışığı/sıcaklık | tam ekran turuncu perde | lamba ışığı halesi büyür ve ısınır, perde yok |
| Toz/loşluk | tam ekran lacivert perde | kenarlardan içe doğru vinyet (ışık resmi) + zeminde toz zerreleri |

Bütçe: aynı anda en çok ~25 canlı öğe, hepsi `useNativeDriver: true`. Ekran odakta değilken ya da uygulama arka plandayken her döngü durur (zaten var). Oda resimleri uygulama açılışında önden yüklenir (`expo-asset` `Asset.loadAsync`), geçişte boş kare görünmez.

**Geçiş (giriş):** Tuştaki Moka resmi ekranın altından yastığa doğru yay çizerek uçar ve büyür (420 ms, `Easing.out(back)`), aynı anda oda %0→100 saydamlıkla açılır, balon 200 ms sonra yaylanarak belirir. Yığın animasyonu `none` olur (iki animasyon üst üste binmez). **Çıkış:** tersi, 300 ms. **Hareketi azalt:** düz 200 ms çapraz geçiş.

---

## 6. Ekran düzeni ve etkileşimler

```
┌──────────────────────────┐
│ ‹            🕘 Geçmiş ⋯ │  üst: geri, geçmiş, menü (notlar, bildir, temizle)
│   ╭──────────────────╮   │
│   │ Moka'nın balonu  │   │  tek balon, en çok 2 kısa cümle
│   ╰────────▽─────────╯   │
│                          │
│         (Moka)           │  yastıkta, ortada
│      [  yastık  ]        │
│ ( 🧹 Temizlik ) ( ➕ İş ) │  iki büyük hap
│ [ Moka'ya yaz…      ➤ ]  │  yazı çubuğu (ücretsiz/misafirde kilit hapı)
└──────────────────────────┘
```

- **Balon:** tek mesaj, harf harf (emoji güvenli, `Array.from`). Yapılan eylemler balonun altında küçük rozet ("✓ Cam silme eklendi", "↩️ Geri al"). Balona dokununca geçmiş açılır.
- **Fikir hapları:** sadece yazma çubuğu odaktayken, 3 tane, duruma göre: geciken iş varsa "Geciken işlere bir bakalım", sabah "Bugün ne yapmalıyım?", alışveriş listesi boşsa "Alışveriş listesine süt ekle".
- **Klavye:** Moka küçülüp yukarı kayar (şimdiki gibi), iki düğme gizlenir, balon görünür kalır. Android `height`, iOS `padding`; kısa ekran (720×1280) ve uzun ekran (1080×2400) emülatörde denenir.
- **Moka'ya dokun:** sırayla değişen tepki (kıkırdama, el sallama, kalp); 5 hızlı dokunuşta gizli tepki ("Gıdıklanıyorum! 🤭"). **Uzun bas:** Moka'nı tasarla.
- **Nesneler:** lamba = söner/yanar (oda loşlaşır, Moka "Böyle daha huzurlu"); kupa = Moka yudumlar; bitki = sallanır, kullanıcının sulanması gelen bitkisi varsa onu söyler; pencere = gerçek havayı söyler. Hepsi hafif titreşim + `sfx('tap')`.
- **Eşya yerleri:** boş yer uzun basılınca küçük bir sayfa açılır, kazanılmış eşyalardan biri seçilir (bölüm 8).

---

## 7. Oda kullanıcının gününü yansıtır

Kaynak `roomState()` genişletilir: bugün yapılan işler, bugünkü kalan işler, geciken işler, seri, son giriş.

| Durum | Oda | Moka ve ilk cümle (örnek) |
|---|---|---|
| Sabah, iş var | gün ışığı | selam pozu: "Günaydın! Bugün 3 küçük işimiz var ☕" |
| Gün içinde iş yapıldı | lamba halesi ısınır (5 işte tam) | sakin, mutlu göz |
| Bugünün hepsi bitti | 3 sn yıldız saçılması (bir kez), gece boyu raf üstünde küçük ışık zinciri parlar | "Bugün harikaydın, oda pırıl pırıl ✨" |
| Çok geciken iş | normal ışık (suçlama yok) | düşünen poz: "Birikmiş birkaç iş var, en kısasından başlayalım mı?" |
| 3+ gün gelinmedi | vinyet + toz zerreleri | uyuklayan pozda; dokununca uyanır: "Döndün! Seni özledim 🥹", toz 1,5 sn'de dağılır |
| Seri koptu | aynı | yumuşak: "Olur böyle şeyler. Bugün yeniden başlarız" |
| Gece | gece resmi | 22:00 sonrası esner, "Yarın için bir şey not edeyim mi?" |

Bu cümleler **yapay zekâ değil**, telefondaki cümle bankasından gelir (her durum için 3-4 çeşit, 9 dil). Sohbet hakkı düşmez, internetsiz çalışır.

---

## 8. Oda büyür: eşyalar

Odaya **6 eşya yeri** tanımlanır (oda koordinatı, resimde boş alanlar): sol duvar çerçeve, sağ duvar çerçeve, rafın üstü (ışık zinciri), pencere önü (vazo), sol zemin köşesi, sağ zemin köşesi. Her eşya saydam bir çıkartma; gece ona da gece tonu bindirilir.

| Eşya | Nasıl açılır | Yer |
|---|---|---|
| Işık zinciri | 7 gün seri | rafın üstü |
| Çerçeveli Moka resmi | 14 gün seri | sol duvar |
| Pikap | 30 gün seri | sağ zemin |
| Bahçe vazosu | bahçede ilk çiçeği albüme alınca; vazodaki çiçek albümdeki son çiçek | pencere önü |
| Kitap yığını | Moka seviye 5 | sol zemin |
| Rozet panosu | 10 rozet | sağ duvar |
| Kedi minderi | evcil hayvan cevabı "var" + 7 iş | sağ zemin |
| Mevsim süsü (Noel, bahar, bayram) | Premium, tarihe göre kendiliğinden | rafın üstü + pencere |

- Açılma durumu veriden **hesaplanır** (seri, rozet, seviye, bahçe albümü); sunucuya yeni tablo gerekmez. Sadece yerleşim seçimi `Play.roomItems?: Record<slotId, itemId>` olarak saklanır (play JSON içinde, mevcut yedeklemeyle gider; alan isteğe bağlı, `SCHEMA_VERSION` artmaz).
- Yeni eşya açılınca: odaya ilk girişte eşya parıltıyla belirir, Moka söyler: "Bak, ışık zinciri geldi! 7 gündür buradasın ✨".
- Bahçe bağlantısı iki yönlü: odadaki vazoya dokununca bahçe açılır.

---

## 9. Moka'nın kişiliği ve dil tonu

- Kahve seven, biraz uykucu, sıcak bir ev arkadaşı. Asla suçlamaz, utandırmaz, "yapmadın" demez; "hadi birlikte" der.
- Odada balon en çok **2 kısa cümle** (≈140 karakter), en çok 1 emoji. Uzun cevaplar geçmiş sayfasında tam okunur.
- Saat ve havayı bilir, kullanıcının iş adlarını kullanır ("Salon camı" gibi).
- Sunucu istemine `room: true` bağlamı eklenir: "odadasın, cevabın en çok iki kısa cümle". Bu edge function yeniden yüklenince (`moka-chat`) etkili olur; o zamana kadar uzun cevaplar balonda kayar.
- Cümle bankası `src/domain/mokaLines.ts`: durum → 3-4 Türkçe cümle; çeviriler `src/i18n/extra.ts` satırları (9 dil). Japonca kibar ama sıcak (です/ます yumuşak), Korece 반말 değil 해요체, Arapça sade fusha.

---

## 10. İlk ziyaret (onboarding)

Bir kez, `Play.roomIntro` bayrağıyla:
1. Oda açılır, Moka yastıkta uyuyor (zzz).
2. Balon (Moka'nın değil, küçük ipucu): "Moka'ya dokun".
3. Uyanır, selam: "Burası benim odam! Hoş geldin ☕"
4. "Lambaya, kupaya ya da pencereye dokunabilirsin" (nesneler bir kez hafifçe parlar).
5. "Bana bir renk seçer misin?" → odanın içinde alttan 8 kürk rengi şeridi; seçince Moka anında değişir, "Çok yakıştı!" Geç düğmesi var.
6. "İş eklemek ya da temizliğe başlamak için aşağıdaki düğmeler. Konuşmak istersen yaz." Bitti.

---

## 11. Boş ve hata durumları

| Durum | Davranış |
|---|---|
| Misafir | yazı çubuğu yerine hap: "Moka ile konuşmak için hesap aç" → `/giris`. Oda, düğmeler, nesneler, cümle bankası açık. |
| Ücretsiz üye | hap: "Moka ile sohbet Premium'da ⭐" → `/premium`. Önce yazdırıp reddetmek kalkar; çubuk hiç açılmaz, basit kalır. |
| Premium, hak bitti | Moka esner: "Bugünlük çok konuştuk, yarın devam ☕"; çubuk yerine "Yarın açılır" hapı. |
| Hak azaldı | sayaç sadece son 5'te görünür ("☕ 4"), sürekli "18/25" kaygı yaratmaz. |
| İnternet yok | Moka: "İnternet gitti galiba. İş eklemek için aşağıdaki düğme çalışıyor." Yazılan mesaj kaybolmaz, çubukta kalır. |
| Sunucu hatası | "Kafam karıştı, bir daha dener misin?" + "Tekrar dene" hapı. Hak düşmez (sunucu zaten geri veriyor). |
| Hiç iş yok | "Henüz iş yok. İlkini birlikte ekleyelim mi?" → İş ekle sayfası. |
| Resim yüklenemedi | oda yerine tema renginde düz zemin; Moka yine çıkar. |

---

## 12. Erişilebilirlik

- **Hareketi azalt:** bütün döngüler durur; Moka sabit, sadece mimik değişir; geçişler 200 ms çapraz geçiş.
- **Ekran okuyucu:** nesneler çevrilmiş adlarla ("Lamba", "Kupa"...), balon `accessibilityLiveRegion="polite"` (Android) ve iOS'ta `AccessibilityInfo.announceForAccessibility`; dekoratif katmanlar gizli.
- **Yazı büyütme:** balon `maxFontSizeMultiplier` 1,4, sığmazsa balon içinde kayar.
- **Dokunma alanları** en az 44 dp; nesnelerin dokunma kutuları ekran boyuna göre en az 44 dp'ye büyütülür.
- **Kontrast:** balon yazısı lacivert, zemin krem %96 opak.
- Titreşim ayarına uyar (`haptic` zaten).

---

## 13. Melih'in üretmesi gereken görseller (öncelik sırasıyla)

Hepsi ChatGPT'de, aynı sohbette, her seferinde `moka_happy.png` + oda resmi ekli. Teslim: proje dosyalarına `moka-oda/` klasörü.

**A. Oturan Moka, 5 poz (EN ÖNEMLİ)** → `docs/moka-yastik-promptlari.md` aynen geçerli. Adlar: `moka_oda_sakin`, `_kahve`, `_selam`, `_dusunen`, `_uyuklayan` (.png, 1024, saydam).

**B. Yüz düzenlemeleri** (A bitince, aynı sohbette, her biri ayrı mesaj, ilgili poz görseli ekli):
```
Bu görselin AYNISI olsun: gövde, kanatlar, renkler, ışık, boyut ve tuvaldeki yer piksel piksel aynı kalsın. Sadece yüzü değiştir: [DEĞİŞİKLİK]. Başka hiçbir şeyi değiştirme, saydam arka plan, 1024x1024.
```
[DEĞİŞİKLİK] yerine:
- her 5 poz için: `gözler tamamen kapalı (göz kırpma anı)` → `_gozkapali`
- sakin, selam, düşünen için: `gaga yarı açık, konuşuyor gibi` → `_agiz`
- sadece sakin için: `gözler mutlu kıvrık (^ ^)` → `_mutlu`; `gözler kocaman açık, şaşkın` → `_saskin`; `kaşlar hafif düşük, üzgün ama sevimli` → `_uzgun`
Toplam 13 düzenleme. Kaydıysa sorun değil, script hizalar.

**C. Oda eşyaları (8 çıkartma)** — ilk mesaj:
```
Ekteki Moka ve oda görselinin çizim stilini birebir kullan (tombul, yumuşak lacivert kontur, düz renk + tek kademe yumuşak gölge, sıcak pastel). Bundan sonra istediğim her eşyayı TEK BAŞINA, saydam arka planlı, 1024x1024 tuvalin ortasında, odadaki ışıkla (sağdan sıcak lamba ışığı) çiz. Yazı, zemin, gölge zemini yok. Anladıysan "hazır" yaz.
```
Sonra tek tek: `rafa asılan küçük sıcak sarı ampullü ışık zinciri, yatay` · `ahşap çerçeveli küçük tablo, içinde kahve fincanı çizimi` · `küçük retro pikap, plak üstünde` · `pencere önüne konacak küçük cam vazo, içinde tek pembe çiçek` (çiçeksiz vazo da iste: `aynı vazo, boş`) · `üst üste 3 kitap, üstünde küçük fincan` · `mantar pano, üstünde 4 küçük rozet` · `yuvarlak kedi minderi` · `Noel süsü: rafa asılan kırmızı-yeşil çam dalı çelengi`.
Adlar: `esya_isik_zinciri`, `esya_tablo`, `esya_pikap`, `esya_vazo`, `esya_vazo_bos`, `esya_kitap`, `esya_pano`, `esya_minder`, `esya_noel`.

**D. (İsteğe bağlı) Yüksek çözünürlüklü oda:** oda gündüz görselini ekle: `Bu görselin AYNISINI 1170x2532 çözünürlükte, daha net çizgilerle üret; hiçbir nesneyi taşıma, ekleme, çıkarma.` Gece için aynısı. Kaydıysa script yeniden katmanlar ve koordinatları ölçeklerim; tutmazsa mevcut kalır.

Gerekmeyenler: kıyafet setleri, aksesuarlar, yeni oda, ses dosyası (lofi radyo ayrı iş).

---

## 14. Çeviri ve RTL

- Odadaki her metin (`moka.tsx`, cümle bankası, ipuçları, nesne adları, eşya adları) `src/i18n/extra.ts`'e 9 dilde eklenir. Bir test eklenir: odada kullanılan her Türkçe metnin 8 çevirisi var mı (`src/i18n/__tests__`).
- Arapça: oda resmi aynalanmaz (sahne), arayüz (üst düğmeler, haplar, düğme sırası) aynalanır; balon ortada olduğu için değişmez.
- Japonca/Korece/Arapça harf harf yazma `Array.from` ile karakter güvenli.

---

## 15. Premium ve sınırlar

- **Oda herkese açık** (ürünün özü: her gün uygulamada vakit). Nesneler, cümle bankası, temizlik, iş ekleme, eşyaların çoğu ücretsiz.
- **Sohbet:** Premium günde 25, ayda 750 (değişmez, `LIMITS`); misafir ve ücretsiz üyede kapalı (bölüm 11). Hazır cevaplar ve aynı mesaj tekrarı hak düşürmez (zaten var).
- **Premium odada:** mevsim süsleri, +2 eşya yeri (toplam 8), Premium eşyalar ileride. Kilitli eşya yerinde küçük 👑, dokununca ödeme ekranı (kurulum ve iş yaparken reklam/ödeme yok kuralına uygun).

---

## 16. Ev ve Ben sekmesindeki Moka

- Kürk rengi her yerde aynı: Ev'deki `MokaMascot`, Ben sekmesi, oda, tuştaki Moka.
- Aksesuar katmanı kaldırılır: `MokaAcc` sadece kürk rengini çizen `MokaAvatar`'a iner, `moka-acc.ts` ve `assets/moka/acc/` silinir, `mokaAcc` alanı okunmaz (veri bozulmaz).
- "Moka'nı tasarla": büyük oturan Moka (oda önizlemesi), kürk rengi, isim (isteğe bağlı, "Moka" varsayılan, balonda ve bildirimlerde kullanılır), "Odamı düzenle" (eşya yerleri). `oda-demo` rotası silinir.

---

## 17. Yapım sırası

Her aşama ayrı commit, sonunda `npm run typecheck`, `npm run lint`, testler; dal push edilir, Melih emülatör thread'i ile çeker.

| # | İş | Görsel gerekir mi | Süre |
|---|---|---|---|
| P0 | Düzeltmeler: çeviri (9 dil), emoji güvenli yazma, tek katman çizimi + dakikalık gece güncellemesi, lamba nefesi, perdeler yerine hale/vinyet, sade üst menü (⋯), uyarı balondan çıkar, misafir/ücretsiz kilit hapı, haplar sadece odakta + duruma göre 3 tane, sayaç son 5'te, aksesuar katmanını kaldır, `oda-demo` sil | Hayır | 1 gün |
| P1 | Yeni giriş/çıkış geçişi (Moka tuştan yastığa uçar), cümle bankası + "oda günü yansıtır" anları (sabah, hepsi bitti, uzun ara + uyanma, seri koptu), nesne tepkileri (lamba söner/yanar, bitki sulama ipucu, gerçek hava cümlesi) | Hayır | 1-1,5 gün |
| P2 | İlk ziyaret + odada kürk seçimi, Moka'nı tasarla sadeleşir, isim | Hayır | 0,5 gün |
| P3 | Oturan Moka: 5 poz, yastık hizası, gölge, gece tonu, kürk renkleri, yüz yamaları (script + bileşen), boşta davranışlar yeni pozlarla | A + B | 1-1,5 gün |
| P4 | Eşya yerleri, açılma kuralları, yerleşim sayfası, bahçe vazosu, yeni eşya anı, Premium mevsim süsü | C | 1-1,5 gün |
| P5 | Yüksek çözünürlüklü oda, sunucu istemine `room` bağlamı (edge function yeniden yükleme), mağaza görselleri | D | 0,5 gün |

**Durum (2026-11-16):** P0, P1, P2 yapıldı (dal `claude/project-thread-jb6lt2`). P0'dan kalan: sohbet sayacı ve haplar yapıldı; 1170 px oda P5'te. P3 ve P4 Melih'in görsellerini bekliyor.

P0-P2 görsel beklemeden hemen yapılabilir. P3 görseller gelince başlar; o zamana kadar mevcut mimikli Moka yastığın üstüne daha iyi oturtulur (ölçek ve gölge).

**Yerel derleme:** gerekmez. `expo-asset` Expo'nun parçası; titreşim zaten korumalı.
**Sunucu:** sadece P5'te `moka-chat` yeniden yüklenir; o zamana kadar her şey çalışır.

---

## 18. Test listesi

- Android emülatör: kısa ekran 720×1280, uzun ekran 1080×2400; klavye açık/kapalı; geri tuşu.
- Hareketi azalt açık; TalkBack; yazı boyutu en büyük.
- 9 dil, özellikle AR (RTL), JA, KO; emoji içeren cevapta harf harf yazma.
- Saat 06:30 ve 18:30'da karışım; yağmur/kar; gece 22:00 sonrası.
- Misafir, ücretsiz, Premium, Premium hak bitti, internet yok.
- 3 gün uğramama (cihaz saatini ileri al) → uyanma anı; 7 gün seri → ışık zinciri.
- Pil: oda 10 dk açık, CPU profili (Android Studio), arka planda döngü yok.

---

## 19. Melih'in vereceği kararlar

1. Ücretsiz üyede yazı çubuğu tamamen kilitli hap mı olsun (önerim), yoksa bir tanıtım mesajına izin mi verilsin?
2. Lambaya dokununca sönüp yanması olsun mu (önerim evet)?
3. Eşya listesi ve açılma kuralları (bölüm 8) uygun mu?

---

## 20. Kahve: odaya kahveyle ilgili ne eklenir? (öneri, onay bekliyor)

İstek (Melih, 2026-11-16): odaya kahveyle ilgili bir şey; oyun şart değil. Ölçüt ürünün özü: **disiplin ve her gün geri gelmek**. Kahve bunun "ödülü ve ritüeli" olmalı, işten kaçış olmamalı.

### Önerim 1 (en iyisi): Günün kahvesi ve Kahve defteri

**Fikir:** Her gün Moka'nın "günün kahvesi" var. Kullanıcı bugünkü işlerini yaptıkça odadaki fincan dolar; dolunca kahve hazır olur, Moka yudumlar ve o kahve **Kahve defterine** damgalanır. Gün gün biriken fincanlar odada görünür. Yani seri, odada bir fincan dizisi olur.

- **Doldurma:** bugünkü işlerin yüzdesi (en az 3 iş ya da hepsi; azsa hepsi). Her iş fincanı bir kademe doldurur, buhar artar. İş bitince oda zaten ısınıyor (bölüm 7), fincan bunun somut hâli.
- **Kahve hazır anı:** Moka "Latte'n hazır ☕" der, fincanı alır (kahve pozu), damga sesi, kısa parıltı. Günde bir kez.
- **Odada görünür seri:** lambanın yanındaki sehpaya bir tepsi; üstünde haftanın 7 fincanı. Dolu günler dolu fincan, kaçan gün boş fincan (suçlama yok, sadece boş). Pazartesi tepsi yenilenir; hafta tam dolarsa tepside küçük bir kurabiye belirir.
- **Hangi kahve:** bugünün kahvesi tarihe göre açılmış kahvelerden seçilir (herkes aynı gün farklı ama tutarlı). Yeni kahveler seriyle açılır: 1. gün Filtre, 3 Türk kahvesi, 7 Latte, 14 Cold brew, 21 Mocha, 30 Affogato... (liste `kahve-oyunu/kahve-menu.md`'den, alkolsüz). Mevsim kahveleri kendiliğinden: sonbahar balkabağı latte, kış salep/zencefilli, yaz buzlu, Ramazan ve bayram için Türk kahvesi + lokum.
- **Kahve defteri:** 24 kahvelik koleksiyon sayfası (Ben sekmesinden ve odadaki tepsiye dokununca). Her kartta kahvenin çizimi, bir cümlelik ilginç bilgi ve **evde yapma tarifi** (3-4 adım). Gerçek hayata faydası olan küçük bir ödül.
- **Neden işe yarar:** her gün geri gelmek için somut, görsel ve sevimli bir sebep; seri sayıdan çıkıp odada nesne olur; kayıp duygusu yumuşak (boş fincan). Oyun gibi zaman almaz, işi yapmaya iter.

### Önerim 2: Kahve molası (odak sayacı)

Odada "Kahve molası" seçeneği: mevcut odak ekranı (`/odak`) 25 dk çalışır, bu sırada odadaki fincan yavaşça demlenir; bitince 5 dk mola, Moka kahvesini yudumlar. Ders, iş ya da temizlik için. Mevcut parçalarla yarım gün. Önerim 1'den sonra.

### Kart oyunu (isteğe bağlı not)

Önermiyorum: odada oyun, işten kaçışa döner. Olursa sadece **ödül** olarak: bugünün işleri bitince açılan 1-2 dakikalık "kahve kartı eşleştirme" (kahve defterindeki çizimlerle hafıza oyunu), günde bir kez. Ayrı karar.

### Veri ve kurallar
- `Play.coffee?: { days: Record<DayKey, CoffeeId> }` (play JSON'da, yedekle gider, sunucu tablosu yok). Açılan kahveler seri ve tarihten hesaplanır.
- Puan/ödül vermez (kötüye kullanım yok); sadece görsel ve koleksiyon. Bu yüzden SQL gerekmez.
- Ücretsiz: günün kahvesi, haftalık tepsi, 12 temel kahve. **Premium:** 12 nadir ve mevsim kahvesi, defterde tüm tarifler, fincan desenleri.
- 9 dil: 24 kahve adı + 24 bilgi + 24 kısa tarif + ~10 arayüz metni, `src/i18n/` tablo + test (bölüm 14 gibi).

### Melih'in üretmesi gereken görseller
İlk mesaj (Moka ve oda görseli ekli):
```
Ekteki Moka ve oda görselinin çizim stilini birebir kullan (tombul, yumuşak lacivert kontur, düz renk + tek kademe yumuşak gölge, sıcak pastel). Bundan sonra istediğim her içeceği TEK BAŞINA, aynı açıdan (hafif yukarıdan, üçte dört), aynı boyutta fincan/bardak içinde, saydam arka planlı, 1024x1024 tuvalin ortasında çiz. Yazı, zemin yok. Anladıysan "hazır" yaz.
```
Sonra tek tek 24 içecek: Filtre kahve, Espresso, Americano, Türk kahvesi (fincan + lokum), Macchiato, Cortado, Cappuccino (köpükte kalp), Latte, Flat white, Mocha, Sıcak çikolata, Iced latte, Iced americano, Cold brew, Frappe, Affogato, Matcha latte, Chai latte, Balkabağı latte (sonbahar), Salep (kış, tarçınlı), Zencefilli latte (kış), Şeftalili buzlu çay (yaz), Vanilyalı latte, Karamel macchiato.
Ayrıca: `ahşap küçük tepsi, üstünde 7 fincan yeri, yukarıdan hafif açı` (tepsi), `boş krem fincan` (dolma animasyonu için; doluluk kodla çizilir).
Adlar: `kahve_<ad>.png`, `tepsi.png`, `fincan_bos.png`.

### Emek ve sıra
| Adım | İçerik | Süre |
|---|---|---|
| K1 | Günün kahvesi + dolan fincan + hazır anı + haftalık tepsi (çizimler gelene kadar emoji yedek) | 1 gün |
| K2 | Kahve defteri ekranı, 24 kahve verisi, 9 dil | 1 gün |
| K3 | Kahve molası (odak bağlantısı) | 0,5 gün |

Önerim: K1 + K2 (birlikte "Günün kahvesi"), sonra K3. Kart oyunu şimdilik yok.
