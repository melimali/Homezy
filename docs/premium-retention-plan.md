# Geri dönüş ve Premium planı

Amaç: kullanıcı her gün dönsün, Premium'u "zorunlu" olduğu için değil "istediği için" alsın. İlke (Melih, 2026-10-31): **Premium daha fazla seçenek, içgörü ve içerik verir; evin temel büyümesini, mevcut ilerlemeyi ve kullanıcı verisini asla kilitlemez.**

## 1. Mevcut durum (integration/tum-pr)

Zaten var: RevenueCat paywall (`PremiumChoice`, yıllık/aylık, ilk ay teklifi, TR fiyatı), tek kaynak `src/domain/premium.ts` (`LIMITS`, `THEMES`, `FEATURES`), `PremiumLock` kilit kartı, seri + seri dondurma (ücretsiz 1 / Premium 3), puan çarpanı, 5 ev, ev temaları (Gündüz + Cottagecore ücretsiz; Gece/Kış/Sonbahar/Minimal/Lavanta Premium), Moka gardırobu (`MokaWardrobe`, `MokaWearLayer`), bahçe, haftalık kart (`WeekCard`, `hafta.tsx`), ruh hali (`MoodCheckin`), öz bakım kartı, yerel bildirimler.

Boşluklar: paywall yalnızca açılışta ve elle çıkıyor (zamanlanmış "an" yok); deneme süresi vurgusu yok; yıllık plan varsayılan seçili değil (aylık seçili); Premium bitince "ne kaybediyorsun" görünmüyor; ayrıntılı rapor yok; mevsim paketi / etkinlik yok.

## 2. Ücretsiz / Premium bölünmesi

**Ücretsiz kalır (kilitlenmez):** rutinler, odalar, hatırlatmalar, evin ve bahçenin günlere yayılan büyümesi, seri takibi ve basit özet, puan (1×), 1 ev, Gündüz + Cottagecore teması, temel mobilya, ayda 1 dondurma, haftada 2 tarama, veriyi dışa aktarma ve hesabı silme, bulut yedeği (ev verisi).

**Premium (seçenek + içgörü + içerik):**

| Alan | Ücretsiz | Premium | Durum |
|---|---|---|---|
| Temalar | 2 | Tümü + aylık mevsim paketi | Kısmen var; mevsim paketi yeni |
| Moka gardırobu | Temel aksesuarlar | Mevsim paketleri, özel kıyafetler | Var, genişlet |
| Raporlar | Basit haftalık özet | Ayrıntılı haftalık/aylık rapor, ruh hali içgörüsü, geçen yıl bugün | Rapor yeni |
| Mobilya | Temel koleksiyon | Geniş koleksiyon | Var (Premium eşyalar) |
| Ev kişiselleştirme | Hazır temalar | Kendi fotoğrafı / renkleriyle ev | Yeni |
| Ek alanlar | 1 ev | 5 ev, ek oda, alternatif tasarım | Kısmen var |
| Hedef planı | 1 plan | Birden fazla plan, esnek rutin, hedef önerisi | Yeni |
| Bildirim | Sabit saat | Akıllı saat, gelişmiş hatırlatıcı | Var |
| Dondurma / tarama / puan | 1 / haftada 2 / 1× | 3 / günde 50 / 1,5× | Var |

Değişmesi gereken tek karar: **seri dondurma ve puan çarpanı "temel ilerleme" sayılır mı?** Öneri: kalsın (ilerlemeyi kilitlemiyor, sadece hızlandırıyor/koruyor), ama seri **asla** paywall arkasında silinmesin: dondurma yoksa seri kırılır, bu doğal kuraldır; Premium bittiğinde eldeki seri ve ev korunur.

## 3. Her gün dönme kancaları

1. **Seri**: ana ekranda büyük seri sayacı; 3 / 7 / 14 / 30 gün kutlaması (Moka + `Burst`). Kırılma dili destekleyici (bkz. `docs/tasarim-finch.md` §5), "geri dön" etiketi.
2. **Günün kartı**: açılışta tek kart (ruh hali check-in + Moka cümlesi + "bugün sadece şu 1 iş"). Var: `MoodCheckin`, `greeting.ts`, `SelfCareCard`; birleştir.
3. **Bildirimler**: sabah özeti, akşam "serini kaybetme" (seri ≥ 3 ve bugün iş yok ise 20:30), pazar 19:00 haftalık özet. Günde en çok 2 bildirim; tür başına kapatılabilir. Yeni modül yok (`expo-notifications` var).
4. **Haftalık rapor**: pazar akşamı. Ücretsiz: özet kart (kaç iş, seri). Premium: ayrıntı (oda bazlı, ruh hali, en verimli gün). Ücretsiz kullanıcıya **bulanık önizleme** + "Ayrıntıyı gör".
5. **Mevsimsel etkinlik**: Bayram temizliği, Yılbaşı, İlkbahar temizliği, Ramazan. Süreli ev dekoru + Moka kıyafeti. Ücretsiz katılır, bir parça ücretsiz, tam paket Premium.
6. **Yeni içerik ritmi**: ayda bir Moka + tema paketi ("Kasım paketi"). Premium'a her ay yeni neden verir.

