# Veri envanteri (KVKK m.16 / GDPR Art. 30 taslağı)

| Veri | Kaynak | Yer | Alıcı / işleyici | Süre | Silme |
|---|---|---|---|---|---|
| Ev verisi (AppState: plan, rutin, gardırop, stok, bitki, fatura, garanti, not, günlük, spor, ayarlar, puan) | Kullanıcı | Telefon (SQLite). Hesap varsa `homes` (jsonb) | Supabase (AB) | Hesap açık olduğu sürece | Hesap silme (`delete_me` → cascade); telefonda uygulamayı silme |
| Hesap (ad, e-posta, parola hash) | Kullanıcı | `auth.users`, `profiles` | Supabase | Hesap süresi | Hesap silme |
| Anonim misafir kimliği | Otomatik | `auth.users` | Supabase | Hesap süresi / çıkışta silinir | Misafir çıkışı + hesap silme |
| Puan, alımlar, harcamalar | Uygulama | `play_events`, `play_owned`, `play_spend` | Supabase | Hesap süresi | Cascade |
| Tarama / sohbet sayaçları | Sunucu | `scan_usage`, `chat_usage` (içerik yok) | Supabase | Hesap süresi | Cascade |
| Abonelik durumu | RevenueCat webhook | `subscriptions` | Supabase, RevenueCat, Apple/Google | Hesap süresi; mağaza kayıtları yasal süre | Cascade (RevenueCat müşteri kaydı için bkz. aşağıdaki not) |
| Günlük fotoğrafı (Premium yedek) | Kullanıcı | Storage `yedek/<uid>/…` | Supabase | Hesap süresi | `removeAllPhotos` + `delete_me` içinde SQL |
| Aile evi (paylaşılan ev, üyeler, ortak hedefler, ilerleme kayıtları) | Kullanıcı | `families`, `family_members`, `shared_homes`, `family_goals`, `family_goal_logs` | Supabase | Hesap süresi | Cascade + `delete_me` (hedef ilerleme kayıtları) |
| Tarama fotoğrafı (buzdolabı / kıyafet) | Kullanıcı | Sunucuda saklanmaz; istek süresince bellekte | Anthropic | Anthropic politikası | – |
| Moka sohbet mesajları + ev bağlamı (oda/iş adı-durumu, seviye, seri, tarih; son 12 mesaj) | Kullanıcı | Sunucuda saklanmaz; telefonda sadece açık oturumda bellekte | Anthropic | Anthropic politikası | Sohbeti temizle düğmesi |
| Yaklaşık konum (2 ondalık) | Cihaz | Saklanmaz | Open-Meteo | – | – |
| Bildirim zamanlamaları | Uygulama | Telefon | – | – | İzin kapatma / uygulamayı silme |
| Reklam kimliği, IP, cihaz bilgisi (ücretsiz plan) | AdMob SDK | AdMob | Google | Google politikası | Premium'a geçiş / reklam kimliğini sıfırlama |

## Notlar

- **RevenueCat'te kullanıcı kaydı:** `delete_me` Supabase'i temizler; RevenueCat'in kendi müşteri kaydı (app user id = Supabase uid) kalır. RevenueCat DPA'sına göre silme için "Delete Customer" API'si kullanılabilir. İstenirse `subscription-sync`/webhook tarafına eklenebilir; şimdilik kayıt anonim kimlik içerir ve yasal saklama süresi için tutulur. Avukata sor.
- **Supabase yedekleri:** Projenin otomatik veritabanı yedekleri (plana bağlı) silinen verileri bir süre taşıyabilir.
- **Erişim / taşınabilirlik:** uygulamadaki "Verilerimi dışa aktar" ev verisini verir. Sunucuya özgü kayıtlar (sayaçlar, alımlar) için e-posta talebi 30 gün içinde yanıtlanır.
- **Analytics / çökme raporu yok.** `src/lib/events.ts` yalnızca yerel olaylar içindir (kontrol et: sunucuya gönderen kod eklenirse bu belge ve politika güncellenmeli).
- **Yurt dışı aktarım:** Anthropic (ABD), RevenueCat (ABD), Google (ABD/İrlanda). Rıza: ilk sohbet/taramada.
