# Denetim notları (Homezy)

Denetçi: salt-okunur kod incelemesi, kod değiştirilmedi. Dal: `integration/tum-pr`. Başlangıç: 2026-11-13.
Düzeltme yapan thread bu dosyayı okuyup maddeleri bitirdikçe `[x]` işaretleyebilir.
Öncelik: **Y** yüksek, **O** orta, **D** düşük. Biçim: `dosya:satır` · öncelik · sorun · önerilen çözüm.

Durum: build maddeleri eklendi; 1. tur (sunucu, veri katmanı, bulut yedeği, bildirim, ödeme) yazıldı; 2. tur (3D ev, sekmeler, UX, metin) devam ediyor.

---

## ⚠ BUILD GEREKTİREN MADDELER (SON build hakkı: bunlar şimdi yakalanmalı)

Kural: Her madde **BUILD GEREKTİRİR** ya da **BUILD GEREKTİRMEZ** (saf JS; OTA ile ya da sonraki build'de) diye işaretli. Aşağıdakiler build ÖNCESİ yapılmazsa sonradan düzeltilemez. **Bağımlılıkları dondur:** build'den sonra yeni native paket eklenirse eski build'de çöker.

- [ ] **BLD1 · Y · BUILD GEREKTİRİR · OTA (expo-updates) HİÇ KURULU DEĞİL.** `package.json`'da `expo-updates` yok; `app.json`'da `updates` / `runtimeVersion` yok; `eas.json` profillerinde `channel` yok. Sonuç: bu build'den sonra bulunan HER JS hatası yeni mağaza sürümü + yeni build ister (son build hakkın biter). Çözüm (build'den önce): `npx expo install expo-updates`; `app.json`: `"runtimeVersion": {"policy": "appVersion"}`, `"updates": {"url": "https://u.expo.dev/b96d1fb9-c720-4170-aaf3-c9e4d7d00bd3", "fallbackToCacheTimeout": 0, "checkAutomatically": "ON_LOAD"}`; `eas.json`: `preview`/`production` için `"channel": "preview"/"production"`. Sonra düzeltmeler `eas update --channel production` ile (build hakkı harcamaz, store incelemesi gerektirmez; yalnız JS/asset). Native kod/izin/paket değişirse yine build gerekir.
- [ ] **BLD2 · Y · BUILD GEREKTİRİR · `EXPO_PUBLIC_*` değerleri build anında koda gömülür.** `.env` git'te yok (`.gitignore`). EAS **production** ortamında şunlar dolu olmalı, yoksa uygulama bulutsuz/ödemesiz/reklamsız çıkar ve sonradan OTA ile bile değiştirilemez (OTA yeniden paketler ama env o anki ortamdan gelir; yine de en güvenlisi build öncesi `eas env:list production` ile doğrula): `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_KEY`, `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`, `EXPO_PUBLIC_REVENUECAT_IOS_KEY`, `EXPO_PUBLIC_ADMOB_APP_ID_ANDROID/IOS`, `EXPO_PUBLIC_ADMOB_BANNER_ANDROID/IOS`, `EXPO_PUBLIC_SENTRY_DSN`. `app.config.ts:25-34` yalnız AdMob'u kontrol edip build'i durduruyor; Supabase/RevenueCat/Sentry eksikse sessizce devam eder (`src/lib/supabase.ts:14-16`, `PurchasesProvider.tsx:25`, `crash.ts:22`). Çözüm: aynı fonksiyona bu anahtarlar için de fail-fast ekle. Ayrıca RevenueCat anahtarı `test_` ile başlıyorsa üretimde reddediliyor (iyi) ama bu durumda ödeme kapanır: `goog_`/`appl_` olduğunu doğrula.
- [ ] **BLD3 · Y · BUILD GEREKTİRİR · Sentry eklentisi (`app.json` plugin `@sentry/react-native/expo`)** derlemede `SENTRY_AUTH_TOKEN` ister (kaynak haritası yükleme). Token EAS secret olarak yoksa build kırılır ya da sembolsüz çıkar (çökme raporları okunamaz). Çözüm: `eas secret:create SENTRY_AUTH_TOKEN` veya `SENTRY_DISABLE_AUTO_UPLOAD=true` (rapor ucu açık kalır). DSN yoksa (BLD2) çökme izleme tamamen kapalı olur.
- [x] **BLD4 · D · BUILD GEREKTİRMEZ (düzeltme: ATT gerekmiyor).** Reklamlar `requestNonPersonalizedAdsOnly: true` ile istendiği ve takip izni istenmediği için (`src/ads/AdBanner.tsx:35`, `ads.ts:9`) ATT penceresi şart değil; IDFA kullanılmıyor. Tek koşul: App Store gizlilik etiketinde "Takip" işaretlenmemesi ve `delayAppMeasurementInit` açık kalması. Yine de iOS'ta AdMob "Limited ad serving" durumu (bellek notu 2026-11-12) mağaza doğrulamasına bağlı, kod değil.
- [ ] **BLD5 · O · BUILD GEREKTİRİR · iOS widget hedefi (`targets/widget`, `@bacons/apple-targets`) bu build'de ilk kez derlenecek.** Hata riski en yüksek yer: widget + ana uygulama arasındaki App Group (`group.com.meikai.homezy`) EAS provisioning'de her iki hedef için tanımlı olmalı; widget `bundleIdentifier` (`com.meikai.homezy.widget`) Apple Developer'da kayıtlı ve `eas credentials` ile profil üretilmiş olmalı. Aksi halde iOS build hemen düşer. TestFlight öncesi `eas build -p ios --profile preview` yerine production ile tek seferde denemek hakkı yakar: önce `npx expo prebuild --platform ios --no-install` ile yerelde yapı hatası ara (Mac gerekmeden de config hataları görünür).
- [ ] **BLD6 · O · BUILD GEREKTİRİR · Android native modül listesi:** `package.json` ile uyumlu olduğu kontrol edildi (kodda `package.json`'da olmayan import yok). Modüller (`expo-audio`, `expo-haptics`, `expo-blur`, `expo-location`, `expo-store-review`, `expo-task-manager`, `react-native-android-widget`, `view-shot`, `webview`) build'e girer, ama `src/lib/ambient.ts` ve `src/lib/sfx.ts` bunları **üst düzey `import`** ile alıyor (korumasız). Build'de varlar → sorun yok; yalnız eski geliştirme APK'sında çöker. **Yeni build'e kadar hiçbir yeni native paket ekleme.** `npm ls` / `npx expo-doctor` temiz olmalı; `package-lock.json` güncel (eski denetimde `npm ci` kırılmıştı) ve `overrides` (typescript) ile `npm ci` yerelde bir kez dene.
- [ ] **BLD7 · O · BUILD GEREKTİRİR · Android:** `versionCode: 1` + `autoIncrement` + `appVersionSource: remote` tutarlı (iyi). `blockedPermissions` içinde `READ_MEDIA_IMAGES` var: `expo-image-picker` Android 13+ sistem fotoğraf seçicisini kullanır, sorun değil; ama Android ≤12'de `READ_EXTERNAL_STORAGE` engelli → galeri seçimi çalışmaz mı kontrol et (picker seçiciyi kendi açar, genelde izin istemez). `POST_NOTIFICATIONS` plugin ile gelir. Tam-ekran/exact-alarm izni yok (iyi, bildirimler tarihli tek-seferlik). Proguard kuralları geniş (`-keep class com.meikai.homezy.**`): minify açık; release'de yalnız denemeyle görülebilecek sınıf-silinme hatası riski (reanimated yok, kural var) → **release APK'yı (preview profili, apk) cihazda bir kez aç** (bu bir build harcar; OTA sonrası mümkünse son production build'den önce yapma, preview ile production aynı build sayılıyorsa not düş).
- [ ] **BLD8 · O · BUILD GEREKTİRİR · Gizlilik manifestosu (iOS):** `privacyManifests` 4 API kategorisi tanımlı; RevenueCat/AdMob/Sentry/expo-location kendi manifestlerini getirir. Eksik kategori App Store Connect uyarısı verir (red değil). Konum: `expo-location` yalnız "when in use" (iyi); `ACCESS_BACKGROUND_LOCATION` engelli (iyi).
- [ ] **BLD9 · D · BUILD GEREKTİRİR · `userInterfaceStyle: automatic`** + splash arka planı `#F7F2EA` (açık). Koyu temada splash beyaz-krem parlar (görsel, hata değil). `expo-system-ui` yüklü.
- [ ] **BLD10 · D · BUILD GEREKTİRMEZ · Adaptif ikon, widget önizleme dosyaları** (`assets/widget-preview*.png`) var; yoksa build düşerdi → var.

