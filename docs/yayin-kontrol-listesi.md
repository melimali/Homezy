# Homezy yayın kontrol listesi (2026-11-01)

Durum: ✅ kodda tamam · 🖐 Melih elle yapacak (adım adım: `MELIH-MANUEL-ISLER.md`) · ❓ belirsiz / doğrulanmalı

Bağlam: Melih'in şirketi yok, D-U-N-S yok. Google Play ve Apple **kişisel** hesap. Meikai Digital yayıncı planı iptal.

## 1. Uygulama yapılandırması (app.json / eas.json)

| Madde | Durum | Not |
|---|---|---|
| Android paket adı `com.meikai.homezy`, iOS `bundleIdentifier` aynı | ✅ | Mağazaya ilk yüklemeden sonra değişmez. (CLAUDE.md'deki `com.meikaidigital.layfapp` eski, bu dosya doğru.) |
| Sürüm `1.0.0`, `versionCode 1`; `eas.json` production `autoIncrement` + `appVersionSource: remote` | ✅ | Her production build kodu kendisi artırır |
| Production profili = `app-bundle` (.aab), `environment: production` | ✅ | |
| Submit: `track: internal` | ✅ | İlk .aab elle yüklenir, sonra `eas submit` çalışır. Submit için Play servis hesabı JSON'u gerekir (🖐) |
| İkon 1024×1024, adaptive icon, splash (açık/koyu) | ✅ | Apple için alfa kanalı olmamalı: `assets/icon.png` yayından önce kontrol et ❓ |
| İzinler: konum sadece ön plan, `READ_MEDIA_*`, `RECORD_AUDIO`, arka plan konumu engelli | ✅ | Kamera, bildirim, konum metinleri Türkçe |
| `SCHEDULE_EXACT_ALARM` | ❓ | Kodda istenmiyor; Play Console > Uygulama paketi gezgini / Veri güvenliği ön kontrolünde çıkarsa gerekçe yaz |
| Bildirim kanalı `sabah-ozeti` | ✅ | |
| Android widget (react-native-android-widget) | ✅ | |
| **AdMob test ID yayında kalmasın** | ✅ **düzeltildi** | `app.config.ts`: production derlemede `EXPO_PUBLIC_ADMOB_APP_ID_ANDROID` EAS'ta yoksa derleme hata verip durur. Eskiden sessizce Google test kimliği ile çıkardı |
| `tsc` temiz | ✅ **düzeltildi** | `House3D.tsx` 2 TS7023 hatası giderildi (EAS bunu çalıştırmaz ama temiz olsun) |
| `eslint` | ❓ | 6 `react-hooks` (React Compiler) kuralı hatası: House3D, MokaPet, PurchasesProvider. Derlemeyi engellemez, davranış hatası değil; sonraya bırakıldı |
| Yerel modül dolu: expo-location, expo-audio, expo-blur, haptics | ❓ | Production build her şeyi sıfırdan derler, sorun yok. Emülatör geliştirme APK'si için yeniden derleme gerekir (`npx.cmd expo run:android`) |

## 2. EAS ortam değişkenleri (production ortamı)

EAS bulut derlemesi `.env.local` dosyasını **görmez**. Takip edilen `.env` dosyası görülür (git'te). Gereken:

| Değişken | Nereden | Durum |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_KEY` | `.env` içinde (anon anahtar, herkese açık) | ✅ |
| `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` (`goog_…`) | `.env` içinde | ✅ (RevenueCat'te aynı anahtar olduğunu doğrula 🖐) |
| `EXPO_PUBLIC_REVENUECAT_IOS_KEY` (`appl_…`) | RevenueCat iOS uygulaması | 🖐 iOS için, şimdilik gerekmez |
| `EXPO_PUBLIC_ADMOB_APP_ID_ANDROID` (`ca-app-pub-6763724339604565~6223192132`) | AdMob | 🖐 `eas env:list production` ile doğrula; yoksa build artık durur |
| `EXPO_PUBLIC_ADMOB_BANNER_ANDROID` (`…/6167351815`) | AdMob | 🖐 yoksa production'da reklam çıkmaz (hata vermez) |
| iOS AdMob ID'leri | AdMob | 🖐 iOS için |

## 3. AdMob

| Madde | Durum |
|---|---|
| Banner sadece Ev ve Bugün altında, Premium'da yok, tam ekran/ödüllü reklam yok | ✅ |
| Kişiselleştirilmemiş reklam (`requestNonPersonalizedAdsOnly`), `maxAdContentRating: PG` | ✅ |
| UMP onay penceresi (`AdsConsent.gatherConsent`) reklamdan önce; `canRequestAds` false ise reklam yok | ✅ kodda, 🖐 AdMob panelinde **GDPR mesajı oluşturulup yayınlanmalı**, yoksa Avrupa'da onay penceresi çıkmaz ve reklam gelmez |
| Banner ID production'da yoksa reklam göstermez, test reklamı sadece `__DEV__` | ✅ |
| `app-ads.txt` themeikai.com kökünde | 🖐 |
| AdMob uygulamasını Play mağaza kaydına bağlama | 🖐 (uygulama Play'de yayınlanınca / test sürümünde görününce) |
| Çocuk içeriği: uygulama **13+**, "çocuklara yönelik" işaretlenmemeli; AdMob'da `tagForChildDirectedTreatment` kullanılmıyor | ✅ tutarlı |
| AdMob ödeme bilgisi, vergi formu, adres PIN'i | 🖐 |
| Reklam kimliği (AD_ID) izni Play'de beyan | 🖐 Veri güvenliği: reklam kimliği → toplanıyor + AdMob ile paylaşılıyor, amaç reklam. "Reklam kimliği" beyanı ayrı sayfada da sorulur |

## 4. RevenueCat

| Madde | Durum |
|---|---|
| Yetki (entitlement) kod ve sunucuda `premium` (`PurchasesProvider.tsx`, `_shared/subscription.ts`) | ✅ |
| Offering: kod `getOfferings().current` okuyor; paketler `$rc_monthly` / `$rc_annual` | ✅ kodda; 🖐 panelde default offering'in **current** olduğunu doğrula |
| Ürün kimlikleri: Play `homezy_premium` ürünü, temel planlar `aylik` / `yillik`, teklif `ilk-ay` (`homezy_premium:aylik`, `:yillik`) | ❓ Eski notlarda `layfapp_premium` geçiyor; güncel belge `docs/odeme-kurulumu.md` `homezy_premium`. RevenueCat'te içe aktarılan ürünün adını kontrol et |
| `goog_` genel anahtar `.env`'de | ✅ |
| Play servis hesabı JSON'unu RevenueCat Google uygulamasına yükleme + Play'de izin | 🖐 (en sık takılma noktası; yükledikten sonra RevenueCat "Credentials valid" göstermeli, 36 saate kadar sürebilir) |
| Webhook: `https://gkccsimguzabfrsumjtv.supabase.co/functions/v1/revenuecat-webhook`, Authorization = `Bearer <REVENUECAT_WEBHOOK_SECRET>` | ✅ fonksiyon hazır, 🖐 panelde değerleri doğrula, "Send test event" → 200 |
| Webhook fonksiyonu `--no-verify-jwt` ile deploy edilmeli, secret yoksa her isteği reddeder | ✅ kodda, 🖐 deploy |
| Kullanıcı kimliği: uygulama RevenueCat'e Supabase kullanıcı UUID'sini verir; anonim RC kimlikleri atlanır | ✅ |
| Satın alımı geri yükle, abonelik yönetimi bağlantısı (Play / App Store) | ✅ |
| Fiyatlar: USD 6,99 / 59,99 / ilk ay 4,99; TR 149,99 / 1.564,99 / 119,99 TL | 🖐 Play Console'da elle girilir (paywall mağaza fiyatını gösterir, kodda sabit fiyat yok) |
| Sandbox / lisans testi (Gmail'i ekle) | 🖐 |

## 5. Supabase (proje `gkccsimguzabfrsumjtv`, Frankfurt)

| Madde | Durum |
|---|---|
| Tüm SQL tek dosyada: `supabase/tum-sql.sql` (idempotent). **Eksikti: `persona` kolonu** (profiles.persona) | ✅ **düzeltildi**: eklendi. Yoksa "Seni tanıyalım" cevapları kaydedilemez |
| Migration sırası: hesap → delete_me → puan → premium → scan → scan_premium_50 → bahçe → aile_evi → moka_chat → yasal_silme → ai_suistimal → persona → güvenlik | ✅ tum-sql bu sırada. Not: iki dosya aynı zaman damgasını taşıyor (`20261101000000_ai_suistimal` ve `_persona`); `supabase db push` yerine SQL Editor'e `tum-sql.sql` yapıştır, çakışma olmaz |
| Çalıştırıldı mı? | ❓ Melih'in belirsiz bıraktığı: bahçe, aile_evi, moka_chat, yasal_silme, ai_suistimal, persona, güvenlik. En kolayı `tum-sql.sql`'i bir kez daha çalıştırmak |
| RLS: tablolara doğrudan yazma yok, yazma RPC ile; `subscriptions` sadece sunucu yazar | ✅ (guvenlik raporu) |
| Edge function'lar: `scan`, `moka-chat`, `subscription-sync` (JWT doğrulamalı), `revenuecat-webhook` (`--no-verify-jwt`) | ✅ kodda, 🖐 deploy (en son kod ile; güvenlik değişiklikleri için hepsi yeniden) |
| Secret'lar: `ANTHROPIC_API_KEY`, `REVENUECAT_WEBHOOK_SECRET`, `REVENUECAT_API_KEY` (`sk_…`); `SUPABASE_SERVICE_ROLE_KEY` Supabase'ce otomatik. İsteğe bağlı: `SCAN_MODEL`, `CHAT_MODEL` (varsayılan `claude-haiku-5-5`), `AI_DISABLED` | 🖐 `supabase secrets list` |
| Auth: anonim girişler açık | 🖐 |
| Auth: e-posta onayı açık, Site URL + Redirect URLs (`https://themeikai.com/homezy/eposta-onayi`) | 🖐 |
| Auth: Türkçe e-posta şablonları (Confirm signup, Reset password, Magic link) | 🖐 |
| Auth: SMTP — varsayılan Supabase e-postası saatte çok az mail gönderir (test içindir), yayın için özel SMTP gerekir | 🖐 (Resend / Brevo vb.) |
| Auth: rate limit (anonim giriş, kayıt, e-posta) | 🖐 Captcha uygulamada **yok** (WebView gerekir); önce rate limit |
| Auth: şifre en az 8 karakter, sızmış şifre koruması | 🖐 önerilir |
| Anonim hesap temizliği `cleanup_anonymous()` | ✅ SQL'de; zamanlama isteğe bağlı (`pg_cron`) |
| Hesap silme `delete_me()` (uygulama içi: Ben > Hesabımı sil) | ✅ |
| `pc-sync/.env` paylaşılan klasörde gizli anahtar var mı | 🖐 varsa sil ve anahtarı yenile |
| Anthropic aylık harcama limiti | 🖐 |
| Premium'u kendine verme (test): `subscriptions` satırı | ✅ SQL hazır, yayın öncesi gerçek abonelikle de dene |

## 6. Yasal

| Madde | Durum |
|---|---|
| Sayfalar repoda: `docs/yasal/` (gizlilik, koşullar, hesap silme, e-posta onayı, EN sürümler) | ✅ |
| Yayın adresleri `https://themeikai.com/homezy/gizlilik`, `/kosullar`, `/hesap-silme`, `/eposta-onayi` (uygulama `src/lib/links.ts` bunları kullanıyor) | 🖐 sunucuya yükleme (proje klasöründe `themeikai-yasal/homezy/`) |
| İletişim e-postası: kodda `info@themeikai.com`. Sayfalarda aynı adres olmalı | ❓ Gerçek, okunan bir kutu mu? Play bu adrese doğrulama / politika bildirimi yollar |
| Veri sorumlusu: Melih Tuğyan (şahıs), adres yazılmadı | ❓ Play kişisel hesapta ad + adres mağazada görünür; Apple de adres ister. Posta kutusu / sanal adres düşün |
| Gizlilikte: fotoğraf + yapay zekâ, konum (sadece hava), Moka sohbeti, AdMob, RevenueCat, hesap silme | ✅ (yayın günü tarihi güncelle) |
| Play Veri Güvenliği formu | ✅ cevaplar hazır `docs/yasal/magaza-formlari.md`, 🖐 forma girilecek |
| İçerik derecelendirme (IARC) | 🖐 sohbet botu sorusunu dürüst işaretle |
| Reklam beyanı: Evet | 🖐 |
| Hedef kitle: 13+ (çocuk uygulaması değil) | 🖐 |
| Hesap silme web adresi (Play zorunlu) | 🖐 form alanına `…/hesap-silme` |
| Sağlık uygulaması beyanı (spor/ilaç notları) | ❓ Play "Sağlık" formunda uygulama sağlık işlevi sayıyorsa "evet" demek gerekebilir; spor günlüğü basit, tıbbi iddia yok |
| Avukat görüşü (KVKK/VERBİS, GDPR temsilci) | ❓ önerilir, yayını engellemez |

## 7. Mağaza içeriği

| Madde | Durum |
|---|---|
| Başlıklar: Play TR "Homezy: Rutin ve Ev İşleri", EN "Homezy: Routine & Chores"; Apple TR "Homezy: Günlük Rutin ve İşler", EN "Homezy: Daily Routine & Chores" | ✅ `docs/magaza-metni.md`, `-en.md` |
| Görseller: `docs/magaza/tr|en/play` (1080×1920 ×8), `ios-6.7`, `ios-6.5`, `ios-5.5`, `feature-graphic-1024x500.png`, `play-icon-512.png` | ✅ |
| Görsellerdeki ekranlar güncel uygulamayla uyumlu | ❓ yayından önce son kez bak |
| Destek e-postası, web sitesi (themeikai.com), gizlilik URL'si | 🖐 |
| Ses kredileri (Pixabay) | ❓ Lofi için gerçek ses dosyası yok; dosya eklenmeden "Pixabay" kredisi doğru olmaz |

## 8. Google Play Console (kişisel hesap)

| Madde | Durum |
|---|---|
| Hesap onayı (kimlik + telefon/cihaz doğrulama) | 🖐 beklemede olabilir |
| **Kişisel hesap kuralı:** yeni kişisel hesaplarda production'dan önce **kapalı test: en az 12 test kullanıcısı, 14 gün kesintisiz** | ❓ Kural değişebilir; Play Console > Pano'daki "Production erişimi" kartında **güncel şartı** oku. Testçi toplamaya şimdiden başla |
| Uygulama oluştur (TR, uygulama, ücretsiz) | 🖐 |
| Abonelik ürünü + base plan + `ilk-ay` teklifi + TR/USD fiyatları | 🖐 |
| Dahili test → kapalı test → production | 🖐 |
| Play App Signing | 🖐 varsayılan açık bırak |
| Lisans test hesabı | 🖐 |
| Pre-launch raporu (otomatik) çökmeleri | 🖐 dahili testten sonra bak |

## 9. Apple (sonra)

| Madde | Durum |
|---|---|
| Kişisel Apple Developer hesabı (99 $/yıl) | 🖐 |
| Bundle ID `com.meikai.homezy`, App Store Connect kaydı | 🖐 |
| `eas build -p ios`, TestFlight | 🖐 |
| Abonelik ürünleri `homezy_premium_aylik/_yillik` + giriş teklifi; Ücretli Uygulamalar sözleşmesi | 🖐 |
| iOS RevenueCat anahtarı `appl_…` (kodda okunuyor, yoksa iOS'ta satın alma kapalı) | 🖐 |
| iOS AdMob ID'leri yoksa iOS'ta reklam çıkmaz (test kimliği iOS app ID `app.json`'da duruyor; iOS yayınından önce gerçekle değiştir) | ❓ |
| Hesap silme uygulama içinde (Apple 5.1.1(v)), Apple ile giriş gerekmez | ✅ |
| Demo hesap + inceleme notu | 🖐 |
