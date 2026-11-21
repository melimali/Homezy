# Homezy tam yayın kontrol listesi (2026-11-21)

Kaynak: `integration/tum-pr` e820198 + bu dalın değişiklikleri. ✅ yapıldı · 🖐 Melih · ⛔ engel/risk · ❓ doğrulanmadı.
**Kural: Melih "go" demeden EAS build, submit, yayın YOK. (Android'de 1 EAS kredisi var; ücretsiz krediler 2026-12-01'de yenilenir.)**

## A. Sürüm planı

| Madde | Durum |
|---|---|
| iOS mağazada 1.0.3. `app.json` sürümü 1.0.4 (1447ec5'te hazırlanan 1.0.4 eskiydi; güncel kod bunun üstünde) | ✅ 1.0.4 kalsın |
| Android `versionCode`: EAS uzaktan (`appVersionSource: remote`, `autoIncrement`) | ✅ elle artırma yok |
| `runtimeVersion: appVersion` + OTA: yeni yerel modüller (`expo-asset`, iOS widget) yüzünden 1.0.4 binary'si ancak yeni build ile gider; eski 1.0.3'e OTA gitmez | ✅ doğru |
| Paket kimliği `com.meikai.homezy` (iOS+Android), app group `group.com.meikai.homezy` | ✅ |
| Yerel modüller (yeni build şart): expo-location, expo-sensors, expo-blur, expo-audio, expo-haptics, expo-asset, @bacons/apple-targets (iOS widget), android-widget, google-mobile-ads, purchases | ✅ production build hepsini sıfırdan derler |
| iOS `CFBundleLocalizations`: tr en de es fr pt ja ko ar (AR RTL kod tarafında) | ✅ |
| `ITSAppUsesNonExemptEncryption=false`, privacy manifest | ✅ |
| Android izinleri: RECORD_AUDIO, depolama, medya, arka plan konum engelli. Konum yalnızca ön plan | ✅ |
| R8 + resource shrink açık (`app.json` expo-build-properties) | ✅ |

## B. Ön kontrol (temiz klonda, e820198 üstü)

| Kontrol | Sonuç |
|---|---|
| `npx tsc --noEmit` | ✅ temiz (test dosyaları için `tsconfig` `types: [jest,node]` eklendi; önce 46 test-tipi hatası vardı) |
| `jest` | ✅ 241 geçti, 1 atlandı |
| `expo lint` | ❓ çalıştırıldı ama bitmedi/çıktı alınamadı; eski notta 6 react-hooks kuralı uyarısı var (derlemeyi engellemez). Build öncesi tekrar çalıştır |
| `expo-doctor` | ✅ `expo-asset` peer eksikti → eklendi (expo-audio çökme riski, **native**). ❓ Kalan: `@sentry/react-native` 8.33 (beklenen ~8.28), `react-native-safe-area-context` 5.10.1 (beklenen ~5.11.1), 20 paket patch farkı. Çökme nedeni değil; build öncesi `npx expo install --check` ile hizalamak istersen tek seferde yapılır |
| `expo export` / prebuild | ❓ bu makinede çalıştırılmadı; build öncesi `npx expo export --platform android` önerilir |
| Debug menüsü / dev kodu | ❓ `__DEV__` korumaları ve admin hediye aracı (`admin_grant_points`) sunucuda yalnızca sahip hesabına açık olmalı; build öncesi son gözden geçirme önerilir |
| Ortam anahtarları | `.env`: Supabase URL/anon + RevenueCat **Android** (goog_). 🖐 EAS production ortamında doğrula: `EXPO_PUBLIC_REVENUECAT_IOS_KEY` (appl_), `EXPO_PUBLIC_ADMOB_APP_ID_{ANDROID,IOS}`, `EXPO_PUBLIC_ADMOB_BANNER_{ANDROID,IOS}` (yoksa `app.config.ts` production build'i durdurur — iyi) |

## C. Supabase (`gkccsimguzabfrsumjtv`, eu-west-1, ACTIVE_HEALTHY)

| Madde | Durum |
|---|---|
| Edge function'lar aktif: scan v11, moka-chat v10, subscription-sync v7, revenuecat-webhook v7 (webhook `verify_jwt=false`, diğerleri true) | ✅ doğru ayarlar |
| Son güncelleme 2026-11-14 civarı. Repodaki sonraki değişiklikler (örn. moka-chat boş yanıt koruması d226a85) için 🖐 yeniden deploy: `supabase functions deploy scan moka-chat subscription-sync` ve `supabase functions deploy revenuecat-webhook --no-verify-jwt` |
| Migration kaydı: yalnızca `kurk`, `puan_hediye` kayıtlı; diğerleri SQL editörle uygulanmış (tablolar ve RPC'ler var) | ✅ çalışıyor, ❓ kayıt tutarsız; sorun değil |
| RLS: tüm tablolarda açık. 12 tabloda politika yok (ai_*, family_*, lb_*, shared_homes, chat_usage) = yalnızca RPC/servis erişimi; bu tasarım gereği | ✅ |
| Advisor ⚠️ `handle_new_user()` anon/authenticated çağırabiliyor (trigger fonksiyonu) | 🖐 önerilen: `revoke execute on function public.handle_new_user() from anon, authenticated, public;` (yayını engellemez) |
| Advisor ⚠️ 27 SECURITY DEFINER RPC `authenticated`'a açık | ✅ uygulama bunları çağırıyor, her biri içinde `auth.uid()` kontrolü olmalı (güvenlik raporu 2026-11 incelendi) |
| Advisor ⚠️ sızmış şifre koruması kapalı | 🖐 Auth > Password security aç |
| Secret'lar: `ANTHROPIC_API_KEY`, `REVENUECAT_WEBHOOK_SECRET`, `REVENUECAT_API_KEY`, (`SCAN_MODEL`, `CHAT_MODEL`) | 🖐 panelde varlığını doğrula (değerleri bu oturum göremez) |
| Auth: SMTP, e-posta şablonları, rate limit, Site URL/redirect | 🖐 (`docs/yayin-kontrol-listesi.md` §5) |

## D. RevenueCat (panel erişimi bu oturumda yok; hepsi 🖐 doğrulama)

1. Proje > Apps: Google (`com.meikai.homezy`) ve App Store (`com.meikai.homezy`) uygulamaları var, her birinde public anahtar (goog_ / appl_) EAS ortamıyla aynı.
2. Google: Play servis hesabı JSON'u yüklü, "Credentials valid".
3. Apple: App Store Connect API anahtarı + In-App Purchase anahtarı (.p8) yüklü.
4. Products: Play `homezy_premium` (base plan `aylik`, `yillik`), App Store aylık+yıllık ürünler; hepsi içe aktarılmış.
5. Entitlement `premium` iki platformun ürünlerine bağlı.
6. Offering `default` **current**; paketler `$rc_monthly`, `$rc_annual`, her ikisinde iki platform ürünü.
7. Webhook: `https://gkccsimguzabfrsumjtv.supabase.co/functions/v1/revenuecat-webhook`, Authorization `Bearer <REVENUECAT_WEBHOOK_SECRET>`; "Send test event" 200 dönmeli.
8. Fiyatlar: USD 6,99 / 59,99; TR 149,99 / 1.559,99 (tüm belgeler ve koddaki yedek fiyat 1.559,99 olarak birleştirildi; mağazada da aynı gir).

## E. iOS widget = Android widget (bu dalda yapıldı)

Önce iOS: sabit Türkçe metin, 🔥, "N iş kaldı", navy zemin, tema yok. Şimdi: veri `src/widget/ios.ts` içinde Android ile aynı kaynaktan (`widgetData`) hazırlanır; başlık ("Bugün N iş"/"Her şey tamam"/"Tatildesin"), alt satır ("N/M bitti" ya da "+N iş daha"), ☕ seri (>0 ise), satırlar "emoji · ad · oda · durum" (gecikmiş kırmızı), boş durum metni, **dil** (`tx`), **açık/koyu** renkler (`palettes`) aktarılır; `targets/widget/index.swift` bunu çizer. Satır dokunuşu `homezy://bugun` açar.
- ⛔ Fark: Android'deki satır içi ✓ "Yaptım" düğmesi iOS'ta yok (iOS 17 AppIntent + uygulamaya bekleyen-işlem kuyruğu gerekir). Bu sürüme alınmadı; riskli ve Mac'siz doğrulanamıyor.
- ❓ Swift kodu bu makinede derlenmedi (Mac yok). İlk EAS iOS build'inde derleme hatası çıkarsa hızlı düzeltilir.
- **Native rebuild gerekir mi: EVET** (widget extension Swift değişti; OTA ile gitmez). Yeni iOS build şart.

## F. Boyut optimizasyonu

| Değişiklik | Önce → sonra |
|---|---|
| `assets/moka/drawn-holds` PNG→WebP (q88, alfa korundu, 161 dosya, kodda yollar güncellendi) | 71,5 MB → 11 MB (**−60 MB kaynak**) |
| Zaten açık: Hermes, R8 minify + resource shrink, AAB (Play ABI/yoğunluk bölmesini kendisi yapar) | ✅ |
| Aday (yapılmadı): `assets/sounds` 14 MB mp3 (fan 3,6 MB, firepit 1,5 MB…) 64 kbps'e düşürülebilir, ffmpeg bu makinede yok; `assets/scenes` 7,5 MB jpg; `assets/store` (3,4 MB, pakete girmiyor) | ❓ |
| Gerçek indirme boyutu ölçümü | 🖐 ancak build sonrası (Play "Uygulama boyutu" / `eas build` AAB) |

## G. Mağaza hazırlığı

| Madde | Durum |
|---|---|
| Metin: `docs/magaza-metni.md` (TR), `-en.md` | ✅ TR+EN |
| **9 dil yerelleştirme (de es fr pt ja ko ar)** mağaza metni | ⛔ yok; TR+EN ile yayın olur, diğer dillerde mağaza EN gösterir. İstersen ayrı iş olarak çeviririm |
| Ekran görüntüleri `docs/magaza/{tr,en}/play`, `ios-6.7/6.5/5.5`, feature graphic, 512 ikon | ✅ var; ❓ güncel arayüzle uyumu son kez bak |
| Gizlilik/Koşullar/Hesap silme URL: `themeikai.com/homezy/{gizlilik,kosullar,hesap-silme}` | 🖐 canlı ve 200 dönüyor mu kontrol et |
| Play: Veri güvenliği (`docs/yasal/magaza-formlari.md` cevapları hazır), içerik derecelendirme (IARC, sohbet botu sorusu), reklam=evet, hedef kitle 13+, hesap silme URL, trader/geliştirici durumu (kişisel hesap, adres görünür) | 🖐 |
| Apple: App Privacy anketi, inceleme notları (demo hesap gerekmiyor; misafir giriş var; yapay zekâ taraması ve abonelik açıklaması), yaş derecelendirme, destek URL `https://themeikai.com` | 🖐 |
| AdMob: app-ads.txt themeikai.com kökünde, mağaza bağlama, UMP GDPR mesajı yayında | 🖐 |
| Play kişisel hesap: 12 testçi/14 gün kapalı test kuralı geçerli mi? Pano > Production erişimi | ❓ 🖐 |

## H. Dünya çapında yayın

- Google Play: Production > Ülkeler/bölgeler > tüm kullanılabilir ülkeleri seç; Abonelik fiyatları ülke bazlı (USD 6,99 / 59,99 baz, TR 149,99 / 1.559,99). 🖐
- App Store: Fiyat ve Kullanılabilirlik > tüm ülkeler; abonelik fiyat noktaları USD 6,99 / 59,99, Türkiye ayrı fiyat. 🖐
- Yasal: AB (GDPR/UMP), Çin hariç bırakmak ve Güney Kore/Japonya için ek mağaza zorunlulukları ayrıca değerlendirilmeli ❓.

## I. Sıralı adımlar

1. Bu dalı incele/birleştir (widget, WebP, expo-asset, tsconfig). 🖐
2. `npx expo install --check` (isteğe bağlı hizalama), `npx expo export --platform android` sanity.
3. Supabase: 4 fonksiyonu yeniden deploy, secret ve auth ayarlarını doğrula, `handle_new_user` revoke.
4. RevenueCat §D listesini panelde işaretle; EAS env değişkenlerini `eas env:list production` ile doğrula.
5. Mağaza konsolları §G, §H.
6. **Melih'den "go"** → önce iOS build+TestFlight (kredi sorunu yok mu doğrula), Android build (tek kredi: hata payı yok, 2. adım şart).
7. TestFlight/dahili testte: açılış, satın alma (sandbox), widget iOS+Android, tarama, bildirim.
8. İki mağazaya gönder, aşamalı yayın (Play %20 → 100).

## J. Risk listesi

1. Tek Android EAS kredisi: build hata verirse 2026-12-01'e kadar bekleme. Azaltma: adım 2 sanity + bu dalın tsc/jest temiz olması.
2. iOS Swift widget derlenmemiş kod (Mac yok).
3. RevenueCat paneli doğrulanamadı; offering `current` değilse paywall boş kalır.
4. Edge function'lar güncel koddan eski olabilir (11-14 deploy).
5. Play kişisel hesap 14 gün kapalı test kuralı yayını geciktirebilir.
6. 9 dil için mağaza metni yok (uygulama içi dil var).
7. TR yıllık fiyat 1.559,99 TL olarak birleştirildi; Play/App Store'a da aynısı girilmeli.
8. Paket boyutu hâlâ büyük olabilir: sesler ve sahne jpg'leri.
