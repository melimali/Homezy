# 3D ev: geliştirme planı (2026-11-23)

Sadece plan; kod değişmedi. Kaynak: `src/components/House3D.tsx` (2513 satır, 60e0c2e), `HouseFloors.tsx`, `HouseGarden.tsx`, `MokaPet.tsx`, `src/domain/{play,look,garden,items,itemRecipes,ev3dArt}.ts`, `src/lib/weather.ts`, `src/hooks/useTilt.ts`. Görsel üretim ayrıntısı zaten `docs/3d-ev-gorsel-gelistirme.md`'de; burada tekrarlanmıyor. Moka odası kapsam dışı (GPT çalışıyor).

## 0. Şu anki durum (özet)

- Ev tek SVG, izometrik 2:1, `react-native-svg`. 3D kütüphanesi yok. Artık WebP sprite/doku var (`assets/ev3d`, 576 KB: ağaç, bulut, kuş, güneş/ay, duman, mobilya, kapı, pencere, doku). `EV3D_ART` yoksa eski çokgen çizim yedekte.
- Seviye 0-100 (`STAGES`): 1-7 inşaat, 9+ bahçe süsleri. Boş gün olursa sadece **hafif toz** (`idle` en fazla 1). Çatlak/çökme **yok**, seviye düşmez. Bu bilinçli yumuşak karar; "çökme" planına dönüş gerekiyorsa Melih onaylamalı (bkz. 5).
- Hava: `useSky` Open-Meteo + konum (`expo-location`, `requireOptionalNativeModule('ExpoLocation')` ile korumalı). Saat bazlı yedek var. Gün evresi tek kaynaktan: `dayPhase()`.
- Eğim: `useTilt` (expo-sensors, korumalı) sadece oda sahnesinde. Ev dönüşü için altyapı var (`projectionAngle`) ama `angle = 0` sabit.
- Hareketi azalt: `AccessibilityInfo` + `useActive` (ekran odakta değilse döngüler durur). Güzel.
- Test: House3D için otomatik test **yok**. Önizleme için bellekteki Node+Playwright yöntemi var (`house3d-preview`).

## 0.1 Dalga 1 ilerleme (2026-11-23)

- Yapıldı: oda mobilyaları ve mağaza eşyaları SVG (sprite yok), `Orient` ile 4 duvara dönebilir (arka duvarlar öncelikli); tek ay/güneş; ağaçlar sadece arka kenarda, ayak izi dışında, gölgesiz.
- Sırada: P0 ölçüm, `placeProp()` birim test, erişilebilirlik özeti.

## 1. Hedef ve ilkeler

Melih'in kalıcı tercihleri (gün içinde gözü yormayan, sakin, cozy):
1. Göz yormasın: tüm ev sallanmaz, odada tek yumuşak ışık, yavaş yıldız.
2. Eşyalar duvara yaslı, kapı önü boş, etiketin arkasında.
3. Gökyüzü gerçek saate/hava durumuna uyar; uygulamanın koyu teması geceyi **zorlamaz**.
4. Tek temiz beşik çatı; zemin gölgesi yok; tek ay/güneş.
5. Yeni native modül gerekiyorsa `requireOptionalNativeModule` ile koru, yoksa sessizce yedeğe düş, Melih'e "yeni derleme lazım" de.

Kalite çıtası: orta seviye Android'de ana ekranda 50+ fps hissi, tam ekran pinch'te takılma yok, her şey 6 / 9 / 12 oda planında ve 1-2 katta aynı güzellikte.

## 2. Görsel estetik