---

## Reklam afişi kontrolü (Melih sorusu)

- **Her sekmede DEĞİL.** `AdBanner` yalnız **Ev** (`src/app/(tabs)/index.tsx:300`) ve **Bugün** (`bugun.tsx:221`) ekranlarında. Gelişim, Ben (hesap), Odalar, Moka ve oda/iş ekranlarında yok (CLAUDE.md'deki "Ev ve Bugün altında" kuralıyla uyumlu; kasıtlı).
- **Ekranın en altına sabit değil**, kaydırılan içeriğin SONUNDA (`<Screen>` içinde son blok). Kısa ekranda altta görünür, uzunda sayfanın sonuna inince. Ev'de afişten sonra `EditTabBtn` ve modallar geliyor, yani en son öğe değil (O · BUILD GEREKTİRMEZ; istenirse afişi `Screen`'in dışında sabit alt şeride al, tab bar + safe-area ile çakışmaması için `useSafeAreaInsets`/tab bar yüksekliğini hesaba kat).
- Premium'da gizli (`!premium.active`), RevenueCat hazır olana kadar da gizli (`purchasesReady`), Expo Go/web/modül yok/birim kimliği yok/izin yok/yükleme hatasında `null` döner: boşluk bırakmaz (iyi).
- Sorunlar: (1) `failed` bayrağı bir kez set olunca ekran yeniden açılana kadar tekrar denenmez (O, BUILD GEREKTİRMEZ: birkaç dakika sonra sıfırla). (2) `"Reklam · Premium'da reklam yok"` metni `tx()` içinde değil, EN kullanıcı Türkçe görür (`AdBanner.tsx:32`, D, BUILD GEREKTİRMEZ). (3) Boyut sabit `BANNER` 320×50; yüksek çözünürlüklü/geniş ekranda `ANCHORED_ADAPTIVE_BANNER` daha iyi doluluk/gelir verir (D). (4) UMP onayı `gatherConsent` 8 sn zaman aşımı; AB'de yavaş ağda ilk açılışta reklam o oturumda hiç gelmeyebilir (D, bilinen). (5) Üretimde `EXPO_PUBLIC_ADMOB_BANNER_*` yoksa reklam sessizce hiç çıkmaz (BLD2'de build kapısı var).

---

## 100 GÜN KULLANIM (hedef: 100 gün hatasız ve güzel)

Etiket: **BG** = BUILD GEREKTİRİR, **BGY** = BUILD GEREKTİRMEZ (JS, OTA ile düzelir; ama OTA için BLD1 şart).

**Zaten sağlam (doğrulandı):** gün anahtarı yerel saatle ve öğle sabitiyle (`src/domain/play.ts:34-43`, yaz saati kaymasına dayanıklı); `useNow` dakikada bir ve öne gelince yenileniyor (gece yarısı geçişi `src/hooks/useNow.ts`); `play.log` 120 gün, `awarded` günlük, `growth` listeleri (600/400) sınırlı; iOS 64 bildirim sınırı bilinçli tavanlı (özet 7 + iş 21 + hatırlatma ≤4/gün + ilaç 16 + evcil 12 < 64); abonelik bitişinde `PremiumEndedCard` ve sunucuda `expires_at`/`grace` var; oturum yalnız ön planda yenileniyor.

