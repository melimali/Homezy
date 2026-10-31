# Melih'in yapacakları (Play testine hazırlık)

Sıra önemli. Her madde: ne, nerede, neden. Kod tarafı hazır; aşağıdakiler sadece senin hesaplarınla yapılabilir.

## A. Hesaplar (kişisel hesaplar alındı; D-U-N-S gerekmiyor)
1. **Google Play kişisel hesap:** yeni kişisel hesaplarda production'dan önce **kapalı test** zorunlu: en az **12 test kullanıcısı**, hepsi **14 gün kesintisiz** katılımda kalmalı (Play Console > Test > Kapalı test, e-posta listesi ya da Google Grubu). Sonra "Production erişimi için başvur" formu açılır. Test kullanıcılarını şimdiden topla (arkadaş, aile; Gmail ile). İlk yükleme bu testle başlar, bu yüzden süreyi erken başlat.
2. **Kişisel hesapta adın ve adresin Play'de herkese görünür.** Gönderen adı olarak kendi adın çıkar; adres/telefon/e-posta mağaza sayfasında gösterilebilir. İstemezsen ileride kuruluş hesabına geçmek gerekir (bu durumda uygulama aktarımı yapılır). Destek e-postası olarak ayrı bir adres kullan.
3. Play kişisel hesapta kimlik doğrulama ve telefon/cihaz doğrulaması ister; Console'daki adımları tamamla.
4. **Not:** CLAUDE.md ve mağaza metinlerinde "yayıncı Meikai Digital" geçiyor; kişisel hesapla yayıncı sen olursun. Gizlilik/koşullar sayfasındaki yayıncı adını da buna göre düzelt.

## B. Supabase (proje gkccsimguzabfrsumjtv) — SQL Editor'de sırayla
Neden: yeni özellikler bu tablolar olmadan çalışmaz (hata verir).
1. `supabase/migrations/20261027120000_bahce.sql` (Moka bahçesi)
2. `supabase/migrations/20261031000000_aile_evi.sql` (aile paylaşımı)
3. `supabase/migrations/20261031120000_moka_chat.sql` (Moka sohbet, günlük mesaj sınırı)
4. Önceki hepsi (hesap, delete_me, puan, premium, scan, scan_premium_50) çalıştırıldıysa tekrar gerekmez; emin değilsen Table Editor'de `scan_usage`, `chat_usage`, `shared_homes` var mı bak.

## C. Edge function deploy (bilgisayarda, `npx.cmd supabase ...`)
Neden: yapay zekâ taraması ve Moka sohbet sunucuda çalışır; API anahtarı uygulamada olamaz.
1. `npx.cmd supabase functions deploy scan`
2. `npx.cmd supabase functions deploy moka-chat`
3. `npx.cmd supabase functions deploy revenuecat-webhook` ve `subscription-sync` (güncellendiyse)
4. Secret'lar: `ANTHROPIC_API_KEY` (+ RevenueCat webhook gizli anahtarı, service role zaten ayarlı). `npx.cmd supabase secrets list` ile kontrol et.
5. Test: uygulamada bir buzdolabı taraması ve bir Moka mesajı.

