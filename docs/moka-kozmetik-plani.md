# Moka kozmetik planı: parçalı Moka, katmanlı yüz, giyilebilir eşyalar (2026-11-16)

Plan + kesme prototipi. Uygulama kodu yok. Prototip: `scripts/slice-moka-parts.py`, örnek çıktılar `docs/moka-kozmetik-ornek/` (627 px, önizleme).
Neden eski deneme çirkindi: tek bir sticker'ın üstüne aksesuar bindirilmişti (hiza, perspektif, gölge yok). Çözüm: **aynı tuvalde, çıkarılabilir katmanlar**; eşya baş/gövdeye bağlanır, onlarla birlikte oynar.

## 0. Kısa karar (öneri)

1. ChatGPT'nin verdiği baş + gövde **piksel hizalı çıktı** (ölçtüm, sec. 1). Demek tuval çalışıyor.
2. Kodla kesme **işe yarıyor ama sadece "kolay" parçalarda**: gözler ve kel baş temiz, kanatlar %80 (elle ayar ister). Dolgu gereken yerlerde (kel yüz, kanat altı) ChatGPT'ye bir kez "aynı resim, sadece X'i sil" dedirtmek daha temiz.
3. **Yüz ayrı olsun: evet.** Kel baş + ayrı göz / göz kapağı / ağız / yanak. Mimik için 8 hazır yüzü atıp parça parça yüz kurmak ek iş ama kalite sıçraması burada (kırpma, bakış, ağız hareketi).
4. Eşya yuvaları: baş üstü, yüz (gözlük), boyun (atkı), gövde (kazak), sağ/sol el. Her eşya tek PNG + kendi çapa noktası.
5. Satın alma mevcut puan yolundan (`owned`), kürk gibi (`kurk_<id>`): `eşya_<id>`.

## 1. Hizayı doğrulama (yapıldı, sonuç)

Girdi: `moka-oda/v3/moka_oda_sakin.png`, `moka_govde.png`, `moka_bas.png`, hepsi **1254×1254 RGBA**. (ChatGPT 1024 dedi, 1254 verdi; sorun değil, ama tüm parçalar aynı boyutta olmalı.)

| Bulgu | Sonuç |
|---|---|
| Tuval | Üçü de 1254×1254 → aynı |
| Baş + gövde birleşince tam resimle kıyas | Konum **hizalı** (`onizleme_birlesik.png`, `onizleme_kayik_goz.png`). Kafa kenarı birkaç px farklı çizilmiş (ChatGPT yeniden çizdi), tüy deseni birebir değil. Gözle bakınca fark yok |
| Baş ↔ gövde birleşim | Başın alt yarısı gövdenin üstüne biniyor; **boyun dolgusu var**, kesilince boşluk görünmüyor |
| Gövde | **Kanat/kol ve kuyruk yok** (gövdede karın açık, ayaklar var). Yani kanatlar ayrı çizilmeli |
| Baş | Yüz **pişmiş**: göz, gaga, yanak resmin içinde |
| Kanat | Tam resimde (`oda_sakin`) var, gövdede yok → oradan kesilebilir |

Doğrulama komutu (sürekli kullan, yeni her parçada): `scripts/slice-moka-parts.py` önce "baş+gövde = tam resim" farkını basar. Kod içi test: oyun içi hata ayıklama ekranında parçaları %50 saydam üst üste çiz (`?hiza=1`), kayma >2 px ise ret.

Kural: **bir parça setinin hepsi tek sohbette, aynı resmi düzelttirerek üretilir** (sıfırdan çizdirmek hizayı bozar, bunu ChatGPT zaten kabul etti).

## 2. Kodla kesme: ne kadar iyi?

Araç: Python (Pillow + OpenCV + scipy), `scripts/slice-moka-parts.py`. Dosya yazma araçlarıyla binary yazılmaz, betik üretir.

