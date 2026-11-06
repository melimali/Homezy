# Moka Disiplin Testi (tasarım, ilk tur)

Durum: sadece tasarım, kod yok. Dal: integration/tum-pr. "Seni tanıyalım" (`src/domain/persona.ts`, `src/app/taniyalim.tsx`) ve kişilik testi **tek akışta birleşti** (2026-11-06): tek soru listesi, kişilik tipi sonda gösterilir.

## 0. Akış (tek akış: önce tanı, sonra tip, sonra plan)
Moka tanıtımı → **Amaç ekranı** → **Seni tanıyalım** (tek soru listesi, aşağıda) → Moka "notlarını alıyor" → **Tip ekranı** → **Plan ekranı** → ev kurulumu.
"Ev" ve "disiplin" soruları artık iki ayrı bölüm değil, **tek numaralı liste** (Q1-Q17). Kullanıcı bölüm adı görmez; sadece "Moka seni tanıyor" ve ilerleme çubuğu (örn. 7/17). Aynı cevaplar hem ev planını/yemeği (persona) hem tipi/planı besler, hiçbir soru iki kez sorulmaz. Tip adları (8) değişmez.
Toplam 17 soru (+ B1'de seçilen alan başına 1 dallanan soru, en çok 3) , tek dokunuş, geri tuşu, "Atla" (varsayılan tip: Dengeli Moka). Hepsi telefonda hesaplanır, yapay zekâ yok, internet gerekmez.

**İlk indirmede sorulmayanlar (Melih, 2026-11-06):** "Bugün nasıl hissediyorsun?" ve "Bugün evde misin / planın var mı?" (`MoodCheckin`, `src/domain/mood.ts`) tanıma akışında ve ilk açılışta **sorulmaz**. Kullanıcı ilk gün doğrudan tanıma → tip → plan → ev kurulumu görür.

**Günlük açılış soruları (ayrı kural, Melih 2026-11-06):** Kurulum gününden **sonraki** her gün iki ayrı soru, iki ayrı açılışta sorulur:
1. O günün **ilk** açılışı: "Bugün nasılsın?" (`feel`).
2. O günün **ikinci** açılışı: "Bugün evde misin?" (`busy`: Evdeyim / Biraz işim var / Yoğun bir gün).
Üçüncü ve sonraki açılışlarda soru yok. Kurulum günü (ilk indirme) hiçbiri sorulmaz; ikinci soru ertesi günün ikinci açılışından itibaren başlar. Her soruda "Atla" var: atlanan soru o gün bir daha sorulmaz (ikinci soruyu atlamak birinciyi etkilemez). Uygulama notu: bugün şu an tek ekranda iki soru soran `MoodCheckin`/`CheckIn` ikiye bölünür; günlük açılış sayacı (`opens`, `dayKey`) ve ayrı `feel`/`busy` kayıtları gerekir. Tanıma testi bu sorularla karışmaz: biri kalıcı kişilik, diğeri günlük ruh hali.

## 1. Sorular (tek liste)
Numaralar sunum sırası. "Besler" sütunu ev (persona/yemek/plan) ya da disiplin (tip/plan) tarafını gösterir. Eski adlar parantezde.

| Q | Soru | Besler |
|---|---|---|
| Q1 | Evde kimlerle yaşıyorsun? (`who`) | ev planı, persona |
| Q2 | Günün genelde nasıl geçiyor? (`rhythm`) | persona; `yogun` → günlük süre ≤ 30 dk |
| Q3 | Yemek yapmayı sever misin? (`cook`) | yemek |
| Q4 | Mutfakta ne kadar uğraşırsın? (`effort`, sadece Q3≠sevmem) | yemek |
| Q5 | Neler yemeyi seversin? (`tastes`) | yemek |
| Q6 | Yemek bütçen nasıl? (`budget`) | yemek |
| Q7 | Evi nasıl tutarsın? (`style`) | persona; `duzenli` → Düzen +2 |
| Q8-Q17 | B1-B10 (aşağıdaki tablo; B1 → Q8 … B10 → Q17) | tip + plan |

Kısaltma: soru sayısı fazla gelirse zorunlu 12 (Q1, Q2, Q3, Q5, Q7, Q8-Q14), kalanı "Daha iyi tanıyalım" opsiyonel.

### Disiplin soruları (Q8-Q17)
| # | Soru | Seçenekler | Besler |
|---|---|---|---|
| B1 | Hangi alanlarda disiplin istiyorsun? (en çok 3) | 🏠 Ev düzeni · 💼 İş / kariyer · 📚 Ders / sınav · 🏋️ Spor · 😴 Sağlık / uyku · 🌱 Kişisel gelişim · 💰 Para · 🧘 Ruh hali | `areas` (plan modülleri) |
| B2 | Şu an neredesin? | 🌱 Sıfırdan başlıyorum · 🔧 Vardı ama bozuldu · 🚀 İyiyim, daha iyi olmak istiyorum | `level` (plan zorluğu) |
| B3 | En verimli olduğun zaman? | 🌅 Sabah · ☀️ Öğlen · 🌆 Akşam · 🌙 Gece | `chrono` (görev saati, bildirim) |
| B4 | Bir işe başlamak sana nasıl gelir? | Hemen başlarım · Isınmam gerekir · Hep "birazdan" derim · Başlayınca bırakamam | Başlama +, Erteleme |
| B5 | Bir alışkanlığı en çok neden bırakırsın? | 🤷 Unutuyorum · 😴 Yoruluyorum · 🥱 Sıkılıyorum · 💥 Bir gün aksayınca hepsini bırakırım · 🎨 Dikkatim dağılıyor | `quit` (ana risk) |
| B6 | Seni ne harekete geçirir? | ⭐ Puan ve seri · 🤝 Birine söz vermek · 🎁 Ödül · ⏰ Son tarih / baskı · 🎯 Kendi hedefim | `drive` |
| B7 | Plan nasıl olsun? | 📋 Saatlik detaylı program · ✅ Kısa günlük liste · 🌊 Esnek, ruhuma göre | Düzen +, plan biçimi |
| B8 | Kesintisiz ne kadar odaklanırsın? | 10 · 25 · 45 · 90 dk | Odak, `focusMin` |
| B9 | Günde bu hedeflere ne kadar vakit ayırabilirsin? | 15 · 30 · 60 · 120+ dk | `budgetMin` |
| B10 | Son 30 günde bir alışkanlığı en çok ne kadar sürdürdün? | Hiç · 1-3 gün · 1 hafta · 2 hafta+ | Süreklilik, `startLevel` |

Dallanan sorular (sadece B1'de seçilen alan için, alan başına 1, en çok 3):
- 💼 İş: "Günde kaç saat derin çalışma?" (1 / 2-3 / 4+) · öncelik: toplantı yoğun mu, proje mi?
- 📚 Ders: "Sınav/hedef ne zaman?" (<1 ay / 1-3 ay / 3 ay+ / yok) → plan süresi.
- 🏋️ Spor: "Nerede?" (evde / salon / dışarıda) + "Deneyim?" (yeni / orta / ileri).
- 😴 Sağlık: "Uyku saatin?" (<6 / 6-7 / 8+) → akşam rutini.
- 🌱 Gelişim: "Ne öğrenmek?" (okuma / dil / beceri / meditasyon).
- 💰 Para: "Takip ediyor musun?" (hayır / kafamda / not alıyorum).
- 🏠 Ev ve 🧘 Ruh: ek soru yok (Q1-Q7 + günlük mood kaydı yeter).

## 2. Skor ve tip
Beş eksen, her biri 0-10 (başlangıç 5). Cevap puanları:

| Eksen | + yönü |
|---|---|
| **Düzen (D)** | B7 detaylı +3, kısa +1, esnek −2 · A.style=duzenli +2 · B10 2hf+ +2, 1hf +1, hiç −1 |
| **Başlama (B)** | B4 hemen +3, başlayınca bırakamam +2, ısınmam +0, hep birazdan −3 · B2 iyiyim +1 |
| **Odak (O)** | B8 90 +3, 45 +2, 25 +0, 10 −2 · B5 dikkat dağılıyor −2 |
| **Dayanıklılık (Y)** | B5 "bir gün aksayınca bırakırım" −3, unutuyorum −1, yoruluyorum −1, sıkılıyorum −1 · B10 2hf+ +3, 1hf +1, 1-3 gün −1, hiç −2 |
| **İçsel güdü (G)** | B6 kendi hedefim +3, ⭐ puan +1, ⏰ +0, 🤝 −1, 🎁 −1 |

Sonuç sınırlandırılır 0-10. Eşik: yüksek ≥ 7, orta 4-6, düşük ≤ 3. B3 (zaman) ve B1 (alan) tipi değiştirmez, plana girer.

### Tipler (8)
Önce özel kural, yoksa en yakın eşleşme (sıra önemli):
| Tip | Kural | Moka diyor ki |
|---|---|---|
| 📋 **Planlı Moka** | D≥7 ve B≥5 | "Senin için planı sen çizersin. Ben sadece saati tutarım." |
| ⚡ **Atik Moka** | B≥7 ve Y≤5 | "Hızlı başlarsın, güzel! Ben seni yolda tutarım." |
| 🧊 **Sakin Moka** | Y≥7 ve B≤5 | "Geç başlarsın ama bırakmazsın. Küçük adımlar sana yeter." |
| 🎯 **Odaklı Moka** | O≥7 ve D≥4 | "Odaklanınca dağları aşarsın. Sana derin çalışma blokları kuruyorum." |
| 🎨 **Dalgın Moka** | O≤3 veya B5=dikkat dağılıyor | "Aklın çok yerde, bu güzel bir şey. Seni kısa turlarla toplayacağım." |
| 🔥 **Hırslı Moka** | B5=hepsini bırakırım ve G≤5 | "Ya hep ya hiç. Bir gün aksarsa dert değil, seri dondurma var." |
| 🥛 **Tembel Moka** | G≥7 ve D≤5 | "Sana kimse baskı yapmasın. Esnek, kendi hızında bir plan yaptım." |
| ☕ **Dengeli Moka** | Hiçbiri (varsayılan, "Atla" da buraya) | "Her şeyden biraz. Birlikte neyin sana uyduğunu bulacağız." |

Birden fazla tip tutarsa sıra: Dalgın > Hırslı > Planlı > Atik > Odaklı > Sakin > Tembel > Dengeli. Her tip için 2. bir "yan renk" (ikinci en yüksek eksen) gösterilir: "Biraz da Odaklı Moka gibisin". Tip kaydı: `AppState.persona.discipline = {type, axes, answers, at}` (şema sürümü artar). Test 90 günde bir yeniden yapılabilir (Ben → Moka'nın notları).

## 3. Plan üretim kuralları
Plan = **modüller** (B1 alanlarından) + **gün şablonu** (tipten) + **ayarlar** (cevaplardan). Her modül mevcut parçalara bağlanır (rutin, `growth.ts`, `workout.ts`, `meds.ts`, Günlük, Bugün).

Ayarlar:
- Görev saati = `chrono` (sabah 08:00, öğlen 13:00, akşam 19:00, gece 22:00); sabah özeti de buna.
- Günlük yük = `budgetMin` ve `level`: sıfırdan → ilk hafta yarı yük; bozuldu → yük 2/3; iyi → tam yük. Hiçbir gün `budgetMin`'i aşmaz.
- Başlangıç seri hedefi = `startLevel`: hiç/1-3 gün → 3 gün, 1 hf → 7, 2hf+ → 14.
- Odak bloğu uzunluğu = `focusMin` (en çok 90); arasında 5 dk mola önerisi.

Tip şablonları:
| Tip | Biçim | Hatırlatma | Seri/ödül |
|---|---|---|---|
| Planlı Moka | Saatlik program, haftalık plan ekranı | Sabah planı + akşam gözden geçirme | Haftalık rapor vurgusu |
| Atik Moka | Günde 3 hedef, her hafta zorluk +1 | Az bildirim | Zorluk rozetleri |
| Sakin Moka | Günde 1-2 mikro görev (5 dk), her 7 günde +1 | Nazik, akşam | "Bugün de oldu" kutlaması |
| Odaklı Moka | 1 ana derin çalışma bloğu + 2 ufak | Blok başlangıcında | Odak dakikası grafiği |
| Dalgın Moka | 10-15 dk'lık mini görevler, sık değişen çeşitlilik | Kısa, çok değil | Anında yıldız, oyunlaştırma |
| Hırslı Moka | Küçük zafer + "yarım yaptım" sayılır, kaçırınca suçluluk yok | Kaçırılan günde "devam et" mesajı | Seri dondurma önerisi, ilk hafta 2 dondurma |
| Tembel Moka | Haftada hedef (günlere dağıt), saat yok | Yok / kullanıcı seçer | Kendi hedef notu, Günlük |
| Dengeli Moka | Her alandan 1 görev, 3 gün sonra uyarlanır | Standart | Standart |

Modül örnekleri (B1 → ne eklenir):
- 🏠 Ev: mevcut ev planı + A cevapları.
- 💼 İş: derin çalışma bloğu, gün başı en önemli 3 iş, gün sonu kapanış (5 dk).
- 📚 Ders: sınav tarihinden geriye plan, Pomodoro (`focusMin`), haftalık tekrar.
- 🏋️ Spor: `workout.ts` şablonu (yer + deneyim), dinlenme günleri, antrenman hatırlatması.
- 😴 Sağlık: uyku saatinden geriye "ekranı bırak" hatırlatması, su, ilaç (`meds.ts`).
- 🌱 Gelişim: `growth.ts` önerisi (okuma, dil, meditasyon).
- 💰 Para: haftalık harcama gözden geçirme (ilk sürümde sadece hatırlatma).
- 🧘 Ruh: günlük mood kaydı + 2 dk nefes.

Zorluk uyarlaması: ilk 14 gün her hafta sonu Moka sorar ("Bu hafta nasıldı? Kolay / Tam / Zor"); Zor → yük −20%, Kolay → +20% (ilk sürümde sadece soru + yük).
Alan sınırı: ilk hafta en çok 3 alan, 2'den fazlaysa her gün en çok 1 görev/alan (aşırı yük "karmaşık" sorununu önler, 1.0.2 sadelik planıyla uyumlu).
Ücretsiz/Premium: tip + 1 alan planı ücretsiz; 3 alan, haftalık plan ekranı, ayrıntılı rapor Premium.

## 4. Ekranlar ve Moka görselleri
| # | Ekran | İçerik | Moka (mevcut poz / yeni) |
|---|---|---|---|
| E1 | **Amaç** (tanıtımın son sayfası) | "Moka sana özel bir disiplin planı hazırlayacak." Alt: "Birkaç soru, 2 dakika." Buton "Hadi başlayalım" · "Şimdi değil" | `moka_checklist` / `moka_thumbs_up`; yeni: Moka gözlük + defter (**yeni**, "plan yapan Moka") |
| E2 | Soru ekranı (Q1-Q17) | Üstte ilerleme (örn. 7/17), büyük emoji kartlar, alt-geri tuşu; Q8 öncesi kısa geçiş yok, akış kesintisiz (tek liste) | `moka_analyzing`; her cevapta kısa tepki (`moka_wink`, `moka_amazed`) |
| E3 | Alan seçimi (B1) | 8 büyük kare, en çok 3 | `moka_todo` |
| E4 | Notlarını alıyor | Yükleme: "Moka notlarını alıyor…" 2-3 sn | `moka_laptop` |
| E5 | **Tip ekranı** | Büyük tip kartı, tip emojisi + adı, "Moka senin için böyle düşünüyor:" + 2 cümlelik yorum, 5 eksen küçük çubuklar (Düzen, Başlama, Odak, Dayanıklılık, İçsel güdü), yan renk. Paylaş (Premium'sız da) | Tip başına bir poz (aşağıda) |
| E6 | **Plan ekranı** | "Senin planın" özeti: alanlar, günlük süre, saat, ilk hafta hedefi. Buton "Planı başlat" · "Değiştir" (alan/saat) | `moka_checklist`, kutlama `moka_sparkling_complete` |
| E7 | Ben → Moka'nın notları | Tip kartı + testi yeniden yap | tip pozu |

Tip görselleri: her tip için ayrı ChatGPT görseli, bkz. bölüm 6.
Hareket: `Appear` ile kart beliriş, tip açıklanırken `Burst`, çubuklar sırayla dolar. "Hareketi azalt" saygı gösterilir.

### 4b. Quiz görsel yönü (cazip + cozy, Melih 2026-11-06)
- **Zemin ve renk:** kahve teması. Krem/sütlü kahve zemin (`useColors()` yüzeyleri, renk kodu yazma), kil ve kahve vurgular, koyu temada sıcak koyu kahve. Üstte yumuşak degrade, köşelerde buhar/kahve çekirdeği süsü (çok hafif, sabit).
- **Kartlar:** büyük, yuvarlak (~22px), yumuşak gölgeli, kabarık; seçenek kartında büyük emoji + kısa metin. Seçince `Squish` ile esner, seçili kart kil dolgu + küçük ✓ ile belirir. Kartlar `Appear` ile sırayla gelir.
- **Moka her soruda:** sol-üstte küçük Moka (`MokaReact`/`MokaSprite`), soruyu konuşma baloncuğunda söyler. Cevap verince 1 sn'lik küçük tepki: kahve sorusunda `happy`, ağır cevapta (yoruluyorum, bırakırım) `blanket`/destek cümlesi, güçlü cevapta `party`, ara sıra `wink`. Tepki seçilen cevaba göre bir satır ("Anladım, not aldım ☕").
- **İlerleme çubuğu:** kahve fincanı doluyor: üstte yatay çubuk, ucunda küçük fincan; her cevapta dolar (örn. 7/17), son soruda fincan taşar ve buhar çıkar. Geri tuşu ve "Atla" sönük yazı.
- **Geçişler:** soru kayarak değişir (kısa, yaylı), tip ekranında `Burst`. "Hareketi azalt" açıksa kayma/yaylanma ve buhar kapanır, sadece solma kalır.
- **Performans:** ek paket yok, `Animated` + native sürücü, ekranda en çok bir Moka animasyonu, resimler mevcut `assets/moka`.
- **Tip ekranı:** tipin arka plan rengi (bölüm 6 notu), büyük tip pozu, kahve fincanı üstünde eksen çubukları; paylaşım kartı aynı görsel dilde.

## 5. Açık kararlar (Melih)
1. Soru sayısı 17 çok mu? Öneri: zorunlu 12 (bkz. bölüm 1), geri kalanı "Daha iyi tanıyalım" opsiyonel.
2. Tip adları/emojileri (8 tip) ve Moka cümleleri uygun mu? Gerekirse İngilizce karşılıklar ayrıca yazılır.
3. Test sadece yeni kullanıcıya mı, mevcut kullanıcılara da "Moka seni tanıyor" kartıyla mı sunulsun? (Öneri: ikisi de.)
4. Tip paylaşım görseli ilk sürümde olsun mu? (Öneri: evet, düşük maliyet.)
5. Sadelik planı (1.0.2): başlangıçta 3 alan sınırı korunsun mu? (Öneri: evet.)
6. Para modülü ilk sürümde sadece hatırlatma mı kalsın? (Öneri: evet.)
7. Yeni görseller ChatGPT ile üretilecek (bölüm 6); 8 tip görseli gelene kadar mevcut pozlar yedek olsun mu? (Öneri: evet.)

## 6. Görsel prompt'ları: 8 tip, tek sayfa, 4K
Hedef: **tek bir görsel**, 3840x2160 (4K, 16:9), 4 sütun x 2 satır ızgara, her hücrede bir tip. Sonra `scripts/slice-moka.py` ile hücrelere kesilir ve `scripts/clean-moka-edges.py` ile temizlenir. Dosyalar: `assets/moka/tip/moka_<planli|atik|sakin|odakli|dalgin|hirsli|tembel|dengeli>.webp`.

Kullanım: ChatGPT'ye mevcut Moka çıkartmalarından 2-3 tanesini yükle (ör. `assets/moka/moka_happy.webp`, `moka_checklist.webp`, `moka_lazy_coffee.webp`), aşağıdaki **tek prompt'u** yapıştır. 8 karakter tek görselde tutarsız çıkarsa: aynı sohbette önce 4'lü iki satır iste ya da her hücreyi ayrı iste (hücre prompt'ları aşağıda ayrı).

### 6.1 Tek sayfa ana prompt (kopyala-yapıştır)
> Yüklediğim görsellerdeki Moka karakterini birebir koru: tombul, yuvarlak hatlı, yumuşak gölgeli kahveci kakapo papağanı; aynı yeşil-sarı tüy renkleri, aynı yüz ve göz stili, aynı oran ve çizgi kalınlığı. Bana 3840x2160 piksel (4K, 16:9) tek bir görsel çiz: 4 sütun x 2 satır eşit ızgara, toplam 8 hücre, her hücrede Moka'nın farklı bir kişilik hâli. Hücreler arası sabit boşluk, her hücrenin kendi arka planı düz yumuşak pastel renk, hücre köşeleri yuvarlak, hücre içinde karakter ortada ve tam görünür (kesilmesin), karakter hücrenin yaklaşık %75'i. Stil: sevimli çıkartma, kabarık 3D-vari pastel çizim, krem beyaz kalın kenarlık, yumuşak gölge, tüm hücrelerde aynı ışık ve çizgi kalınlığı. Görselde hiçbir yazı, rakam ya da logo olmasın. Hücreler soldan sağa, yukarıdan aşağıya şu sırada:
> 1) Planlı Moka: elinde açık kareli plan defteri ve kalem, yanında cam filtre kahve demliği, küçük yuvarlak gözlük, kendinden emin hafif gülümseme. Arka plan kahve tonu.
> 2) Atik Moka: elinde minik beyaz espresso fincanı, havaya zıplıyor, arkada küçük hız çizgileri ve kıvılcımlar, heyecanlı kararlı geniş gülümseme. Arka plan turuncu.
> 3) Sakin Moka: elinde buz küplü uzun cam soğuk kahve, yavaş ve sakin duruyor, gözler yarı kapalı huzurlu, yanında küçük kum saati. Arka plan açık mavi.
> 4) Odaklı Moka: bakır cezve ve küçük süslü Türk kahvesi fincanıyla, keskin odaklı bakış, dik duruş, yanında içinde ok olan küçük hedef tahtası. Arka plan lacivert.
> 5) Dalgın Moka: elinde kalp latte-art'lı cappuccino fincanı, etrafında uçuşan minik yıldız, nota ve boya lekeleri, meraklı neşeli hafif şaşkın ifade. Arka plan pembe.
> 6) Hırslı Moka: iki küçük espresso fincanını birden tutuyor, fincanlardan yükselen buhar hafif alev gibi, hırslı tutkulu ifade, kaşlar hafif çatık ama sevimli. Arka plan kırmızı-turuncu.
> 7) Tembel Moka: yumuşak battaniyeye sarılmış, büyük süt köpüklü latte kupası, rahat bir yastıkta oturuyor, yarı kapalı keyifli gözler, rahat gülümseme. Arka plan krem.
> 8) Dengeli Moka: klasik hâliyle, iki kanadı yana açık, sıcak dengeli gülümseme, yanında küçük kahve fincanı ve yeşil yaprak, sade huzurlu. Arka plan mint.