- [ ] **H1 · Y · BGY · Kaçırılan sunucu günü: 2+ gün çevrimdışı kalan kullanıcının puanı ve serisi sessizce silinir.** `supabase/migrations/20261109000000_formuller.sql:22` `play_award` yalnız `today-1 … today+1` günleri kabul eder, aksi `bad day` (P0001) atar. İstemci (`src/play/usePlay.ts:30,63-69`) `rejected()` ile olayı kuyruktan **siler**, sonra `apply()` yerel `days`/`points` değerlerini sunucu özetine göre yeniden yazar. Uçak/kötü ağ/telefonu kapalı tutma ile 2. günden sonra eşzamanlama puan ve seri kaybettirir. 100 günlük disiplin hedefinde en olası "haksız kayıp". Çözüm: sunucu penceresini `today-7`'ye çıkar (günlük iş sınırı zaten gün bazlı, sahte puan riski düşük), istemcide reddedilen eski günü yerelde koru ya da kullanıcıya göster.
- [ ] **H2 · Y · BGY · Aktif misafir 60 gün sonra sunucuda silinebilir.** `supabase/migrations/20261101120000_guvenlik.sql:245-261` `cleanup_anonymous` `last_sign_in_at` (yenilemede güncellenmez; oturum açılışında bir kez) 60 günden eskiyse anonim hesabı siler; evsiz (`homes` satırı yok) ama her gün puan toplayan misafir `play_events`, puan ve eşyalarıyla birlikte gider (cron açılırsa; şu an yorumda). Çözüm: ölçütü son etkinliğe bağla (`max(play_events.day)`, `scan_usage`, `auth.refresh_tokens.updated_at`) ve `play_events`'i olan hesapları koru. Cron açmadan önce düzelt.
- [ ] **H3 · O · BGY · 8+ gün uygulamayı açmayan kullanıcıya hiç bildirim gitmez.** `src/notifications/schedule.ts:200-302` hepsi tek seferlik, yalnız önümüzdeki 7 gün; yeniden zamanlama yalnız uygulama açılınca. iOS'ta arka planda yenileme yok. En çok geri dönüş gereken kullanıcı (bırakanlar) bildirimsiz kalır. Çözüm: 7 günlük pencerenin ardına tekrar eden (`repeats: true`, haftalık) 1-2 genel "Moka seni bekliyor" hatırlatması ekle (iOS 64 payı yeter).
- [ ] **H4 · O · BGY · Her `state` değişiminde bildirim yeniden zamanlama + bulut yazma (P3/P4)** 100 günde pil ve ağ maliyeti; B3 çift bildirim riski gün aşırı birikir (deterministik `identifier` ekle).
- [ ] **H5 · O · BGY · İlaç/evcil bildirimleri yalnız 3 gün ileri (`meds.ts:10`, `pets.ts:9`) ve ilaç tavanı 16.** 5+ ilaç/doz × 3 gün tavana çarpar, geç saatteki dozların bildirimi sessizce düşer (sağlıkla ilgili; uyarısız). Çözüm: tavan dolunca kullanıcıya "Bazı hatırlatmalar sığmadı" göster ya da dozları gün gün öncelikle sırala.
- [ ] **H6 · O · BGY · Bulut yedeği çakışması (K2) uzun kullanımda artar:** telefon değişimi/ikinci cihaz 100 gün içinde kaçınılmaz; `home_save` RPC ile atomik yap, yedek durumunu göster (U2).
- [ ] **H7 · O · BGY · Durum JSON'u büyür ve her dokunuşta tamamen kopyalanır (P1/P2).** `play.days/medLog/journal/checkins/sport` günde birkaç yüz bayt eklenir; 100 günde ~100-300 KB. Tek başına sorun değil ama P1 (kopya) ve P2 (tam yeniden yazma) ile birleşince eski cihazlarda dokunuş gecikmesi. Çözüm: `play` alanını ayrı tabloya al ya da 365 günden eskiyi arşivle (`journal`, `medLog`, `checkins` için `pruneLog` benzeri). Şema değişirse `SCHEMA_VERSION` artır ve okuma tarafında geçiş yaz (bkz. B1).
- [ ] **H8 · O · BGY · Eski sürümden yeni sürüme veri uyumu:** `db.ts` yalnız sütun ekliyor (`ADDED_COLUMNS`), `loadState` JSON alanlarında `normalize()` ile varsayılanları dolduruyor (iyi), ama `SCHEMA_VERSION` okunmuyor ve bozuk JSON tüm yüklemeyi düşürüyor (K1/B1/B5). Her sürümde "eski veri + yeni kod" jest testi ekle (örnek: sürüm 1.0.0 şemasında kayıtlı bir dump yükle).
- [ ] **H9 · O · BGY · Widget (Android) gece yarısından sonra bayat görünür:** `app.json` `updatePeriodMillis: 1800000` (30 dk, Android alt sınırı) → gün değişince "bugünün işleri" 30 dk'ya kadar dünü gösterir. Çözüm: `AlarmManager`/`WorkManager` yerine uygulama açılışında ve görev tamamlanınca widget'ı tazele (zaten yapılıyorsa gece yarısında `00:01` zamanlı bir bildirim görevi ekle). Widget kodu native modül olduğu için yalnız JS tarafı değişirse BGY.
- [ ] **H10 · D · BGY · Abonelik bitiş/iptal/yenileme:** istemci RevenueCat `entitlements.active` ile, sunucu `subscriptions.expires_at/will_renew` ile karar veriyor; webhook kaçarsa sunucu "bitti", istemci "aktif" (ya da tersi) kalabilir: AI limiti ve aile paylaşımı sunucuya göre, reklam/özellikler istemciye göre. Çözüm: uygulama öne gelince `subscription-sync` çağrısı (15 sn korumalı) ve `PremiumEndedCard` tek kaynaktan tetiklensin. Sandbox satın alımlarının üretimde premium sayılması (sunucu notu) ayrıca karar ister.
- [ ] **H11 · D · BGY · Oturum/token:** yenileme yalnız ön planda; çevrimdışı 100 gün olmaz ama uzun arka plan sonrası ilk RPC `401` verebilir; `play_*` çağrıları `rejected()` kodlarıyla karışmıyor (401 ağ hatası gibi sayılıp tekrar denenir: iyi). Çıkış durumunda (`signedOut`) `cloudUser` unutuluyor; kullanıcı yeniden girince `fetchHome` çakışma sorusu çıkar (beklenen).
- [ ] **H12 · D · BGY · Uzun oturum bellek:** çok sayıda `setInterval` (1 sn) ve 3D ev animasyonları; ekran odakta değilken durdurulmuyorsa (`House3D.tsx`) 100 günde değil ama uzun oturumda ısınma/pil. `useIsFocused` ile durdur (P5).
- [ ] **H13 · D · BGY · Saat dilimi değişikliği/seyahat:** gün anahtarı yerel; doğuya seyahatte aynı gün iki kez sayılabilir, batıya gidince bir gün "tekrar" olur. Sunucu UTC ±1 gün toleransı kapsıyor (UTC+14…UTC−12 dahil). Tutarlı ama `lb_publish` (`siralama_adil.sql`) UTC gün kullanır: gece yarısı çevresinde sıralama "bugün" ile yerel "bugün" bir gün kayabilir (kozmetik).
- [ ] **H14 · D · BGY · Telefon saatini ileri alarak hile:** sunucu ±1 gün sınırı koruyor; yerel puan sunucu özetiyle ezilir (`apply`), yani yerel hile kalıcı değil (iyi).

