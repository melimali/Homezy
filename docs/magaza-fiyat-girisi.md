# Mağaza fiyat girişi (Melih için kopyala-yapıştır)

Hedef: aylık **6,99 USD**, yıllık **59,99 USD**; Türkiye aylık **149,99 TL**, yıllık **1.559,99 TL**. Diğer ülkeler mağazanın otomatik dönüşümüyle gelir. Her iki mağazada tam fiyat yoksa **en yakın basamağı** seç. Bu oturumun mağaza konsollarına erişimi yok; adımlar elle uygulanır. Kaydetmeden önce karşında görünen fiyatı hedefle karşılaştır.

## Ürün kimlikleri

| Platform | Ürün | Kimlik |
|---|---|---|
| Google Play | Abonelik | `homezy_premium` |
| Google Play | Temel planlar | `aylik`, `yillik` |
| App Store | Abonelik ürünleri | `homezy_premium_aylik`, `homezy_premium_yillik` (aynı abonelik grubu) |

3 gün ücretsiz deneme giriş teklifi her iki plana, yeni müşteri.

## Google Play Console

1. Para kazanma > Ürünler > Abonelikler > `homezy_premium` > temel plan `aylik` > Fiyatlar > **Fiyatları yönet**.
2. Önce **Amerika Birleşik Devletleri = 6,99 USD** gir. "Tüm ülke/bölgeler için fiyatları dönüştür" ile otomatik doldur.
3. **Türkiye (TRY) = 149,99** satırını elle düzelt (Play istediğin tutarı kabul eder; otomatik değer farklıysa üzerine yaz).
4. `yillik` plan: ABD **59,99 USD**, Türkiye **1.559,99 TRY**.
5. Kaydet > planı **Etkinleştir**. Yayındaki aboneler için fiyat değişikliği onay ister, yeni üründe sorun yok.
6. Fiyat girerken Play "bölge fiyatı uyarısı" verirse (vergiye göre farklı) KDV dahil/hariç farkıdır; fiyatı değiştirme, onayla.

## App Store Connect

1. Abonelikler > grup > `homezy_premium_aylik` > Abonelik Fiyatları > Fiyat ekle.
2. Başlangıç ülkesi **Amerika Birleşik Devletleri**, fiyat **6,99 USD** seç. Apple diğer 175 ülkenin fiyatını otomatik eşitler.
3. **Türkiye** için "Tüm fiyatları görüntüle" > Türkiye satırı. Listede **149,99 TL** yoksa en yakın listelenen basamağı seç (Apple Türkiye fiyatlarını sabit basamaklarla sunar). Aynısı yıllık için: hedef **1.559,99 TL**, yoksa en yakın basamak. Seçtiğin değeri bu dosyaya not et.
4. `homezy_premium_yillik`: ABD **59,99 USD**.
5. Giriş teklifi: ücretsiz deneme, 3 gün, yeni abone.
6. Her ürüne yerelleştirme (ad + açıklama), inceleme ekran görüntüsü ekle; durum "Gönderilmeye hazır" olmalı.

## Kontrol

- Uygulama paywall'u fiyatı mağazadan okur; kodda sabit fiyat sadece yedek (`PurchasesProvider.tsx`, 149,99 / 1.559,99). Mağazada Apple'ın en yakın basamağı farklıysa paywall mağaza fiyatını gösterir, yedek devreye girmez.
- RevenueCat'te fiyat girilmez; ürün eşleşmesi kontrol edilir: iOS ürünleri (`homezy_premium_aylik/yillik`) ve Play (`homezy_premium:aylik/yillik`) `premium` entitlement'ına bağlı, `default` offering **current**, paketler `$rc_monthly` ve `$rc_annual`.
- Fiyatlar sonradan değişirse TR basamaklarını aynı tabloya geri yaz.
