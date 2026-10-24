# Ödeme kurulumu (Google Play + RevenueCat)

Bu sayfa Premium'un gerçekten satın alınabilmesi için elle yapılacak işleri sırayla anlatır. Önce Android; iOS adımları en altta.

Kod tarafı hazır: ödeme ekranı (`src/components/PremiumChoice.tsx`), satın alma ve geri yükleme (`src/purchases/PurchasesProvider.tsx`), abonelik durumunu Supabase'e yazan iki sunucu fonksiyonu (`supabase/functions/revenuecat-webhook`, `supabase/functions/subscription-sync`).

## Fiyatlar

| Plan | Fiyat | Not |
|---|---|---|
| Aylık | **6,99 $** | |
| Aylık, ilk ay | **4,99 $** | Sadece daha önce abone olmamış kişiye. Google Play'de "giriş teklifi" olarak tanımlanır. |
| Yıllık | **59,99 $** | Ekranda 12 aylık fiyata göre indirim oranı yazar (≈ %28), mağaza fiyatından hesaplanır. |

**Türkiye:** aylık **149,99 TL** (Melih, 22 Ekim 2026; dönüştürülen fiyat yerine elle girilir). Yıllık **1.564,99 TL** (10,5 × 149 TL; 12 aylığa göre ≈ %13 indirim). İlk ay teklifi **119,99 TL**.

Ekrandaki fiyatlar mağazadan okunur; Türkiye'deki kullanıcı mağazaya girilen TL fiyatını görür, kodda TL yazılı değil. Mağaza bağlanmadan önce yukarıdaki dolar fiyatları gösterilir.

## Adımlar

### 1. Google Play Console hesabı (bir kere, ≈ 25 $)