| Parça | Yöntem | Kalite | Not |
|---|---|---|---|
| Gözler (2) | Koyu kahve yuvarlak bulma + 9 px genişletme | **Çok iyi** | `goz_sol/sag.png`. Parlama ve kontur dahil. |
| Kel baş | Göz bölgesini çevreden doldur (`cv2.inpaint` TELEA) | **İyi, kusurlu** | Yüz düz krem, dolgu temiz; yanakta iki beyaz lekecik kalıyor (göz parlaması), yanak allığı kayboldu. Çözüm: gerçek kel baş ChatGPT'den (sec. 6) |
| Gaga | Henüz ayrılmadı | – | Gaga çizgi-sanatı; kesilebilir ama kelde kalması daha güvenli (kaş/ağız ona göre biner) |
| Ağız | Yok | – | Moka'nın ağzı yok (gaga var). Ağız = gaganın açılması, sec. 3 |
| Kanatlar | Yeşil+koyu renk eşiği + kutu + delik doldurma | **Orta (~%80)** | Üstte baş tüyüne, altta ayağa/kuyruğa taşıyor. Elle çokgen (6-8 nokta) ile %95'e çıkar |
| Kuyruk | Kanat sol parçasıyla yapışık | Kötü | Elle ayır |
| Kanat altı (gizli alan) | Gövde zaten kanatsız | **Hazır** | ChatGPT gövdeyi kanatsız verdi, karın dolu |
| Baş altı (gizli alan) | Gövde başın altına uzanıyor | Hazır | Boyun görünmez |

Dürüst özet:
- **Kod yapabilir:** göz, kanat ve kuyruk kesimi (elle çokgenle), kel baş (inpaint), tüm hizalı birleştirme, ölçek/dönüş pivotları, yanak/gölge katmanı.
- **Kod yapamaz (temiz):** kesilen yerin arkasında *olmayan* şeyi çizmek (bir kanat kalkınca arkadaki gövde, el ayrılınca kol kökü, gözlük altında kırpma). Bunlar ya zaten arkada çizili olmalı ya ChatGPT çizmeli.
- **Kural:** parça "üst üste biner, arkasında dolgu var" ise kodla keseriz. Parça "içinden bir şey çıkar" ise ChatGPT.

## 3. Yüz: ayrı katmanlar (öneri: evet)

Kel baş (gözsüz, gagalı, yanaksız) + şu katmanlar, hepsi aynı 1254 tuvalde, ayrı PNG, pivot kayıtlı:

| Katman | İçerik | Hareket |
|---|---|---|
| `goz_beyaz+iris` (sol/sağ) | Göz küresi + pupil (parlama dahil) | Bakış: x/y ±8 px kayar (maske içinde), pupil biraz daha fazla |
| `goz_kapak` (sol/sağ) | Üst kapak (kapalı hali yarım ay, derinlik) | Kırpma: scaleY 0→1, 70-170 ms; uyku: yarım kapalı; mutlu: alt kapak yükselir (^^ gözü) |
| `kas` (sol/sağ) | İnce kaş çizgisi (tüy tutamı gibi) | Üzgün/şaşkın/düşünen: açı ve y |
| `gaga_ust`, `gaga_alt` | Gaga iki parça | Konuşma: alt gaga 0-12 px açılır; lip-sync |
| `yanak` (sol/sağ) | Pembe allık | Mutlu/utanmış: opaklık |
| `yuz_ekstra` | Ter damlası, ünlem, yıldız göz, "z" | Mimik özel |

Önerilen pratik: **v1 = kel baş + göz (iris+kapak) + gaga alt/üst + yanak.** Kaş v2.

Mimik tablosu (kod, `MokaFace` büyütülür; mevcut 8 pişmiş mimik kalır, yedek):

| Mimik | Göz | Kapak | Kaş | Gaga | Yanak |
|---|---|---|---|---|---|
| neutral | merkez | açık | düz | kapalı | az |
| happy | merkez | alt yükselmiş | hafif yukarı | hafif açık | orta |
| cheer | ^^ (kapalı tersine) | kapalı | yukarı | geniş açık | çok |
| wow | büyük iris | tam açık | yukarı | "o" açık | az |
| sad | aşağı | yarı | iç yukarı | kapalı | yok |
| sleepy | – | yarı/kapalı | düşük | kapalı | az |
| think | yukarı-yan bak | açık | tek kaş | kapalı | az |
| talk | merkez | açık | – | 3 ağız şekli döngü | az |

