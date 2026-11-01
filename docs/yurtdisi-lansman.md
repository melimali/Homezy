# Yurt dışı lansman planı

Hedef: Homezy'yi Türkiye dışında tanıtmak, ilk ücretli kullanıcıları yurt dışından almak. Hazırlanma tarihi: 2026-10-30.

Dayanak: 2026-10-21 pazar analizi (Finch ≈ 1 M $/ay, Sweepy ≈ 70K $/ay, Tody 10–30K $/ay; ücretsizden ücretliye geçiş ≈ %2, 30. gün tutma ≈ %3–4). Gelirin çoğu yurt dışında, bu yüzden İngilizce ilk sırada. Türkçe mağaza metni: `docs/magaza-metni.md`.

## 0. Ön koşullar (bunlar olmadan yurt dışı yok)

1. **Uygulama içi dil.** Mağaza metni İngilizce ama uygulama Türkçe açılırsa kötü yorumlar ve düşük puan gelir. i18n (yapılacaklar listesinde) önce EN ile bitmeli; ES / PT-BR / DE / FR sonra, her biri o ülkenin sırası geldiğinde.
2. **Google Play onayı ve Türkiye yayını.** İlk yayın Türkiye'de; çökme ve ödeme akışı orada doğrulanır.
3. **Ölçüm.** Firebase Analytics ya da benzeri ile en az şunlar: kurulum, ev çizimi bitti, ilk "Tamamladım", 1. / 7. / 30. gün geri dönüş, ödeme ekranı görüldü, deneme başladı, satın aldı. RevenueCat zaten gelir tarafını tutuyor.
4. **Fiyat.** ABD 6,99 $ / ay, 59,99 $ / yıl. Diğer ülkelerde Play ve App Store'un önerdiği yerel fiyatı başlangıç al; Brezilya ve Meksika'da satın alma gücüne göre aşağı çek (ör. Brezilya ≈ 19,90 R$ / ay, Meksika ≈ 79 MXN / ay).
5. **Yasal sayfalar** İngilizce (themeikai.com/homezy/en/privacy, /terms, /delete-account). Avrupa için KVKK yerine GDPR dili; AdMob için AB'de onay (UMP) ekranı zorunlu.

## 1. Pazar önceliği

Puanlama: gelir potansiyeli, rekabet, dil işi, reklam maliyeti. 5 üzerinden.

| Sıra | Pazar | Dil | Gelir | Rekabet (düşük = iyi) | Reklam maliyeti | Neden |
|---|---|---|---|---|---|---|
| 1 | ABD + UK (+ CA, AU, IE, NZ) | EN | 5 | 2 (Sweepy, Tody, Finch kalabalık) | Pahalı | Gelirin büyük kısmı; tek dille 6 ülke. Organik TikTok ve Reddit burada en güçlü. |
| 2 | Brezilya | PT-BR | 2 | 4 | Çok ucuz | Dev Android kitlesi, "rotina de limpeza" içeriği çok izleniyor, yerel rakip az. Ucuz kurulumla retention testi için ideal. |
| 3 | Meksika + İspanya (+ AR, CO, CL) | ES | 3 | 4 | Ucuz (MX), orta (ES) | Tek dil 20+ ülke. İspanya Avrupa fiyatı öder, Meksika hacim getirir. |
| 4 | Almanya (+ AT, CH) | DE | 4 | 3 | Pahalı | Ödeme isteği yüksek, düzen / "Putzplan" kültürü güçlü. Metin ve yasal iş (GDPR, Impressum) en ağır. |
| 5 | Fransa (+ BE, CA-QC) | FR | 3 | 3 | Orta | İyi gelir ama içerik pazarı daha kapalı; ilk dördü gördükten sonra. |

Sıralama önerisi: EN ile aç, 2–4 hafta sonra PT-BR ve ES'yi birlikte ekle (çeviri ucuz, test pazarı), DE ve FR'yi retention verisi iyiyse ekle.

## 2. Mağaza metni taslakları

Karakter sınırları: Play başlık 30, Play kısa açıklama 80, App Store başlık 30, alt başlık 30, anahtar kelime 100. Aşağıdakilerin hepsi sınır içinde (sayılar parantezde). Uzun açıklama kısa tutuldu; mağaza 4000'e izin veriyor, Türkçe metindeki bölümler aynı sırayla genişletilebilir.

