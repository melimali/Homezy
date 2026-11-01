# Homezy pazar raporu (2026-10-31)

Önceki rapor: 2026-10-21 (memory: `market-analysis`). Bu rapor son değişikliklerden sonra yazıldı: yeni iskelet (Ev · Bugün · Moka+ · Gelişim · Ben), 3D ev kurucu + 2. kat (Premium), Moka sohbet botu (Haiku), odak/Pomodoro + Moka seviye sistemi, plak/ambiyans sesleri, aile evi, premium satış planı.

**Etiketler:** `[KAYNAK]` = web kaynağında yazıyor. `[TAHMİN]` = benim tahminim ya da modelleme. `[DOĞRULANMADI]` = kaynak zayıf, çelişkili ya da bu oturumda bulunamadı; karar vermeden önce kontrol et. Web araştırması 2026-10-31'de yapıldı; üçüncü taraf gelir/indirme rakamları (Adapty, FoxData, AppGoblin, Screensdesign) modellenmiş tahminlerdir, şirket açıklaması değildir.

---

## 1. Özet (10 satır)

1. Homezy artık "rutin takip uygulaması" değil, "ev merkezli duygusal alışkanlık oyunu": 3D ev + Moka maskotu + odak + AI sohbet. En yakın model Finch; ev işi tarafında Sweepy/Tody.
2. Finch ~1 M $/ay gelir ve ~600 B aylık indirme `[KAYNAK: Adapty, 2026-10-13, modelleme]`. Bu, "sevimli maskot + öz bakım" kategorisinin tavanını gösteriyor.
3. Ev işi uygulamaları ucuz: Sweepy 3,99 $/ay, 19,99 $/yıl; ~70 B $/ay `[KAYNAK: App Store / Adapty]`. Homezy'nin 6,99 $ ve 59,99 $ fiyatı bu segmentin 2–3 katı, Finch'in (9,99 $ / 69,99 $) altında. Premium değer anlatısı "ev + Moka + AI" ile savunulabilir, yalnızca "rutin" ile savunulamaz.
4. Sağlık-fitness kategorisinde yıllık plan baskın (~%60 gelir, Adapty) ve medyan yıllık fiyat ~39,99 $ `[KAYNAK: RevenueCat 2025 / Airbridge]`. Homezy yıllık 59,99 $ medyanın üstünde; deneme/giriş teklifi şart.
5. Türk geliştiricilerin abonelik gelirinin %89'u yurt dışından `[KAYNAK: RevenueCat, Eyl 2025–Ağu 2026, Foreks 2026-10-28; makale gövdesi okunamadı]`. TR'yi vitrin/ilk kullanıcı pazarı, ABD/BR/MX/DE'yi gelir pazarı say.
6. AI maliyeti kontrol altında: Haiku 5.5 girdi 0,10 $ / çıktı 0,50 $ (1 M token, ≤100 B istem) `[KAYNAK: üçüncü taraf blogları]`. Sohbet mesajı başına ~0,0003 $ `[TAHMİN]`. Asıl risk sohbet değil, Premium'da günde 50 görsel tarama.
7. Politika riski düşük-orta: sohbet botu Moka ile sınırlı olsa da Apple yaş derecelendirmesi ve Google Play AI-içerik politikası formları dikkatle doldurulmalı.
8. En büyük risk pazar değil, dağıtım: 8/10 yeni abonelik uygulaması 10 B $'ı geçmiyor (Adapty 2026, önceki rapor). Gelirin %95'i ilk %10'da `[KAYNAK: Adapty 2026, ppc.land]`.
9. Güçlü yön: ev + maskot + AI birleşimi rakiplerde yok; zayıf yön: İngilizce/çoklu dil yok, 3D ev emülatör dışında test edilmedi, ses dosyaları yok.
10. 90 günlük plan: (a) EN + i18n, (b) Play kapalı yayın + TestFlight, (c) onboarding paywall + 7 günlük deneme, (d) Brezilya/ABD organik kısa video testi, (e) D1/D7 eşiği tutarsa küçük ücretli test.