---

## 0. KRİTİK (önce bunlar)

- [ ] **K1 · Y · Veri kaybı: yükleme hatasından sonra ilk dokunuş veritabanını siler.**
  `src/store/AppStore.tsx:88-105` + `src/data/db.ts:164-171`. `loadState()` iki kez hata verirse (bozuk JSON sütunu, kilitli DB) `emptyState()` ile açılır, kaydetme sadece o an atlanır. Kullanıcı herhangi bir şeye dokunup `update()` çağırınca `saveState` `lastTables=''` olduğu için `DELETE FROM rooms/tasks/clothes/stock` + yeniden yazma yapar; gerçek veri kalıcı silinir.
  Çözüm: `failed` bayrağını store'a taşı; `failed` iken `saver` hiçbir şey yazmasın ve "Verin okunamadı, Tekrar dene / Destek" ekranı çıksın. Ek olarak `loadState` içindeki `JSON.parse` çağrıları (`db.ts:76,97,100`) tek tek `try/catch` ile varsayılana düşsün (tek bozuk sütun tüm uygulamayı kilitlemesin). Silmeden önce `layfapp.db` dosyasını `.bak` olarak kopyala.

- [ ] **K2 · Y · Bulut yedeği "karşılaştır-ve-yaz" atomik değil, damga yoksa körlemesine ezer.**
  `src/sync/cloud.ts:46-52` (`pushChecked`). Önce `remoteStamp` okunuyor, sonra ayrı bir `upsert` yapılıyor: iki telefon aynı anda yazarsa biri sessizce ezilir. Ayrıca `known` (prefs `cloudStamp`) boşsa (uygulama verisi temizlendi, yeniden kurulum, `prefs` hatası) `known && rs && rs !== known` koşulu false olur ve çakışma kontrolü atlanıp bulut ezilir.
  Çözüm: aile kaydındaki gibi sunucu tarafında `home_save(p_state, p_base timestamptz)` RPC'si (`family_save` örneği, `20261101120000_guvenlik.sql`): `update ... where updated_at = p_base`, 0 satır ise 'conflict'. `known` yoksa ve bulutta satır varsa yazma, ilk eşleşme akışına (soru) yönlendir.

- [ ] **K3 · Y · Canlı veritabanında 07–11 Kasım migration'ları eksik (operasyonel).**
  Bellek notu 2026-11-12: `birlesik-20261112.sql` henüz uygulanmadı. Eksikken `lb_*` (sıralama), `family_week/goals`, `ai_take/ai_burst` RPC'leri 404 verir. **`ai_take`/`ai_burst` yoksa `guard()` (`supabase/functions/_shared/guard.ts:48-62`) her isteği `500 server` ile reddeder: tüm AI taramaları ve Moka sohbeti kapanır.** (Fail-closed olması doğru; ama dağıtım sırası kritik.)
  Çözüm: önce SQL'i uygula, sonra `scan` ve `moka-chat` deploy et. İstemcide `500 server` için ayrı, anlaşılır mesaj olsun (şu an "Şu an tarama yapılamıyor", `src/lib/scan.ts:90`).

- [ ] **K4 · O · Migration sürüm numaraları çakışıyor: `supabase db push` / CLI kırılır.**
  `supabase/migrations/20261101000000_ai_suistimal.sql` ile `20261101000000_persona.sql`; `20261109000000_aile_haftasi.sql` ile `20261109000000_formuller.sql` aynı sürümü paylaşıyor. CLI `schema_migrations` birincil anahtar hatası verir. Şimdilik elle SQL Editor kullanıldığı için görünmüyor; ilk CI/branch kullanımında patlar.
  Çözüm: dosyalardan birini bir sonraki boş saniyeye yeniden adlandır (ör. `20261101000001_persona.sql`, `20261109000001_formuller.sql`). Zaten uygulanmış olanlar SQL Editor'den çalıştığı için güvenli; idempotent olduklarını kontrol et.