### İngilizce (EN-US, EN-GB için de aynı)

- **Play başlık:** Homezy: Routine & Chores (24)
- **Play kısa açıklama:** Draw your home, do a little each day, keep your streak and watch your home grow. (80)
- **App Store başlık:** Homezy: Daily Routine & Chores (30)
- **App Store alt başlık:** Cozy cleaning & chore tracker (29)
- **App Store anahtar kelimeler:** cleaning,schedule,habit,tracker,household,tidy,laundry,grocery,list,planner,family,reminder,home (96)

**Uzun açıklama:**

Chores never end, but a little every day keeps them from piling up. Homezy puts every job in your home in one cozy place and tells you only what to do today.

🏡 DRAW YOUR HOME
Sketch your home with blocks in seconds: bedroom, kitchen, bathroom, living room, balcony. Each room gets its own routines automatically. Answer a few quick questions (pets, dishwasher, plants) and your routines fit your real home.

✅ KNOW WHAT TO DO TODAY
Your three most urgent jobs are right on the home screen. Tap "Done" and earn points. Overdue tasks turn red, rooms fade as they get messy and glow again when you clean.

🔥 KEEP YOUR STREAK, BUILD YOUR HOME
Do at least one job a day and your streak grows, and so does your house. Miss a day? A streak freeze protects it. Spend your points on furniture and decorations.

🐦 MEET MOKA
Moka the coffee-colored kakapo cheers you on, celebrates your wins and gets a little dusty when you skip.

👕 WARDROBE & LAUNDRY
Mark clothes Clean, Dirty or To iron. Homezy tells you when there is enough for a load. Snap a photo to add clothes automatically.

🧊 FRIDGE & SHOPPING LIST
Take a photo of your fridge; AI finds what is running low. Empty items drop onto your shopping list.

🔔 MORNING SUMMARY
One gentle notification a day, at the time you choose.

⭐ PREMIUM
50 AI scans a day, 3 streak freezes a month, 1.5× points, up to 5 homes, themes, family sharing and no ads. The basics of your home are always free.

Your data stays on your phone first. Create an account only if you want a backup.

### İspanyolca (ES-419 Latinoamérica + ES-ES)

- **Play başlık:** Homezy: Rutina y Tareas (23)
- **Play kısa açıklama:** Dibuja tu casa, haz un poco cada día, mantén tu racha y mira crecer tu hogar. (77)
- **App Store başlık:** Homezy: Tareas del Hogar (24)
- **App Store alt başlık:** Rutina de limpieza fácil (24)
- **App Store anahtar kelimeler:** limpieza,rutina,hogar,casa,organizar,lista,compras,colada,ropa,hábitos,recordatorio,familia (91)

**Uzun açıklama:**

Las tareas de la casa nunca terminan, pero un poco cada día evita que se acumulen. Homezy reúne todo lo de tu hogar en un solo lugar acogedor y te dice solo lo que toca hoy.

🏡 DIBUJA TU CASA — Crea tu plano con bloques en segundos. Cada habitación recibe sus propias rutinas.
✅ SABE QUÉ HACER HOY — Tus tres tareas más urgentes en la pantalla principal. Toca "Hecho" y gana puntos.
🔥 MANTÉN TU RACHA — Haz al menos una tarea al día y tu casa crece piso a piso. Si fallas un día, la protección de racha la salva.
🐦 CONOCE A MOKA — Un kakapo color café que celebra cada logro contigo.
👕 ROPA Y COLADA · 🧊 NEVERA Y LISTA DE COMPRAS con foto e IA · 🔔 RESUMEN MATUTINO a la hora que elijas.
⭐ PREMIUM — 50 escaneos con IA al día, más protecciones de racha, puntos ×1,5, varias casas, temas, compartir en familia y sin anuncios. Lo básico siempre es gratis.

### Portekizce (PT-BR)

- **Play başlık:** Homezy: Rotina e Tarefas (24)
- **Play kısa açıklama:** Desenhe sua casa, faça um pouco por dia e veja seu lar crescer com você. (72)
- **App Store başlık:** Homezy: Tarefas de Casa (23)
- **App Store alt başlık:** Rotina de limpeza fofa (22)
- **App Store anahtar kelimeler:** limpeza,rotina,faxina,casa,organizar,lista,compras,roupa,hábitos,lembrete,família,lar (85)

**Uzun açıklama:**

