# Moka'nın kahvesi: seri yerine kahve potu (plan)

Durum: 2026-11-16, sadece plan. Melih "başla" demeden kod yazılmaz.
Bu belge `docs/moka-oda-son-plan.md` §20'nin (Kahve) yerini alır; oradaki "Günün kahvesi + Kahve defteri" fikri burada seriye bağlanarak genişletildi.

## 1. Fikir tek cümlede

Seri (🔥 N gün) artık **Moka'nın kahve potu**: pot her zaman dolu durur, seri sürdükçe tüter ve arada üstünde **"Kahvemiz hâlâ taze ☕"** yazar. Seri kırılınca pot boşalmaz, sadece buharı kesilir ve Moka nazikçe **"Kahve soğumuş, yeniden demleyelim"** der.

Neden böyle: alev "kaybedersen yanar" duygusu verir, kahve "seni bekliyor" der. Uygulamanın tonu (yumuşak, suçlamayan, "ev geri gitmez") ile uyumlu. Pot hep dolu olduğu için kullanıcı hiçbir şey kaybetmiş gibi hissetmez.

## 2. Kahve potu: durumlar

Sayı tek kaynaktan gelir: `progressOf(S.play, now)` (`streak`, `today`) ve `S.play.frozen`. Yeni bir seri hesabı yazılmaz.

| Durum | Koşul | Pot | Ara sıra çıkan yazı |
|---|---|---|---|
| Taze | `streak > 0 && today` | Dolu, buhar tüter, sıcak parıltı | "Kahvemiz hâlâ taze ☕" / "{} gündür taze ☕" |
| Tazelenmeyi bekliyor | `streak > 0 && !today` | Dolu, buhar ince | "Bugün bir iş, kahve tazelenir ☕" |
| Ilık tutuldu | dün dondurma kullanıldı | Dolu, buhar ince, ❄️ küçük işaret | "Kahveyi senin için ılık tuttum ❄️" |
| Soğumuş | `streak === 0` ve daha önce gün var | Dolu, buhar yok, renk biraz soğuk (kodla ton) | "Kahve soğumuş, yeniden demleyelim ☕" |
| İlk gün | hiç gün yok | Dolu, buhar yok | "İlk kahveyi birlikte demleyelim ☕" |

Kurallar:
- Pot **hiçbir zaman boşalmaz** (Melih). Fark sadece buhar, parıltı ve yazı.
- Sayı potun yanında küçük bir hap: `☕ 7`. Seri 0 iken hap gizli.
- "Taze" yazısı **arada bir** çıkar, sürekli değil: oda açılınca 3 sn sonra bir kez (4 sn görünür), sonra en erken 3-5 dk'da bir; pota dokununca hemen. Hareketi azalt açıksa yazı yine çıkar ama süzülmez.
- Bugün ilk iş bitince (seri arttığında) pot bir kez "fokurdar" (küçük zıplama + buhar artar) ve yazı "Kahve tazelendi, {} gün ☕" olur. Bu, mevcut "+puan 🔥 N günlük seri!" mesajının yerini alır.

## 3. Nerede görünür

| Yer | Şimdi | Sonra |
|---|---|---|
| Moka'nın odası | yok | Lambanın yanındaki sehpada pot (büyük, dokunulur, yazı balonu) |
| Ev sekmesi (`(tabs)/index.tsx`) Stat + "Sıradaki · 🔥" | 🔥 N gün seri | Pot simgesi + "N gün taze" |
| Bugün (`bugun.tsx`) başlık sağı | 🔥 N gün | ☕ N gün |
| Ben/Gelişim (`gelisim.tsx`, `hesap.tsx`) StatPill | 🔥 gün seri | ☕ gün taze kahve |
| Haftalık takvim noktaları (`charts.tsx`) | 🔥 iş yapılan gün | ☕ fincan, ❄️ aynı |
| DayCard, WeekCard, MokaReport, report.ts, HouseShareCard, PaywallMoments, siralama | 🔥 | ☕ |
| Bildirim (akşam hatırlatması `messages.ts`) | "🔥 N günlük serin var" | "Kahvemiz soğumasın ☕ N gündür taze, minik bir iş yeter" |
| Bildirim ayarı (`bildirimler.tsx`) | "Seri hatırlatması 🔥" | "Kahve hatırlatması ☕" |
| Widget'lar (Bugün, Mini) | `🔥 N` | `☕ N` (sadece yazı değişir, yeni derleme gerekmez) |
| Okuma serisi (`buyume.tsx`, `growth.ts` oku-3) | 🔥 | Olduğu gibi kalır: o ayrı bir seri, kahveyle karışmasın |

