# Moka Disiplin Testi (tasarım, ilk tur)

Durum: sadece tasarım, kod yok. Dal: integration/tum-pr. Mevcut "Seni tanıyalım" (`src/domain/persona.ts`, `src/app/taniyalim.tsx`) bu testin **A bölümü** olur; kişilik tipi artık gösterilir.

## 0. Akış
Moka tanıtımı → **Amaç ekranı** → A bölümü (ev, 6-7 soru) → B bölümü (disiplin, 10 soru + dallanan 2 soru) → Moka "notlarını alıyor" → **Tip ekranı** → **Plan ekranı** → ev kurulumu.
Toplam ≈ 17-19 soru, tek dokunuş, ilerleme çubuğu, geri tuşu, "Atla" (varsayılan tip: Moka Kakapo). Hepsi telefonda hesaplanır, yapay zekâ yok, internet gerekmez.

## 1. Sorular
### A. Ev (mevcut, değişmez)
`who, rhythm, cook, effort(sadece cook≠sevmem), tastes, budget, style` → persona, yemek, ev planı, sabah saati. Disiplin skoruna katkısı: `style=duzenli` → Düzen +2; `rhythm=yogun` → Enerji kısıtı (günlük süre ≤ 30 dk varsayılanı).

### B. Disiplin (yeni)
| # | Soru | Seçenekler | Besler |
|---|---|---|---|
| B1 | Hangi alanlarda disiplin istiyorsun? (en çok 3) | 🏠 Ev düzeni · 💼 İş / kariyer · 📚 Ders / sınav · 🏋️ Spor · 😴 Sağlık / uyku · 🌱 Kişisel gelişim · 💰 Para · 🧘 Ruh hali | `areas` (plan modülleri) |
| B2 | Şu an neredesin? | 🌱 Sıfırdan başlıyorum · 🔧 Vardı ama bozuldu · 🚀 İyiyim, daha iyi olmak istiyorum | `level` (plan zorluğu) |
| B3 | En verimli olduğun zaman? | 🌅 Sabah · ☀️ Öğlen · 🌆 Akşam · 🌙 Gece | `chrono` (görev saati, bildirim) |
| B4 | Bir işe başlamak sana nasıl gelir? | Hemen başlarım · Isınmam gerekir · Hep "birazdan" derim · Başlayınca bırakamam | Başlama +, Erteleme |
| B5 | Bir alışkanlığı en çok neden bırakırsın? | 🤷 Unutuyorum · 😴 Yoruluyorum · 🥱 Sıkılıyorum · 💥 Bir gün aksayınca hepsini bırakırım · 🦋 Dikkatim dağılıyor | `quit` (ana risk) |
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
- 🏠 Ev ve 🧘 Ruh: ek soru yok (A bölümü + mood kaydı yeter).

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
| 🦫 **Moka Kunduz** | D≥7 ve B≥5 | "Senin için planı sen çizersin. Ben sadece saati tutarım." |
| 🐯 **Moka Kaplan** | B≥7 ve Y≤5 | "Hızlı başlarsın, güzel! Ben seni yolda tutarım." |
| 🐢 **Moka Kaplumbağa** | Y≥7 ve B≤5 | "Geç başlarsın ama bırakmazsın. Küçük adımlar sana yeter." |
| 🦅 **Moka Şahin** | O≥7 ve D≥4 | "Odaklanınca dağları aşarsın. Sana derin çalışma blokları kuruyorum." |
| 🦋 **Moka Kelebek** | O≤3 veya B5=dikkat dağılıyor | "Aklın çok yerde, bu güzel bir şey. Seni kısa turlarla toplayacağım." |
| 🐲 **Moka Ejderha** | B5=hepsini bırakırım ve G≤5 | "Ya hep ya hiç. Bir gün aksarsa dert değil, seri dondurma var." |
| 🐱 **Moka Kedi** | G≥7 ve D≤5 | "Sana kimse baskı yapmasın. Esnek, kendi hızında bir plan yaptım." |
| 🦜 **Moka Kakapo** | Hiçbiri (varsayılan, "Atla" da buraya) | "Her şeyden biraz. Birlikte neyin sana uyduğunu bulacağız." |