- **Kırpma:** kapak katmanı scaleY animasyonu (native driver); kırpmaz mimikler (cheer/sleepy) otomatik.
- **Lip-sync:** ses yok, metin var. Sohbet cevabında harf grubuna göre 3 şekil (kapalı / yarım / geniş) döngüsü + virgülde duraklama. Gerçek fonem eşlemesi gerekmez.
- **Bakış:** dokunulan yere bak, durma anında rastgele küçük bakış.
- **Maliyet:** gözler iki katman, kapak iki, gaga iki, yanak iki = ~8 Animated.Value (bütçe 60'ın altında).

### Gözlük ve yüz sırası

Katman sırası (alttan üste): gövde → kuyruk → ayaklar → kanat arka → **kazak/üst giyim** → kel baş → yanak → göz → kapak → kaş → gaga → **gözlük** → **atkı** (boyun: baş ile gövde arası, gövdenin üstünde, başın altında) → şapka/saç aksesuarı → **eldeki eşya** → kanat ön.
Gözlük kapakların üstünde: kırpma gözlüğün arkasında olur, doğru görünür. Güneş gözlüğü (opak) gözleri örter, bakış animasyonu gizlenir; mimiğe uyumlu değil, sorun değil. Şapka kafa tüyüne (en üst tutam) kurulur; şapka açıkken üstteki tüy tutamı ayrı katman olursa şapkanın içine girer (v2).

## 4. Katman yığını ve çapa sistemi

```
ROOT  (nefes: scaleY 1→1.018, pivot ayak tabanı)
 ├─ kuyruk                    pivot: kökü
 ├─ govde                     (ayaklar dahil)
 │   ├─ ust_giyim (kazak, ceket)         gövdeye yapışık, nefesle ölçeklenir
 │   ├─ atki                              boyun çapası, baş sallanınca hafif geç kalır
 ├─ bas_grubu (pivot: boyun/çene altı; nefes +1 kare gecikme, eğilme ±6°)
 │   ├─ bas_kel
 │   ├─ yuz: yanak, goz, kapak, kas, gaga_ust/alt
 │   ├─ gozluk                            yüz çapası
 │   └─ sapka                             baş üstü çapası (şapka, kulaklık, taç)
 └─ kanat_sol / kanat_sag (pivot: omuz; kaldırma ±25°)
     └─ el_esya (fincan, çiçek, kitap)    kanat ucu çapası, kanatla döner
```

**Çapa:** her eşya JSON'da 1254 tuvalinde şu alanları taşır (tek yerde, `src/domain/kozmetik.ts`):
`slot`, `asset`, `anchor {x,y}` (eşya resmindeki bağlanma noktası), `parent` (`bas|govde|kanat_sol|kanat_sag`), `follow` (0-1, ebeveyn hareketine uyma, atkı 0.6), `z`.
Oda ekranı tuvali ekran boyutuna ölçekler; hepsi aynı ölçek katsayısını kullanır, yani hiza bozulmaz.

**Eşyaların baş eğilmesini izlemesi:** eşya baş grubunun *çocuğu* olur; baş dönünce eşya da döner (transform ağacı, ek hesap yok). Atkı gibi "yumuşak" eşya için baş dönüşünün %60'ı + 80 ms gecikmeli ikinci `Animated.Value` (follow-through).

**Nefes:** gövde scaleY 1.018, baş 1 kare geç takip; kazak gövdeyle birlikte ölçeklenir (aynı grup), atkı baş-gövde arasında kayar (kesikli görünmesin diye atkı resmi her iki yönde 20 px taşar).

## 5. Eşya envanteri ve slotlar

| Slot | Eşya (v1, 10 adet) | Premium? |
|---|---|---|
| Baş üstü | Bere, taç (rozete bağlı), çiçek tokası, kahve fincanı şapka | 2 ücretsiz, 2 premium |
| Yüz | Yuvarlak gözlük, güneş gözlüğü | 1 ücretsiz |
| Boyun | Mint atkı, papyon | 1 ücretsiz |
| Gövde | Kazak (krem), önlük (aşçı), pelerin | 1 ücretsiz |
| El | Fincan, kitap, çiçek, süpürge | rozet ödülleri |
Moka'nın "rahat, kahveli, ev" teması: eşyalar aşırı kostüm olmasın. Her slotta **tek eşya** (aynı slotta iki eşya yok, çakışma yok).

## 6. ChatGPT: her slot için üretim promptları

Hepsi **tek yeni sohbet**, çapa mesajı `docs/moka-oda-chatgpt-promptlari.md` sec. 2'deki stil çapasının **Moka sürümü** (ekler: `moka_oda_sakin.png`, `moka_govde.png`, `moka_bas.png`). Kural: her istek *aynı* sohbette ve ekli ana resimle; çıktı **1254×1254 saydam PNG**, Moka dahil değil (sadece eşya), eşya Moka'nın doğru yerinde. İngilizce prompt:

**A. Çapa (ilk mesaj, 3 resim ekli)**
```
Remember this canvas: 1254x1254 transparent PNG. The attached moka_oda_sakin.png is the FULL reference of Moka; moka_govde.png and moka_bas.png are its body and head, perfectly aligned on the same canvas. For every item I ask next: draw ONLY the item (no Moka, no background), on a transparent 1254x1254 canvas, at EXACTLY the pixel position where it would be worn on Moka in moka_oda_sakin.png, same scale, same soft navy outline (#283044), chubby, soft sticker style with one shading tier. Do not resize or move anything. After each item, also output a second version of the same image composited on top of moka_oda_sakin.png so I can check the fit. Reply only "ready".
```

**B. Kel baş + yüz parçaları** (sec. 3'ün kaynağı)
```
Using moka_bas.png on the same 1254x1254 canvas, same pixel positions, output these as separate transparent PNGs, nothing else changes:
1) bas_kel.png: the head with the eyes, eyebrows, cheek blush and beak REMOVED; keep the cream face area smooth and clean (remove the beak too), keep all feather outline.
2) goz_sol.png and goz_sag.png: each eye alone (dark brown iris, white highlight, thin outline), on its exact position.
3) goz_kapak_sol.png and goz_kapak_sag.png: a soft closed eyelid (curved navy line with a little cream puffy lid) exactly covering each eye's position.
4) gaga_ust.png and gaga_alt.png: the beak split in an upper and a lower part, so the lower part can open downward; same position.
5) yanak_sol.png and yanak_sag.png: soft pink cheek blush, semi-transparent.
6) kas_sol.png and kas_sag.png: small soft feather-tuft eyebrows (curved short strokes) above each eye.
Also give me bas_kel_kontrol.png: all of them composited, must look identical to moka_bas.png.
```

**C. Kanatlar ve kuyruk (kod yerine ChatGPT)**
```
On the same canvas: kanat_sol.png and kanat_sag.png, the left and right wing/arm of Moka in moka_oda_sakin.png, each alone, exactly at its position, complete shape including the part that is hidden behind the head and body (draw the missing hidden part so the wing is a full rounded shape). kuyruk.png: the tail alone, full shape. Check composite included.
```

**D. Eşyalar** (hepsi aynı sohbet; sırayla)
```
Item: beanie hat. A soft cream knit beanie with a small clay pom-pom, sitting on Moka's head at the top tuft, slightly tilted, covering the top feathers. Transparent canvas 1254x1254, position exactly as it would sit on moka_oda_sakin.png. Also output the version composited on moka_oda_sakin.png.
```
(Aynı kalıp, satırı değiştir:)
- `round wire glasses, thin clay-brown frame, clear lenses, sitting across both eyes and the beak bridge`
- `sunglasses, rounded mint-blue frame, dark navy lenses, 15% transparent`
- `scarf: a mint scarf around the neck between head and body, one end hanging down the left side, 20 px of overlap on both head and body, no hand-drawn seam`
- `sweater: a cream knit sweater with a rolled collar, worn on the body, arm-holes aligned with wing roots, hem at the belly bottom; the wings must still be visible above it (draw sweater only, no wings)`
- `held item (wing tip): a coffee cup / book / small flower / broom, drawn as it would be held by the right wing, with the wing tip hole empty (no wing); I will put the wing on top`

Her eşya için ikinci resim (kompozit) **kontrol içindir**; koda sadece saydam eşya girer. Kompozitte kayma varsa: `Move nothing in the item; I'll shift it myself` deme, doğrusu `Same item, shift it 24 px left`.

**Eşya sınıfı başına kabul testi (kod):** eşya PNG'si ile `moka_oda_sakin` üst üste, farkı bas; konturların %90'ı örtüşmeli (betik `scripts/check-moka-fit.py` yazılacak).

## 7. Kilit açma ve ekonomi (mevcut sisteme oturur)

- Mevcut yol: puan harcama + `owned` listesi (kürk `kurk_<id>` ile aynı). Eşya `esya_<id>`.
- Fiyat bandı (puan): temel 60, orta 120, nadir 200. Rozet/seri ödülleri ücretsiz: Moka seri 7 → bere, seri 30 → atkı, seri 100 → taç (kahve planıyla uyumlu, `moka-kahve-plani.md` rozet adları).
- Premium: 1,5× puan zaten var; Premium'a özel 3-4 eşya ("Premium eşyalar" zaten tabloda). Ücretsiz kullanıcı hepsini **görebilir**, satın alamaz.
- Giyilen eşya Moka'yı **her yerde** değiştirir: Oda, sohbet, Ev kartı. Eşya yoksa eski sticker kalır (maliyet ve güvenli geri dönüş).
- Rozet ödülü yumuşak: kaybedilmez (seri bozulsa bile eşya kalır).

## 8. Veri modeli

- Yerel: `Play.moka = { fur, name, worn: { sapka?: id, gozluk?: id, atki?: id, ust?: id, el?: id } }`; sahip olunanlar `owned` içinde `esya_<id>`. `AppState` sürümü artar (`SCHEMA_VERSION`), eski kayıtta `worn = {}`.
- Katalog: `src/domain/kozmetik.ts` (sabit, kod içinde): `id, slot, asset, anchor, parent, follow, z, price, unlock {type: 'puan'|'rozet'|'seri'|'premium', value}`.
- Yedek: hesap açmış kullanıcıda `profiles`/oyun kaydı içinde mevcut yedekle gider (yeni tablo yok). Misafir: yerel.
- Aile paylaşımı: Moka kişiye ait, paylaşılmaz.
- Yeni migrasyon gerekmiyor (kürk migrasyonu `20261116120000_kurk.sql` ile aynı alan genişler, sunucu `owned` JSON ise).

## 9. Animasyon kancaları

| Hareket | Katmanlar |
|---|---|
| Nefes | root + baş geç takip; kazak/atkı gövdeyle |
| Baş eğme / bakma | bas_grubu açı ±6°; şapka ve gözlük çocuk olarak izler; atkı %60 + gecikme |
| Kırpma | goz_kapak scaleY; gözlük sabit |
| Konuşma | gaga_alt açı + baş küçük sekme; şapka 1 kare geç sekme |
| Zıplama (kutlama) | root: çömel → zıpla → ezilme; şapka +10 px geç düşer (follow-through) |
| Kanat kaldır (fincan yudumla) | kanat açı; el eşyası kanat çocuğu; gaga alt ve göz kısılır |
| Uyku | göz kapak kapalı, baş öne düşer, şapka biraz aşağı; z'ler |
| Dokunma | squish; eşya kayıt kaymaz (ebeveyn dönüşümünde) |
Hareketi azalt: nefes ve kırpma kalır, geri kalan durur. Performans: parça sayısı ~14 `Animated.View`, hepsi transform+opacity.

## 10. Fazlar, süreler, riskler

| Faz | İş | Süre | Melih |
|---|---|---|---|
| K0 | Hiza testi + kesme betiği (yapıldı), kel baş ve kanat için ChatGPT karşılaştırması | 0,25 gün | B ve C promptlarını çalıştır, 8 PNG |
| K1 | Katman bileşeni `MokaRig` (ağaç, pivotlar, nefes), eşyasız | 1 gün | – |
| K2 | Yüz katmanları + mimik tablosu + kırpma/bakış/lip-sync | 1 gün | yüz parçaları (B) |
| K3 | Eşya slotları, çapa JSON, `check-moka-fit.py`, ilk 4 eşya | 1 gün | 4 eşya (D) |
| K4 | Satın alma, rozet ödülü, "Moka'nı giydir" ekranı, 9 dil | 1 gün | – |
| K5 | Kalan 6 eşya, parlatma, performans ölçümü | 0,5-1 gün | 6 eşya |
Toplam ~4,5-5 gün kod; Melih üretimi: yüz seti (1 sohbet, ~1 saat) + eşyalar (eşya başına 2-3 dk).

Riskler:
1. **Hiza kayması** (ChatGPT kayar): çözüm = hep aynı sohbet + ekli ana resim, kabul testi, kodda her eşyaya x/y ince ayar alanı.
2. **Stil sapması** eşyalarda: sohbet uzayınca; her 8-10 eşyada yeni sohbet + çapa.
3. **Tüy kenarı** yumuşak, saydam kenarda beyaz halo: koyu kontur olduğu için düşük risk; yine de PNG'ye `premultiply` yap.
4. **Android boyut/bellek:** 1254 px × ~20 parça. Önerilen: 600-700 px ya da WebP (parça başı 100-250 KB). Oda ekranı için yeterli.
5. **Eşya baş eğilince** (gözlük) pivot yanlışsa kayar gibi görünür: tek pivot (çene altı) ve ±6° sınırı.
6. **Native modül yok** (Animated), derleme gerekmez; sadece JS güncellemesi (OTA).

## 11. Açık sorular (Melih)

1. Yüz katmanlı (öneri: evet, v1 = göz+kapak+gaga+yanak, kaş v2). Onay?
2. Kanat ve kuyruk için: ben elle çokgenle keseyim (hızlı, %95) mi, yoksa ChatGPT'ye "tam şekilde çiz" mi (temiz ama hiza riski)? Önerim: kes, kenarlarda tutarsa ChatGPT.
3. Eşya sayısı: v1 için 10 yeterli mi, daha çok mu? Mevsimlik (bayram, yılbaşı) eşya olsun mu?
4. Eşyalar sadece oda ve sohbette mi, yoksa Ev/Bugün Moka'sında da mı? (Öneri: her yerde, ama sticker ve sahne Moka'larında yok, çünkü onlar tek resim.)
5. Kahve planı (`moka-kahve-plani.md`) ve usta plan (`moka-oda-usta-plan.md`) onayı bu işten önce mi sonra mı?

## 12. Prototip nasıl çalıştırılır

```
pip install opencv-python-headless scipy pillow
python scripts/slice-moka-parts.py <moka_oda_sakin/govde/bas klasörü> <çıktı>
```
Çıktılar: `govde`, `bas_kel`, `goz_sol/sag`, `kanat_sol/sag`, `onizleme_birlesik` (parçalar geri birleşir), `onizleme_kayik_goz` (6 px kaydırma testi).
Gerçek PNG'ler (1254 px, saydam) Melih'in PC'sinde `moka-oda/v3/`; depodaki örnekler 627 px önizleme.

## 13. "Moka'nı tasarla" ekranı: baştan (Moka Dolabı)

Mevcut ekranın sorunları (ekran görüntüsü, 2026-11-16): koyu, "ayarlar" gibi; Moka küçük ve sticker, yalnız renk seçiliyor; fiyat etiketleri ve tek büyük "63 puan daha" butonu soğuk; zemin odanın krem dilinden kopuk; deneme yok (satın almadan görme yok); kilit nedeni anlatılmıyor.

### 13.1 Karar
Ekranın adı **Moka Dolabı** (başlık: "Moka'nın dolabı 🧣"). Odadaki "Moka'nı tasarla" düğmesi buraya açılır. Canlı katmanlı Moka (sec. 4) önizlemedir; her seçim anında üstüne biner. Tema: oda ile aynı krem `room` token'ları, koyu zemin yok (koyu tema açıksa oda gecesi gibi sıcak lacivert-kahve).

### 13.2 Düzen (dikey telefon, yukarıdan aşağı)
```
┌───────────────────────────────┐
│ ‹ Geri        Moka'nın dolabı  ⭐ 63 │  üst çubuk: puan hapı (dokun = nasıl kazanılır)
├───────────────────────────────┤
│  ┌─────────────────────────┐  │
│  │   sahne: oda zemini +   │  │  üst %42: canlı Moka, büyük, nefes alır,
│  │   küçük halı, ışık      │  │  kırpar, 6 sn'de bir bakınır
│  │        (MOKA)           │  │  Moka'ya dokun = hoplar, mimik
│  │  [↺ Çıkar]   [🔍 Yakınlaş]│  │  köşede: Tümünü çıkar, yakınlaştır (yüz/boy)
│  └─────────────────────────┘  │
│  "Bere çok yakışmış!"          │  Moka'nın tek satırlık yorumu (yerel cümle bankası)
├───────────────────────────────┤
│ Kürk  Baş  Yüz  Boyun  Gövde  El │  kaydırılabilir sekme hapları, seçili = dolu kil
├───────────────────────────────┤
│ ┌────┐┌────┐┌────┐             │  eşya ızgarası, 3 sütun, yuvarlak köşeli kartlar,
│ │ 🧢 ││ 🎓 ││ 👑 │             │  her kartta: eşyalı Moka küçük resmi (kendi önizlemesi)
│ │ ✓  ││60⭐││🔒  │             │  durumlar: giyili ✓ / sahip / satın al / kilitli
│ └────┘└────┘└────┘             │
├───────────────────────────────┤
│ [ Dene ]  → [ Giy ]  /  [ 60⭐ ile al ] │  alt sabit çubuk, seçime göre tek eylem
└───────────────────────────────┘
```

### 13.3 Kart durumları
| Durum | Görünüm | Dokununca |
|---|---|---|
| Giyili | Kil çerçeve + ✓ rozeti | Seçim; alt çubuk "Çıkar" |
| Sahip | Normal kart | **Önizlemede giydir**, alt çubuk "Giy" |
| Satın alınabilir | Altta ⭐ fiyat hapı | **Önce dene** (önizlemede giydir, "deneme" etiketi), alt çubuk "60⭐ ile al" |
| Puan yetmiyor | Fiyat hapı soluk, alt çubukta "Kalan: 17⭐ · Nasıl kazanılır?" | Yine denenir (satın alma yok) |
| Kilitli (rozet/seri) | 🔒 + küçük ipucu ("Seri 7 günde açılır", ilerleme çubuğu 4/7) | Önizlemede göster (denenebilir), alt çubuk "Seri 7'de açılır" |
| Premium | 👑 köşe rozeti | Denenir; satın alma Premium değilse ödeme ekranı (reklam yok) |

Kural: **her eşya denenebilir**, satın alma sadece onaydır. Deneme geçici: ekrandan çıkınca kaydedilmemiş seçim silinir, "Kaydedilmedi" uyarısı yok (deneme zaten belli).

### 13.4 Akış
1. Odadan aç → Moka şu an giydikleriyle gelir, "Kürk" veya son kullanılan sekme açık.
2. Eşyaya dokun → anında önizleme (180 ms çapraz geçiş, Moka küçük bir "hoplama" yapar, yorum satırı değişir).
3. Alt çubuk: sahipse **Giy**, değilse **Al** (puan düşer, konfeti + "Moka çok sevindi" mimik, giydirilir).
4. Aynı slotta yeni eşya eskisini değiştirir (slot başına tek). Giyiliyse tekrar dokun = çıkar.
5. Geri: kaydet otomatik (giy = kaydet). Odaya dönünce Moka giyinmiş.
6. Kürk sekmesi eski mantıkla çalışır (8 renk), aynı kart biçimi; seçili kürk tüm katmanlara (kanat, baş, gövde) boyanır.

### 13.5 Ayrıntılar
- **Sıralama:** her sekmede: giyili → sahip → satın alınabilir (ucuzdan pahalıya) → kilitli.
- **Boş durum:** sekmede eşya yoksa Moka "Yakında yeni şeyler gelecek" der, geri sayım yok.
- **Moka yorumları:** yerel cümle bankası (`mokaLines.ts`), eşya ve slota göre 3-4 cümle, 9 dil, yapay zekâ yok.
- **Puan hapı:** üstte ⭐ bakiye; satın alınca sayı akarak düşer. Dokununca "Puan nasıl kazanılır" kısa sayfası (iş bitir, seri, rozet).
- **Erişilebilirlik:** her kartın adı sesli okunur ("Bere, 60 puan, denenebilir"), renk tek başına durum bildirmez (✓ ve 🔒 simgesi var), dokunma alanı ≥ 48 px, hareketi azalt'ta hoplama kapalı.
- **Performans:** önizleme tek `MokaRig`, kartlardaki küçük resimler önceden üretilmiş WebP (eşya başına bir; kod her açılışta çizmez).
- **Hata:** satın alma sunucuya/yedeğe yazamazsa yerel kayıt kalır, tekrar dener; çift satın alma `owned` içinde kontrol.
- **Ücretsiz/misafir:** hepsi görünür ve denenebilir; satın alma puanla, premium eşya için ödeme ekranı. Misafirde puan zaten yerel.

### 13.6 Görsel dil
Krem kart (`room.paper`), 22 px köşe, hafif kabarık gölge, kil seçili çerçeve, kahve yazı (Baloo 2 başlık, Nunito metin), sekmeler hap. Koyu lacivert zemin ve sönük gri buton **kullanılmaz**. Sahne: odanın zemin ve duvar parçası (arka plan resminden kesit), Moka yerde, sağ üstte küçük lamba ışığı. Dişli ikonu (şimdiki sağ üst) kalkar: ayarlar bu ekranın işi değil.

### 13.7 Eklenen faz
| Faz | İş | Süre |
|---|---|---|
| K4a | Moka Dolabı ekranı: sahne, sekmeler, kartlar, deneme/giy/al, yorum bankası | 1,5 gün |
K4 (sec. 10) bununla birleşir: K4 = K4a + satın alma/rozet ödülü bağları + 9 dil (toplam ~2 gün). Yeni toplam ~5,5 gün.
Bağımlılık: K1 (`MokaRig`) ve en az 4 eşya (K3) hazır olmalı; kürk sekmesi hemen yapılabilir.

### 13.8 Açık sorular (ek)
1. Ad "Moka Dolabı" olur mu, yoksa "Moka'nı giydir"?
2. Deneme sırasında kilitli (rozet/seri) eşya denensin mi? Önerim evet, motivasyon.
3. Moka sahnesi sade krem mi, odanın kesiti mi? Önerim oda kesiti (bağlam hissi).
4. "Tümünü çıkar" ve "Rastgele giydir 🎲" düğmesi gerekir mi? Önerim ikisi de, küçük.

## 14. Durum (2026-11-17): ilk sürüm kodlandı
- `scripts/make-moka-rig.py`: ChatGPT parçalarından `assets/moka/rig/*.webp` (7 katman + 7 kürk tonu) ve `assets/moka/esya/*.webp` (60 eşya). ChatGPT `hasir_sapka` ile `yilbasi` adlarını ters vermişti, betikte düzeltildi. Küçük baş eşyaları (< 300 px) 1,4 kat büyütülür. Gaga kodla kesildi, kapak ve yanak yok (sec. 3 v2).
- `src/components/MokaRig.tsx`: katmanlı Moka (nefes, baş eğme, kırpma, bakış, konuşurken gaga, kanat ve kuyruk, zıplama). Baş eşyası başın, el eşyası ekranın sağındaki kanadın çocuğu.
- `src/domain/kozmetik.ts`: 60 eşya (baş 20, gövde 20, el 20), 3'ü ücretsiz, 57'si puanlı, 10'u Premium. Sunucu fiyatları `supabase/migrations/20261117100000_kozmetik.sql` (**henüz uygulanmadı**, uygulanmazsa satın alma "sunucuda hazır değil" der).
- `src/app/moka-tasarim.tsx`: Moka Dolabı (sec. 13): canlı Moka, Kürk / Baş / Gövde / El sekmeleri, deneme, al, çıkar, hepsini çıkar.
- Yapılmadı: odadaki ve sohbetteki Moka hâlâ eski resim (`RoomMoka`); yüz kapak/yanak/kaş; yüz ve boyun eşyaları; 9 dil çevirisi (yeni cümleler Türkçe kalır); eşya küçük resimli kartlar (şimdilik emoji).
