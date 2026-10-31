# Finch tarzı görsel yenileme: öneri

Hedef: kadın kullanıcıya en çok hitap eden, görselliğiyle konuşulan, "kendine bakım" hissi veren Homezy. Finch'ten alınan fikir: uygulama bir görev listesi değil, birlikte büyüdüğün bir arkadaş (Moka) ve bir yuva. Mevcut kimlik (Moka, Baloo 2 + Nunito, Cozy, açık/koyu tema) korunur; üstüne pastel sıcaklık, cam yüzey ve kişiselleştirme eklenir.

## 1. Mevcut durum (integration/tum-pr)

- `src/theme/index.ts`: adaçayı zemin (`#F0F4EE`), lacivert yazı/duvar, kil/kahve vurgu. Temiz ama soğuk ve "ofis". Rozet ve duvarlar lacivert, sert kontrast.
- Zaten var: `Glass` (blur kart), `MokaMascot` (poz + balon), `Float/Squish/Burst`, `MoodCheckin`, `WeekCard` (paylaşılabilir), `Outfits` (haftalık kombin, Moka kıyafeti değil), `House3D` + `HouseTheme` (gunduz/gece/kis/sonbahar), sahneler (`assets/scenes`).
- Eksik: sıcak pastel palet, Moka aksesuarı/kıyafeti, ev dekor teması seçimi, destekleyici (cezalandırmayan) metinler, öz bakım rutinleri, mağaza ekran görüntüsü stili.

Ekran notları:
- **Ev**: sahne + Moka kartı iyi; kartlar düz beyaz, gölge sert. Cam kart ve sıcak degrade zemin eklenmeli.
- **Odalar**: resimli kartlar var; oda renkleri soluk pastel, pembe-şeftali yok.
- **Bugün**: gecikmiş = kırmızı baskı hissi. Gecikme "nazik hatırlatma"ya dönmeli.
- **Bahçe**: bitki sahneleri güzel; ödül/büyüme dili daha sıcak olabilir.
- **Ev (3D)**: zaten en güçlü görsel; tema seçimi (dekor) buraya bağlanır.
- **Hesap/Profil**: seviye + başarımlar; Moka gardırobu ve tema seçici için doğal yer.
- **Tanıtım/kurulum**: Moka karşılama var; ilk 30 sn'de isim, ruh hali, "evini nasıl hissettirmek istersin" (tema) sorulabilir.
- **Premium**: kilit/paywall dili "sınır" gibi; "Moka'ya daha fazlasını ver" gibi hediye diline çevrilebilir.

## 2. Palet (pastel sıcak)

Yeni token seti; mevcut anahtar adları korunur, değerler değişir (kırılma yok).

| Rol | Açık | Koyu | Not |
|---|---|---|---|
| bg (krem) | `#FBF4EA` | `#2B2A35` | degrade: krem → şeftali tozu |
| surface | `#FFFBF5` | `#37364A` | kart zemini |
| surface2 | `#F6E6DA` | `#44425A` | ikincil |
| peach (yeni) | `#F7C9B0` | `#B98672` | sıcak vurgu, "bugün" |
| sage (yeni) | `#BFD8C4` | `#6E8F78` | tamam / sağlıklı |
| lavender (yeni) | `#D9CDEB` | `#8F82B5` | öz bakım, gece, premium |
| rose (yeni) | `#F2C6CF` | `#B5798A` | sevgi, seri, kalp |
| ink | `#3B3345` (sıcak eflatun-kahve) | `#FBF4EA` | lacivert yerine yumuşak |
| accent | `#7F9C86` (adaçayı koyu) | `#BFD8C4` | ana buton |
| late | `#C97B72` | `#E8A199` | daha yumuşak, kırmızı değil mercan |

Marka lacivert/mint yalnızca logo ve mağaza ikonunda kalır. Oda renkleri (`room`) pastel set ile yeniden dağıtılır (şeftali, adaçayı, lavanta, gül, bulut mavisi).