Kontrol listesi (üretimden sonra): 8 hücre var mı · karakter her hücrede aynı mı · hiç yazı yok mu · karakter hücreden taşmıyor mu · çözünürlük 3840x2160. Olmazsa "sadece 3. ve 6. hücreyi aynı stilde yeniden çiz" diye düzelttir.

### 6.2 Tek tek hücre prompt'u (yedek, 4K kare 2160x2160)
Ortak başlık (her hücrede aynı):
> Yüklediğim görseldeki Moka karakterini birebir koru: tombul, yuvarlak hatlı, yumuşak gölgeli kahveci kakapo papağanı; aynı yeşil-sarı tüy renkleri, aynı yüz ve göz stili, aynı oran ve çizgi kalınlığı. Stil: sevimli çıkartma, kabarık 3D-vari pastel çizim, krem beyaz kalın kenarlık, şeffaf arka plan, kare 2160x2160, karakter ortada ve tam görünür. Yalnızca poz, ifade ve aksesuar değişsin. Yazı ekleme.

Sonra tipin satırı: yukarıdaki 6.1 listesindeki ilgili madde (arka plan rengi hariç; arka plan şeffaf kalır).

Tip kartı arka plan renkleri (uygulamada): Planlı kahve, Atik turuncu, Sakin mavi, Odaklı lacivert, Dalgın pembe, Hırslı kırmızı-turuncu, Tembel krem, Dengeli mint.

