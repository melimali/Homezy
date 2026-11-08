# Uygulama ile disiplin kazandırma: araştırma ve öncelikli fikirler

Tarih: 2026-11-08. İstek: Melih. Önceki çalışma: `disiplin-fikirleri.md` (10 fikir), `docs/disiplin.md` (rampa, uygulandı). Bu belge onları tekrar etmez; **yeni açıları** ekler ve tek listede önceliklendirir.

## 1. Davranış biliminden 8 ilke (kısa)

| İlke | Bulgu | Homezy'ye anlamı |
|---|---|---|
| Uygulama niyeti (if-then) | "X olunca Y yaparım" planı hedefe ulaşmayı belirgin artırır (Gollwitzer, meta-analiz, orta-büyük etki) | Görev "ne" değil "ne zaman + nerede" ile kurulmalı |
| Alışkanlık süre değil tekrar | Ortalama ~66 gün, 18-254 arası (Lally 2009). **Bir gün kaçırmak süreci bozmaz** | Seri bir hedef değil gösterge olmalı |
| "Zaten bozuldu" etkisi | Seri kopunca bırakma riski sıçrar (what-the-hell etkisi) | Kopuşta ceza değil kolay geri dönüş |
| Sürtünme | Eylemi 1 dokunuşa indirmek, başlatma oranını en çok artıran şey | Widget, bildirimde "Yaptım", ana ekranda tek iş |
| Özerklik-yetkinlik-bağ (SDT) | İçsel motivasyon, seçme hakkı + başarı hissi + ilişkiden gelir; dış ödül tek başına söner | Kullanıcı kendi işini seçer, Moka ilişki taşır |
| Kimlik temelli alışkanlık | "Yatağını toplayan biri" > "10 puan" (Clear, Oyserman) | Sonuç değil kimlik cümleleri |
| Taze başlangıç etkisi | Pazartesi, ay başı, doğum günü, yılbaşı sonrası hedef girişimi artar (Dai/Milkman) | Zamansal "yeni sayfa" anlarını yakala |
| Hedefe yaklaşma + taahhüt | Çubuk doluyorken çaba artar; önceden verilen söz/depozit tutma oranını artırır | İlerleme çubukları, söz mekaniği |

## 2. Rakiplerden dersler

| Uygulama | İyi yaptığı | Tuzağı | Homezy dersi |
|---|---|---|---|
| **Finch** | Şefkatli dil, kendini bakım, hayvan bağı, ceza yok | Ev işi ve disiplin zemini zayıf | Moka bağı doğru; üstüne gerçek ev işi/rutin ekliyoruz |
| **Habitica** | Oyunlaştırma, parti/görev, "boss" | Can kaybı cezası, karmaşık, bırakma yüksek | Ceza yok (zaten karar); karmaşıklıktan kaçın |
| **Streaks** | Sade, tek dokunuş, seri | Sert seri, kopunca motivasyon çöker | Seriyi yumuşat (dondurma + geri dönüş) |
| **Forest** | Odak = ağaç, kaybetme çekimi, telefonu bırak | Tek amaç | Odak seansı görevle bağlı (zaten `odak.tsx`) |
| **Fabulous** | Sabah rutini yolculuğu, kademeli yük, kimlik dili | Uzun onboarding, ücretli duvar | Sabah zinciri + kademe (rampa var) |
| **Tody / Sweepy** | Oda bazlı temizlik, "ne zaman yapılmalı" bar | Soğuk, tarama listesi | Bizim fark: Moka + 3D ev + disiplin |

Ortak sonuç: **kalıcılık = az ceza, çok küçük zafer, kimlik bağı, düşük sürtünme.** Homezy'nin ev + Moka kombinasyonu bunun için güçlü zemin.

## 3. Bugün uygulamada ne var (doğrulanmış, `disiplin-fikirleri.md` + bellek notları)

Var: seri, dondurma (ücretsiz 2), puan/günlük bir kez, ev geri gitmez (toz/çökme kaldırıldı), seviye rampası (`ramp.ts`), hafif gün, haftalık özet/yansıma, ruh hali, günlük, spor, ilaç, rozetler, Moka sohbeti, tek oda modu, bildirim varsayılanları (sabah+akşam). 
Yok (yeni kodda doğrula): sabah zinciri, geri dönüş mekaniği/rozeti, akşam kapanış+yarın niyeti, 66 gün/kimlik, uyum düzeyi, tetikleyiciye bağlama, söz, sorumluluk arkadaşı.

## 4. Yeni fikirler (öncekilerde yok)

