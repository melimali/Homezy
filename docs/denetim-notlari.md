
## Sunucu/Güvenlik

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