Kelime: Türkçede "seri" yazıları "taze kahve" ya da "gün" olur; ayarlar ve yardım metinlerinde bir kez "Kahve serisi" denir ki kullanıcı ne olduğunu anlasın. "Seri dondurma" → **"Kahveyi ılık tut"** (hak sayısı, Free 1 / Premium 3, mantık aynı).

## 4. Günün kahvesi (fincan) ve hafta tepsisi

Pot = uzun süre (seri). Fincan = bugün.
- Odada Moka'nın önünde küçük bir fincan, bugünün işleri bittikçe dolar (`done / total`). Hepsi bitince Moka bir yudum alır, "Günün kahvesi: Latte ☕" der, deftere damga basılır.
- Günün kahvesi seriye göre açılan kahvelerden seçilir (gün + kullanıcı tohumuyla sabit).
- **Hafta tepsisi:** sehpada son 7 günün fincanları. İş yapılan gün dolu fincan, ılık tutulan gün ❄️'lü fincan, kaçırılan gün sadece boş bir altlık (üzgün değil, nötr).

## 5. Kahve defteri (koleksiyon)

24 kahve. Bir kahve ilk kez "günün kahvesi" olunca deftere girer.
- Ücretsiz: 12 temel kahve (seriyle açılır). Premium: 12 mevsimlik/nadir kahve (kabak baharatlı latte, salep, sahlepli, kar kahvesi vb.).
- Açılma: en uzun seriye (`longestStreak`) göre: 1 Filtre, 3 Türk kahvesi, 7 Latte, 14 French press, 21 Mocha, 30 Cold brew, 60 Affogato, 100 Altın çekirdek... Rozetlerle aynı basamaklar (aşağıda), böylece tek bir merdiven var.
- Her sayfada kısa bir "evde nasıl yapılır" tarifi (yerel metin, yapay zekâ yok).

## 6. Seri rozetleri: kahveye çevrilir

Rozet kimlikleri ve koşulları aynı kalır (kazanılmış rozet kaybolmaz, `badgesSeen` bozulmaz). Değişen: ad, açıklama, simge ve açılış penceresi yazısı. Grup adı "Seri 🔥" → "Kahve ☕".

| id | Eski ad | Yeni ad | Kademe | Koşul | Simge |
|---|---|---|---|---|---|
| seri-3 | Kahve Sever | İlk Demleme | kolay | 3 gün taze kahve | Türk kahvesi cezvesi |
| seri-7 | Seri Ateşi | Her Gün Taze Filtre | orta | 7 gün | filtre kahve demliği |
| seri-14 | İki Hafta | French Press Ustası | orta | 14 gün | french press |
| seri-30 | Bir Ay Dolu | Barista | zor | 30 gün | barista önlüğü + latte art |
| seri-100 | Yüzler Kulübü | Altın Çekirdek | zor | 100 gün | altın kahve çekirdeği |
| seri-60 (yeni, isteğe bağlı) | yok | Cold Brew Sabrı | zor | 60 gün | cold brew şişesi |
| seri-365 (yeni, isteğe bağlı) | yok | Kahve Efsanesi | zor | 365 gün | taç takmış pot |

Not: 60 ve 365 yeni rozet ekler (35 → 37). Eklemezsek sadece ad değişir. Önerim: ekleyelim, uzun soluklu kullanıcıya hedef olur.