As tarefas de casa nunca acabam, mas um pouquinho por dia evita que acumulem. O Homezy junta tudo da sua casa em um só lugar aconchegante e mostra só o que fazer hoje.

🏡 DESENHE SUA CASA — Monte a planta com blocos em segundos. Cada cômodo ganha suas próprias rotinas.
✅ SAIBA O QUE FAZER HOJE — Suas três tarefas mais urgentes na tela inicial. Toque em "Feito" e ganhe pontos.
🔥 MANTENHA A SEQUÊNCIA — Faça pelo menos uma tarefa por dia e sua casa cresce andar por andar. Perdeu um dia? O congelamento protege sua sequência.
🐦 CONHEÇA A MOKA — Um kakapo cor de café que comemora cada conquista com você.
👕 ROUPAS E LAVANDERIA · 🧊 GELADEIRA E LISTA DE COMPRAS com foto e IA · 🔔 RESUMO DA MANHÃ no horário que você escolher.
⭐ PREMIUM — 50 análises com IA por dia, mais congelamentos, pontos ×1,5, várias casas, temas, compartilhamento em família e sem anúncios. O básico é sempre grátis.

### Almanca (DE)

- **Play başlık:** Homezy: Routine & Haushalt (26)
- **Play kısa açıklama:** Zeichne dein Zuhause, erledige täglich ein wenig und sieh dein Haus wachsen. (76)
- **App Store başlık:** Homezy: Putzplan & Haushalt (27)
- **App Store alt başlık:** Gemütlicher Haushaltsplaner (27)
- **App Store anahtar kelimeler:** putzen,routine,aufgaben,wohnung,ordnung,einkaufsliste,wäsche,gewohnheit,erinnerung,familie (90)

**Uzun açıklama:**

Hausarbeit hört nie auf, aber ein bisschen jeden Tag verhindert, dass sie sich stapelt. Homezy sammelt alle Aufgaben deines Zuhauses an einem gemütlichen Ort und zeigt dir nur, was heute dran ist.

🏡 ZEICHNE DEIN ZUHAUSE — Grundriss aus Blöcken in Sekunden. Jedes Zimmer bekommt eigene Routinen.
✅ WISSEN, WAS HEUTE DRAN IST — Deine drei dringendsten Aufgaben auf dem Startbildschirm. Tippe auf "Erledigt" und sammle Punkte.
🔥 HALTE DEINE SERIE — Mindestens eine Aufgabe pro Tag und dein Haus wächst Stockwerk für Stockwerk. Einen Tag verpasst? Der Serienschutz rettet dich.
🐦 LERNE MOKA KENNEN — Ein kaffeebrauner Kakapo, der jeden Erfolg mit dir feiert.
👕 KLEIDUNG & WÄSCHE · 🧊 KÜHLSCHRANK & EINKAUFSLISTE per Foto und KI · 🔔 MORGENÜBERSICHT zu deiner Wunschzeit.
⭐ PREMIUM — 50 KI-Scans pro Tag, mehr Serienschutz, 1,5× Punkte, mehrere Wohnungen, Themes, Familienfreigabe, ohne Werbung. Die Grundfunktionen bleiben kostenlos.

Not: Almanya'da Impressum (şirket adresi) ve GDPR uyumlu gizlilik metni mağaza girişinde zorunlu.

### Fransızca (FR)

- **Play başlık:** Homezy : Routine et Ménage (26)
- **Play kısa açıklama:** Dessinez votre maison, faites un peu chaque jour et regardez-la grandir. (72)
- **App Store başlık:** Homezy : Ménage et Routine (26)
- **App Store alt başlık:** Planning ménage tout doux (25)
- **App Store anahtar kelimeler:** ménage,routine,tâches,maison,rangement,courses,liste,lessive,habitude,rappel,famille (84)

**Uzun açıklama:**

Le ménage ne s'arrête jamais, mais un peu chaque jour l'empêche de s'accumuler. Homezy réunit toutes les tâches de votre maison dans un endroit douillet et vous dit seulement quoi faire aujourd'hui.

