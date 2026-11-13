# Denetim notları (Homezy)

Denetçi: salt-okunur kod incelemesi, kod değiştirilmedi. Dal: `integration/tum-pr`. Başlangıç: 2026-11-13.
Düzeltme yapan thread bu dosyayı okuyup maddeleri bitirdikçe `[x]` işaretleyebilir.
Öncelik: **Y** yüksek, **O** orta, **D** düşük. Biçim: `dosya:satır` · öncelik · sorun · önerilen çözüm.

Durum: 1. tur (sunucu, veri katmanı, bulut yedeği, bildirim, ödeme) yazıldı; 2. tur (3D ev, sekmeler, UX, metin) devam ediyor.

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
- [ ] **P5 · O · `House3D.tsx` 2396 satır, tek dosya.** `src/components/House3D.tsx`. Hava/kuş/bulut animasyonları, `setInterval` ve çok sayıda efekt bir arada; düşük cihazlarda kare düşüşü. Çözüm: `FPS` sınırı + "Düşük hareket" ayarı (zaten `reduceMotion` var mı kontrol et), bileşeni bölüp `React.memo`; ekran dışındayken (sekme odakta değil) animasyonu durdur (`useIsFocused`).
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

_Tur 2'de eklenecek: sekmeler (Ev/Bugün/Moka/Gelişim/Ben), 3D ev ayrıntısı, onboarding, aile paylaşımı, reklam/ödeme duvarı akışı, erişilebilirlik, i18n tutarlılığı._

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