Açılış penceresi (`BadgeEarned`) seri rozetlerinde: "Yeni kahve rozeti! ☕ {ad}" ve Moka'nın fincan kaldırdığı stickerı (varsa), yoksa mevcut kutlama.

## 7. Mevcut kurallarla ilişki

- **Seri hesabı:** değişmez (`houseProgress`, `forgivenGaps`, `autoFreeze`). Pot sadece okur.
- **Puan:** `streakBonus` aynı. Sadece mesaj metni değişir.
- **Ev tozu:** ev zaten geri gitmiyor, sadece hafif toz var. Toz kalır; pot "soğumuş" olduğunda aynı gün toz da vardır, ikisi aynı sinyal. Ek ceza yok.
- **Moka'nın odası:** soğumuş günde açılış cümlesi kahveye bağlanır ("Kahve soğumuş, ama ben buradayım ☕"). 3+ gün uzaktaysa mevcut "uyuyan Moka" sahnesi önce gelir.
- **Rozetler:** koşul `best = max(longestStreak, streak)` aynen.
- **Aile paylaşımı:** seri kişiye ait, pot da kişiye ait.

## 8. Ücretsiz / Premium

| | Ücretsiz | Premium |
|---|---|---|
| Kahve potu, taze yazısı, sayı | ✓ | ✓ |
| Günün kahvesi fincanı, hafta tepsisi | ✓ | ✓ |
| Seri (kahve) rozetleri | ✓ | ✓ |
| Kahve defteri | 12 kahve | 24 kahve (12 mevsimlik/nadir) |
| Kahveyi ılık tut (dondurma) | ayda 1 | ayda 3 (mevcut) |

## 9. Örnek metinler (9 dil)

| TR | EN | DE | ES | FR | PT | JA | KO | AR |
|---|---|---|---|---|---|---|---|---|
| Kahvemiz hâlâ taze ☕ | Our coffee is still fresh ☕ | Unser Kaffee ist noch frisch ☕ | Nuestro café sigue fresco ☕ | Notre café est encore frais ☕ | Nosso café ainda está fresquinho ☕ | コーヒーはまだ淹れたて ☕ | 우리 커피 아직 따끈해 ☕ | قهوتنا لا تزال طازجة ☕ |
| {} gündür taze ☕ | Fresh for {} days ☕ | Seit {} Tagen frisch ☕ | Fresco desde hace {} días ☕ | Frais depuis {} jours ☕ | Fresquinho há {} dias ☕ | {}日間ずっと淹れたて ☕ | {}일째 따끈해 ☕ | طازجة منذ {} أيام ☕ |
| Bugün bir iş, kahve tazelenir ☕ | One task today keeps it fresh ☕ | Eine Aufgabe heute hält ihn frisch ☕ | Una tarea hoy y sigue fresco ☕ | Une tâche aujourd'hui et il reste frais ☕ | Uma tarefa hoje e ele continua fresco ☕ | 今日ひとつで淹れたてキープ ☕ | 오늘 하나만 하면 따끈해져 ☕ | مهمة واحدة اليوم تبقيها طازجة ☕ |
| Kahve soğumuş, yeniden demleyelim ☕ | The coffee went cold, let's brew again ☕ | Der Kaffee ist kalt, lass uns neu aufbrühen ☕ | Se enfrió el café, preparemos otro ☕ | Le café a refroidi, refaisons-en ☕ | O café esfriou, vamos passar outro ☕ | コーヒーが冷めちゃった、また淹れよう ☕ | 커피가 식었어, 다시 내리자 ☕ | بردت القهوة، لنحضّر غيرها ☕ |
| Kahveyi senin için ılık tuttum ❄️ | I kept the coffee warm for you ❄️ | Ich hab den Kaffee für dich warm gehalten ❄️ | Te guardé el café calentito ❄️ | Je t'ai gardé le café au chaud ❄️ | Guardei o café quentinho pra você ❄️ | コーヒー、温めておいたよ ❄️ | 커피 따뜻하게 데워 뒀어 ❄️ | أبقيت القهوة دافئة لك ❄️ |
| Her Gün Taze Filtre | Fresh Filter Every Day | Jeden Tag frischer Filter | Filtro fresco cada día | Filtre frais chaque jour | Coado fresco todo dia | 毎日淹れたてドリップ | 매일 신선한 필터 | فلتر طازج كل يوم |