| # | İş | Not | Boyut |
|---|---|---|---|
| G1 | **Tek ay / tek güneş denetimi**: gökyüzünde hem `SkyBackdrop` gün/ay dairesi hem `ambient()` içindeki `spr('sunmoon')` sprite'ı çiziliyor (satır ~1070 ve 955-1012). Aynı anda iki gök cismi görünmemeli. Tek kaynak seç (sprite varsa sprite, yoksa daire). Ay evresi saate göre sabit "hilal" yeter | S (0,5 gün) |
| G2 | **Eşya yerleşim kuralı sağlamlaştırma**: duvara yaslama şimdi `wallRank` ile skor; sprite için `wall` parametresi (0/1/2) var ama sadece 0.2 / 0.5 kayması. Eksikler: köşe odaları, tek bloklu odalar, 2 katta üst-alt kat çakışması, `turn` ile döndürülen eşyalar. Kural: (1) kapı bloğu yok, (2) duvara dayalı, (3) yüzü odanın içine, (4) etiket kutusuyla çakışmaz. Çakışırsa bir sonraki en iyi blok. Kural tek fonksiyona (`placeProp()`) çıksın, birim testle sınansın | M (1,5-2 gün) |
| G3 | **Ağaç / zemin**: ağaçlar dış halkalarda %11 olasılıkla ve rastgele (`rnd()`); tohum evin kimliğine bağlı olmalı ki yeniden çizimde yer değiştirmesin (kontrol et). Ev ayak izine ve kapı yoluna yaklaşmasın; ağaç arkadan öne sıralı. Mevsime göre ağaç (kış: karlı/çıplak, sonbahar: turuncu) sprite'ı eksik; `agac_yuvarlak` her mevsimde aynı. Çim dokusu halkalar arasında hafif tonlu, kenarda yumuşak solma | M (2 gün + 3-4 yeni görsel Melih'ten) |
| G4 | **Gölgesiz tutarlılık**: yer gölgesi kaldırıldı, ama ağaç altında küçük elips gölge ve mobilya sprite'larının altında hâlâ yumuşak gölge olabilir. Tek kural: ya her yerde var ya hiçbir yerde yok. Öneri: sadece **sprite temas gölgesi** (çok hafif, 0,10 saydamlık), evin kendisinde yok | S (0,5 gün) |
| G5 | **Cephe ve çatı ayrıntısı**: baca sprite'ı (`ev_baca`), pencere gece sürümü, kapı. Pencere dizilimi bugün "aralıklı, 0,35 yükseklik"; büyük pencere ve düzgün aralık tercihi korunsun. Duvar/çatı Pattern dokuları (A1-A4) hangi cihazlarda kasıyor ölçülmeli (bkz. 4) | M |
| G6 | **Üst kat dış görünüşü**: balkon korkuluğu, çatı kenarı, merdiven ayrıntısı (D2, görsel eksik) | M |
| G7 | **Tam kullanılmayan temalar** (gece, kış, sonbahar): premium tema önizlemesi için tek ekran karşılaştırma görüntüsü; renk uyumu kontrolü, koyu temada sprite kontrastı | S |

## 3. Animasyon

Mevcut: Drift (bulut), Roamer (Moka, kedi, köpek), Burst (seviye), nefes/yıldız parıltısı, bahar yaprağı/kar. Plan:

- **A1 Tek zaman kaynağı**: şu an `useNow` + birçok `Animated.loop` bağımsız. Hepsi native driver; iyi. Eklerken kural: yeni sürekli animasyon **en fazla 3** eşzamanlı (bulut, duman, Moka) + hava parçacıkları.
- **A2 Kuş**: `kus_1..3` 3 kareli kanat döngüsü, yalnız gündüz ve açık havada, ekranda aynı anda 1-2 kuş, bazen hiç. Ekran dışına çıkınca durur.
- **A3 Duman**: baca sprite'ı + `duman_1..3` yavaş yükselip solar, sadece soğuk/kış/akşam.
- **A4 Pencere ışığı gece**: pencere gece sprite'ına yumuşak geçiş (gün batımında 20 sn crossfade), tek ışık kuralı (oda başına tek yumuşak parıltı) korunur.
- **A5 Moka rutini**: Moka yürür/oturur/uyur (`MokaPet`). Ekle: gün saatine göre rutin (sabah kahve köşesi, öğlen koltuk, gece yatak odası), iş bitince odasına koşup zıplama (Burst ile birlikte), uzun süre boşta ise uyuyor. Moka sadece gündüz uyanık (son commit bunu ekledi, ev tarafı da uyumlu olmalı).
- **A6 Seviye atlama**: mevcut Burst + `sproutScale`. Eklenecek: yeni eşya belirmesi için "pop" (0,35 sn yay), kamera yeni eşyaya 1 sn kayıp geri döner, haptic (`ExpoHaptics` koruması zaten var).
- **A7 Kat geçişi** (`HouseFloors`): kayma animasyonu var; aynı kolay-in-out eğrisi ve süre (320-400 ms) tüm geçişlerde.
- **A8 "Hareketi azalt" ve arka plana alma**: tüm yeni animasyonlar `reduce` bayrağına bağlansın; reduce açıkken kuş/duman/Moka yürüyüşü **durağan sahne** olur (yok olmaz).