Biçim: köşe 26-30, çok yumuşak renkli gölge (siyah değil, kartın tonunda), 1px beyaz iç parıltı, buton hap + hafif degrade.

## 3. Yüzeyler ve hareket

- **Cam kart** (`Glass`): Ev üstü özet, Moka kartı, ödül/başarım, paylaşım kartı. Blur modülü yoksa düz yarı saydam (zaten korumalı).
- **Degrade zemin**: ekran arkasında çok hafif krem→şeftali (gündüz), eflatun→lacivert (gece). Tema ile değişir.
- **Mikro-etkileşim**: `Squish` tüm butonlarda, `Burst` yalnızca anlamlı anlarda, Moka göz kırpma/uyku döngüsü (hareketi azalt açıksa durur).

## 4. Moka tepkileri ve selamlar (ekran başına)

- **Ev**: saate göre selam. Sabah "Günaydın {ad}, bugün kendine de bir iyilik yapalım mı?", akşam "Bugün yeterince iyiydin."
- **Bugün**: liste boşsa Moka kahve içer ("Bugün sakin. Dinlen."). Çok iş varsa "Hepsi şart değil, birini seç."
- **Odalar**: oda açılınca o odaya göre poz (mutfakta şef, yatakta battaniye).
- **Bahçe**: sulayınca mutlu ıslık, bitki kuruyorsa üzgün değil "su bekliyor" tonu.
- **Ev (3D)**: Moka gezer, ışık saate göre; dokununca tek cümlelik sevgi.
- **Hesap**: seviye atlayınca Moka'ya yeni aksesuar hediyesi.
- **Paywall**: Moka hediye kutusuyla.

## 5. Destekleyici dil (cezalandırmayan)

- Seri bozulursa: "Seri kırıldı" yerine "Dinlenme günü de bakımın parçası. Yarın kaldığın yerden devam." Seri dondurma düğmesi öne çıkar, yeni seri "yeniden başlat" yerine "geri dön" etiketi.
- Gecikme: "Gecikti" → "Seni bekliyor". Üç günden uzun gecikmede sayı yerine "Bugün sadece birini yapsak yeter mi?".
- Ünlem yok, emir yok ("yap" → "istersen"). Hata/boşluk metinleri Moka ağzından.
- Haftalık özet: eksikleri değil yapılanı öne çıkar ("Bu hafta evine 14 iyilik yaptın").
- Kopya rehberi tek dosyada (`src/i18n`) tutulur, ton kuralı: sıcak, kısa, suçlamasız.

## 6. Öz bakım açısı

- Her gün isteğe bağlı "sana bir şey" kartı: su iç, 5 dk nefes, yüz bakımı, kitap. Rutin altyapısıyla aynı (yeni oda türü yok, "Kendim" listesi).
- Ruh hali check-in (`MoodCheckin` var): sabah ilk açılışta tek dokunuş; ruh hâline göre Moka ve iş önerisi ("Yorgunsun, sadece 10 dk'lık işler.") — mevcut "Ne kadar vaktin var?" ile bağlanır.
- Gece kapanış: "Bugün iyi bir şey" tek satır günlük (günlük ekranı var).

## 7. Kişiselleştirme

- **Moka gardırobu**: aksesuarlar (atkı, şapka, gözlük, çiçek tacı, fular), kıyafet setleri. Seviye/başarımla açılır, Premium'a özel birkaçı. Veri: `AppState.moka = { equipped: {...}, owned: [...] }`. Görsel: Moka sticker/sahne kaynakları üzerine katman (`MokaMascot` katman desteği; yeni resim üretimi gerekebilir, `docs/sahneler.md`).
- **Ev dekor/renk temaları**: `HouseTheme` genişler: Cottagecore (çiçek, ahşap), Minimal (beyaz-bej), Kış kulübesi (kar, şömine), Lavanta gecesi, Sakura. Her tema = palet kayması + 3D ev malzemeleri + ana ekran sahne seti. Bazıları ücretsiz, bazıları Premium.
- **Uygulama vurgu rengi seçici**: şeftali / adaçayı / lavanta / gül (4 hazır set; token seti anahtar değiştirir).
- İsim ve Moka'ya takma ad.