🏡 DESSINEZ VOTRE MAISON — Votre plan en blocs en quelques secondes. Chaque pièce reçoit ses propres routines.
✅ SACHEZ QUOI FAIRE AUJOURD'HUI — Vos trois tâches les plus urgentes sur l'écran d'accueil. Touchez « Fait » et gagnez des points.
🔥 GARDEZ VOTRE SÉRIE — Au moins une tâche par jour et votre maison grandit étage par étage. Un jour manqué ? Le gel de série vous protège.
🐦 FAITES CONNAISSANCE AVEC MOKA — Un kakapo couleur café qui fête chaque réussite avec vous.
👕 VÊTEMENTS ET LESSIVE · 🧊 FRIGO ET LISTE DE COURSES par photo et IA · 🔔 RÉSUMÉ DU MATIN à l'heure de votre choix.
⭐ PREMIUM — 50 analyses IA par jour, plus de gels de série, points ×1,5, plusieurs maisons, thèmes, partage familial et sans publicité. L'essentiel reste gratuit.

### Çeviri notları

- Taslaklar benim çevirim; yayından önce her dili bir ana dil konuşanına okut (Fiverr / Upwork'te dil başına 15–30 $).
- Ekran görüntülerindeki yazılar da çevrilmeli; ilk 3 görüntü dönüşümün çoğunu taşır.
- App Store'da başlıktaki kelimeler anahtar kelime alanında tekrar edilmez (boşa harcanır). Yukarıdaki listeler buna göre yazıldı.

## 3. 10 kısa video fikri (TikTok / Reels / Shorts)

Ortak kurallar: 9:16, 7–20 sn, ilk 1 saniyede kanca yazısı, sesli trend müzik, sonda logo yok ya da 0,5 sn. Moka her videoda. Ekran kaydı + Moka çıkartmaları (assets/moka) yeterli; yüz göstermek gerekmez. Haftada 4–5 video, aynı video üç platforma.

| # | Başlık / kanca | İçerik | Neden tutar |
|---|---|---|---|
| 1 | "I skipped chores for 5 days. Moka was NOT ok." | Evin toz tutması, çatlaması, kat kaybetmesi; Moka'nın üzgün yüzü. Sonda tek iş yapılıp evin parlaması. | Çöküş ve kurtarma, analizdeki en güçlü fikir. |
| 2 | "POV: your house grows every time you clean" | 30 günlük serinin hızlandırılmış hali, ev kat kat yükseliyor. | Tatmin edici dönüşüm, cozy game kitlesi. |
| 3 | "Rating my roommate's chores with a kakapo" | Moka her işe tepki çıkartması veriyor (kutlama / şok / uyku). | Mizah, düet ve stitch'e açık. |
| 4 | "5-minute reset with Moka" | "Ne kadar vaktin var?" 10 dk seçimi, gerçek oda + uygulamada işaretleme yan yana. | CleanTok'un en çok izlenen formatı (reset videoları). |
| 5 | "Things my ADHD brain needed in a chore app" | Sadece bugünün 3 işi, sabah tek bildirim, esnek zamanlama. | ADHD cleaning içerikleri büyük ve paylaşılıyor; iddia değil, kişisel deneyim tonu. |
| 6 | "My fridge told me what to buy" | Buzdolabı fotoğrafı, yapay zekânın çıkardığı liste, alışveriş listesine düşmesi. | "AI did it for me" kancası. |
| 7 | "Draw your apartment in 10 seconds" | Blok ızgarada oda boyama hızlandırılmış. | Merak; yorumlarda "evimi çizdim" paylaşımları. |
| 8 | "Moka's reaction when you finally do the laundry" | Gardırop 3+ kirli uyarısı, çamaşır yapılınca Moka dansı. | Tekrarlanabilir seri formatı (Moka's reaction to...). |
| 9 | "Cozy games but it's your actual house" | Animal Crossing / Stardew tarzı müzik, eşya satın alma, evi süsleme. | Cozy gamer kitlesi kadın 18–34, hedef kitleyle örtüşüyor. |
| 10 | "Day 1 vs Day 30 of using Homezy" | Gerçek kullanıcı (ya da Melih) ev görüntüsü + uygulamadaki ev yan yana. | Önce / sonra, en güvenilir sosyal kanıt. |

Seri hesap adı önerisi: @homezy.moka. Biyo: "Moka keeps your home cozy 🐦☕ Free on Google Play". İlk 2 hafta Türkçe denemeleri ayrı hesapta tut; İngilizce hesap ilk günden İngilizce kalsın (algoritma dili karıştırmasın).

## 4. ASO anahtar kelime listesi

Hacim tahmini (Y / O / D) sezgisel; yayından sonra Play Console "Arama terimleri" ve App Store Connect verisiyle güncellenmeli. AppTweak veya Astro ile ilk ay ücretsiz deneme yeterli.

| Kelime (EN) | Hacim | Rekabet | Kullanım |
|---|---|---|---|
| chore tracker | Y | Y | Play başlık değil kısa açıklama + uzun açıklama ilk satır |
| chores | Y | Y | Başlıkta (Play + Apple) |
| routine | Y | Y | Başlıkta |
| cleaning schedule | O | O | Alt başlık / anahtar kelime |
| cleaning routine | O | O | Uzun açıklama, video etiketleri |
| habit tracker | Y | Çok Y | Anahtar kelime (tek başına sıralamak zor, uzun kuyrukta işe yarar) |
| cozy / cozy app | O | D | Alt başlık; cozy game kitlesine köprü |
| household planner | D | D | Anahtar kelime |
| house cleaning | O | O | Uzun açıklama |
| tidy / declutter | D | D | Anahtar kelime |
| laundry tracker | D | D | Uzun açıklama |
| grocery list | Y | Y | Uzun açıklama (yan özellik, ana mesaj değil) |
| family chores | O | O | Aile paylaşımı bölümü |
| ADHD cleaning | O | D | Sadece uzun açıklamada nazik bir cümle; başlıkta tıbbi iddia yok |
| home maintenance | D | D | Ev bakımı bölümü |

Diğer diller için ana çekirdek: ES "rutina de limpieza, tareas del hogar, limpieza casa"; PT-BR "rotina de limpeza, faxina, tarefas de casa"; DE "Putzplan, Haushaltsplan, Haushalt App"; FR "planning ménage, tâches ménagères, routine ménage".

Kural: Play'de uzun açıklamada ana kelimeyi 3–5 kez doğal geçir, fazlası spam sayılır. Apple'da başlık + alt başlık + anahtar kelime alanı birlikte indekslenir, tekrar etme.

## 5. Reddit ve Product Hunt planı

### Reddit (kurallar: kendi ürününü reklam gibi atmak çoğu yerde yasak; önce katkı, sonra paylaşım)

Alt forumlar: r/CleaningTips, r/declutter, r/ADHD (sadece kendi kuralları izin verdiğinde, genelde haftalık "self-promo" başlıkları), r/organization, r/productivity, r/getdisciplined, r/CozyGamers (oyun değil ama "cozy" açısı), r/androidapps, r/SideProject, r/indiehackers, r/apps.

Sıra:
1. **Hafta -2 / -1:** Hesap yaşlandır. r/CleaningTips ve r/declutter'da gerçek yorumlarla katkı (günde 2–3 yorum, uygulama adı yok).
2. **Lansman haftası:** r/SideProject ve r/androidapps'e "I built a chore app where your house collapses if you skip cleaning" başlıklı, GIF'li, hikâye anlatan gönderi. Geri bildirim iste, link yorumda.
3. **Lansman +1 hafta:** r/indiehackers'a rakamlarla "first week" yazısı (kurulum, D1 tutma, öğrendiklerin).
4. **Sürekli:** "chore app" / "cleaning app recommendation" geçen başlıkları haftada bir tara, uygunsa dürüstçe "geliştiricisiyim" diyerek öner.

Ölçü: her gönderiye ayrı UTM / Play "referrer" linki, böylece hangi forumun kurulum getirdiği görülür.

### Product Hunt

- **Ne zaman:** İngilizce sürüm Play'de canlı ve iOS TestFlight / App Store'da en az bekleme listesi varken. Product Hunt kitlesi iPhone ağırlıklı; sadece Android ile gelmek etkiyi yarıya indirir.
- **Gün:** Salı–Perşembe, 00:01 PT (Türkiye saatiyle yazın 10:01, kışın 11:01).
- **Hazırlık (2 hafta önce):** "Coming soon" sayfası, 5 görsel (ilk görsel: Moka + çöken / yükselen ev), 30–45 sn tanıtım videosu, maker yorumu taslağı (neden yaptın, Türkiye'den tek kişilik stüdyo hikâyesi), lansman gününe özel teklif (ilk ay ücretsiz Premium kodu ya da 4,99 $ giriş fiyatı vurgusu).
- **Destek:** Reddit, X ve Indie Hackers'taki takipçilere o sabah tek mesaj; oy isteme değil, "geri bildirim bekliyorum" dili (PH oy isteyen linkleri cezalandırıyor).
- **Gün içi:** Her yoruma 1 saat içinde cevap.
- Hedef gerçekçi: ilk 10 içinde günün ürünü olmak bonus; asıl kazanç 300–1.000 kurulum ve geri dönüş yazıları.

Ek kanallar (ücretsiz): AlternativeTo'da Sweepy / Tody alternatifi olarak listele; "Best chore apps 2027" yazısı yazan blog ve YouTuber'lara e-posta (20 kişilik liste, kişiye özel kısa mesaj, Premium kodu).

## 6. Ücretli reklam planı

**Başlama şartı (ikisi birden):**
1. Google Play onayı geldi, uygulama ilk dilde (EN) yayında.
2. Organik kullanıcılardan en az 2–4 haftalık retention verisi: hedef D1 ≥ %30, D7 ≥ %12, D30 ≥ %5 ve deneme → ücretli ≥ %25. Bu eşiklerin altındaysa reklam parası delik kovaya gider; önce ürünü düzelt.

**Kurallar:** Günlük 10–20 $, tek ülke, tek dil. Bir seferde tek değişken.

| Aşama | Süre | Kanal | Ülke / dil | Bütçe | Amaç |
|---|---|---|---|---|---|
| A. Ucuz test | 14 gün | Google App Campaigns (Play kurulumu) | Brezilya / PT-BR ya da Meksika / ES | 10 $/gün ≈ 140 $ | Hangi video / görsel kurulum getiriyor, retention reklamla düşüyor mu. Kurulum maliyeti hedefi < 0,40 $. |
| B. Asıl pazar | 14–21 gün | Google App Campaigns, sonra TikTok Ads | ABD / EN | 15–20 $/gün ≈ 300–400 $ | Deneme başlatma maliyeti (CPT) ve ilk abonelikler. Kurulum hedefi < 2 $, deneme hedefi < 15 $. |
| C. iOS | iOS yayına girince | Apple Search Ads (Basic sonra Advanced) | ABD / EN | 10 $/gün | "chore app", "cleaning schedule" gibi niyetli aramalar. |

Karar kuralı: 7 günlük toplam abonelik geliri (yıllık abonelik 12'ye bölünerek) harcamanın %30'unu bile geçmiyorsa kampanyayı durdur, görseli değiştir, tekrar 7 gün dene. 3 denemede de olmazsa o ülke / kanal bırakılır. Kâra geçiş için 12 aylık kullanıcı değeri (LTV) ≥ 1,3 × kullanıcı edinme maliyeti olmalı.

Görseller: en iyi performans gösteren 2–3 organik TikTok videosu reklamda aynen kullanılır (Spark Ads / YouTube Shorts reklamı). Ayrı reklam çekimi yok.

Ölçüm: Google Ads ↔ Firebase bağlantısı, TikTok için Firebase üzerinden ya da TikTok SDK'sı; RevenueCat → Google Ads / TikTok gelir entegrasyonu (RevenueCat dashboard'unda tek tıkla).

## 7. Takvim (Play onayından itibaren)

| Hafta | İş |
|---|---|
| 0 | Türkiye yayını, ölçüm kurulu, İngilizce i18n bitiyor |
| 1–2 | EN mağaza metni + ekran görüntüleri, ABD / UK yayını; TikTok hesabı açılıp haftada 4–5 video; Reddit hesap yaşlandırma |
| 3 | Reddit lansman gönderileri, AlternativeTo, blog / YouTuber e-postaları |
| 4–5 | PT-BR ve ES dil + mağaza metni; retention verisine bak |
| 5–6 | Şartlar tuttuysa ücretli aşama A (Brezilya ya da Meksika) |
| 7–9 | Aşama B (ABD); iOS hazırsa Product Hunt |
| 10+ | DE ve FR; Apple Search Ads |

## 8. Melih'in kararı gereken noktalar

1. İlk ücretli test ülkesi: Brezilya mı Meksika mı (öneri: Brezilya, daha ucuz ve Android ağırlıklı).
2. Brezilya ve Meksika'da düşük yerel fiyat uygulanacak mı (öneri: evet).
3. Product Hunt'ı iOS'u bekleyerek mi yapalım (öneri: evet).
4. Çevirileri ana dil konuşanına okutma bütçesi (dil başına 15–30 $).