Boyut: A2+A3+A4 M (2 gün), A5 M (2 gün), A6 S (1 gün), A8 sürekli kural.

## 4. Performans

Ölçülmeden iş yapılmaz. Önce ölçüm, sonra optimizasyon.

- **P0 Ölçüm** (S, 1 gün): `__DEV__` sayaçları: SVG düğüm sayısı (şu an kaynakta ~176 çizim ifadesi, ama blok × oda × halka ile binlerce düğüm olur), render süresi, `House3DInner` yeniden render sayısı. 6×8, 10×12 ve 2 katlı büyük planda, orta seviye Android'de ölç; bütçe: ilk çizim < 250 ms, ana ekranda sürekli yeniden render yok.
- **P1** `sameProps` (memo) zaten var; `state` nesnesi her `update()`'te yeni olduğundan memo çoğu zaman boşa düşer olabilir. Evin çizimine giren alanlardan (hücreler, odalar, eşyalar, seviye, tema, gün) bir **imza (hash)** üretip yalnız imza değişince yeniden çiz.
- **P2** Statik katmanı (zemin, duvarlar, halkalar) `useMemo` ile ayır; animasyonlu katman (bulut, Moka, parçacık) ayrı `Animated.View`. Böylece her saat tiki (`useNow`) tüm SVG'yi yeniden kurmaz.
- **P3** Zoom çıkınca 5 halka çiziliyor (`buildGroundRings`): her halka kaç düğüm? Uzak halkalara ağaç/çiçek sayısını azalt (LOD). Pinch sırasında ağır katmanları (ağaç, parçacık) gizle, bırakınca geri getir.
- **P4** Dokular `Pattern` ile çokgen başına: çok çokgende pahalı olabilir. Seçenek: duvar/zemin için tek büyük pattern fill + clipPath, ya da düşük seviyeli cihazda düz renk (`reduce` benzeri "hafif mod").
- **P5** Hafif mod: eski/yavaş cihazlarda (kare süresi ölçümü ya da kullanıcı ayarı) parçacık/kuş/duman kapanır; ayar `Ayarlar → Hareket` altında. 
- **P6** Bellek: WebP'ler 576 KB, sorun değil; sprite `Image`'lar `SvgImage` ile; çok sayıda aynı sprite (ağaç) tek `Defs`+`Use` ile tekrar kullanılabilir mi dene.
- **P7** Dosya yapısı: House3D 2513 satır, tek dosya. Böl: `house/geometry.ts` (P, box, shade), `house/furniture.tsx`, `house/garden.tsx`, `house/sky.tsx`, `house/roamer.tsx`, `House3D.tsx` (birleştirme). Davranış değişmez; önce snapshot/önizleme eşitliği doğrula. (L, 3 gün; riskli, G2/P1'den **sonra**.)

## 5. Puan → ev ilişkisi

Bugünkü akış: görev → puan (`taskPoints`, günlük üst sınır) → mağazadan eşya (`ITEMS`, `itemRecipes.ts`) → `itemAt[i]` ile odaya konur. Seri → ev seviyesi (`houseProgress`): her aktif gün +1, 100'e kadar. Boşluk → `idle=1` (toz), geri gelince "Ev toparlanıyor" ve Burst.

Öneriler:
- **E1 Görev → ev geri bildirimi (en büyük etki)**: bir iş tamamlanınca ev sahnesinde **o odada** küçük ışık/yıldız belirsin (`DoneCelebration` yerine ya da yanında), ev tabında dönünce odanın temizlik yüzdesi 0,6 sn'de dolsun. Odanın `roomClean()` değerine göre zemin temizliği (şimdi `DUSTY` karışımı, var) sürekli akışlı. S-M.
- **E2 Puan harcama → eşya anı**: satın alınca ev açılsın, eşya yerine "pop" ile belirsin, Moka eşyaya gitsin (kedi/köpek hariç, Moka 2 sn bakar). Eşyayı yerleştirme modu (`placing`) zaten var; satın alma sonrası "Yerleştir" kısayolu. M.
- **E3 Toz ve "çökme"**: kodda çökme/çatlak yok ve bu bilinçli yumuşaklık (ceza yok). Öneri: **çökme ekleme**. Onun yerine kademeli "uyuyan ev": 1 gün sonra hafif toz, 3+ gün sonra perdeler kapanır, ışık söner, Moka uyur; dönüşte "uyandı" animasyonu + toz silinir (mevcut Burst). Ceza hissi yok, ama özlem hissi var. Onay: Melih. S-M.
- **E4 Seri koruması (dondurma, af)** evde görünsün: dondurma kullanılan gün pencereye minik buz/kristal, af günü "yamalı" cam. S.
- **E5 Odaya özel görünüm**: oda temizlik yüzdesi %90+ ise o odanın penceresi sıcak yansın; %30 altı ise o odada toz. Mantık `roomClean()` ile var, sadece eşikler netleşsin. S.
- **E6 Puan ekonomisi dengesi**: fiyat 30-250 arası, günlük tavan ve `taskPoints` kademesi var. Tur: ilk hafta "alınabilir ilk eşya" 2. günde, ilk pahalı hedef ~3 hafta (`docs/premium-retention-plan.md` ile uyumlu). Tek tabloya dök ve `points.test.ts`'e ekle. S.
- **E7 Kozmetik/Premium eşyalar** (`premium: true`, 👑): Premium dışında kilitli gösterim; ev tarafında değişiklik gerekmiyor.

## 6. Etkileşim

- **I1 Pinch/pan** (`pinchZoom`): sınır (ev ekrandan tamamen çıkmasın), çift dokunuş = sığdır, bırakınca yumuşak geri yaylanma. Dokunma alanı: oda etiketi minimum 44 pt.
- **I2 Oda yakınlaşma** (`roomZoom`, `focusRoom`): dokununca odaya kayma var; eklenecek: yatay kaydırma ile komşu odaya geç (sol/sağ), uzun basınca oda adı + bekleyen iş sayısı balonu.
- **I3 Eşya dokunma**: eşyaya dokununca küçük tepki (Moka bakar, eşya zıplar) + isim balonu; `onPickCell` düzenleme modunda zaten var. Eşya **döndürme** (`turn`) ve sürükle-bırak taşıma (faz 2 listesinde: `house-builder.md`) → M-L.
- **I4 Ev dönüşü** (`projectionAngle`): altyapı var (`angle = 0`). 4 sabit açı (0/90/180/270) ile "Döndür" düğmesi; arka duvarlar ön olunca alçalmalı, etiket/mobilya duvar kuralı (G2) her açıda sınanmalı. Riskli, M-L (3-4 gün). Önce G2 + testler.
- **I5 Kat ok düğmeleri** (`HouseFloors`): erişilebilirlik etiketi, kat sayısı göstergesi (1/2).
- **I6 Sesler**: `sfx` zaten var (`levelup`); eşya yerleşimi, kapı, kuş için çok kısa sesler **sadece açıksa**; Lofi çalar için gerçek ses dosyası yok (ayrı iş).
- **I7 Yatay/dik ekran**: tam ekran ev görünümü dönünce ölçü bozulmasın (`onLayout` ile var, test et).

## 7. Bahçe

Mevcut: `/bahce` ekranı, 16 çiçek, albüm → evin yanında saksılar, süs (sulama, uğur böceği evi, hamak, sera), `gardenParts()` evin etrafında (çim halkaları, çit, havuz, kemer, çeşme, ağaç, kuş evi); `STAGES` ile 9+ seviye bahçe.

- **B1 İki ayrı bahçe karışıklığı**: seviye bahçesi (çim, çit, çeşme, …) ile `Garden` (çiçek tarhı, albüm) farklı kaynak. Tek kural: seviye = **zemin ve yapı** (çim, çit, yol, gölet), `Garden` = **canlı bitkiler**. Çakışma (aynı karede çiçek ve çit) önleyen yerleşim haritası (`gardenSlots`) tek yerde.
- **B2 Mevsim**: bitki ve ağaç sprite'ları mevsime göre (kış çıplak/karlı, sonbahar turuncu, ilkbahar çiçekli). Tema (`kis`, `sonbahar`) var, bahçe elemanları tam eşleşmiyor → G3 ile birlikte.
- **B3 Bahçe → ev bağı**: çiçek açınca evin penceresinde/kapısında küçük saksı belirsin (zaten "albüm → saksı" var; kapı önü saksıları seviye 24'te). Sınırı belirle: en çok 6 saksı, kapı önünü kapatma.
- **B4 Sulama**: bahçe bakım işi yapılınca (sulama) ev sahnesinde kısa yağmur damlası animasyonu, Moka sulama kovasıyla.
- **B5 Bahçe tam ekranı**: `GardenScene` ile 3D ev bahçesi **aynı** çizim kaynağından beslensin (iki ayrı çizim farklı görünmesin). Kontrol et, ayrışıyorsa tek sprite haritası.
- **B6 Bahçe başarım ve rozet**: ilk çiçek, 10 çiçek albüm, mevsim çiçeği → rozet (bkz. 8).

## 8. Hava ve gökyüzü

- **W1** `dayPhase()` tek kaynak olarak kalsın; uygulamanın koyu teması geceyi zorlamıyor (korunur). Test: 05:30, 08:00, 13:00, 19:30, 23:00.
- **W2 Gün doğumu/batımı**: Open-Meteo'dan `sunrise`/`sunset` iste (aynı istek, ek ağ yok); evreyi gerçek güneş saatlerine bağla (yazın 21:00'de hâlâ gündüz). `fetchSky()` yanıtına eklenir, önbellek 30 dk. S.
- **W3 Sıcaklık ve rüzgâr**: rüzgâra göre bulut hızı, soğukta baca dumanı (zaten kış/akşam). Ek istek alanı: `temperature_2m,wind_speed_10m`. S.
- **W4 Yağmur/kar**: `yagmur_damla`, `kar_tanesi` sprite'ları iki katman; yağmurda pencere cam parlaması, kapı önü ıslak zemin (hafif koyu ton). Parçacık sayısı hafif modda yarıya. M.
- **W5 Konum izni**: reddedilince `denied=true` ve saat yedeği; izin kutusu `permissionBusy()` ile açık pencereyle çakışmaz (iOS donma notu korunur). Ayarlarda "Gerçek hava durumu" anahtarı ve açıklama metni (gizlilik: kaba konum, 2 ondalık, sunucuya kaydedilmez).
- **W6 Native**: `expo-location` modülü **yeni derleme** gerektirir (Melih'in listesinde bekliyor: `npx.cmd expo run:android` C:\w'de). Modül yoksa mevcut kod sessizce saate düşer. Yeni modül yok.
- **W7 Mevsim kaynağı**: tema (`gunduz/gece/kis/sonbahar`) elle seçiliyor. Öneri: "Otomatik" seçeneği: ay + konuma göre mevsim (kuzey yarım küre, Türkiye varsayılan). S.

## 9. Rozet ve seviye büyümesi

35 rozet, 3 kademe + açılış penceresi var (`c8e20fc`, `achievements.ts`). Seviye 1-7 inşaat, sonra bahçe, 37 altın yıldız, 100 rüya bahçe.

- **L1 Seviye 7 sonrası ev büyümesi**: 9-100 arası sadece bahçe süsü. 100 gün uzun; ev gelişimi donmuş hissi verir. Öneri: ara ödüller her ~10 günde bir **evin kendisinde** görünsün: bayrak (7), saksılı çiçeklik (24), altın kupa (50) var; ekle: balkon çiçekliği (14), çatıda güneş paneli/yıldız (60), ışıklı tabela "Moka'nın evi" (80). Her biri tek sprite, M (görsel + kod).
- **L2 Rozet → ev vitrini**: kazanılan rozet evde küçük bir raf/duvar rozet panosu (ön kapı yanı), 3 rozetle başlar, dokununca rozet ekranı. M.
- **L3 Seviye göstergesi**: ev ekranında seviye ve "sonraki aşama" ipucu (kısa, tek satır), `nextStage()` hazır. S.
- **L4 Seviye atlama kutlaması**: mevcut `LevelUpPeek` ile aynı dil; kamera yeni parçaya odaklansın (A6). S.
- **L5 Test için hata ayıklama seviyesi**: `P.debugLevel` var, ayarlarda gizli kaydırıcı olarak kalsın; yayın sürümünde kapalı olduğunu denetle. S.

## 10. Erişilebilirlik

- **Ac1** Ev tek SVG olduğundan ekran okuyucu için **tek anlamlı özet**: "Evin 7 odalı, 2 odada gecikmiş iş var, seviye 23" (`accessibilityLabel` ev kutusunda). Oda etiketleri ayrı `Pressable` + etiket ("Mutfak, 2 bekleyen iş").
- **Ac2** Sıralı gezinme: odaları plan sırasına göre odaklanabilir yap; `accessibilityHint` "Odaya gitmek için çift dokunun".
- **Ac3** Renk körlüğü: gecikmiş (kırmızı) / bugün (sıcak) yalnız renk değil **rakam + simge** ile (bugün zaten sayı var; simge ekle).
- **Ac4** Hareketi azalt: durağan sahne (bkz. A8); pinch yerine `+` / `−` düğmeleri zaten var, ekran okuyucuda kalıcı görünür olsun.
- **Ac5** Dokunma alanı ≥ 44 pt, kontrast (etiket yazısı/zemin) AA; koyu temada ayrı kontrol.
- **Ac6** Yazı ölçeği büyük olunca etiketler taşmasın (`SvgLessText` ile etiket boyu sınırı).
- **Ac7** Titreşim ve ses: kapatılabilir (mevcut ayarlarla bağla).

## 11. Native modül gereksinimi

Yeni native bağımlılık **gerekmiyor**; bu planın hiçbir kalemi yeni paket istemiyor.

| Modül | Durum | Kural |
|---|---|---|
| `expo-location` | Derlemede bekliyor (gerçek hava) | `requireOptionalNativeModule('ExpoLocation')` ile korunuyor (`weather.ts`) |
| `expo-sensors` | Derlemede bekliyor (eğim, `useTilt`) | `requireOptionalNativeModule('ExponentAccelerometer')` |
| `expo-haptics` | Korumalı (`MokaFlap`, `BadgeEarned`) | aynı kural; `sfx.haptic` kontrol et |
| `expo-blur` | Korumalı (`Glass`) | — |
| `expo-audio` (Lofi, ev sesleri) | Dosya yok | Ses eklenirse aynı koruma |

Kural (CLAUDE.md/bellek): yeni native dep eklenirse **önce** `requireOptionalNativeModule('Ad')` kontrolü, `require` try/catch tek başına yetmez (native çökme yakalanmaz). Emülatör yeniden derlemesi gerekirse Melih'e açıkça söyle.
Şu an bekleyen toplu derleme: konum + sensör + yerelleştirme (iOS Info.plist, AR RTL).

## 12. Test planı

1. **Birim (Jest, `src/domain/__tests__`)**: `placeProp()` kuralları (kapı önü, duvara yaslama, köşe, tek blok, 2 kat), `houseProgress` (seri, af, dondurma, `idle`), `dayPhase()` + `sunrise/sunset`, `taskPoints` ve fiyat tablosu, bahçe yerleşim haritası.
2. **Görsel regresyon**: bellekteki Node+Playwright önizleme betiği (`renderToStaticMarkup` + stub'lar) `scripts/preview-house.mjs` olarak depoya girsin; şu planlar için PNG üret: 6×8 standart, tek oda, L şeklinde, 2 katlı, 12×12; seviye 0/3/6/7/24/50/100; gündüz/akşam/gece/kış/sonbahar; yağmur/kar. Değişiklikten önce-sonra karşılaştırma, kabaca elle bakış (piksel eşitlemesi gerekmez).
3. **Cihaz (emülatör, C:\w)**: P0 sayaçları, 1 ve 2 katlı ev, pinch/pan, kat geçişi, odaya girme, arka plana alıp dönme (animasyonlar durup devam ediyor mu), uzun oturum bellek (10 dk).
4. **Hava senaryoları**: konum izni verildi / reddedildi / modül yok (eski derleme) / ağ yok; hava kodları 0, 3, 45, 61, 71, 95 için sahne.
5. **Erişilebilirlik**: TalkBack/VoiceOver ile ev özeti ve oda gezinmesi; "hareketi azalt" açık; yazı %200.
6. **Düşük cihaz**: en eski elimizdeki Android'de hafif mod; kare süresi.
7. **Çoklu dil** (9 dil): oda etiketi, seviye mesajları, hata/yedek metinler taşmıyor mu; AR sağdan sola yerleşim ev planını aynalamasın (plan yönü sabit kalsın, sadece metinler).
8. **Her değişiklikten sonra**: `npx tsc --noEmit` (bulut kapsayıcıda `npm run lint` takılıyor), Melih tarafında `npm run lint`.

## 13. Öncelik sırası ve iş büyüklüğü

Büyüklük: S ≤ 1 gün, M 2-3 gün, L 4+ gün (tek geliştirici).

**Dalga 1: kalite ve güven (önce yap)** ~ 1 hafta
1. P0 ölçüm + `preview-house.mjs` görsel test betiği (S)
2. G1 tek ay/güneş, G4 gölge kuralı (S+S)
3. G2 `placeProp()` + birim testler (M)
4. P1/P2 yeniden çizim azaltma (M)
5. Ac1-Ac3 temel erişilebilirlik (S-M)

**Dalga 2: his ve motivasyon** ~ 1,5 hafta
6. E1 + E2 görev/satın alma → ev geri bildirimi (M)
7. E3 "uyuyan ev" (Melih onayı sonrası) (S-M)
8. A2/A3/A4 kuş, duman, pencere ışığı (M)
9. A5 Moka rutini + A6 yeni eşya anı (M)
10. W2/W3 gerçek gün doğumu-batımı, rüzgâr (S)

**Dalga 3: derinlik** ~ 2 hafta
11. G3/B2 mevsim ağaçları ve bahçe uyumu (M + yeni görseller)
12. B1/B3/B5 bahçe tek yerleşim haritası (M)
13. L1/L2 seviye 7 sonrası ev büyümesi + rozet vitrini (M)
14. P3-P5 LOD ve hafif mod (M)
15. I1-I3 pinch/pan cilası, eşya tepkisi (M)

**Dalga 4: büyük ve riskli**
16. P7 House3D dosyasını bölme (L)
17. I4 ev dönüşü (L)
18. I3 eşya sürükle-taşı + döndür (L)
19. W4 yağmur/kar detayı, W7 otomatik mevsim (M)

## 14. Açık sorular (Melih)

1. **Çökme**: istenmiyorsa (öneri: yok) "uyuyan ev" (E3) yeterli mi?
2. Seviye 7 sonrası için ek ev parçaları (balkon çiçekliği, güneş paneli, tabela) hoşuna gider mi; görselleri sen mi üreteceksin (ChatGPT) yoksa SVG çizimle mi başlayalım?
3. Ev dönüşü (I4) şart mı, yoksa 4 sabit açı yerine tek açı + daha iyi yakınlaşma mı?
4. Hafif mod (P5) ayarı gösterilsin mi, yoksa otomatik mi seçilsin?
5. Ev tabında ses (kuş/kapı) varsayılan kapalı kalsın mı?

## 15. Riskler

- Ölçmeden yapılan optimizasyon boşa gider: P0 şart.
- G2 ve I4 birlikte yapılırsa yerleşim hataları çarpılır: önce G2.
- P7 bölme işlemi diğer dalların (Moka odası, GPT) `House3D.tsx` dokunuşlarıyla çakışabilir: kimse dosyada çalışmazken yap.
- Bellek notu: Moka odası ayrı iş, bu plan ona dokunmaz.