1. [play.google.com/console](https://play.google.com/console) → geliştirici hesabı aç. Bireysel mi, Meikai Digital adına mı kararı burada verilir (CLAUDE.md'deki açık karar). Kimlik doğrulaması birkaç gün sürebilir.
2. **Ödeme profili** (Settings → Payments profile): para satabilmek için şart. Banka hesabı ve vergi bilgisi burada.
3. **Uygulama oluştur**: adı Layfapp, varsayılan dil Türkçe, "Uygulama", "Ücretsiz" (abonelik olsa da uygulama ücretsiz sayılır).

### 2. İlk sürümü Play Console'a yükle

Google, uygulamaya bir sürüm yüklenmeden abonelik ürünü açtırmıyor. Windows'ta proje klasöründe:

```
npx.cmd eas-cli@latest login
npx.cmd eas-cli@latest build --platform android --profile production
```

Çıkan `.aab` dosyasını Play Console → **Test ve yayın → Dahili test** → yeni sürüm olarak yükle. Kendi Gmail adresini test kullanıcısı listesine ekle ve test bağlantısından katıl.

### 3. Abonelik ürününü oluştur

Play Console → **Para kazanma → Ürünler → Abonelikler → Abonelik oluştur**:

1. Ürün kimliği: `layfapp_premium`, ad: Layfapp Premium.
2. İki **temel plan**:
   - `aylik`: otomatik yenilenen, 1 ay, **geriye dönük uyumlu (backwards compatible)** olarak işaretli, **6,99 USD**. "Fiyatları dönüştür" ile diğer ülkelere dağıt, sonra listede **Türkiye**'yi bul ve fiyatı elle **149,99 TRY** yap.
   - `yillik`: otomatik yenilenen, 1 yıl, **59,99 USD**; Türkiye için elle **1.564,99 TRY**.
3. `aylik` planına **teklif** ekle: kimlik `ilk-ay`, uygunluk "Yeni müşteri edinme" (daha önce bu aboneliği almamış olanlar), aşama "Tek ödeme" ya da "Sabit fiyat", **1 ay, 4,99 USD**; Türkiye için elle **119,99 TRY**. Etkinleştir.
4. Temel planları ve teklifi **etkinleştir**.

### 4. RevenueCat

1. [app.revenuecat.com](https://app.revenuecat.com) → ücretsiz hesap, proje adı Layfapp.
2. **Apps → + New → Google Play**, paket adı `com.meikaidigital.layfapp`.
3. **Google servis hesabı** (RevenueCat'in Google'dan abonelikleri okuyabilmesi için). RevenueCat'in "Google Play service credentials" rehberini adım adım izle; özetle:
   - Google Cloud'da bir proje, **Google Play Android Developer API** ve **Cloud Pub/Sub API** açık.
   - Bir servis hesabı, JSON anahtarı indir.
   - Play Console → **Kullanıcılar ve izinler** → servis hesabının e-postasını davet et; "Finansal verileri görüntüle", "Siparişleri ve abonelikleri yönet" izinleri.
   - JSON dosyasını RevenueCat'teki Android uygulamasına yükle. Google'ın bunu kabul etmesi 36 saati bulabiliyor, "Valid" yazana kadar bekle.
   - Aynı sayfada **Real-time developer notifications** için RevenueCat'in verdiği Pub/Sub konusunu Play Console → Para kazanma kurulumu kısmına yapıştır.
4. **Products → Import**: `layfapp_premium:aylik` ve `layfapp_premium:yillik` gelir.
5. **Entitlements → + New**: kimlik tam olarak `premium`. İki ürünü de bağla.
6. **Offerings → default** (yoksa oluştur, "current" yap). İki paket:
   - **Monthly** (`$rc_monthly`) → `layfapp_premium:aylik`
   - **Annual** (`$rc_annual`) → `layfapp_premium:yillik`

   Paket türleri önemli: uygulama "Monthly" ve "Annual" paketlerini arıyor. İlk ay teklifini ayrıca seçmek gerekmez; RevenueCat hak kazanan kişiye teklifi kendiliğinden uygular.
7. **Project settings → API keys**:
   - Android **public** anahtarı (`goog_...`). Bunu bana gönderebilirsin: herkese açık bir anahtar, repodaki `.env` dosyasına ekleyeceğim (EAS bulut derlemesi `.env.local`'ı görmüyor).
   - **+ New secret API key**, sürüm **V1**, adı "supabase" (`sk_...`). Bu **gizli**, kimseye ve bana yazma; sadece 5. adımda Supabase'e girilecek.

### 5. Supabase'e iki sunucu fonksiyonunu yükle

Windows'ta proje klasöründe. `<uzun-rastgele-metin>` için kendin uzun, rastgele bir metin uydur (ör. bir şifre yöneticisinden 40 karakter).

```
npx.cmd supabase login
npx.cmd supabase link --project-ref gkccsimguzabfrsumjtv
npx.cmd supabase functions deploy revenuecat-webhook --no-verify-jwt
npx.cmd supabase functions deploy subscription-sync
npx.cmd supabase secrets set REVENUECAT_API_KEY=sk_... REVENUECAT_WEBHOOK_SECRET=<uzun-rastgele-metin>
```

- `revenuecat-webhook`: RevenueCat her değişiklikte (satın alma, yenileme, iptal, bitiş) çağırır, `subscriptions` tablosunu günceller.
- `subscription-sync`: uygulama satın almadan hemen sonra çağırır, böylece Premium hakları webhook'u beklemeden açılır.

### 6. Webhook'u bağla

RevenueCat → **Integrations → Webhooks → + New**:

- URL: `https://gkccsimguzabfrsumjtv.supabase.co/functions/v1/revenuecat-webhook`
- Authorization header value: `Bearer <uzun-rastgele-metin>` (5. adımdakiyle aynı metin, başında `Bearer ` ve bir boşluk)
- Environment: hem Production hem Sandbox.
- **Send test event** → "200" görmelisin.

### 7. Test

1. Play Console → **Ayarlar → Lisans testi**: kendi Gmail adresini ekle. Lisans test kullanıcıları gerçek para ödemez; aylık abonelik 5 dakikada bir yenilenir, birkaç yenilemeden sonra biter.
2. Gerçek satın alma Expo Go'da çalışmaz. Bir kere development build al ve telefona kur:
   ```
   npx.cmd eas-cli@latest build --platform android --profile development
   ```
   Telefonda Play Store aynı Gmail ile açık olmalı ve 2. adımdaki dahili teste katılmış olmalısın.
3. Uygulamada Hesabım → Premium → Aylık → **Premium ile başla · ilk ay 4,99 $**. Google'ın ödeme penceresinde "Test kartı, her zaman onaylanır".
4. Kontrol: Supabase → Table editor → `subscriptions`: `active = true`, `product_id = layfapp_premium:aylik`. RevenueCat → Customers'ta da görünür.
5. Uygulamayı silip kur, misafir olarak gir, **Satın alımları geri yükle** → Premium geri gelmeli.

## iOS (sonra)

1. Apple Developer Program (99 $/yıl).
2. App Store Connect → uygulama → **Abonelikler**: grup "Layfapp Premium", iki ürün `layfapp_premium_aylik` (6,99 $; Türkiye için elle 149,99 TL) ve `layfapp_premium_yillik` (59,99 $; Türkiye için elle 1.564,99 TL). Aylık ürüne **Giriş teklifi**: "Kullandıkça öde", 1 ay, 4,99 $ (Türkiye 119,99 TL).
3. RevenueCat → App Store uygulaması ekle (App Store Connect API anahtarı ve "In-App Purchase Key"), ürünleri içe aktar, aynı `premium` entitlement'ına ve aynı offering'deki Monthly / Annual paketlerine bağla.
4. iOS public anahtarı (`appl_...`) `.env`'e eklenir.