## 8. Paylaşılabilir haftalık ev kartı

`WeekCard` temelinde: pastel zemin, cam kart, Moka'nın o haftaki kıyafeti, 3D ev anlık görüntüsü, "Bu hafta 14 iyilik" metni, ruh hali ortalaması (emoji), sakin imza "homezy". Hikaye boyutu (9:16) ve kare (1:1) iki çıktı; filigran küçük, kapatılabilir (Premium). Paylaş düğmesi hafta sonu özetinde ve Pazar 19:00 bildiriminde.

## 9. Mağaza ekran görüntüleri

6 ekran, pastel degrade zemin, büyük Baloo 2 başlık (Türkçe), telefon çerçevesi cam, Moka yanda:
1. "Evin senin gibi sıcak" (3D ev)
2. "Moka her gün yanında" (Bugün)
3. "Küçük işler, büyük huzur" (rutinler + seri)
4. "Gardırobun cebinde" (dolap/kombin)
5. "Ruhuna da bak" (ruh hali + öz bakım)
6. "Evini kendine göre süsle" (temalar + Moka kıyafeti)

Mevcut `scripts/generate-store-listing.py` ve `assets/store-listing/` bu stile uyarlanır.

## 10. Öncelikli, küçük adımlar

Her adım ayrı commit, `npm run typecheck` + `lint`, `integration/tum-pr`'a doğrudan push.

1. **Tema tokenları** (`src/theme`): yeni pastel palet (açık+koyu), yeni anahtarlar `peach/sage/lavender/rose`, radius/gölge güncelleme. Çok küçük risk; tüm uygulama yeni tonu alır.
2. **Ortak bileşenler** (`ui.tsx`, `Glass`, `TaskRow`, `TabBar`): degrade zemin, sıcak gölge, yumuşak rozetler, "Seni bekliyor" gecikme stili, buton hap degrade.
3. **Destekleyici metin geçişi**: gecikme/seri/boş durum metinleri, Moka selamları (saate göre).
4. **Ev + Bugün ekranları**: cam Moka kartı, günlük "sana bir şey" kartı, boş durum Moka.
5. **Ruh hali bağlantısı**: ilk açılış check-in, ruh hâline göre iş filtresi/öneri.
6. **Ev dekor temaları** (palet + 3D malzeme, 3 tema ile başla: Cottagecore, Minimal, Kış kulübesi) + vurgu rengi seçici.
7. **Moka gardırobu** (aksesuar katmanı, hesap ekranında seçici, seviye ile açılma). Yeni resim varlığı gerekir.
8. **Haftalık paylaşım kartı** yenileme (9:16 + 1:1).
9. **Onboarding + paywall** pastel/hediye dili.
10. **Mağaza ekran görüntüleri**.

Yerel modül: 1-6, 8-10 hepsi JS/TS; yeni derleme gerekmez. 7 için yeni modül gerekmez (resim katmanı). Paylaşım kartı resim kaydı için `expo-sharing`/`react-native-view-shot` zaten varsa yeni modül yok; yeni modül eklenirse `requireOptionalNativeModule` ile korunur ve ayrıca bildirilir.

## 11. Riskler

- Koyu tema pastel değerleri ayrı ayarlanmalı (kontrast, AA).
- Eski lacivert zeminli sahne resimleri yeni krem zeminle çatışabilir; sahneler gerekirse hafif ton kaydırma ile uyumlanır.
- Premium temalar için RevenueCat yetkisi (`premium`) kullanılır, yeni ürün gerekmez.
