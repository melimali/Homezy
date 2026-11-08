# Veri envanteri (KVKK m.16 / GDPR Art. 30 taslağı)

| Veri | Kaynak | Yer | Alıcı / işleyici | Süre | Silme |
|---|---|---|---|---|---|
| Ev verisi (AppState: plan, rutin, gardırop, stok, bitki, fatura, garanti, not, günlük, spor, ayarlar, puan) | Kullanıcı | Telefon (SQLite). Hesap varsa `homes` (jsonb) | Supabase (AB) | Hesap açık olduğu sürece | Hesap silme (`delete_me` → cascade); telefonda uygulamayı silme |
| İlaç takibi (ilaç adı, doz, saatler, alındı/atlandı kaydı) | Kullanıcı | Sadece telefon (SQLite `meta`). Buluta (`homes`) yedeklenmez, aile paylaşımına girmez | - | Uygulama silinene kadar | Uygulamayı silmek ya da ilacı uygulamada silmek |
| Hesap (ad, e-posta, parola hash) | Kullanıcı | `auth.users`, `profiles` | Supabase | Hesap süresi | Hesap silme |
| Anonim misafir kimliği | Otomatik | `auth.users` | Supabase | Hesap süresi / çıkışta silinir | Misafir çıkışı + hesap silme |
| Puan, alımlar, harcamalar | Uygulama | `play_events`, `play_owned`, `play_spend` | Supabase | Hesap süresi | Cascade |
| Tarama / sohbet sayaçları | Sunucu | `scan_usage`, `chat_usage` (içerik yok) | Supabase | Hesap süresi | Cascade |
| Abonelik durumu | RevenueCat webhook | `subscriptions` | Supabase, RevenueCat, Apple/Google | Hesap süresi; mağaza kayıtları yasal süre | Cascade (RevenueCat müşteri kaydı için bkz. aşağıdaki not) |
| Günlük fotoğrafı (Premium yedek) | Kullanıcı | Storage `yedek/<uid>/…` | Supabase | Hesap süresi | `removeAllPhotos` + `delete_me` içinde SQL |
| Aile evi (paylaşılan ev, üyeler, ortak hedefler, ilerleme kayıtları) | Kullanıcı | `families`, `family_members`, `shared_homes`, `family_goals`, `family_goal_logs` | Supabase | Hesap süresi | Cascade + `delete_me` (hedef ilerleme kayıtları) |
| Tarama fotoğrafı (buzdolabı / kıyafet) | Kullanıcı | Sunucuda saklanmaz; istek süresince bellekte | Anthropic | Anthropic politikası | – |
| Moka sohbet mesajları + ev bağlamı (oda/iş adı-durumu, seviye, seri, tarih; son 12 mesaj) | Kullanıcı | Sunucuda saklanmaz; telefonda sadece açık oturumda bellekte | Anthropic | Anthropic politikası | Sohbeti temizle düğmesi |
| Sıralama (isteğe bağlı): takma ad, ev puanı, seviye, seri, temizlik %, Moka exp | Kullanıcı (katılırsa) | Supabase `lb_profiles`, `lb_daily` (herkese açık yalnız takma ad + puanlar) | Supabase (AB) | Sıralamada kaldığı sürece | Sıralamadan çık (`lb_leave`) ya da hesap silme (cascade) |
| İlaç adı, doz, saat, "içtim" kayıtları (sağlık verisi) | Kullanıcı | Sadece telefon (expo-sqlite); bulut yedeğine, sohbete ve yapay zekâya gönderilmez (`src/sync/cloud.ts forCloud`) | – | Uygulamayı silene kadar | Uygulamayı silme / veri sıfırlama |
| Yaklaşık konum (2 ondalık) | Cihaz | Saklanmaz | Open-Meteo | – | – |
| Robot doğrulaması (IP, tarayıcı/cihaz sinyalleri; sadece giriş, kayıt ve misafir oturumu açılırken, captcha açıksa) | Cloudflare Turnstile | Saklanmaz (Cloudflare işler) | Cloudflare | Cloudflare politikası | – |
| Bildirim zamanlamaları | Uygulama | Telefon | – | – | İzin kapatma / uygulamayı silme |
| Reklam kimliği, IP, cihaz bilgisi (ücretsiz plan) | AdMob SDK | AdMob | Google | Google politikası | Premium'a geçiş / reklam kimliğini sıfırlama |

## Notlar

- **RevenueCat'te kullanıcı kaydı:** `delete_me` Supabase'i temizler; RevenueCat'in kendi müşteri kaydı (app user id = Supabase uid) kalır. RevenueCat DPA'sına göre silme için "Delete Customer" API'si kullanılabilir. İstenirse `subscription-sync`/webhook tarafına eklenebilir; şimdilik kayıt anonim kimlik içerir ve yasal saklama süresi için tutulur. Avukata sor.
- **Supabase yedekleri:** Projenin otomatik veritabanı yedekleri (plana bağlı) silinen verileri bir süre taşıyabilir.
- **Erişim / taşınabilirlik:** uygulamadaki "Verilerimi dışa aktar" ev verisini verir. Sunucuya özgü kayıtlar (sayaçlar, alımlar) için e-posta talebi 30 gün içinde yanıtlanır.
- **Analytics / çökme raporu yok.** `src/lib/events.ts` yalnızca yerel olaylar içindir (kontrol et: sunucuya gönderen kod eklenirse bu belge ve politika güncellenmeli).
- **Çökme raporu (Sentry, ABD):** yayın derlemesinde uygulama çökerse hata mesajı, yığın izi, cihaz modeli, işletim sistemi ve uygulama sürümü Sentry'ye gider. Kullanıcı kimliği, IP, fotoğraf ve ev verisi gönderilmez (`src/lib/crash.ts`). Politikaya ve Play Data Safety'ye (Crash logs / Diagnostics) eklenmeli.
- **Yurt dışı aktarım:** Anthropic (ABD), RevenueCat (ABD), Sentry (ABD), Google (ABD/İrlanda). Rıza: ilk sohbet/taramada.
