# Moka odası: animasyon planı (2026-11-16)

Hedef: oda "resim üstünde titreyen katmanlar" değil, **yaşayan bir yer** gibi hissettirmeli. Sadece animasyon; yeni native modül yok (Animated API, `useNativeDriver`), "hareketi azalt" ve ekran odakta değilken her şey durur.

## 1. Mevcut durumun dürüst denetimi

Dal `claude/project-thread-mna56i` (commit "boşta yaşam…") ilk turu. Kodu okuyarak ve Melih'in yorumuyla çıkan sorunlar:

| Alan | Sorun | Neden |
|---|---|---|
| Pencere ışığı | Düz dikdörtgen gibi duruyor, eğik huzme değil | `ISIK` yumuşak elips resmi, döndürülmüş ama kenarı bulanık değil ve duvara/zemine oturmuyor. Perspektif, pencere kafesinin gölgesi, toz ile etkileşim yok |
| Işıltı | Sabit "+" gibi | İki ince çubuk; ışıldama yok, parlama halkası, dönüş ve zamanlama düzensiz değil |
| Moka | Çoğu zaman donuk | Tek resim + mimik katmanları. Beden parçalara ayrık değil: baş, kulak, kuyruk, kol ayrı hareket etmiyor. Hareket tüm bedeni oynatıyor (kaymış gibi) |
| Hareket kalitesi | Mekanik | Çoğu sine ease; "anticipation / overshoot / follow-through" yok |
| Geçişler | Hareketler arası bağ yok | Esneme, yudumlama rastgele seçiliyor ama mood, saat ve olaylarla ilişkisi yok |
| Derinlik | Zayıf | Paralaks sadece birkaç katman, öne gelen (foreground) ve arka (cam dışı) fark az |

## 2. Referans kalite hedefi

Duolingo / Tamagotchi / Finch / Neko Atsume hissi:
- **Her 2-3 saniyede bir ekranda küçük bir şey olmalı** (göz kırpma, kuyruk, toz, ışık), ama hiçbiri dikkat çalmamalı.
- Her hareket **hazırlık → eylem → yerleşme** (anticipation, action, settle). Yaylanma ve aşma (overshoot) var.
- Moka'nın bir **içsel durumu** var (enerji, keyif); hareketleri bundan seçilir, rastgele değil.
- Dokunuşa her zaman **hemen** tepki (en çok 80 ms), sonra tepkinin kuyruğu.
- Sessiz anlar da güzel: nefes, ışık, toz.

## 3. Önerilen mimari: durum makinesi

`MokaBrain` (saf TS, bileşen dışı, test edilebilir):
- Durumlar: `idle`, `curious` (etrafa bak), `sip`, `yawn`, `stretch`, `groom`, `doze` (uyuklama), `sleep`, `talk`, `think`, `react-tap`, `react-done`, `react-sad`.
- Girdiler: saat, mood, son etkileşimden beri süre, oda enerjisi (`room.dust`, `room.warm`), olaylar (iş bitti, dokunuş, lamba, sürahi).
- Enerji 0-1: sabah yüksek, akşama doğru düşer; düşük enerjide esneme ve uyuklama ağırlığı artar; iş bitince yükselir.
- Kural: aynı hareket arka arkaya olmaz; son 3 hareket tutulur; en az 5 sn boşluk; konuşurken sadece `talk` + küçük idle.
- Geçişler tablosu (örnek): `idle → curious 30%, sip 25%, groom 15%, stretch 15%, yawn 15%`; enerji < 0.3 ise `yawn`/`doze` ×2; `doze → sleep` 40 sn dokunulmazsa.
- Her durum bir **zaman çizelgesi** (keyframe listesi) döner; bileşen sadece çalar. Böylece hareketler ayarlanabilir, Reanimated gerekmez.

## 4. Katmanlı animasyon listesi

### 4.1 Moka (en büyük kazanım)
Bugün tek resim. Kalite sıçraması **parçalara ayırmaktan** gelir (bkz. sec. 6 görsel ihtiyaç). Parçalar: gövde, baş (+yüz mimikleri), sol/sağ kulak (kakapo tüyü), kuyruk, kupa+kol.