Birden fazla tip tutarsa sıra: Kelebek > Ejderha > Kunduz > Kaplan > Şahin > Kaplumbağa > Kedi > Kakapo. Her tip için 2. bir "yan renk" (ikinci en yüksek eksen) gösterilir: "Biraz da Moka Şahin gibisin". Tip kaydı: `AppState.persona.discipline = {type, axes, answers, at}` (şema sürümü artar). Test 90 günde bir yeniden yapılabilir (Ben → Moka'nın notları).

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
| Moka Kunduz | Saatlik program, haftalık plan ekranı | Sabah planı + akşam gözden geçirme | Haftalık rapor vurgusu |
| Moka Kaplan | Günde 3 hedef, her hafta zorluk +1 | Az bildirim | Zorluk rozetleri |
| Moka Kaplumbağa | Günde 1-2 mikro görev (5 dk), her 7 günde +1 | Nazik, akşam | "Bugün de oldu" kutlaması |
| Moka Şahin | 1 ana derin çalışma bloğu + 2 ufak | Blok başlangıcında | Odak dakikası grafiği |
| Moka Kelebek | 10-15 dk'lık mini görevler, sık değişen çeşitlilik | Kısa, çok değil | Anında yıldız, oyunlaştırma |
| Moka Ejderha | Küçük zafer + "yarım yaptım" sayılır, kaçırınca suçluluk yok | Kaçırılan günde "devam et" mesajı | Seri dondurma önerisi, ilk hafta 2 dondurma |
| Moka Kedi | Haftada hedef (günlere dağıt), saat yok | Yok / kullanıcı seçer | Kendi hedef notu, Günlük |
| Moka Kakapo | Her alandan 1 görev, 3 gün sonra uyarlanır | Standart | Standart |

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
| E2 | Soru ekranı (A+B) | Üstte ilerleme (örn. 7/17), büyük emoji kartlar, alt-geri tuşu; B bölümü başında kısa geçiş "Şimdi seni biraz daha yakından tanıyayım" | `moka_analyzing`; her cevapta kısa tepki (`moka_wink`, `moka_amazed`) |
| E3 | Alan seçimi (B1) | 8 büyük kare, en çok 3 | `moka_todo` |
| E4 | Notlarını alıyor | Yükleme: "Moka notlarını alıyor…" 2-3 sn | `moka_laptop` |
| E5 | **Tip ekranı** | Büyük tip kartı, tip emojisi + adı, "Moka senin için böyle düşünüyor:" + 2 cümlelik yorum, 5 eksen küçük çubuklar (Düzen, Başlama, Odak, Dayanıklılık, İçsel güdü), yan renk. Paylaş (Premium'sız da) | Tip başına bir poz (aşağıda) |
| E6 | **Plan ekranı** | "Senin planın" özeti: alanlar, günlük süre, saat, ilk hafta hedefi. Buton "Planı başlat" · "Değiştir" (alan/saat) | `moka_checklist`, kutlama `moka_sparkling_complete` |
| E7 | Ben → Moka'nın notları | Tip kartı + testi yeniden yap | tip pozu |

Tip görselleri: her tip için ayrı ChatGPT görseli, bkz. bölüm 6.
Hareket: `Appear` ile kart beliriş, tip açıklanırken `Burst`, çubuklar sırayla dolar. "Hareketi azalt" saygı gösterilir.

## 5. Açık kararlar (Melih)
1. Soru sayısı 17-19 çok mu? Öneri: zorunlu 12 (A'dan 5 + B'den 7), geri kalanı "Daha iyi tanıyalım" opsiyonel.
2. Tip adları/emojileri (8 tip) ve Moka cümleleri uygun mu? Gerekirse İngilizce karşılıklar ayrıca yazılır.
3. Test sadece yeni kullanıcıya mı, mevcut kullanıcılara da "Moka seni tanıyor" kartıyla mı sunulsun? (Öneri: ikisi de.)
4. Tip paylaşım görseli ilk sürümde olsun mu? (Öneri: evet, düşük maliyet.)
5. Sadelik planı (1.0.2): başlangıçta 3 alan sınırı korunsun mu? (Öneri: evet.)
6. Para modülü ilk sürümde sadece hatırlatma mı kalsın? (Öneri: evet.)
7. Yeni görseller ChatGPT ile üretilecek (bölüm 6); 8 tip görseli gelene kadar mevcut pozlar yedek olsun mu? (Öneri: evet.)

## 6. ChatGPT görsel prompt'ları (8 tip)
Kullanım: önce ChatGPT'ye mevcut Moka çıkartmalarından 1-2 tanesini (ör. `assets/moka/moka_happy.webp`) yükle, **ortak başlığı** yapıştır, sonra tipin satırını ekle. Her tip için ayrı sohbet açma, aynı sohbette sırayla iste (tutarlılık artar). Çıktıyı `scripts/clean-moka-edges.py` ile temizle.

**Ortak başlık (hepsinde aynı):**
> Yüklediğim görseldeki Moka karakterini birebir koru: tombul, yuvarlak hatlı, yumuşak gölgeli kahveci kakapo papağanı; aynı yeşil-sarı tüy renkleri, aynı yüz ve göz stili, aynı oran ve çizgi kalınlığı. Stil: sevimli çıkartma (sticker), kabarık 3D-vari pastel çizim, krem beyaz kalın kenarlık, şeffaf arka plan, kare 1024x1024, karakter ortada ve tam görünür. Aşağıda yalnızca poz, ifade ve küçük aksesuar değişsin, karakterin tasarımı değişmesin. Yazı ekleme.

| Tip | Moka'nın hâli | Prompt (başlığın sonuna ekle) |
|---|---|---|
| 🦫 **Moka Kunduz** (planlayıcı, düzenli) | Kunduz kulak bandı, elinde plan defteri | Moka, başında küçük kunduz kulaklı bir bando, bir elinde açık kareli plan defteri, diğer elinde kalem; gözlüklü, kendinden emin hafif gülümseme; yanında küçük bir takvim sticker'ı. |
| 🐯 **Moka Kaplan** (hızlı başlayan) | Kaplan şapkası, atılan zıplama | Moka, turuncu-siyah çizgili küçük kaplan kapüşonu giymiş, bir kanadı havada yumruk gibi, ileri atılırken zıplıyor; gözler heyecanlı ve kararlı, geniş gülümseme; arkada küçük hız çizgileri. |
| 🐢 **Moka Kaplumbağa** (sabırlı, istikrarlı) | Sırtında yeşil kabuk, yavaş ve huzurlu | Moka, sırtında küçük yeşil kaplumbağa kabuğu sırt çantası, elinde kahve fincanı, yavaş yürüyor; gözler yarı kapalı huzurlu, yumuşak gülümseme; ayaklarının yanında küçük bir yıldız. |
| 🦅 **Moka Şahin** (odaklı) | Şahin gözlükleri, hedef tahtası | Moka, başında küçük kahverengi şahin tüyü ve ince pilot gözlüğü, bir kanadı ileri bir hedef tahtasını işaret ediyor; keskin, odaklı bakış, dik duruş; yanında içinde ok olan bir hedef. |
| 🦋 **Moka Kelebek** (dağınık ama yaratıcı) | Kelebek kanatları, etrafında renkli noktalar | Moka, sırtında pastel renkli küçük kelebek kanatları, etrafında uçuşan minik yıldız, kalp ve not simgeleri; meraklı, neşeli, hafif şaşkın ifade, bir ayağı havada dans eder gibi. |
| 🐲 **Moka Ejderha** (ya hep ya hiç, enerjik) | Küçük ejderha kanatları, minik alev | Moka, sırtında küçük kırmızı-turuncu ejderha kanatları ve kuyruğu, ağzından çok küçük sevimli bir alev, kanatlar açık; hırslı, tutkulu ifade, kaşlar hafif çatık ama yine sevimli. |
| 🐱 **Moka Kedi** (özgür, kendi hızında) | Kedi kulakları, battaniye ve kahve | Moka, başında küçük kedi kulaklı bando, yumuşak battaniyeye sarılmış, elinde sıcak kahve fincanı, rahat bir yastıkta oturuyor; yarı kapalı keyifli gözler, rahat gülümseme. |
| 🦜 **Moka Kakapo** (dengeli, klasik) | Moka'nın kendisi, aksesuarsız | Moka, kendi klasik hâliyle, iki kanadı yana açık, sıcak ve dengeli gülümseme, yanında küçük bir kahve fincanı ve küçük bir yeşil yaprak; sade, huzurlu. |

Not: tip kartı arka plan rengi: Kunduz kahve, Kaplan turuncu, Kaplumbağa yeşil, Şahin lacivert, Kelebek pembe, Ejderha kırmızı-turuncu, Kedi mor-gri, Kakapo mint. Dosya adı önerisi: `assets/moka/tip/moka_<kunduz|kaplan|kaplumbaga|sahin|kelebek|ejderha|kedi|kakapo>.webp`.
