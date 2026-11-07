# Disiplin kazandırma: özellik fikirleri

Tarih: 2026-11-07. İstek (Melih): yatağı toplamakla başlayan, disiplin ve kişisel gelişim odaklı uygulama; insanlara nasıl disiplin kazandırırız?
Durum: sadece öneri, kod yok. Melih seçer.

## Bilimsel zemin (kısa)

Disiplin irade değil, tekrar ve ortamdır. Uygulamayı buna göre kuruyoruz:
1. **Küçük başla** (2 dakika kuralı). Başarı duygusu motivasyonu getirir, tersi olmaz.
2. **Tetikleyiciye bağla** ("yatağı toplayınca su iç"). Bağlam yoksa alışkanlık oturmaz.
3. **İki kez üst üste kaçırma.** Bir gün kaçırmak normal; asıl kayıp ikinci gün.
4. **Kimlik.** "Yatağını toplayan biriyim" demek, "10 puan kazandım"dan güçlü.
5. **Anında ve küçük ödül.** Moka tepkisi, ev büyümesi.

## Uygulamada bugün olanlar (integration/tum-pr)

| Alan | Var |
|---|---|
| Seri ve puan | `play.ts`: günlük puan, seri bonusu, seri dondurma, ev büyür / toz tutar / çöker |
| Disiplin seviyesi | `discipline.ts`: seri 0-3 Başlangıç (3 iş), 4-7 Alışkanlık (4), 8+ Düzen (5); küçük işler önde |
| Alışkanlıklar | `habits.ts`: paketler, su, uyku |
| Ruh hali | `mood.ts`: günlük check-in, yoğun/hasta günde plan küçülür |
| Günlük, spor, ilaç, büyüme | `gunluk`, `spor`, `ilac`, `buyume`, `hafta` ekranları |
| Rozetler | `achievements.ts`: iş, seri, seviye, okuma |
| Moka | sohbet, hikaye, yürüyen Moka |
| Tek oda modu | gençler ve yurt için |

Eksik olan: **tetikleyici zinciri, akşam kapanışı, kimlik/66 gün yolculuğu, geri dönüş mekanizması, uyum düzeyi (kolaylaştır / zorlaştır) ve sosyal sorumluluk.**

## Öncelikli liste

Efor: S = 1-2 gün, M = 3-5 gün, L = 1+ hafta.