### 6.3 İlk deneme sonucu (2026-11-06) ve düzeltme
İlk çıktı (`Kahve Seven Sevimli Papağanın Sekiz Hali.png`) 1672x941 geldi: **4K değil** (ChatGPT görseli bu boyutta verir; 4K için sonradan büyütme gerekir, bkz. 6.5). Izgara (4x2, 8 hücre), yazısızlık ve renk sırası doğru. Sorunlar:
1. **Moka'ya uyum zayıf:** referansta ince koyu kahve kontur, açık zeytin-krem tüy, küçük gri-kahve gaga, yuvarlak kapalı/küçük gözler var; çıktıda kalın siyah kontur, koyu zeytin tüy, iri pembe gaga, belirgin kaşlar/büyük gözler, daha "anime" yüz. Hücrelerde karakter Moka'dan çok "başka bir kakapo".
2. **Fazladan efekt ve nesneler:** 1, 3, 6, 8'de başın üstünde yay çizgiler; 2'de bulut ve hız çizgileri, 7'de duman bulutu; **5'te mavi kar tanesi gibi leke** (boya lekesi istenmişti) ve palet + fırça + latte birden; 6'da turuncu alev kıvrımları gaga ve fincanı örtüyor.
3. **Taşma:** 4'te hedef tahtası sağ kenara, 1'de defter alt kenara çok yakın; karakter hücrenin %75'inden büyük, hücre kenarı sticker kenarlığına değiyor.
4. **Tutarsızlık:** boyut ve kafa oranı hücreler arasında değişiyor (2 ve 8'de gövde farklı), gaga rengi/şekli aynı değil, ifadeler birbirine çok benzer (hep kaşlı-açık ağız).
5. **Arka plan:** renkli hücre arka planı sticker'ı kesmeyi zorlaştırır (renk kenarlıkta kalır).

### 6.4 Düzeltilmiş prompt (v2, kopyala-yapıştır)
Aynı sohbette önce referans `moka_happy.webp` + `moka_checklist.webp` + `moka_lazy_coffee.webp` yüklenir, sonra:
```
Yüklediğim Moka'yı BİREBİR kopyala, yeniden tasarlama: açık zeytin-yeşil ve krem tüy, küçük kısa gri-kahve gaga (pembe ya da iri değil), yuvarlak küçük gözler ya da kapalı gülen gözler, kaş YOK, kalın siyah kontur YOK; ince koyu kahve (#5a3f33) kontur, yumuşak boyalı doku, sade 2D çıkartma çizimi (anime ya da parlak 3D değil). Karakter her hücrede aynı boyda ve aynı vücut oranında olsun.
Tek bir görsel: 4 sütun x 2 satır, 8 eşit hücre, hücreler arası boşluk, hücre arka planı tamamen düz tek renk #FFFFFF (beyaz); renk yok, desen yok, gölge hücre içinde sadece karakterin altında küçük yumuşak oval. Karakter hücrenin ortasında, hücrenin en çok %65'i; hiçbir parça kenara değmesin. Görselde yazı, rakam, logo, parıltı, yıldız, hız çizgisi, buhar, duman, bulut, kıvılcım, alev, kar tanesi, nota ve leke OLMASIN. Her hücrede yalnızca belirtilen nesneler olsun, başka nesne ekleme. Sırayla:
1) Planlı: elinde sadece açık kareli plan defteri, yanında bir cam filtre kahve demliği, küçük yuvarlak gözlük, sakin hafif gülümseme.
2) Atik: tek elinde küçük beyaz espresso fincanı, zıplıyor (ayaklar yerden kalkmış), kapalı gülen gözler, geniş gülümseme.
3) Sakin: elinde buzlu uzun kahve bardağı ve pipet, yanında küçük kum saati, yarı kapalı huzurlu gözler.
4) Odaklı: iki elinde küçük bakır cezve, önünde küçük fincan, dik bakış; hedef tahtası yok, ok yok.
5) Dalgın: elinde kalp latte-art'lı fincan, gözler yukarıda dalgın, ağız hafif açık; palet, fırça, nota ve leke YOK.
6) Hırslı: iki küçük espresso fincanını iki elinde tutuyor, kararlı ve gururlu bakış, buhar ya da alev YOK.
7) Tembel: yumuşak ekose battaniyeye sarılmış, elinde süt köpüklü latte kupası, yastığa yaslanmış, kapalı gülen gözler, duman YOK.
8) Dengeli: klasik Moka, iki kanadı yana açık, gülen kapalı gözler, yanında küçük kahve fincanı ve bir yeşil yaprak.
```
Not: arka plan beyaz olduğu için hücre renkleri uygulamada kod ile verilir (tip kartı arka plan renkleri yukarıda). Tipin duygusu (ör. Hırslı) artık yüz ifadesi ve nesnelerle verilir, efektle değil.

### 6.5 Bozuk hücreyi tek başına yeniden çizdirme
Aynı sohbette, v2 ortak metni (ilk paragraf + "tek hücre, kare 2160x2160, beyaz düz arka plan, ortada") ve şunlardan biri:
- **5 Dalgın:** "Sadece Dalgın Moka: elinde kalp latte-art'lı fincan, gözler yukarıda dalgın. Başka hiçbir nesne, leke, nota ya da yıldız olmasın."
- **6 Hırslı:** "Sadece Hırslı Moka: iki espresso fincanı, kararlı bakış; buhar ve alev olmasın."
- **4 Odaklı:** "Sadece Odaklı Moka: cezve ve fincan; hedef tahtası olmasın, hiçbir parça kenara değmesin."
- **Yüz uyumsuzsa (herhangi hücre):** "Yüzü yüklediğim moka_happy ile aynı yap: küçük gri-kahve gaga, kaşsız, ince kahve kontur."

4K: ChatGPT çıktısını 4K'ya büyütmek için `scripts/` altında bir büyütme adımı eklenebilir (örn. Real-ESRGAN/Lanczos); ya da hücreleri tek tek 2160 kare iste. Uygulamada tip pozu en çok 1024 px gösterilir, yani 2160 hücre fazlasıyla yeter.

### 6.6 v2 sonucu ve tipe özgü kıyafet (v3 prompt)
v2 çıktısı (`ChatGPT Gorseli v2.png`, 1672x941) Moka'ya çok daha yakın: ince kontur, küçük gri gaga, beyaz zemin, efekt yok, kenara taşma yok. Ama **tipleri ayıran tek şey elindeki nesne**; kıyafet ve aksesuar yok, ifadeler benzer (2/8 ve 5/6 hemen hemen aynı). Çözüm: her tipe kendi renginde bir kıyafet/aksesuar (siluette okunacak kadar büyük) ve belirgin bir yüz ifadesi.

| Tip | Kıyafet / aksesuar (renk) | İfade |
|---|---|---|
| 📋 Planlı | kahverengi örgü kazak, yuvarlak gözlük, kulağında kalem | sakin, hafif gülümseme |
| ⚡ Atik | kırmızı beyzbol şapka, bileğinde spor bandı | kapalı gülen gözler, geniş gülümseme |
| 🧊 Sakin | açık mavi hafif hırka | yarı kapalı huzurlu gözler |
| 🎯 Odaklı | siyah bere, lacivert atkı | dik, odaklı bakış |
| 🎨 Dalgın | pembe-mor yıldız desenli şal, başında küçük pembe bere | gözler yukarıda, ağız hafif açık |
| 🔥 Hırslı | kırmızı atkı, alında kırmızı bandana | kararlı, gururlu bakış |
| 🥛 Tembel | krem uyku bonesi, ekose battaniye, pembe pofuduk terlik | kapalı gülen gözler |
| ☕ Dengeli | yeşil sade yelek | sıcak gülümseme |

Kıyafet sadece sembolik ve sade; tüy ve yüz hâlâ referans Moka. Efekt yasağı (parıltı, buhar, alev, nota, leke...) kalır.

```
Yüklediğim Moka'yı BİREBİR koru (yüz, gaga, tüy rengi ve dokusu, ince koyu kahve kontur, sade 2D çıkartma stili, aynı beden oranı), sadece aşağıdaki kıyafet, aksesuar ve ifadeyi ekle. Kıyafetler sade, düz renk, silüette net okunsun, Moka'nın yüzünü ve gagasını örtmesin.
Tek bir görsel, mümkün olan en yüksek çözünürlük (hedef 3840x2160): 4 sütun x 2 satır, 8 eşit hücre, hücre arka planı tamamen düz beyaz #FFFFFF, desen ve renk yok, karakterin altında sadece küçük yumuşak gölge. Karakter hücrenin ortasında, hücrenin en çok %65'i, hiçbir parça kenara değmesin, her hücrede aynı boyda. Yazı, rakam, logo, parıltı, yıldız çizgisi, hız çizgisi, buhar, duman, bulut, kıvılcım, alev, kar tanesi, nota ve boya lekesi OLMASIN; belirtilenden başka nesne ekleme. Sırayla:
1) Planlı Moka: kahverengi örgü kazak giymiş, yuvarlak gözlük, kulağının arkasında kalem, elinde açık kareli plan defteri, yanında cam filtre kahve demliği, sakin hafif gülümseme.
2) Atik Moka: kırmızı beyzbol şapka, bileğinde beyaz spor bandı, tek elinde küçük beyaz espresso fincanı, zıplıyor (ayaklar yerden kalkmış), kapalı gülen gözler, geniş gülümseme.
3) Sakin Moka: açık mavi hafif hırka giymiş, elinde buzlu uzun kahve bardağı ve pipet, yanında küçük kum saati, yarı kapalı huzurlu gözler.
4) Odaklı Moka: siyah bere ve lacivert atkı, iki elinde küçük bakır cezve, önünde küçük fincan, dik odaklı bakış; hedef tahtası yok.
5) Dalgın Moka: pembe-mor yıldız desenli şal, başında küçük pembe bere, elinde kalp latte-art'lı fincan, gözler yukarıda dalgın, ağız hafif açık; palet, fırça, nota yok.
6) Hırslı Moka: kırmızı atkı ve alnında kırmızı bandana, iki elinde küçük espresso fincanı, kararlı ve gururlu bakış, buhar ya da alev yok.
7) Tembel Moka: krem uyku bonesi, ekose battaniyeye sarılmış, ayaklarında pembe pofuduk terlik, elinde süt köpüklü latte kupası, yastığa yaslanmış, kapalı gülen gözler, duman yok.
8) Dengeli Moka: yeşil sade yelek giymiş, iki kanadı yana açık, gülen kapalı gözler, yanında küçük kahve fincanı ve bir yeşil yaprak.
```
Sonra kontrol: 8 hücrede de farklı bir kıyafet silueti var mı · yüz referansla aynı mı · efekt yok mu. Olmayan hücre için 6.5'teki gibi tek hücre iste ("Sadece Hırslı Moka, kırmızı atkı ve kırmızı bandana ile, düz beyaz zemin, efekt yok").

### 6.7 v3 sonucu (2026-11-06): kabul
`moka-tipler-v3.png` (1672x941, saydam arka plan): 8 tip kıyafetle net ayrışıyor (kazak+gözlük, kırmızı şapka, mavi hırka, siyah bere+lacivert atkı, yıldızlı şal+pembe bere, kırmızı atkı+bandana, uyku bonesi+battaniye+terlik, yeşil yelek). Yüz, gaga, tüy ve kontur Moka'ya uyuyor, taşma ve efekt yok. **Hiçbir hücre baştan çizilmez.**
Kalan işler (görsel değil, temizlik):
1. Karakter altındaki gri zemin gölgesi ovalinin kenarında kırmızı/sarı hâle (arka plan kaldırma artığı) var: `scripts/clean-moka-edges.py` ile temizle ya da gölge ovalini sil.
2. 8 hücreyi `scripts/slice-moka.py` ile kes, `assets/moka/tip/moka_<tip>.webp` olarak kaydet.
3. İsteğe bağlı: 4 (Odaklı) ve 6 (Hırslı) yüzleri benzer (ikisi de çatık kaşlı). Hırslı'yı tekrar çizdirmek istersen: "Sadece Hırslı Moka, aynı kıyafet, kaşsız, gururlu geniş gülümseme, düz beyaz zemin, zemin gölgesi ve efekt yok."
4. Referansta kaşsız yüz var; 3, 4, 6'daki küçük kaşlar kabul edildi.