| Hareket | Süre | Eğri | Detay |
|---|---|---|---|
| Nefes | 1.9-2.6 sn, düzensiz | sine | Göğüs ölçek 1.018; baş 1 kare geç takip eder (follow-through) |
| Göz kırpma | 65-170 ms | quad | Yavaş/hızlı/çift; bakış yönüyle birlikte |
| Kuyruk/tüy | 0.9-1.6 sn | spring friction 5 | Gecikmeli takip, aşma %15 |
| Etrafa bakma | 1.8 sn | spring | Önce gözler (30 ms), sonra baş, sonra gövde (anticipation) |
| Esneme | 3 sn | out-quad / sine | Hazırlık (çökme 120 ms) → yüksel → ağız "wow" → bırak |
| Yudumlama | 3.2 sn | sine | Kupa kola yaklaşır, göz kısılır, küçük "ahh" nefesi + buhar yoğunlaşır |
| Tüy toplama (groom) | 2.4 sn | spring | Baş yana, hızlı küçük sallanmalar |
| Zıplama (kutlama) | 1.1 sn | out/in quad | Çömelme → 2 zıplama → yere inince ezilme → yerleşme |
| Dokunma tepkisi | 0.6 sn | spring friction 3 | Anında ezilme, sonra uzama, "wow/cheer" mimiği |
| Uyuklama | 8 sn döngü | sine | Baş yavaşça düşer, bir an silkelenir (mikro uyanma) |
| Uyku | sürekli | sine | Yavaş derin nefes, balon (burun), z'ler farklı hızlarda |