| # | Fikir | Bilim | Efor | Not |
|---|---|---|---|---|
| A | **"Ne zaman?" bağlayıcı**: görev eklerken tek soru "hangi olaydan sonra?" (kahveden sonra, işten gelince). Sabah/öğle/akşam + olay seçilir; bildirim saati yerine olaya göre öne çıkar | If-then | S-M | Görev etiketine `cue` alanı, Bugün'de sıralama |
| B | **Minimum gün ("Bugün sadece bu")**: tek dokunuşla günü tek göreve indir; yapılırsa seri **sayılır**. Kötü günde seri bozulmaz | What-the-hell, sürtünme | S | Hafif gün var; seri sayacına bağla |
| C | **Taze başlangıç anları**: pazartesi, ay başı, doğum günü, bayram sonrası Moka "yeni sayfa" kartı: bir alışkanlık seç/yenile | Taze başlangıç | S | Bildirim/kart, sade |
| D | **Kimlik cümlesi seçimi**: onboarding'de "Ben ... biriyim" (düzenli, toplu, sabah insanı). Moka ve rozetler bu cümleyi kullanır | Kimlik | S | Persona sınavı var, ona bağla |
| E | **Birlikte çalışma (body doubling)**: görev başlayınca Moka yanında çalışır/temizler, ses+animasyon; "birlikte yapalım" 10 dk sayaç | Sosyal varlık, odak | S-M | Lofi + Moka animasyonu var |
| F | **Dürtü paketleme**: sevilen şeyi göreve bağla ("temizlerken lofi/Moka hikâyesi aç"). Hikâye bölümü iş bitince açılır | Temptation bundling | M | Hikâye ekranı var |
| G | **Değişken (şaşırtma) ödül, etik**: iş bitince nadiren sürpriz (Moka hediyesi, bahçe nesnesi). Her seferinde değil, tutarlı olasılık, harcama yok, bahisle ilişkisi yok | Değişken pekiştirme | M | Sunucu `play_award` içinde, günde sınır |
| H | **Söz + sessiz taahhüt**: haftaya "şu 3 işi yapacağım" sözü; tutulursa Moka'ya özel nesne. Bozulursa kayıp yok, sadece nesne gelmez | Taahhüt | M | Önceki #10 ile aynı; mağaza SQL gerekir |
| I | **Hedef çubuğu her yerde**: Bugün'de "3 işten 2'si", haftada "5/7 gün" çubuğu; son %20'de Moka teşviki | Hedefe yaklaşma | S | Görsel, veri hazır |
| J | **Yansıma sorusu 10 sn**: iş bitince tek dokunuşla "kolay/zor" (yüz). Veri uyum düzeyini besler | SDT yetkinlik, adaptasyon | S | Önceki #5 ile birleşir |
| K | **Ritüel kapanışı**: akşam "ışığı kapat" animasyonu, evde lamba söner, Moka uyur. Gün sınırı, tatmin | Kapanış hissi, uyku | S | 3D ev gece görünümü var |
| L | **Sosyal söz (isteğe bağlı, tek kişi)**: arkadaşa haftalık özet paylaş (görsel kart, kişisel veri yok) | Sosyal sorumluluk | M | Paylaşılabilir ev görseli fikri zaten var |

## 5. Birleşik öncelik (efor/etki)

**Hemen (1-2 hafta, hepsi S):**
1. **Güne başlama zinciri** (önceki #1) + **D kimlik cümlesi**
2. **B minimum gün** + önceki **#2 geri dönüş kuralı** (seri korunur, utandırma yok)
3. **I hedef çubukları** + **J yüz tepkisi** (sonra uyum düzeyine veri)
4. **C taze başlangıç kartı** (pazartesi/ay başı)
5. Önceki **#4 66 gün yolculuğu**

**Sonra (M):** A "ne zaman" bağlayıcı, akşam kapanışı + yarın niyeti (önceki #3) + **K ritüel**, uyum düzeyi (önceki #5), E birlikte çalışma.

**Daha sonra / karar gerekir:** G sürpriz ödül (kumar algısına dikkat, Apple/Google politikası), H söz (SQL), L sosyal paylaşım, sorumluluk arkadaşı (önceki #8: yasal + çocuk güvenliği).

## 6. Ürün çizgisi (korunacak kurallar)

- **Sade:** her şey mevcut ekrana küçük kart; yeni sekme yok; ana ekranda 3-5 iş.
- **Ceza yok, utandırma yok.** Kayıp çerçevesi yerine "geri dönüş" çerçevesi.
- **Dışsal ödül içselin önüne geçmesin:** puan/mağaza süs, kimlik cümlesi ve Moka bağı ana motor.
- **Kötüye kullanım sınırı:** puan günde bir kez (`play_award`); sürpriz ödül sunucuda.
- **Çocuk/genç güvenliği:** sosyal özellikler yasal belgeleri etkiler (`docs/yasal/`).
- **Ölç:** her fikir için tek metrik: D7/D30 geri dönüş, "kaçırma sonrası 3 gün içinde dönüş" oranı, haftalık aktif gün.

## Kaynaklar (kısa)

Gollwitzer 1999/2006 (uygulama niyetleri); Lally ve ark. 2009 (alışkanlık süresi); Dai, Milkman, Riis 2014 (taze başlangıç); Deci & Ryan (SDT); Kivetz ve ark. 2006 (hedefe yaklaşma); Clear 2018, Oyserman (kimlik); Milkman 2014 (dürtü paketleme); Finch, Habitica, Streaks, Forest, Fabulous uygulama incelemeleri.