Bütün metinler `src/i18n/mokaOda.ts` gibi tek bir `kahve.ts` satır dosyasında; testler (`turkishLeftovers`, `allLangs`) zaten eksik çeviriyi yakalar.

## 10. Melih'in üreteceği resimler (ChatGPT / Gemini)

Ortak stil cümlesi (her isteme ekle): *"cute chubby 3D clay sticker style, soft rounded shapes, gentle soft shadow, warm pastel cozy palette (cream, clay, coffee brown), matching a kakapo mascot app, centered, transparent background, no text, 1024×1024"*

Öncelik sırasıyla:
1. **Kahve potu (dolu):** "a cozy ceramic coffee pot (moka-style kettle) full of coffee, cream and clay colors with a small heart on it, lid slightly open". Buhar ayrı çizilir (kodla), soğuk hali kodla ton verilir, tek resim yeter.
2. **Fincan (boş) + kahve katmanı:** "a round cozy coffee cup on a saucer, empty, seen from slightly above" ve aynı fincan "filled with coffee and a little latte art heart". Doluluk kodla maske ile.
3. **Hafta tepsisi:** "a small wooden serving tray, seen from slightly above, empty".
4. **Rozet simgeleri (5 + 2):** cezve; filtre demlik; french press; barista önlüğü ve latte art fincan; altın kahve çekirdeği; cold brew şişesi; taç takmış kahve potu. Her biri: "<nesne>, as a round badge icon".
5. **Moka fincan kaldırıyor (kutlama):** "the same green kakapo mascot Moka holding a coffee cup up happily, eyes closed smiling" (Moka referans görseliyle).
6. **Defter için 24 kahve** (§5, `moka-oda-son-plan.md` §20'deki liste): her biri ayrı istem, sonra yapılabilir.

Resimler gelene kadar: pot ve fincan kodla (SVG) çizilir, rozetlerde emoji (☕ 🫖 🥇) kullanılır. Dosyaları `moka-oda/kahve/` altına koyman yeter, ben küçültüp yerleştiririm.

## 11. Aşamalar ve süre

| Aşama | İçerik | Resim gerekir mi | Süre |
|---|---|---|---|
| K0 | Rozet adları + grup adı, 🔥 → ☕ her yerde, bildirim ve "Kahveyi ılık tut" metinleri, 9 dil | Hayır | 0,5 gün |
| K1 | Odada kahve potu (SVG yer tutucu), taze/soğuk durumları, ara sıra çıkan yazı, fokurdama | Hayır (sonra pot resmi) | 0,5 gün |
| K2 | Ev, Bugün, Ben'de pot simgesi + "N gün taze" | Hayır | 0,5 gün |
| K3 | Günün kahvesi fincanı + hafta tepsisi | Fincan, tepsi | 1 gün |
| K4 | Kahve defteri (12 + 12 Premium), tarifler | 24 kahve | 1 gün |
| K5 | Yeni rozetler seri-60, seri-365 (isteğe bağlı) | 2 simge | 0,25 gün |

Önerim: K0 + K1 + K2 birlikte (yaklaşık 1,5 gün), resim beklemeden çalışır. K3-K4 resimler gelince.

## 12. Melih'in onaylayacakları

1. Rozet adları (§6) uygun mu, 60 ve 365 günlük yeni rozetler eklensin mi?
2. "Seri dondurma" adı "Kahveyi ılık tut" olsun mu?
3. Okuma serisi (📚 ayrı seri) alevde kalsın mı? (Önerim: evet, karışmasın.)
4. Başlayalım mı: K0 + K1 + K2?