---

## 2. Önceki rapordan (2026-10-21) neler değişti?

| Konu | 2026-10-21 | 2026-10-31 |
|---|---|---|
| Ürün | Ev planı + rutin + gardırop/mutfak | Cozy iskelet, Moka merkezde, 3D ev, 2. kat, odak, sohbet botu, seviye/stat |
| Konumlandırma | "Evini topla, evin büyüsün" | Aynı çekirdek + "evin senin gibi görünsün" (kişiselleştirme) + "Moka ile sohbet" |
| Premium | Tarama, dondurma, 1,5x puan, aile, yedek | + 2. kat/dubleks, premium dekor, sohbet 150/gün, ambiyans |
| Karşılaştırma seti | Finch, Sweepy, Tody | + Habitica, Forest, Fabulous, Structured, Daylio, Flo benzeri |
| Fiyat | 6,99 $ / 59,99 $, TR 149,99 TL | Değişmedi |
| AI | Sadece fotoğraf taraması | + günlük sohbet (Haiku) |
| Gözlem | Önceki risk tahmini: yıl-1 net < 500 $ olasılığı ~%55 | Ürün farkı arttı ama dağıtım çözülmedi; olasılık dağılımını aşağıda (Bölüm 11) yeniden verdim `[TAHMİN]` |

---

## 3. Homezy'nin yeni konumlandırması

**Tek cümle:** "Evini çiz, rutinlerini Moka ile yap, evin senin gibi büyüsün."