### 4.2 Oda (derinlik ve ışık)
- **Pencere ışığı:** gerçek eğik huzme: parçalı yapı (pencere kafesine göre 3 şerit), yumuşak kenar (gradient resmi), yerde pencere şeklinde **ışık lekesi** (parallelogram), gün içinde saate göre **gerçekten yer değiştirir** (sabah uzun ve turuncu, öğle kısa ve beyaz, akşam uzun ve kızıl). Toz zerreleri sadece huzmenin içinde parlar. Bulut gölgesi şeritleri sırayla söner.
- **Lamba:** halenin dışına ikinci geniş sıcak halka, hafif renk sıcaklığı oynaması (3 sn), dokununca "tık" + 120 ms parlama ve oda loşluğunun yumuşak geçişi (500 ms).
- **Sürahi/kupa:** buhar tek eleman değil **3 katman** (ince çizgi, orta kıvrım, sönük duman) farklı hız ve bulanıklıkta; çevresinde yıldız ışıltıları: gerçek **4 köşeli parlama** (kare + dönüş + ölçek: 0 → 1.2 → 0, 600 ms, her biri farklı aralık).
- **Pencere dışı:** gündüz bulut kayması, kuş silüeti (45 sn'de bir), gece yıldız ve ara sıra kayan yıldız; hava durumu (yağmur) damlaları cama değip kayar.
- **Bitkiler:** rüzgâr "dalgası": üç bitki aynı dalgayı gecikmeli yakalar.
- **Perde/ışık zinciri:** sallanma + zincir ampullerinde dalga şeklinde yanma.
- **Paralaks:** 4 derinlik katmanı (cam dışı, duvar, mobilya, ön plan toz/bitki); eğim varsa gerçek, yoksa yavaş süzülme. Moka ve gölge farklı oranda.
- **Zaman döngüsü:** saat başı gündüz-gece karışımı zaten var; gün batımı için 20 dk'lık turuncu geçiş eklenir.

### 4.3 Olay tepkileri (kutlama dizisi)
Sıra (toplam 2.6 sn): ışık parlar (0 ms) → Moka çömelir (100) → zıplama 1 (300) → kalpler/konfeti yükselir (350-1800) → zıplama 2 (650) → sürahi parıltısı (700) → kupa buharı artar (900) → Moka "cheer" yüzü (kapanış). Konfeti: 12 parça, 3 şekil, rastgele dönüş, yerçekimi eğrisi; kalpler sinüs dalgası.

## 5. Performans bütçesi
- Aynı anda en fazla ~60 `Animated.Value`; hepsi `useNativeDriver: true` (transform + opacity). Layout animasyonu yok.
- JS tarafı: durum makinesi 1 zamanlayıcı; `setState` sadece durum değişince (saniyede ≤ 2).
- Hedef: orta seviye Android emülatörde 55+ FPS. Ölçüm: React Native Perf Monitor, 60 sn.
- Odak dışında ve arka planda tüm döngüler durur (`useActive`). Hareketi azalt: durum makinesi sadece `idle` ve nefes; kutlama sadece mimik değişimi.
- Pil: parçacık sayısı düşük cihazda yarıya iner (`PixelRatio` ve ilk 3 sn kare süresi ölçümü ile).

## 6. Görsel ihtiyaç (Melih üretebilir)
Plan kod tarafında görselsiz çalışır, ama kaliteyi asıl bunlar yükseltir:
1. **Moka parçaları (en önemlisi):** aynı çizimde ayrı PNG: baş (yüzsüz), gövde, kuyruk, iki kulak/tüy tutamı, kupa tutan kol. Aynı tuval ve konum (800×800), saydam. Mevcut oturan poz için.
2. **Işık huzmesi:** pencereden zemine uzanan tek eğik ışık şeridi, saydam PNG, yumuşak kenarlı (gündüz sıcak) + ışık lekesi (parallelogram).
3. **Parlama:** 4 köşeli yıldız ışıltı sprite'ı (tek, 128×128).
4. **Konfeti/kalp:** 3 şekil sprite (isteğe bağlı; emoji ile de olur).
5. **Uyku pozu** (var olan plandaki öncelikli poz).
İstem metinleri `docs/moka-oda-son-plan.md` sec. 13 biçiminde yazılabilir; onay verirsen hazırlarım.

## 7. Fazlar ve tahminler
| Faz | İş | Süre |
|---|---|---|
| A | `MokaBrain` durum makinesi + zaman çizelgesi altyapısı, mevcut hareketlerin taşınması | 0.5 gün |
| B | Moka hareket kalitesi: anticipation/overshoot/follow-through, mikro hareketler (görselsiz, tüm gövde) | 0.5 gün |
| C | Oda ışığı: gerçek huzme + ışık lekesi + saate göre kayma, toz sadece huzmede, bulut gölgesi | 0.5 gün |
| D | Parlama sprite'ı, 3 katmanlı buhar, kutlama dizisi (konfeti + kalp), tepkiler | 0.5 gün |
| E | Paralaks 4 katman + pencere dışı (bulut, kuş, kayan yıldız) | 0.5 gün |
| F | Parçalı Moka (görsel gelince): baş/kuyruk/kulak/kol ayrı hareket | 1 gün (görsel hazırsa) |
| G | Performans ölçümü, ayar, hareketi azalt testi | 0.5 gün |
Toplam: görselsiz A-E+G ~2.5 gün; F görsele bağlı.

## 8. Açık sorular (Melih)
1. Moka parçalarını (sec. 6.1) ChatGPT/Gemini'den üretir misin? Yoksa tek resimle (A-E) devam mı?
2. Kutlama daha abartılı mı (konfeti, ses) yoksa sakin mi (kalp, ışık)? Ses var mı (`sfx('done')` zaten var)?
3. Moka bazen odadan kısa süre ayrılsın mı (pencereye gitsin)? Bu tamamen farklı poz ister; öneri: hayır.
4. Uyuma kuralı: 40 sn dokunulmazsa uyuklama, 2 dk'da uyku; çok mu agresif?
5. Gün batımı turuncu geçişi ve kuş/kayan yıldız kalsın mı, çıkarılsın mı?
6. Test: ilk tur için emülatörde ekran videosu/gif ile kıyaslama istiyor musun?