---

## 1. Hatalar / çökme riski

- [ ] **B1 · O · `SCHEMA_VERSION` yazılıyor ama okunmuyor.** `src/data/db.ts:13,172`. Geriye uyumsuz bir şema değişikliğinde (kullanıcı uygulamayı eski sürüme indirir ya da farklı sütun) tespit yok; `ADDED_COLUMNS` ile idare ediliyor. Çözüm: yüklemede `meta.schema > SCHEMA_VERSION` ise yazmayı kapat (K1 ile aynı korumayı kullan).
- [ ] **B2 · O · `saver.flush()` devam eden kaydı beklemez.** `src/store/AppStore.tsx:57-60,63-65`. `running` iken `flush` → `run()` hemen döner; arka plana geçişte sistem işlemi öldürürse son kayıt yarım kalabilir. Çözüm: devam eden `Promise`'i sakla, `flush` onu `await` etsin.
- [ ] **B3 · O · Bildirimler üst üste zamanlanırsa çift bildirim.** `src/notifications/schedule.ts:200-230,258-268` özet ve hatırlatmalar `identifier` olmadan zamanlanıyor; `useNotificationSync.ts:42-49` yeniden zamanlamayı 1,5 sn gecikmeyle her `state` değişiminde tetikler ve çağrılar arasında kilit yok. Önceki çalışma bitmeden (çok sayıda `await` native çağrı) ikincisi başlarsa aynı sabah iki özet çıkar. Çözüm: `rescheduleMorningSummaries` içine tek-çalışan kilit (promise zinciri) + özet/nudge için deterministik `identifier` (`ozet-<gün>`, `nudge-<tür>-<ts>`).
- [ ] **B4 · D · `PurchasesProvider` efekti StrictMode/hızlı yenilemede dinleyiciyi kaybeder.** `src/purchases/PurchasesProvider.tsx:122-135`. `configured.current` ikinci kez çalışmayı engeller ama cleanup `removeCustomerInfoUpdateListener` çalışır; geliştirmede abonelik değişimi yakalanmaz (üretimde değil). Çözüm: dinleyiciyi `configured` bloğunun dışında ayrı efekte al.
- [ ] **B5 · D · `JSON.parse` korumasız yerler:** `src/data/db.ts:76,97,100`, `src/sync/cloud.ts:84` (uzak veri bozuksa), `src/lib/review.ts:16`, `src/lib/events.ts:18,29`, `src/lib/ambient.ts:239`, `src/profile/useActs.ts:16`, `src/lib/tabLayout.ts:63`. `prefs` bozulursa açılışta hata. Çözüm: ortak `safeParse(raw, fallback)` yardımcısı.
- [ ] **B6 · D · `meter` taraması için `mediaType` istemciden gönderilip sunucu `sniff` ile yeniden bulunuyor (iyi); ama base64 doğrulaması yalnızca ilk 4096 karakterde.** `supabase/functions/scan/index.ts:149`. Gerisi bozuksa Anthropic 400 döner → kullanıcıya genel hata, hak geri verilir (sorun yok). Düşük öncelik.

## 2. Güvenlik / açık

Genel: RLS/RPC tarafı (revoke/grant, `search_path=''`, `security definer`, JWT doğrulama, kriz filtresi, bütçe kesici) iyi durumda. Aşağıdakiler iyileştirme:

- [ ] **S1 · O · Anonim hesap oluşturma maliyet yüzeyi.** Captcha henüz Supabase'de açık değil (bellek notu). Anonim kullanıcı `scan` `meter` yolunu kullanabiliyor (`scan/index.ts:154-173`): tarama hakkından düşmüyor, sadece dakikada 4 + IP başına günlük 200 + küresel 1500 sınırı var. Çok sayıda anonim hesap + IP rotasyonuyla küresel tavan (`AI_DAILY_CAP_SCAN`) dolup gerçek kullanıcıların taraması kilitlenebilir (hizmet reddi). Çözüm: Supabase Auth'ta captcha'yı aç; `meter` için ayrı, küçük bir günlük tavan (`g:meter`) ve anonimlere kapat ya da yalnızca hesaplı kullanıcıya aç.
- [ ] **S2 · O · Oturum jetonu şifresiz `localStorage` (expo-sqlite) içinde.** `src/lib/supabase.ts:19-26`. Cihaz kök yetkisiyle/yedekle çıkarılabilir. Çözüm: `expo-secure-store` tabanlı depolama (büyük jetonlar için parçalayan adaptör) ya da en azından Android `allowBackup=false`.
- [ ] **S3 · D · Sahip e-postaları ve UID istemci paketinde.** `src/auth/owner.ts:4-5`. APK'dan okunur; araçlar sadece yerel ama kişisel e-posta ifşası. Çözüm: sahip kontrolünü sunucuda (profiles.is_owner bayrağı) yap ya da e-postaları EAS env'e taşı.
- [ ] **S4 · D · `readJson` Content-Length yoksa (chunked) gövdeyi tamamen belleğe okur.** `supabase/functions/_shared/http.ts:34-47`. `req.text()` önce bitiyor, boyut kontrolü sonra. Çözüm: `req.body` akışını sayarak oku, sınırı aşınca kes.
- [ ] **S5 · D · IP çıkarımı `x-forwarded-for` yedeğine düşüyor.** `supabase/functions/_shared/guard.ts:30-33`. `cf-connecting-ip` yoksa istemci başlığı taklit edilebilir (IP kovasını sıfırlama). Supabase kenarında `cf-connecting-ip` hep var; yine de `x-forwarded-for` yedeğini kaldır ya da son hop'u kullan.
- [ ] **S6 · D · `homes.state` 2 MB üst sınırı var (iyi) ama istemci boyutu hiç kontrol etmiyor.** `supabase/migrations/20261101120000_guvenlik.sql:39`, `src/sync/cloud.ts:41`. Limit aşılırsa yedek sessizce her 10 dk'da bir hata verir; kullanıcı yedekte sanır. Çözüm: yazmadan önce `JSON.stringify(...).length` kontrolü + Hesap ekranında "Yedek başarısız" göstergesi.
- [ ] **S7 · D · Webhook `aliases` yoksa yalnız ilk UUID güncelleniyor.** `supabase/functions/revenuecat-webhook/index.ts:30`. `app_user_id` anonim RC kimliği ise ilk geçerli UUID alias olur, doğru; ama aynı kullanıcı birden çok UUID taşıyorsa (hesap birleşmesi) ikincisi güncellenmez. Düşük; `TRANSFER` zaten iki tarafı kapsıyor.