| # | Fikir | Kullanıcıya faydası | Efor | Tasarıma uyum |
|---|---|---|---|---|
| 1 | **Güne başlama zinciri** | Uyanınca tek akış: yatağı topla → bir bardak su → perdeyi aç → 2 dk esneme. Her adım dokun-tamamla, bitince Moka kutlar. "Sabah 10'a kadar" bitirilirse bonus. Karar yorgunluğunu sıfırlar, günün ilk zaferi hep aynı. | S | Çok iyi. `is.tsx` adımları, `habits.ts` paketi, `DoneCelebration` hazır. Yeni paket + tek ekran |
| 2 | **Geri dönüş kuralı ("iki kez kaçırma")** | Bir gün kaçıranda seri küsmez: ertesi gün "Moka seni bekliyordu" + tek küçük görev. Dönünce "geri dönüş" rozeti. Suçluluk yerine devam ettirir, bırakmayı önler. | S | Çok iyi. Mevcut toz/çökme mantığı yumuşar, `AWAY_DAYS` zaten var |
| 3 | **Akşam kapanışı + yarın niyeti** | Akşam 1 dakika: bugün ne yaptım (otomatik özet), yarın tek öncelik, yatağa gitmeden telefondaki işleri kapat. Sabah ekranı o niyetle açılır ("Dün söz verdin: …"). Planlama alışkanlığı, sabah net başlangıç. | S-M | İyi. `gunluk.tsx` + bildirim saati ayarı; yeni sadece niyet alanı |
| 4 | **66 gün yolculuğu + kimlik rozetleri** | Bir alışkanlık seç (yatak toplama), 66 günlük halka: 7 "başladı", 21 "oturuyor", 66 "ben artık böyle biriyim". Her eşikte Moka cümlesi ("Yatağını toplayan biri oldun"). Uzun vade hedefi, kimlik duygusu. | S | Çok iyi. `achievements.ts` genişler, halka bileşeni var (`growth` halkası) |
| 5 | **Uyum düzeyi (otomatik kolay/zor)** | Şu an seviye sadece seri sayısına bağlı. Yerine: üst üste 3 gün atlanırsa görevler küçülür (5 dk → 2 dk), 7 gün tam gidince bir yeni küçük görev önerilir. Kullanıcı hep "başarabileceği" yerde kalır. | M | İyi. `pickForLevel` içine başarı oranı girdisi |
| 6 | **Tetikleyiciye bağlama (alışkanlık istifleme)** | "Yatağı toplayınca → diş fırçala → vitamin" sırası. Bir iş bitince sıradaki işin kartı Moka balonunda çıkar. Alışkanlık, hatırlatmaya muhtaç kalmadan oturur. | M | İyi. Görev etiketi + "sonraki iş" önerisi; bildirim yok, uygulama içi |
| 7 | **Haftalık gözden geçirme (pazar)** | Mevcut haftalık özetin sonuna 3 soru: ne iyi gitti, ne zor geldi, gelecek hafta tek ayar. Moka ayara göre görev sıklığını önerir. Kendini tanıma, küçük düzeltme döngüsü. | S | İyi. `hafta.tsx` + pazar 19:00 bildirimi var |
| 8 | **Sorumluluk arkadaşı** | Aile paylaşımıyla bir kişiye "bugün yatağımı topladım" tikinin görünmesi, karşılıklı küçük teşvik (👏). Gençte ebeveyn baskısı değil, istemeyle. Sosyal söz, en güçlü disiplin yöntemlerinden. | L | Orta. `family` altyapısı var ama gizlilik ve çocuk güvenliği (yasal) düşünülmeli |
| 9 | **Telefonsuz mola / odak seansı görev bağlı** | Görevi başlatırken 10-25 dk odak sayacı, Moka yanında uyur, süre dolunca ödül. Odak kası. | S | İyi. `odak.tsx` zaten var; göreve bağlanır |
| 10 | **Taahhüt (söz) mekaniği** | Haftaya başlarken Moka'ya söz ver ("hafta içi hergün yatağımı toplayacağım"). Tutarsa bahçede özel nesne açılır. Duygusal bağ + net hedef. | M | Orta. Mağaza ürünleri sunucu fiyatlı (`play_buy`), bu yüzden ödül SQL ister |

## Önerilen sıra

**Önce (1.0.2 ya da hemen sonrası):** 1 → 2 → 4. Hepsi S, hepsi mevcut parçalarla. Üçü beraber "yatağını topla" hikâyesini tamamlar: sabah zinciri başlatır, geri dönüş kuralı bırakmayı önler, 66 gün yolculuğu sebep verir.
**Sonra:** 3, 7, 5. Akşam-sabah döngüsü ve kendini ayarlayan seviye.
**Daha sonra:** 6, 9, 10. Alışkanlık istifi, odak, söz.
**Ayrı karar:** 8 (arkadaş). Yasal ve çocuk güvenliği belgelerini etkiler (`docs/yasal/`).

## Dikkat

- Melih'in 1.0.2 kararı: arayüz sade kalmalı. Her fikir **yeni sekme değil, mevcut ekrana küçük kart** olarak eklenmeli. Ana ekranda 3-5 iş sınırı korunur.
- Ceza yok: kaçırma durumunda utandıran dil kullanma (Moka "üzgün" olur ama suçlamaz).
- Her yeni veri alanı `Play` içinde, SQL olmadan; ödül/puan ise `play_award` ile günde bir kez (kötüye kullanım sınırı).
- Çocuk dostu: kısa cümle, emoji, büyük dokunma alanı.