## D. Gizlilik politikası ve koşullar
1. `docs/yasal/gizlilik.html` ve `kosullar.html` dosyalarını themeikai.com/homezy/ altına yükle (URL'ler: themeikai.com/homezy/gizlilik, /kosullar). Neden: Play Console zorunlu tutar, uygulama da bu adreslere link verir.
2. Politikada şunlar yazmalı (kontrol et): fotoğrafların yapay zekâ servisine gönderildiği (yüz/beden saklanmadığı), konumun sadece hava durumu için kullanıldığı ve saklanmadığı, Moka sohbet mesajlarının yapay zekâya gittiği, reklam (AdMob) ve abonelik (RevenueCat) verileri, **hesap silme** yolu (Ben > Hesabı sil) ve silinen veriler.
3. Play Console > Politika > **Hesap silme URL'si**: aynı gizlilik sayfasında "uygulamada Ben sekmesinden silebilirsin" bölümünü bağla (Play web adresi ister).

## E. AdMob
1. Homezy Android uygulama ve banner kimlikleri memory'de var (app ID `…~6223192132`, banner `…/6167351815`). `.env.local` + EAS ortam değişkenleri ayarlı (`@meikai/homezy`); `eas env:list` ile doğrula.
2. Play'e yükledikten sonra AdMob'da uygulamayı mağazaya bağla; reklam onayı birkaç gün sürer. Test sürümünde test reklamları görünür, normal.

## F. Play Console'da uygulamayı oluştur
1. Yeni uygulama: ad "Homezy: Rutin ve Ev İşleri", dil Türkçe, uygulama, ücretsiz (abonelikli).
2. **Uygulama içeriği** formları: gizlilik URL'si, reklam var (evet), hedef kitle 13+ (çocuk uygulaması DEĞİL), veri güvenliği (aşağıya bak), içerik derecelendirme, haber/COVID/finans: hayır.
3. **Veri güvenliği formu** cevapları: toplanan veri → e-posta (hesap), fotoğraflar (tarama, işlenir, saklanmaz), yaklaşık konum (hava, saklanmaz), satın alma geçmişi, cihaz/reklam kimliği (AdMob), uygulama etkileşimi. Aktarım şifreli (evet), kullanıcı silme isteyebilir (evet).
4. Mağaza sayfası: metinler `docs/magaza-metni.md`. Gerekenler: 512×512 ikon (`assets/icon.png`), 1024×500 öne çıkan görsel, en az 2, ideal 8 telefon ekran görüntüsü (Ev 3B, Bugün, Moka, Gelişim, Odalar, Tarama, Premium, Bahçe).
5. İngilizce liste: Play EN "Homezy: Routine & Chores" (EN çeviri uygulama içinde hazır olmadan yurtdışı açma).

## G. Abonelik ürünleri
1. Play Console > Para kazanma > Abonelikler: ürün `homezy_premium`, temel planlar `aylik` (6,99 $) ve `yillik` (59,99 $). `aylik` için teklif `ilk-ay` (4,99 $, yeni müşteri). Türkiye fiyatları: aylık 149,99 TL, yıllık 1.564,99 TL, ilk ay 119,99 TL.
2. Play Console > API erişimi > servis hesabı JSON'u oluştur, RevenueCat > Google uygulamasına yükle; Play'de bu hesaba "mali veriler + siparişleri yönet" izni ver.
3. RevenueCat: Android uygulaması `com.meikai.homezy`, ürünleri içe aktar, `premium` yetkisine bağla, default offering'de `$rc_monthly` ve `$rc_annual`. Genel `goog_` anahtarı `.env`'de (`EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`) doğru mu bak.
4. Lisans test hesapları: Play Console > Ayarlar > Lisans testi, kendi Gmail'ini ekle. Neden: gerçek para çekilmeden satın alma denenir.
5. Ayrıntı: `docs/odeme-kurulumu.md`.

## H. Derleme ve yükleme (bilgisayarda, C:\lf-wt, `npx.cmd`)
1. `git pull` (integration/tum-pr), `npm install`, `npm run typecheck`, `npm run lint` — **yeni yerel modüller (expo-location, expo-audio vb.) için emülatörde `npx.cmd expo run:android` ile yeniden derle ve dene.**
2. `npx.cmd eas build -p android --profile production` → .aab üretir (versionCode otomatik artar).
3. İlk .aab'yi Play Console > Test > **Dahili test** > yeni sürüm olarak elle yükle (ilk yükleme elle olmalı). Sonra `npx.cmd eas submit -p android` çalışır.
4. Play App Signing'e izin ver (varsayılan). Test kullanıcılarını e-posta listesiyle ekle, davet bağlantısını kendi telefonuna aç.
5. Ses lisansı: lofi/ortam sesleri Pixabay kaynaklı; uygulamada Ben > Hakkında'da kredi satırı var. Dosyaları gerçekten Pixabay'den indirdiğini doğrula.

## I. Telefonda gerçek test listesi (dahili test sürümü gelince)
- İlk açılış tanıtımı (10 sayfa) ve ev çizme; hesap aç / misafir devam.
- Bir iş tamamla, puan, seri, Bugün ve Gelişim sekmeleri.
- Buzdolabı ve kıyafet taraması (internet açık/kapalı), Moka sohbet, odak + lofi.
- Bildirim izni ve sabah özeti saati; konum izni (reddedince de çalışmalı).
- Satın alma (lisans testi), satın alımı geri yükle, iptal sonrası Premium'un düşmesi.
- Hesabı sil → tekrar giriş denenemez, veri gitmiş olmalı.
- Karanlık tema, küçük ekran, uygulamayı kapat-aç.

## İ. Apple tarafı (kişisel Apple Developer hesabı)
1. **App Store Connect:** yeni uygulama, paket kimliği `com.meikai.homezy` (kimlik Developer portalında kayıtlı olmalı; EAS ilk build'de sorar), ad "Homezy: Günlük Rutin ve İşler", birincil dil Türkçe.
2. **iOS build:** `npx.cmd eas build -p ios --profile production` (Mac gerekmez; Apple girişini ve sertifikaları EAS yönetir). Sonra `npx.cmd eas submit -p ios` ile TestFlight'a gönder.
3. **TestFlight:** dahili test (kendi Apple kimliğin) hemen çalışır; dış test için ilk sürümde kısa bir Apple incelemesi olur.
4. **Abonelik (iOS):** App Store Connect > Abonelikler: grup + ürünler `homezy_premium_aylik` ve `homezy_premium_yillik`, ilk ay giriş teklifi. Ücretli Uygulamalar sözleşmesi + banka/vergi bilgisi doldurulmadan ürünler aktif olmaz.
5. **RevenueCat iOS:** iOS uygulaması ekle, App Store Connect API anahtarı/paylaşılan gizli anahtarı yükle, ürünleri `premium` yetkisine bağla, `goog_` yanına `appl_` genel anahtarını al ve `.env`'e ekle (kodda iOS anahtarının okunduğunu ilk iOS build'den önce doğrula).
6. **Gizlilik "beslenme etiketleri" (App Privacy):** e-posta (hesap), fotoğraflar (tarama), yaklaşık konum, satın alma geçmişi, reklam/kullanım verisi (AdMob). İzleme: AdMob kullanıyorsan ATT izni ve `NSUserTrackingUsageDescription` gerekir; iOS AdMob kimliklerini (`EXPO_PUBLIC_ADMOB_APP_ID_IOS` ve banner) al, yoksa iOS'ta reklam kapalı kalmalı.
7. **Sign in with Apple:** sadece Google/Facebook gibi *üçüncü taraf girişi* sunarsan zorunlu. Uygulamada e-posta + şifre ve misafir var, bu yüzden **gerekmez**; ileride Google ile giriş eklenirse Apple ile giriş de eklenmeli.
8. **Hesap silme** uygulama içinde var (Apple şartı karşılanıyor). İnceleme için bir demo hesabı ve notu hazırla; fotoğraf/konum izin metinleri `app.json`'da Türkçe.
9. Ekran görüntüleri: 6,7" (1290×2796) ve 6,5"/5,5" setleri.

## J. Sonra (ilk testten sonra)
- İngilizce çeviri altyapısı (yurtdışı öncesi şart).
- iOS: D-U-N-S → Apple hesabı → `eas build -p ios` → TestFlight.
- Sürüm notları, çökme izleme (Play Console Android vitals yeterli ilk aşamada).

## K. RevenueCat kurulum listesi (koddaki gerçek değerlerle)
Kodda sabit olanlar: yetki (entitlement) kimliği **`premium`**; paketler **`$rc_monthly`** ve **`$rc_annual`** (uygulama `offerings.current` içindeki aylık/yıllık paketi okur); kullanıcı kimliği = Supabase kullanıcı UUID'si (misafir de anonim UUID alır). Ayrıntı: `docs/odeme-kurulumu.md`.

1. **Android uygulamasının paket adını kontrol et (en olası hata).** Uygulamanın paketi artık `com.meikai.homezy`. RevenueCat'te Android app'i eski adla (`com.meikaidigital.layfapp`) açtıysan: RevenueCat > Project settings > Apps > Android app > paket adını `com.meikai.homezy` yap (ya da yeni app ekle ve anahtarı değiştir). Yanlışsa satın alma çalışmaz.
2. **Play service credentials:** Google Cloud'da servis hesabı + JSON anahtar, Play Console > Kullanıcılar ve izinler'de bu hesaba "Mali verileri görüntüle" ve "Siparişleri ve abonelikleri yönet" izni, RevenueCat > Android app > Service credentials'a JSON'u yükle. Play'in tanıması 24-36 saat sürebilir; RevenueCat'te yeşil tik beklenir. Ayrıca Play > Monetization setup'ta RevenueCat'in önerdiği "Real-time developer notifications" (Pub/Sub konusu) bağlantısını kur.
3. **Ürünler:** Play'de abonelik `homezy_premium` + temel planlar `aylik`, `yillik` (+ `aylik` için `ilk-ay` teklifi). Önce Play'e en az bir sürüm (dahili test .aab) yüklenmiş olmalı, yoksa abonelik oluşturulamaz. RevenueCat > Products > Import: `homezy_premium:aylik` ve `homezy_premium:yillik`.
4. **Entitlement:** adı birebir **`premium`**; iki ürünü de bağla.
5. **Offering:** `default` olsun ve **Current** işaretli olsun. Paketler: Monthly (`$rc_monthly`) → `homezy_premium:aylik`, Annual (`$rc_annual`) → `homezy_premium:yillik`. Başka kimlik kullanırsan uygulama fiyatı bulamaz.
6. **API anahtarları (herkese açık, uygulamada):** Android `goog_...` zaten `.env`'de (`EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`). iOS için `appl_...` ekle: `EXPO_PUBLIC_REVENUECAT_IOS_KEY`. `.env` repoya girer (EAS bulutu `.env.local`'ı görmez). Gizli `sk_...` anahtarı asla uygulamaya girmez.
7. **Supabase gizli değişkenleri (edge function'lar için):** `REVENUECAT_API_KEY` (RevenueCat > API keys > secret key, `sk_...`, v1 okuma yetkisi) ve `REVENUECAT_WEBHOOK_SECRET` (kendin belirlediğin uzun bir değer). `npx.cmd supabase secrets set REVENUECAT_API_KEY=... REVENUECAT_WEBHOOK_SECRET=...`
8. **Webhook:** RevenueCat > Integrations > Webhooks > yeni: URL `https://gkccsimguzabfrsumjtv.supabase.co/functions/v1/revenuecat-webhook`, Authorization header değeri `Bearer <REVENUECAT_WEBHOOK_SECRET>`, ortam: hem sandbox hem production. "Send test event" → 200 dönmeli. Fonksiyon kullanıcıyı RevenueCat'ten tekrar okuyup `subscriptions` tablosuna yazar (`supabase/functions/_shared/subscription.ts`); uygulama da satın almadan sonra `subscription-sync` çağırır. İki fonksiyon da deploy edilmiş olmalı (bölüm C).
9. **Sandbox / test:** Play lisans test hesabı (bölüm G.4) ile dahili test sürümünden satın al. Beklenen: uygulamada Premium açılır, RevenueCat > Customers'ta kullanıcı UUID'si görünür, Supabase `subscriptions` tablosunda `active = true`, `product_id = homezy_premium:aylik`. Test aboneliği hızlı yenilenir/biter; iptal edip Premium'un düştüğünü de dene. Geliştirici kimliğiyle emülatörde (Play'siz) satın alma denenemez.
10. **iOS (sonra):** App Store Connect'te `homezy_premium_aylik` / `homezy_premium_yillik` ürünleri (bölüm İ), RevenueCat'e iOS app + App Store Connect API anahtarı, ürünleri `premium`'a ve aynı offering'e bağla (iOS ürünleri aynı Monthly/Annual paketlerine eklenir).
11. **Fiyatlar:** 6,99 $ / 59,99 $ / ilk ay 4,99 $; Türkiye 149,99 TL / 1.564,99 TL / ilk ay 119,99 TL. RevenueCat fiyat tutmaz, mağazadaki fiyat geçerlidir; Play'de Türkiye fiyatını elle gir.