## 3. Performans / kasma

- [ ] **P1 · O · Her `update()` tüm durumu `JSON.parse(JSON.stringify())` ile kopyalıyor.** `src/store/AppStore.tsx:21,122-131`. Çok oda/iş/kıyafet + `play` günlükleri büyüdükçe her dokunuşta onlarca ms. Boyama sırasında parmakla her hücre güncellemesi de bu yoldan geçer. Çözüm: `structuredClone` (Hermes'te var) ya da Immer; en azından `play`/`care` gibi büyüyen alanları dokunuşlu ekranlarda ayrı `store`'a taşı.
- [ ] **P2 · O · Kayıt her değişiklikte tüm tabloları DELETE + yeniden INSERT ediyor (tablo imzası değişince).** `src/data/db.ts:162-205`. İmza için her kayıtta `JSON.stringify([order, rooms, mod, tasks, care, cells])` hesaplanıyor: iş tamamlama bile tüm tabloyu yazar (görev satırı `last` değişimi imzayı değiştirir). Çözüm: satır bazlı diff (`INSERT OR REPLACE` yalnız değişen satır) ya da en az imza için `hash`.
- [ ] **P3 · O · Bildirim yeniden zamanlama ardışık `await` native çağrılarla (≈40+) ve her `state` değişiminde.** `src/notifications/useNotificationSync.ts:42-49`, `schedule.ts:176-270`. Her `state` değişimi (XP, su, kaydırma sonrası ayar vb.) tetikler. Çözüm: yalnız bildirim girdisini etkileyen alanların `hash`'i değişince çalıştır; çağrıları `Promise.all` ile gruplayarak yaz.
- [ ] **P4 · O · Bulut yedeği her `state` değişiminde 3 sn sonra tüm JSON'u gönderiyor (≤2 MB).** `src/sync/cloud.ts:240-256`. Mobil veri ve pil. Çözüm: `forCloud(S)` hash'ini sakla, değişmediyse atla; değişikliklerde en az 15-30 sn birleştir; hücresel bağlantıda ertele.
- [ ] **P5 · D (3D ev incelendi: döngüler native driver, `reduceMotion` destekli; yine de ekran odakta değilken durdurulmuyor, `useIsFocused` hiç kullanılmıyor) · BGY · `House3D.tsx` 2396 satır, tek dosya.** `src/components/House3D.tsx`. Hava/kuş/bulut animasyonları, `setInterval` ve çok sayıda efekt bir arada; düşük cihazlarda kare düşüşü. Çözüm: `FPS` sınırı + "Düşük hareket" ayarı (zaten `reduceMotion` var mı kontrol et), bileşeni bölüp `React.memo`; ekran dışındayken (sekme odakta değil) animasyonu durdur (`useIsFocused`).
- [ ] **P6 · D · `useNow` ve 4+ ayrı `setInterval` (1 sn) ekran başına.** `src/components/OdakCard.tsx:137`, `RestGame.tsx:24-28`, `app/odak.tsx:66`, `app/moka.tsx:355`. Sekmeden çıkıldığında temizleniyor mu kontrol et; aynı saati paylaşan tek bir `useTick` kancası.

## 4. UX

- [ ] **U1 · O · Yükleme hatasında kullanıcı boş ev planı görür ("kurulum" akışı)** (bkz. K1): veri sağlam ama okunamıyor, uygulama sıfırdan başlıyor gibi görünür. Anlaşılır hata ekranı + "Tekrar dene".
- [ ] **U2 · O · Bulut yedeği başarısızlığı kullanıcıya hiç gösterilmiyor.** `src/sync/cloud.ts:228-236` yalnızca `console.warn`. Hesap ekranında "Son yedek: …" / "Yedek alınamadı" satırı.
- [ ] **U3 · D · Çakışma/ilk eşleşme uyarıları "Seçmediğin silinir" diyor ama geri alma yok.** `cloud.ts:128-150,215-235`. Seçimden önce diğer sürümün özeti (oda/iş sayısı, son değişiklik zamanı) gösterilsin.

## 5. Metin (TR/EN)

- [ ] **T1 · O · `tx()` sarmalanmamış kullanıcı metinleri (EN kullanıcı Türkçe görür):** `src/lib/scan.ts:73-86` (limit mesajları, 422 mesajları: "Fotoğraftan bir liste çıkaramadım…"), şablonlu cümleler için `tx` değil biçim/parametre kullan.
- [ ] **T2 · D · Eski sayılar yorumlarda:** `src/lib/scan.ts:14` "Premium'da günde 10", gerçek: bkz. `CLAUDE.md` (50) ve `docs/premium.md`; `supabase/functions/scan/index.ts` başlığı. Sadece belge; kod `LIMITS`'ten okuyor.
- [ ] **T3 · D · Sunucudan dönen `reply` 'Tamam! ☕' sabit Türkçe.** `supabase/functions/moka-chat/index.ts:215`. `lang==='en'` ise "Done! ☕".

## 6. Geliştirme önerileri

- **G1** Sunucu tarafında `home_save` RPC (K2) ile birlikte `homes` için sürüm numarası + ilk eşleşmede özet.
- **G2** Kayıt/yedek durumunu tek bir `useSyncStatus` kancasında topla (K1, U2, S6 için ortak).
- **G3** `src/lib/safe.ts` (`safeParse`, `safeInvoke`) ve ESLint kuralı: çıplak `JSON.parse` yasak.
- **G4** Kritik yollar için jest testleri: `loadState` bozuk meta, `saveState` hata sonrası geri dönüş, `pushChecked` çakışma. Şu an 24 test dosyası, veri katmanı ve bulut yedeği testsiz.
- **G5** Hata izleme: `lib/crash.ts` DSN yoksa kapalı; üretim derlemesinde DSN ortam değişkeninin ayarlı olduğunu `eas.json`'da doğrula.

---

_Henüz derinlemesine bakılmayanlar (sonraki tur): her sekmenin ekran içi akışı, onboarding (`tanitim.tsx`), aile paylaşımı istemcisi, erişilebilirlik (232 `accessibilityLabel` / 71 `Pressable`: oran düşük, etiketsiz dokunma alanları olabilir), TR/EN eksik `tx()` taraması (jest `i18n/__tests__/gaps.test.ts` çalıştırılmalı)._

---

# Düzeltme thread'inin notları (başka thread, aynen korundu)

### Sunucu/Güvenlik

Kapsam: supabase/functions, migrations/RLS, src/auth, purchases, sync, family, leaderboard, consent. Genel durum: JWT kontrolü, webhook gizli anahtarı (sabit zamanlı), RLS, SECURITY DEFINER + search_path, revoke/grant, hak ayırma (tek işlemli) zaten yerinde.

### Düzeltildi
- b7c450a readJson: Content-Length'siz (chunked) büyük gövde önce tamamen belleğe okunuyordu; artık akıştan okunup sınırda kesilir. Dizi gövde reddedilir.
- d37fce8 scan: base64 doğrulaması sadece ilk 4096 karaktere bakıyordu; tamamı doğrulanır (bozuk veri model çağrısına ve hak ayırmaya gitmez).
- e942f50 subscription.ts: RevenueCat çağrısında zaman aşımı yoktu, json hatası yakalanmıyordu, anahtar yoksa "Bearer undefined" gidiyordu.
- 9ab01de photos.ts: hesap silerken yalnız ilk 1000 yedek fotoğraf siliniyordu.

### Açık
- docs/CLAUDE.md'de Premium tarama sınırı 50/gün, ama son migration (20261107120000_ai_limits_25_10.sql) 10/gün uyguluyor; src/domain/premium.ts LIMITS ile birlikte karar verilmeli (ürün kararı).
- chat_reserve aylık sınır kontrolü ile günlük artış ayrı adım: aynı anda gelen istekler aylık sınırı birkaç mesaj aşabilir (düşük risk, günlük sınır atomik).
- src/sync/cloud.ts: sürüm kontrolü (pushChecked) istemcide oku-sonra-yaz; iki telefon aynı anda yazarsa nadir ezme olabilir. Kalıcı çözüm sunucuda koşullu güncelleme (yeni migration).
- src/auth/owner.ts: sahip e-postaları ve kullanıcı kimliği istemci koduna gömülü (sadece gizli geliştirici araçları; sunucu yetkisi vermez). Ortam değişkenine taşınması önerilir.
- RevenueCat sandbox satın alımları da premium sayılır (TestFlight/test için kabul edilebilir; yayında istenmiyorsa sunucuda is_sandbox elenmeli).
- Deploy gerekli: supabase functions deploy scan moka-chat subscription-sync; revenuecat-webhook (--no-verify-jwt).

## OTA (expo-updates) — BUILD GEREKTİRİR
- Açık: `expo-updates` pakete yok; `app.json` / `app.config.ts` içinde `updates` ve `runtimeVersion` yok; `eas.json` build profillerinde `channel` yok. Yani JS düzeltmeleri build'siz ulaşamaz.
- Gerekenler (hepsi yeni build ister, bu yüzden DEĞİŞTİRİLMEDİ): `npx expo install expo-updates`, `eas update:configure`, `runtimeVersion: { policy: "appVersion" }`, `eas.json` her profile `channel` (preview/production). Sonra `eas update --channel production` ile JS yaması gönderilir. Son build'e eklenecekse build'den ÖNCE yapılmalı.

## Sürüm / OTA notu
- Mağazadaki son sürüm 1.0.3 (Melih, 2026-11-13; ChatGPT numaralamış). Repo 1.0.4'e çekildi (app.json, package.json). Build numarası (iOS buildNumber, Android versionCode) `appVersionSource: remote` + `autoIncrement` ile EAS'ta tutulur, elle artırma.
- OTA `runtimeVersion: appVersion`: 1.0.4 build'i kendi runtime'ına bağlanır. Mağazadaki 1.0.3 kullanıcılarına bu OTA GİTMEZ (expo-updates o build'de yok). OTA sadece 1.0.4 ve sonrası build'lere ulaşır. Native değişiklik varsa sürümü artır.

## İstemci

Düzeltildi (saf JS, build gerektirmez):
- fd1b584 `src/data/db.ts`: bozuk bir meta JSON'u (play, others, ...) bütün yüklemeyi düşürüyordu; artık o alan varsayılana döner. Bilinmeyen oda türü (`TYPES[r.type]` undefined) çökertmesin diye atlanır.
- 5be2c2f `src/store/AppStore.tsx`: veri okuma iki kez başarısız olursa boş durum diskteki gerçek verinin üstüne yazılabiliyordu (ilk dokunuşta tüm tablolar silinip yeniden yazılır); bu durumda kayıt kapatıldı. `requestIdleCallback` yoksa doğrudan çalıştırılır.
- 0f72291 `src/components/MokaFace.tsx`: göz kırpma ve boşta animasyon zincirleri bileşen kalkınca/hareketi azalt açılınca bitmiyor, kendini yeniden zamanlıyordu (sızıntı); `dead` bayrağı eklendi.

Açık:
- `src/store/AppStore.tsx` satır ~150: `react-hooks/refs` lint hatası (önceden var, davranışı etkilemiyor).
- `saveState` her tablo değişiminde tüm tabloları siler ve yeniden yazar (tek işlemde, güvenli ama büyük evlerde yavaş olabilir).
- Başka bir ajanın aynı çalışma ağacında yaptığı `src/domain` ve `src/notifications/schedule.ts` değişiklikleri (yaz saati, iOS 64 bildirim sınırı) bu bölüme dahil değil.
- BUILD GEREKTİRİR: bu turda build gerektiren bulgu çıkmadı; native modüller (ads, widget, notifications) zaten guard'lı.

## 100 gün

Kapsam: gün/saat dilimi ve DST, seri/puan, veri büyümesi, şema, bildirim planlama, abonelik ve oturum (istemci), uzun oturum. Kural: yalnız JS/TS düzeltmesi; build gerektirenler işaretli.

### Düzeltildi
- 448cafa schedule.ts: gün hesabı `now + d * DAY` yaz saati geçişinde geceye yakın saatlerde bir günü atlayıp tekrarlayabiliyordu; `setDate` ile aynı yerel saatte günlere geçilir (sabah özeti, spor, su, haftalık, alışveriş hatırlatmaları).
- 448cafa schedule.ts: iOS 64 bekleyen bildirim sınırı: en kötü durumda özet + iş + hatırlatma + ilaç + evcil hayvan 77'yi aşabiliyordu (iOS fazlasını sessizce atar). İlaç/evcil hayvana önce yer ayrılır, kalan 60'a kadar zamanlanır (yalnız iOS).
- 448cafa schedule.ts: iki yeniden zamanlama iç içe girerse bildirimler ikiye katlanıyordu (eylem + durum değişimi); artık sıraya girer.
- 448cafa logic.ts `weekSummary`: son 7 gün `now - i*DAY` ile DST günü kaydırıyordu; `setDate` kullanılır.
- 448cafa play.ts `forgivenGaps`: 14 günlük af bekleme süresi DST'de 13,96 gün çıkıp affı bir gün geciktirebiliyordu; yuvarlanır. (Seri/puan mantığı geri kalanı gün anahtarı + öğle saati ile DST'ye dayanıklı, testler geçti.)
- 448cafa play.ts `normalize`: spor kaydı 400, ilaç işaretleri (`medLog`) 200 günle sınırlandı (sınırsız büyüyordu; açılışta ve buluttan alırken uygulanır). Diğer listeler zaten sınırlı: log 120 gün, su/uyku 60, check-in 120, bütçe 12 ay, notlar 200, okuma 600, odak 200.
- 7a510a9 useNotificationSync: veri değişmezse uygulama öne gelince bildirimler yenilenmiyordu; saatlerce/günlerce arkadaki uygulamada özetler bayatlıyor, 7 günlük ufuk eriyordu. Öne gelince (2 sn bekleyip) yeniden zamanlanır.
- 7a510a9 PurchasesProvider: uzun oturumda abonelik bitişi/yenilenmesi ancak yeniden açılınca görünüyordu; öne gelince RevenueCat müşteri bilgisi ve sunucu `subscriptions` satırı tazelenir (grace/iptal/yenileme durumları RevenueCat entitlement'ından okunmaya devam eder).
- (başka ajan, db.ts/AppStore.tsx) bozuk meta JSON'u, bilinmeyen oda türü, okuma hatasında boş durumla diskteki veriyi ezme engeli.

### Açık
- Şema: `SCHEMA_VERSION` yazılıyor ama okunup sürüme göre geçiş yapılmıyor; geçiş bugün "eksik sütunu ekle" (ADDED_COLUMNS) + `normalize` varsayılanlarıyla yapılıyor. Yeni sütun/alan eklenirken ADDED_COLUMNS ve normalize'a eklemek şart; sütun silme/yeniden adlandırma geçişi yok.
- `journal` (günlük metin/foto yolu), `days`, `frozen` kullanıcı verisi olduğu için budanmıyor (yılda ~365 küçük kayıt; 100 günde sorun değil). `play.pending` internetsiz kalınca sınırsız birikir (kayıt başına küçük).
- Bildirim zamanlaması hâlâ "hepsini iptal et, yeniden kur" biçiminde; kur sırasında uygulama öldürülürse o dönem bildirim kalmaz (sonraki açılışta düzelir). Kalıcı çözüm sabit kimlikli fark-bazlı zamanlama.
- Saat dilimi değişimi (uçuş): gün anahtarı yerel saatten türediği için gün tekrar/atlama olabilir; seri affı ve dondurma bunu büyük oranda karşılar. Sunucu puan tarafı ayrı denetlenmedi.
- RevenueCat'in 8 sn sonra `getCustomerInfo` zaman aşımı sonrası `ready` açılır; ilk açılışta çevrimdışıysa Premium özellikler ~6 sn kilitli görünebilir (önbellekten gelirse hızlı). Bilinen/kabul edilebilir.
- PurchasesProvider içinde mevcut 2 eslint `set-state-in-effect` hatası (önceden vardı, davranışı bozmuyor; ayrı temizlik).
- Takvim/dil: `growth.ts`/`bonus.ts` gün numarası UTC bölme kullanıyor; UTC±12 dışındaki saat dilimlerinde sorun çıkarmaz.
- BUILD GEREKTİRİR: OTA (expo-updates) yok (yukarıdaki bölüm); bu yüzden bu düzeltmelerden sonra çıkacak hatalar yeni mağaza sürümü ister. Son build'den önce expo-updates eklenmesi öneri.