## 4. Deneme ve paywall

- **7 gün deneme** (mağaza tarafında): Google Play'de `ilk-ay` teklifi yanına 7 günlük ücretsiz deneme teklifi; App Store'da giriş teklifi. Ürün kimlikleri `docs/odeme-kurulumu.md` içine eklenir.
- **Deneme bitince "ne kaybediyorsun" kartı:** yalnız görünüm kaybolur (Premium tema Gündüz'e döner, `themeFor` zaten böyle; seçim silinmez), **ilerleme kilitlenmez**. Kart: "Geri dönersen şunlar seni bekliyor: Gece teması, 6 Moka kıyafeti…".
- **Paywall'u gösterme anları** (hepsi kapatılabilir):
  1. Onboarding sonu (zaten var: `LaunchChoice`).
  2. Seri 3 / 7 / 14 günde, kutlamadan sonra.
  3. Seviye atlayınca, kilitli mobilya önizlemesiyle.
  4. Premium temada "Uygula"ya basınca (şimdi doğrudan `/premium`; önizlemeyi göster, sonra paywall).
  5. Kilitli haftalık rapor önizlemesinde.
- **Sıklık kuralları:** günde en çok 1 kapatılabilir paywall; ilk 3 gün hiçbiri (kullanıcı eylemiyle açılan "Uygula" hariç); iş yaparken, ödeme ve kurulum sırasında hiç.
- **Paywall tasarımı:** yıllık plan **varsayılan seçili** + indirim rozeti (`annualSave` var), aylık karşılaştırma için; TR'de bölgesel fiyat (var); Moka hediye dili. RevenueCat Experiments ile A/B (varsayılan plan, metin, deneme süresi).
- **Ölçüm:** paywall görüntüleme → deneme → ücretli; D1 / D7 geri dönüş; kancaya göre dönüşüm (hangi an). Yeni SDK eklenmez; olaylar önce yerel sayaç + RevenueCat'in kendi metrikleri, analitik ayrı karar.

## 5. Öncelikli uygulama listesi (küçük adımlar)

Her adım ayrı commit, `npm run typecheck` + `npm run lint`, doğrudan `integration/tum-pr`. Yerel modül yok.

1. ✅ **Paywall zamanlayıcı** (`src/domain/paywall.ts`): "an" tanımı + sıklık kuralları (günde 1, ilk 3 gün yok, tekrar eden kapatma). Saf fonksiyon, test edilebilir. *Başla: bu.*
2. **Paywall ekranı**: yıllık varsayılan, deneme metni, "an" bazlı başlık/Moka mesajı.
3. ✅ **Seri kilometre taşları** (3/7/14/30): kutlama + paywall anı 2.
4. ✅ **Tema önizleme**: Premium temada Uygula → önizleme + paywall anı 4.
5. ✅ **Deneme bitti / Premium bitti kartı** ("ne kaybediyorsun"), ilerleme dokunulmaz.
6. ✅ **Haftalık rapor v2**: ücretsiz özet + Premium ayrıntı + bulanık önizleme.
7. ✅ (zaten vardı: schedule.ts STREAK_TIME) **Akşam seri bildirimi** (≥3 gün seri, o gün iş yoksa).
8. ✅ **Seviye atlama + kilitli mobilya önizlemesi** (anı 3).
9. ✅ (`src/domain/seasons.ts`, evler ekranında ayın paketi) **Mevsim paketi altyapısı** (`SEASONS` sabiti: tarih aralığı + tema + Moka kıyafeti) ve Kasım paketi.
10. **Ayrıntılı rapor / ruh hali içgörüsü**, çoklu hedef planı, kendi fotoğrafıyla ev (en son, büyük işler).
11. 🟡 (yerel sayaç `src/lib/events.ts`; RevenueCat deneyi elle kurulur) **Ölçüm olayları** ve RevenueCat deney kurulumu (`docs/odeme-kurulumu.md`).

## 6. Riskler

- Deneme + giriş teklifi mağaza kurallarına uymalı (fiyat ve yenileme açıkça yazılı; mevcut metin var).
- Paywall sıklığı düşük tutulmazsa mağaza puanı düşer; kurallar adım 1'de kodla zorlanır.
- Ücretsiz sürüm "bitmiş" hissi vermeli; bölme tablosuna yeni ücretsiz özellik kilitlenerek eklenmez.