Farklar:
- **Gerçek evin ölçüsü:** Kullanıcı kendi planını çiziyor, 2. kat ekleyebiliyor. Finch'te ev yok (ada/oda süsü), Sweepy/Tody'de görsel yok. Bu "kendi evim" bağı tutundurma için en güçlü kozumuz `[TAHMİN]`.
- **Maskot + duygusal ilişki:** Moka (Finch'in kuşuna benzer ama ev odaklı). Seviye/stat, sohbet, kutlama sahneleri.
- **Disiplin + odak:** Pomodoro/odak ile günlük açılış nedeni (Forest benzeri), ama "ev işi + ders/iş" birlikte.
- **AI iki yerde:** Fotoğraf tarama (buzdolabı/kıyafet) ve Moka sohbeti. Rakiplerin çoğu AI'ı ya hiç kullanmıyor ya da chatbot odaklı.
- **Aile evi:** Ev paylaşımı (Premium). Sweepy ve Tody de aile paylaşımı satıyor; Homezy'de puan kişiye ait olduğu için rekabet/oyunlaştırma korunuyor.
- **Türkçe öncelikli:** Doğrudan Türkçe rakip yok `[TAHMİN, önceki raporla aynı; yeniden tam tarama yapılmadı]`.

---

## 4. Rakip analizi

Gelir/indirme rakamları üçüncü taraf modellemedir; ±%30–50 hata payı varsay `[TAHMİN]`.

| Uygulama | Odak | Fiyat (kaynaklı) | Gelir / indirme | Homezy ile ilişki |
|---|---|---|---|---|
| **Finch** | Öz bakım + sanal kuş | Plus 9,99 $/ay, 69,99 $/yıl `[KAYNAK: Finch yardım sayfası via Recurdash, 2026-07-07]`; Adapty'de 39,99–69,99 $ yıllık, 5,99/9,99 $ aylık görünüyor (indirim teklifleri) | ~1 M $/ay, ~600 B indirme/ay `[KAYNAK: Adapty, 2026-10-13]`; son 90 günde 2,34 M indirme, %61,8 ABD `[KAYNAK: FoxData, tarihsiz]`; 315 B puan, 4,9 | En yakın ruh eşi. Homezy'nin farkı: ev planı, ev işleri, TR. Zayıf nokta: Finch'in marka/indirme avantajı kapatılamaz; ona "Finch'in ev versiyonu" demek yerine ev merkezli kal |
| **Sweepy** | Ev temizlik takvimi | 3,99 $/ay, 19,99 $/yıl, 3 gün deneme `[KAYNAK: App Store, App Pricing Lab 2026-05-31]` | ~70 B $/ay, ~30 B indirme/ay `[KAYNAK: Adapty paywall kütüphanesi, kaynak yöntemi belirsiz]` | Doğrudan kategori rakibi. Fiyatı bizden çok ucuz; bizim fark gerekçemiz oyun + maskot + AI. Sweepy'nin ARPU'su yüksek görünüyor (düşük indirme, yüksek gelir) |
| **Tody** | Ev temizliği (sade) | Ücretsiz temel; eşitleme için Premium. Kaynaklar çelişkili: 3,99 $/ay – 19,99 $/yıl ya da tek seferlik `[DOĞRULANMADI]` | `[TAHMİN: 10–30 B $/ay, önceki rapor]` | Estetik olarak sade; oyunlaştırma yok. İşlevsel kıyas noktası |
| **Habitica** | RPG alışkanlık | Ücretsiz + abonelik (~4,99 $/ay) `[KAYNAK: karşılaştırma blogu]` | ~8 M kurulum, ~193 B aylık aktif, 10 B $+/ay `[KAYNAK: AppGoblin]`; başka kaynak 5,2 M $ diyor, kaynaksız `[DOĞRULANMADI]` | Büyük topluluk, eski görsel dil. Homezy'nin cozy görselliği daha geniş kitleye (kadın 20–40) uyar `[TAHMİN]` |
| **Forest** | Odak (ağaç) | Platforma göre değişiyor; ücretli/aboneli karışık `[DOĞRULANMADI]` | Veri bulunamadı | Odak özelliğinin referansı. Homezy odakta Forest'i geçmeyecek; odak "ev + Moka seviyesi" için bir motor olarak kalmalı |
| **Fabulous** | Alışkanlık koçluğu | Ücretli koçluk planı, fiyat bulunamadı `[DOĞRULANMADI]` | ~50 B $ (Screensdesign, tarihsiz) `[DOĞRULANMADI]` | Yüksek fiyatlı, içerik ağırlıklı. Homezy içerik değil, ev odaklı |
| **Structured** | Günlük planlayıcı | Fiyat bulunamadı | 250 B $, 85–150 B indirme (Screensdesign, tarihsiz, dönem belirsiz) `[DOĞRULANMADI]` | Günlük plan görselliği; Homezy "Bugün" ekranı ile örtüşür |
| **Daylio** | Ruh hali günlüğü | Premium üst fiyat noktası 59,99 $ (iOS, 2026-03) `[KAYNAK: App Pricing Lab]` | Veri bulunamadı | Gelişim sekmesindeki ruh hali grafiği için referans; yıllık 59,99 $ tek başına ruh hali günlüğünde bile satılıyor |
| **Flo benzeri** | Kadın sağlığı | Bu oturumda araştırılmadı | — | Büyük "sağlık + topluluk + abonelik" örneği. Doğrudan rakip değil; kitle benzer (kadın ağırlıklı) `[TAHMİN]` |

**Çıkarımlar**
- Sweepy 30 B indirmeyle ~70 B $/ay yapıyorsa kullanıcı başı gelir çok yüksek; **niş ama ödeyen** bir kitle var `[TAHMİN, tek kaynak]`.
- Finch 600 B indirmeyle ~1 M $/ay: indirme başına ~1,7 $/ay. Sweepy: ~2,3 $/ay indirme başına. Homezy'nin bu ARPU'ya ulaşması beklenmemeli `[TAHMİN]`.
- Habitica gibi ücretsiz-ağırlıklı topluluk uygulamaları büyük kullanıcıya rağmen düşük gelir üretiyor; Premium ayrımını net tutmak lazım.

---

## 5. Hedef kitle ve segmentler

| Segment | Açıklama | Neden Homezy | Öncelik |
|---|---|---|---|
| **A. Genç yetişkin ev sahibi/kiracı (22–35, kadın ağırlıklı)** | İlk evi, "düzen kuramıyorum" | Oyunlaştırma + sevimlilik + Moka | Çok yüksek |
| **B. Öz bakım / DEHB ilgili (20–35)** | Finch kullanıcısı | Ev işini oyunlaştırma, odak | Yüksek (EN pazar) |
| **C. Anne/aile (28–45)** | Çocuk odası, gardırop, aile evi | Aile paylaşımı, buzdolabı taraması | Orta (aile ödeme gücü yüksek) |
| **D. Öğrenci/ev arkadaşları** | Paylaşımlı ev | Aile evi (Premium) | Düşük-orta |
| **E. Ev ofisi çalışanı** | Odak + temizlik | Pomodoro + Moka | Orta |

İlk 90 günde A + B'ye odaklan; C Premium dönüşümü için ikinci dalga `[TAHMİN]`.

---

## 6. Pazar fırsatı: Türkiye ve yurt dışı

### Türkiye
- Türk geliştiricilerin abonelik gelirinin %89'u yurt dışından `[KAYNAK: RevenueCat, 2026-10-28 haberi]`; yurt içi abonelik geliri küçük. Türkiye yerel mobil gelir 2025'te 347 M $ (ağırlık oyun) `[KAYNAK: GamesIndustry.biz türevi]`.
- TR avantajı: rakipsizlik, düşük edinme maliyeti, hızlı geri bildirim. TR dezavantajı: düşük ödeme gücü, kur riski (fiyatı TL'den ayrı belirle; mevcut 149,99 TL/ay).
- RevenueCat Türkiye "onaylı yazılım listesi"nde: uygun Türk şirketler RevenueCat ücretinin %50'sini devletten geri alabiliyor `[KAYNAK: RevenueCat blogu]`; Meikai Digital uygunluğunu muhasebeyle kontrol et `[DOĞRULANMADI]`.

### Yurt dışı (Adapty fiyat endeksi ve pazar notları)
| Ülke | Fiyat endeksi (ABD=1,0) | Not |
|---|---|---|
| ABD | 1,0 | Abonelik gelirinin ~%49'u (2025 raporu) `[KAYNAK: Adapty]`; en pahalı edinme |
| Almanya/UK/FR/İT/ES | 1,2 | Almanya'da aylık medyan 17,19 $ `[KAYNAK: Adapty pricing index]`; yüksek ödeme istekliliği, yüksek gizlilik hassasiyeti (AI fotoğraf) |
| Brezilya | 0,9 | 1.000 $ ile ~65 ödeyen abone (ABD'de ~15) `[KAYNAK: Adapty]`; ölçek büyük, ARPU düşük |
| Meksika | — | Bir yıllık abone LTV medyanı 17,9 $; hızlı büyüyen pazar `[KAYNAK: Adapty SOIS 2026]` |

Sıra önerisi (yurt dışı lansman planıyla uyumlu, `docs/yurtdisi-lansman.md`): **ABD/UK (gelir) → BR (düşük CAC testi) → MX/ES → DE → FR.** Kritik ön koşul: İngilizce + i18n. Şu an uygulama yalnızca Türkçe; yurt dışı hiçbir plan i18n olmadan çalışmaz.

---

## 7. Fiyat ve abonelik kıyası

| | Homezy (güncel) | Finch | Sweepy | Sağlık-fitness medyanı |
|---|---|---|---|---|
| Aylık | 6,99 $ (giriş 4,99 $) | 9,99 $ | 3,99 $ | 9,70 $ |
| Yıllık | 59,99 $ | 69,99 $ | 19,99 $ | 39,99 $ |
| Deneme | Yok, ilk ay indirimi | Var `[DOĞRULANMADI]` | 3 gün | — |

Kaynaklar: Finch (yardım sayfası via Recurdash), Sweepy (App Store), kategori medyanı (RevenueCat 2025 via Airbridge). Fiyat endeksi: ABD dışı fiyat ayarı için Adapty.

**Yorum**
- Homezy aylık fiyatı Finch'in altında, yıllık fiyatı kategori medyanının üstünde: **yıllığı satın aldırmak için görünür indirim yüzdesi ve deneme şart** (şu an paywall indirim yüzdesini gösteriyor; deneme yok). Health&Fitness'ta deneme→ücretli dönüşüm medyanı ~%40, üst %10 ~%68 (RevenueCat 2025 via Athletech); Adapty'de 2026 için farklı rakamlar var (%25–62) `[KAYNAK ÇELİŞKİLİ]`.
- Yıllık plan H&F gelirinin ~%60'ı `[KAYNAK: Adapty]`; yıllığı öne çıkar.
- "Üstü çizili eski fiyat" kararı korunuyor (Melih kararı, mağaza/tüketici hukuku riski).
- Brezilya ve Meksika için ayrı fiyat: ABD fiyatının ~%50–70'i `[TAHMİN, mağaza yerel fiyat şablonları kullan]`. Henüz Melih kararı yok.
- Sweepy'nin 19,99 $/yıl fiyatı, "sadece ev işi" arayanlar için bizim ücretsiz planımızın rakibi; Premium'a geçişi **ev işi için değil Moka/ev/aile/AI için** anlat.

---

## 8. AI maliyeti ve limitler

| Kalem | Varsayım | Tahmini maliyet `[TAHMİN]` |
|---|---|---|
| Haiku 5.5 fiyatı | 0,10 $/M girdi, 0,50 $/M çıktı (≤100 B istem) `[KAYNAK: üçüncü taraf bloglar; Anthropic fiyat sayfası doğrulanmadı]` | — |
| Sohbet mesajı | ~2.000 girdi + ~150 çıktı token | ≈ 0,0003 $ |
| Ücretsiz kullanıcı, 15 mesaj/gün | tam kullanım | ≈ 0,005 $/gün ≈ 0,14 $/ay |
| Premium, 150 mesaj/gün | tam kullanım | ≈ 0,045 $/gün ≈ 1,35 $/ay |
| Görsel tarama (Haiku) | ~1.500–3.000 token görsel + çıktı | ≈ 0,0005–0,002 $ |
| Premium, 50 tarama/gün | tam kullanım | ≈ 0,025–0,10 $/gün ≈ 0,75–3 $/ay |

Net Premium geliri mağaza payı sonrası aylık 6,99 $ → ~5,9 $ (%15 küçük işletme programı varsayımı `[TAHMİN, Meikai programa girdiyse]`). Yani **en kötü kullanım bile marjı eritmiyor**, ama kötüye kullanım (bot, paylaşılan hesap) ve ücretsiz kullanıcı hesap çoğaltması riski var.

Önlemler: kullanıcı başı günlük üst sınır (var), IP/cihaz kontrolü, aylık maliyet alarmı, istem önbelleği (cache), kısa sistem istemi. 100 B token üstü istem fiyatı 5x (`0,50 / 2,50 $`) `[KAYNAK]`: sohbet geçmişi 100 B'ı asla aşmamalı (aşmaz, ama kısıtla).

---

## 9. Riskler

| Risk | Olasılık / etki `[TAHMİN]` | Önlem |
|---|---|---|
| **Dağıtım:** organik yok, ücretli pahalı | Yüksek / yüksek | Kısa video (evim çöktü, Moka), ASO, mikro-influencer; ücretli yalnızca D1≥%30, D7≥%12 sonrası |
| **Dil:** yalnızca Türkçe | Kesin / yüksek | EN + i18n altyapısı lansmandan önce |
| **AI politikası (Apple/Google):** sohbet botu + fotoğraf | Orta / orta | Yaş derecelendirmesini sohbet için doğru seç; Moka konu sınırı, içerik filtresi, bildir/şikâyet mekanizması |
| **Gizlilik:** fotoğraf AI'a gidiyor; yüz/beden | Orta / yüksek | Gizlilik politikası + onay metni + KVKK/GDPR; veri saklanmıyor ifadesi |
| **AI maliyeti:** kötüye kullanım | Düşük-orta / orta | Sunucu limitleri, alarmlar, hız sınırı |
| **Retention:** H&F D30 ~%3–4 `[KAYNAK: önceki rapor]` | Yüksek / yüksek | Günlük döngü: Moka selamı, seri, odak, haftalık özet; aile evi |
| **Kapsam şişmesi:** 3D, ses, sohbet, aile çok iş | Yüksek / orta | Lansmandan önce çekirdek döngüyü sabitle; ses dosyaları yok (lofi) |
| **Teknik:** native modüller, 3D performansı düşük cihazlarda | Orta / yüksek | Düşük bütçe cihaz testi, kalite ayarı, çökme izleme |
| **Hesap/yayıncı:** D-U-N-S bekleniyor | Orta / yüksek | Play Console onayı yol haritasının ön koşulu |
| **Ödeme:** mağaza ürünleri + RevenueCat-Google bağlantısı bekliyor | Orta / orta | Play onayı sonrası hemen kur |
| **Finch yeni "ev" özelliği ekler** | Düşük / yüksek | Ev planı ve ev işlerini derinleştir (savunulabilir fark) |

Apple/Google AI politikası notu: Apple 2026-10-16 revizyonu AI ile üretilmiş rıza dışı müstehcen görsellere odaklı (yeni 2.5.19) `[KAYNAK: ppc.land, haber]`; Google Play'in AI üretilmiş içerik politikası, sohbet botunun merkezî özellik olduğu uygulamaları kapsıyor `[KAYNAK: ikincil kaynaklar]`. Resmî metinleri (Apple App Review Guidelines 1.2/1.2.1, Play Console yardım sayfası) yayından önce oku `[DOĞRULANMADI]`.

---

## 10. Güçlü ve zayıf yönler (SWOT)

**Güçlü**
- Ev planı + 3D + 2. kat: kopyalanması zor, duygusal bağ.
- Moka karakteri; sahneler, seviye, sohbet.
- Ücretsizde tam çekirdek, Premium'da gerçek değer (kıyafet/buzdolabı taraması, aile, dekor, kat).
- Düşük işletme maliyeti (telefonda veri, sunucu yalnızca AI).
- Türkçe öncelik; TR rakipsiz.

**Zayıf**
- Yalnızca Türkçe; İngilizce yok.
- Marka tanınırlığı sıfır; mağaza yorum/puanı yok.
- Özellik fazlalığı: yeni kullanıcı için karmaşıklık.
- 3D ev emülatörde denendi, geniş cihaz testi yok.
- Premium değer çok parçalı; tek cümlelik sözü zayıf.

**Fırsat**
- Finch'in 600 B/ay indirmesi öz bakım+maskot talebini kanıtlıyor.
- Ev işi uygulamaları (Sweepy, Tody) görsel/oyun açısından sönük.
- Brezilya/Meksika düşük CAC (Adapty).
- RevenueCat Türkiye teşviki.

**Tehdit**
- Finch veya büyük bir oyunlaştırma uygulaması ev özelliği ekler.
- Mağaza politikası değişiklikleri (AI, yaş).
- İndirme sayıları düşüyor, harcama artıyor (Appfigures: 2025 küresel indirme 106,9 milyara düştü, tüketici harcaması 156 milyar $) `[KAYNAK: Webrazzi 2026-01-15, rakamlar ikincil]`: yeni uygulamayı bulmak zorlaşıyor.

---

## 11. Gelir senaryoları `[TAHMİN]`

Varsayımlar: indirme→ücretli dönüşüm %1,5–3 (freemium, önceki rapor), net ARPPU ~5–6 $/ay (karma aylık/yıllık, mağaza payı sonrası).

| Senaryo | Yıl-1 indirme | Aylık net gelir (12. ay) | Olasılık |
|---|---|---|---|
| Düşük | < 5 B | < 200 $ | ~%50 |
| Orta | 5–30 B | 200–1.500 $ | ~%35 |
| İyi | 30–150 B (bir ülkede viral ya da güçlü ASO) | 1.500–8.000 $ | ~%12 |
| Çok iyi | > 150 B | > 8.000 $ | ~%3 |

Önceki rapora göre ürün farkı arttı ama dağıtım çözülmedi, dağılım hemen hemen aynı; ürün kalitesi "orta" ve "iyi" aralığa olasılık ekler, kanıt değil.

---

## 12. Büyüme, ASO ve kanal önerileri

**ASO (mağaza metni `docs/magaza-metni.md` ile uyumlu)**
- TR başlık: "Homezy: Rutin ve Ev İşleri". EN: "Homezy: Routine & Chores". Anahtar kelimeler: ev işleri, temizlik planı, rutin, alışkanlık, odak, Pomodoro, maskot.
- Ekran görüntüleri: ilk üç kare 3D ev + Moka + "Bugün" listesi. Cozy görseller zaten güçlü.
- Video önizleme: 15 sn, "evini çiz → Moka kutlasın".

**İçerik kanalları**
- TikTok/Reels/Shorts: "evim çöktü" (seri kopunca ev toz oluyor), "odamı çizdim", "Moka ile temizlik", 3D ev yapma videoları. Hedef: haftada 5 kısa video, 90 günde 60.
- Mikro-influencer (5–50 B takipçi, ev/temizlik/öz bakım): TR 10 kişi, yurt dışı BR/ABD 10 kişi `[TAHMİN: bütçe ~300–800 $ bire bir değil, takas ağırlıklı]`.
- Reddit (r/CleaningTips, r/ADHD, r/selfcare) ve Pinterest: görsel ev/odak; satış dili kullanma.
- Product Hunt: iOS yayında olduğunda (öneri: bekle, önceki karar).

**Uygulama içi büyüme**
- Aile evi davet kodu = ilk viral mekanik; "evini göster" paylaşım görseli (henüz yok, öneri).
- Onboarding paywall + 7 günlük deneme (A/B test planı: deneme var/yok).
- Streak + Moka bildirimleri: izinler akıllı kullanılmalı; spam hissi ettirme.

**Ücretli reklam:** sadece Play onayı sonrası ve D1≥%30, D7≥%12 koşuluyla; 10–20 $/gün, tek ülke (BR önerisi) `[TAHMİN, yurt dışı lansman planıyla aynı]`.

---

## 13. 90 günlük öneri plan

| Dönem | Hedef | İşler |
|---|---|---|
| **Gün 1–30** | Yayın altyapısı + dil | EN + i18n altyapısı (TR/EN); Play kapalı test + TestFlight; D-U-N-S ve Play Console tamamlama; onboarding paywall + deneme; çökme/analitik (D1/D7 ölçümü); gizlilik ve AI onay metinleri; düşük cihaz 3D testi |
| **Gün 31–60** | Yumuşak lansman | TR Google Play yayını; TR'de 10 mikro-influencer + 30 kısa video; ASO TR/EN; geri bildirim kanalı; D1/D7, deneme dönüşümü, ilk gelir ölçümü |
| **Gün 61–90** | Yurt dışı testi | EN mağaza yayını (ABD/UK organik, BR test); Brezilya fiyat testi; D1≥%30/D7≥%12 ise 10–20 $/gün ücretli test; iOS TestFlight→yayın; haftalık metrik raporu |

**Başarı ölçütleri (90. gün) `[TAHMİN]`:** 3–10 B indirme, D1 ≥ %30, D7 ≥ %12, deneme→ücretli ≥ %35, ilk 100–500 $/ay gelir. Bu eşiklerin altında ücretli büyüme yapma; ürünü ve onboarding'i düzelt.

---

## 14. Verilecek kararlar (Melih)

1. İlk yurt dışı test ülkesi (öneri: Brezilya; ABD organik paralel).
2. BR/MX fiyat indirimi (öneri: ABD fiyatının ~%50–70'i).
3. Deneme süresi (öneri: 7 gün, yıllıkta).
4. Lansman öncesi i18n kapsamı (öneri: TR + EN).
5. Premium'da günde 50 tarama sınırını sıkılaştırma (öneri: 20–25) `[TAHMİN]`.

---

## Kaynaklar (erişim 2026-10-31)

- Finch gelir/indirme: [Adapty paywall kütüphanesi – Finch](https://adapty.io/paywall-library/finch/) (2026-10-13); [FoxData – Finch](https://foxdata.com/en/blogs/finch-as-app-store-editors-choice-a-self-care-companion/)
- Finch fiyat: [Recurdash – Finch](https://recurdash.com/subscription-pricing/finch), [Finch yardım sayfası](https://help.finchcare.com/hc/en-us/articles/37780175015693-How-to-Subscribe-to-Finch-Plus)
- Sweepy: [App Store](https://apps.apple.com/us/app/id1498897320), [App Pricing Lab](https://www.apppricinglab.com/app/apple/1498897320), [Adapty – Sweepy](https://adapty.io/paywall-library/sweepy/)
- Tody: [todyapp.com](https://todyapp.com), [Mobile App Daily](https://mobileappdaily.com/products/best-free-house-cleaning-apps)
- Habitica / Structured / Fabulous: [AppGoblin](https://appgoblin.info/apps/com.habitrpg.android.habitica), [Screensdesign – Fabulous](https://screensdesign.com/apps/fabulous-daily-habit-tracker/), [Toolradar Forest vs Habitica](https://toolradar.com/compare/forest-vs-habitica)
- Daylio: [App Pricing Lab](https://apppricinglab.com/app/apple/1194023242)
- Abonelik kıyasları: [Adapty State of In-App Subscriptions 2026](https://adapty.io/state-of-in-app-subscriptions/), [ppc.land özeti](https://ppc.land/95-of-app-subscription-revenue-goes-to-top-10-adaptys-2026-benchmark-report/), [Adapty hızlı büyüyen pazarlar](https://adapty.io/blog/fastest-growing-app-markets-2026/), [Adapty fiyat endeksi](https://uploads.adapty.io/adapty_pricing_index.pdf), [Airbridge kategori fiyatları](https://www.airbridge.io/en/blog/subscription-app-pricing-by-category-2026-benchmark), [Athletech – RevenueCat H&F](https://athletechnews.com/fitness-apps-monetizable-winner-take-all-or-most/)
- Türkiye: [Foreks – RevenueCat Türk uygulamaları %89 yurt dışı](https://www.foreks.com/haber/detay/6ae1ac87422c786f3f7ab76d/FRKS/tr/revenuecat-in-eylul-2025agustos-2026-raporuna-gore-turk-mobil-uygulamalarinin-abonelik-gelirlerinin-yuzde-89-u-yurt-disindan-geliyor-28-10-26/), [Adjust Türkiye 2026](https://www.adjust.com/tr/blog/turkiye-app-trends-2026/), [RevenueCat Türkiye onaylı yazılım](https://www.revenuecat.com/blog/company/turkiye-approved-software), [Webrazzi – 2025 indirmeler](https://webrazzi.com/2026/01/15/2025-te-mobil-uygulama-indirmeleri-dustu-tuketici-harcamalari-ise-156-milyar-dolara-cikti/)
- Haiku 5.5 fiyat: [eesel.ai](https://www.eesel.ai/blog/claude-haiku-5-5-pricing), [Codersera](https://codersera.com/blog/claude-haiku-5-5-complete-guide-2026/amp/) (Anthropic resmi sayfasını ayrıca doğrula)
- Politika: [ppc.land – Apple AI intimate imagery](https://ppc.land/apples-app-store-rules-now-require-apps-to-remove-ai-intimate-imagery/), [ConductAtlas – Apple guidelines](https://conductatlas.com/platform/apple/apple-app-store-review-guidelines/ai-generated-content-and-responsible-use-requirements/)

**Bu raporda aranıp bulunamayanlar:** Forest/Structured/Fabulous/Flo güvenilir gelir ve fiyat verisi; Türkiye'ye özgü iOS/Android payı; RevenueCat 2026 raporunun tam metni; Anthropic resmî fiyat sayfası. Bu kalemler için ya Sensor Tower/AppMagic erişimi ya da elle mağaza kontrolü gerekir.
