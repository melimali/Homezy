# Güvenlik raporu (2026-11-01)

Kapsam: Supabase RLS ve fonksiyonlar, edge function'lar, puan/seri, aile kodu, anonim kayıt, sırlar, hesap silme, reklam.
Önceki yapay zekâ suistimali işi (misafir sohbet/tarama kapalı, sohbet Premium, dakika sınırı) tekrarlanmadı.
SQL: `supabase/migrations/20261101120000_guvenlik.sql` (aynısı `supabase/tum-sql.sql` sonunda).

Durum: **Düzeltildi** (kodda/SQL'de, deploy/çalıştırma gerekir) · **Elle** (Melih panelden yapar) · **Kabul** (bilerek bırakıldı).

## Riskler

| # | Risk | Ciddiyet | Durum |
|---|---|---|---|
| 1 | `revenuecat-webhook`: `REVENUECAT_WEBHOOK_SECRET` tanımsızsa `Authorization: Bearer undefined` geçerli sayılıyordu, herkes sahte abonelik olayı yollayabilirdi (RevenueCat'e sorup sadece o kullanıcının gerçek durumunu yazdığı için sahte Premium verilemez, ama RevenueCat API'si tetiklenir). Ayrıca sır `!==` ile karşılaştırılıyordu. | Orta | Düzeltildi: sır yoksa hepsi 401, sabit zamanlı karşılaştırma, POST şart, gövde 100 KB sınırı |
| 2 | Aile davet kodu (6 karakter, ~1 milyar) kaba kuvvetle denenebilirdi; kod doğruysa Premium avantajı (tarama, 1,5 kat puan, yedek) bedava. Sınırsız anonim hesapla kişi başı sınır da aşılırdı. | Yüksek | Düzeltildi: kişi başı 15 dk'da 5, tüm sistemde 10 dk'da 60 yanlış deneme, sonra doğru kod da reddedilir; misafir (anonim) katılamaz |
| 3 | Anonim kayıt spam'i (`signInAnonymously` sınırsız çağrılabilir, auth.users şişer, tablolar dolar) | Yüksek | Elle: Supabase rate limit + captcha (aşağıda). Kodda: `cleanup_anonymous()` ile 60 gün eski boş anonim hesaplar temizlenir |
| 4 | E-posta ile toplu hesap açma (her hesap haftada 2 ücretsiz yapay zekâ taraması) | Orta | Elle: e-posta onayı zorunlu + captcha + rate limit |
| 5 | `homes.state`, `shared_homes.state`, `profiles.name` boyut sınırı yoktu (istemci direkt yazabiliyordu): depolama şişirme | Orta | Düzeltildi: CHECK sınırları (2 MB, 500 KB, 60 karakter) |
| 6 | Tablo yetkileri: Supabase `anon`/`authenticated` için her tabloya tüm yetkiyi verir, sadece RLS koruyordu (RLS politikası eksik kalırsa `subscriptions`, `play_*` yazılabilirdi) | Orta | Düzeltildi: yazma yetkileri kaldırıldı, sadece gereken `select` / `homes` yazma / `profiles.name` güncelleme kaldı |
| 7 | `play_award`: günde 20 işten sonra puansız ama sınırsız satır eklenebiliyordu (farklı `p_ref`) | Düşük-Orta | Düzeltildi: 20'den sonra satır yazılmaz |
| 8 | Puan hilesi: istemci "bu işi yaptım" der, sunucu gerçekten yapılıp yapılmadığını bilemez | Düşük | Kabul: puanı sunucu verir, günde en fazla 20 iş (200 puan) + spor + günlük, aynı iş günde bir. Tarih ±1 gün (saat dilimi için). Saat değiştirme en fazla 1 gün pay bırakır |
| 9 | `play_spend`: `p_day` üç farklı günle çağrılarak günlük sınır ×3 | Düşük | Kabul: bahçe tohumu ucuz, etkisi küçük |
| 10 | `subscription-sync` sınırsız çağrılabilir (her çağrı RevenueCat API'si), hata metni istemciye gidiyordu | Orta | Düzeltildi: kullanıcı başına 15 sn'de bir, hata ayrıntısı sadece sunucu günlüğünde |
| 11 | CORS `*` (scan, moka-chat, subscription-sync) | Düşük | Düzeltildi: izin listesi (`ALLOWED_ORIGINS`, varsayılan yerel Expo web); mobil etkilenmez |
| 12 | `scan`: istemcinin söylediği görsel türü ve base64 doğrulanmıyordu, gövde boyutu JSON okunduktan sonra bakılıyordu | Orta | Düzeltildi: Content-Length ve gerçek boyut sınırı, base64 + JPEG/PNG/WebP imza kontrolü, hak ayrılmadan önce |
| 13 | `moka-chat`: gövde boyutu sınırı yoktu | Düşük | Düzeltildi: 100 KB |
| 14 | Yapay zekâ maliyeti kontrolden çıkarsa acil durdurma yoktu | Orta | Düzeltildi: `AI_DISABLED=1` gizli değişkeni scan ve moka-chat'i anında kapatır. Elle: Anthropic'te aylık harcama limiti |
| 15 | Foto yedeği: kova 3 MB/JPEG sınırlı ama kişi başı dosya sayısı sınırsızdı | Düşük | Düzeltildi: kişi başı 500 dosya |
| 16 | Ortak hedef ilerlemesi (`goal_log`) sınırsız satır | Düşük | Düzeltildi: kişi başı günde 50 kayıt |
| 17 | Sırlar repoda mı? | - | Temiz: izlenen `.env` sadece herkese açık anahtar içeriyor (Supabase `anon` JWT rolü `anon`, RevenueCat `goog_...` herkese açık SDK anahtarı). `service_role`, `sk_`, `sk-ant` hiçbir yerde yok; git geçmişinde de `.env` dışında sır dosyası yok. **Uyarı:** proje dosyalarındaki `pc-sync/.env` (repoda değil, paylaşılan klasörde) gerçek değerler içerebilir; içinde gizli anahtar (service_role, sk_, Anthropic) varsa dosyayı sil ve o anahtarı döndür. İçeriğini ben okumadım |
| 18 | Loglarda gizli bilgi | - | Temiz: `console.error` sadece hata nesnesi ve modelin ilk 200 karakteri; anahtar, jeton, mesaj içeriği yazılmıyor |
| 19 | Hesap silme (KVKK / Play zorunlu) | - | Var: uygulama içi `delete_me()` her şeyi siler; web sayfası `docs/yasal/site/hesap-silme`. Elle: Play Console Veri güvenliği'nde silme bağlantısını bu sayfa olarak gir |
| 20 | RLS genel durum | - | Tamam: profiles, homes, subscriptions, play_*, scan_usage, chat_usage, aile tabloları, hedefler RLS açık; kullanıcı yalnız kendi satırını görür; `subscriptions` istemciden yazılamaz; aile/hedef tabloları politikasız, sadece SECURITY DEFINER fonksiyonla erişilir; fonksiyonlar `anon`'dan alınmış |
| 21 | Referral/promosyon kodu | - | Yok (uygulamada böyle bir özellik yok). Eklenirse: kod başına tek kullanım, hesap başına bir, deneme sınırı |
| 22 | AdMob geçersiz tıklama | Düşük | Kodda önlem tamam: afiş sadece Ev ve Bugün altında, iş yaparken/ödemede/kurulumda yok, tam ekran yok, kişiselleştirilmemiş, içerik PG. Elle: geliştirirken gerçek reklam birimine tıklama, test cihazı ekle (AdMob > Ayarlar > Test cihazları); AdMob'da "geçersiz trafik" bildirimlerini izle |

## Melih'in elle yapacakları (sırayla)

1. **SQL**: Supabase > SQL Editor > `supabase/migrations/20261101120000_guvenlik.sql` içeriğini yapıştır > Run. Hata verirse mesajı bana gönder.
2. **Edge function deploy** (PC'de repo klasöründe):
   - `supabase functions deploy scan`
   - `supabase functions deploy moka-chat`
   - `supabase functions deploy subscription-sync`
   - `supabase functions deploy revenuecat-webhook --no-verify-jwt`
3. **Webhook sırrı kontrolü**: `supabase secrets list` içinde `REVENUECAT_WEBHOOK_SECRET` olmalı (webhook zaten 200 dönüyordu, yani var). Yoksa RevenueCat'teki Authorization değerini `supabase secrets set REVENUECAT_WEBHOOK_SECRET="..."` ile gir.
4. **Anonim kayıt koruması** (Supabase > Authentication):
   - Rate Limits: "Anonymous sign-ins" saatte IP başına 30 (varsayılan 30; ev/ofis ağında yeterli, botu yavaşlatır). "Sign-ups and sign-ins" 30 / 5 dk, e-posta gönderimi saatte düşük tut (ör. 10).
   - Attack Protection > **Enable CAPTCHA protection** > Cloudflare Turnstile (ücretsiz). Turnstile'da site oluştur, Secret'ı Supabase'e gir. Anonim girişi de kapsar. Uygulamada `signInAnonymously({ options: { captchaToken } })` ve `signUp` için jeton gerekir; bu bir WebView widget'ı ister (native modül değil ama `react-native-webview` gerekebilir). Ben henüz eklemedim: önce rate limit yeter mi görelim, captcha için sen "ekle" de.
   - Sign In / Providers > Email: **Confirm email açık** (hesap botlarını keser; zaten onay bağlantısı kurulu). Minimum şifre uzunluğu 8, "Leaked password protection" açık (Pro planda).
   - Kullanıcı sayısı beklenmedik artarsa: Authentication > Users'ta anonim sayısına bak.
5. **Anonim temizlik** (isteğe bağlı): Database > Extensions > `pg_cron` aç, sonra SQL Editor'de: `select cron.schedule('anonim-temizlik', '30 3 * * *', $$select public.cleanup_anonymous()$$);`
6. **Yapay zekâ harcama limiti**: console.anthropic.com > Settings > Limits: aylık harcama üst sınırı koy. Acil durumda: `supabase secrets set AI_DISABLED=1` (açmak için `supabase secrets unset AI_DISABLED`).
7. **Sır rotasyonu**: `pc-sync/.env` (paylaşılan proje klasörü) içinde gizli bir anahtar varsa sil ve ilgili anahtarı yenile: Supabase service_role (Settings > API > JWT keys), RevenueCat gizli API anahtarı (sk_), Anthropic anahtarı. Sonra `supabase secrets set ...` ile güncelle. Sadece `EXPO_PUBLIC_*` (anon, goog_) varsa gerek yok.
8. **Web önizleme CORS**: Expo web'i farklı bir adreste açıyorsan `supabase secrets set ALLOWED_ORIGINS="http://localhost:8081,https://senin-adresin"`.
9. **Play Console**: Veri güvenliği > hesap silme bağlantısı = `hesap-silme` sayfası (Meikai sitesine yüklendiğinde).

## Bilinen kalan riskler

- Puan: sunucu "gerçekten temizledi mi" bilemez; günlük üst sınır ve gün başına tek ödül ile sınırlı. Üstüne gidilirse seri/puan sıralaması (rekabet) eklenmedikçe sorun değil.
- Aile kodu paylaşılırsa (sahibi yanlış kişiye verirse) 5 kişi Premium avantajı alır; tasarım gereği. Sahibi `family_kick` ile çıkarabilir, kodu yenilemek için paylaşımı kapatıp açması gerekir.
- Captcha henüz uygulamada yok (dashboard rate limit önce).
