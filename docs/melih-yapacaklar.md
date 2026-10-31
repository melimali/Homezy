# Melih'in yapacakları (Play testine hazırlık)

Sıra önemli. Her madde: ne, nerede, neden. Kod tarafı hazır; aşağıdakiler sadece senin hesaplarınla yapılabilir.

## A. Hesaplar (beklemesi uzun olanlar önce)
1. **D-U-N-S numarası** (Meikai Digital) — https://www.dnb.com/duns-number/get-a-duns.html (ücretsiz). Neden: Play ve Apple kuruluş hesabı bunu ister; onayı günler/haftalar sürer.
2. **Google Play Console kuruluş hesabı** — play.google.com/console. Yayıncı adı Meikai Digital. Neden: hesap onaylanmadan hiçbir yükleme yapılamaz. (Kişisel hesapta 12 kişi/14 gün test zorunlu, kuruluşta değil.)
3. **Apple Developer kuruluş hesabı** (99 $/yıl) — developer.apple.com. Neden: TestFlight için; Google testi sürerken başlat.

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

## J. Sonra (ilk testten sonra)
- İngilizce çeviri altyapısı (yurtdışı öncesi şart).
- iOS: D-U-N-S → Apple hesabı → `eas build -p ios` → TestFlight.
- Sürüm notları, çökme izleme (Play Console Android vitals yeterli ilk aşamada).
