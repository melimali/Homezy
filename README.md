<p align="center">
  <img src="assets/logo-kare.png" alt="Homezy logosu" width="160">
</p>

# Homezy

Evin gündelik işleri, bir kakapu arkadaşla.

Homezy, ev işlerini ve günlük düzeni tek yerde toplayan mobil uygulama. Evini çizersin, her odanın rutinleri kendi odasında durur, gecikenler ve bugünün işleri tek bakışta görünür. Ev rehberin **Moka**, kahve renkli bir kakapu: işler bitince sevinir, serin bozulunca evde toz birikir.

- **Platform:** iOS ve Android, tek kod (Expo / React Native + TypeScript)
- **Dil:** Türkçe (taban). İngilizce ve diğer diller yolda, bkz. [docs/yurtdisi-lansman.md](docs/yurtdisi-lansman.md)
- **Paket kimliği:** `com.meikai.homezy`, şema `homezy://`
- **Yayıncı:** Meikai Digital

---

## Özellikler

**Ev ve odalar**
- Evi bloklarla çiz, oda türü seç, boya. Plan editöründen sonradan değiştir.
- **3D ev:** Katlı ev (ikinci kat Premium), kat okları, zemin / duvar / pencere / cephe dekoru, eşya yerleştirme. Bulut, kuş, duman, yağmur ve kar efektleri; konuma göre gökyüzü; parmakla yakınlaştırma. Moka evde gezer, seviye arttıkça ev büyür.
- Her odanın rutinleri ("her N günde bir"), son yapılma tarihi, gecikti / bugün / yarın durumları, esnek zamanlama, tahmini süre.
- Odaya özel işlevler: gardırop ve kombin önerisi, buzdolabı ve alışveriş listesi, sarf malzeme stoğu, bitkiler.
- Yapay zekâ taraması: buzdolabı ve kıyafet fotoğrafı.
- Ev bakımı, faturalar, garantiler, mevsimlik işler. Modlar (misafir, tatil, yoğun / hasta, bayram temizliği).

**Moka ve alışkanlık**
- **Moka sohbeti** (`moka-chat` sunucu fonksiyonu), günün cümlesi, ruh hali check-in'i.
- **Odak / Pomodoro**, **temizlik oturumu**, **lofi plak çalar** (sesler).
- **Seviyeler**, puan, seri, rozetler, Moka kıyafetleri; puanla alınan eşyalar.
- **Bahçe:** Moka'nın bahçesi, bitki büyütme.
- **Günlük** (ruh hali, fotoğraf), **spor** takibi ve antrenman planı, **Gelişim** sekmesinde grafikler, haftalık rapor, evin hikâyesi.
- Aile paylaşımı (davet koduyla ortak ev), ana ekran widget'ı.

**Premium** (RevenueCat): daha çok yapay zekâ taraması, ikinci kat ve 5 ev, temalar, ek grafikler, tarif ve kombin planı, reklamsızlık. Ücretsiz planda küçük bir afiş reklam var. Tüm farklar: [docs/premium.md](docs/premium.md), kodda `src/domain/premium.ts`.

Alt menü: **Ev · Bugün · Moka "+" · Gelişim · Ben** ([docs/skeleton-v3.md](docs/skeleton-v3.md)).

---

## Teknoloji

| Konu | Seçim |
|---|---|
| Çatı | Expo SDK 58, Expo Router, React Native 0.88, TypeScript |
| Veri | Önce telefonda (expo-sqlite; web önizlemesinde localStorage) |
| Hesap ve yedek | Supabase (Auth: e-posta + şifre, anonim misafir; evin yedeği) |
| Abonelik | RevenueCat (`premium` yetkisi), mağaza ödeme sistemi |
| Yapay zekâ | Supabase Edge Function'lar (`scan`, `moka-chat`), Claude API; anahtar sunucuda durur |
| Bildirim | Yerel, expo-notifications (sunucu yok) |
| Reklam | Google AdMob, yalnızca ücretsiz planda |
| Derleme | EAS Build / EAS Submit (Mac gerekmez) |

---

## Kurulum ve çalıştırma

Gerekenler: Node.js, Android Studio emülatörü ya da telefonda Expo Go. Windows'ta PowerShell betik kısıtı yüzünden `npx` yerine **`npx.cmd`** kullan.

```bash
npm install
cp .env.example .env.local   # Windows: copy .env.example .env.local
npx expo start               # Windows: npx.cmd expo start
```

> Uygulama yerel modüller kullanıyor (expo-blur, expo-location, expo-haptics, expo-audio, AdMob, RevenueCat). Bunlar Expo Go'da tam çalışmaz; emülatör / cihaz için geliştirme derlemesi gerekir: `npx.cmd expo run:android`. Yeni yerel bağımlılık eklenince derlemeyi yenile. Derlemeyi OneDrive dışındaki kısa bir klasörde yap (uzun yol sınırı).

Diğer komutlar:
- `npm run web`: tarayıcı önizlemesi (bildirim yok)
- `npm run typecheck` ve `npm run lint`: her değişiklikten sonra
- Paket eklerken `npx expo install <paket>`

### Ortam değişkenleri (`.env.local`)

| Değişken | Açıklama |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_KEY` | Supabase > Project Settings > API |
| `EXPO_PUBLIC_REVENUECAT_IOS_KEY`, `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` | RevenueCat herkese açık SDK anahtarları |
| `EXPO_PUBLIC_ADMOB_APP_ID_*`, `EXPO_PUBLIC_ADMOB_BANNER_*` | AdMob kimlikleri, boşsa test reklamı ([docs/reklam.md](docs/reklam.md)) |
| `EXPO_PUBLIC_DEV_PREMIUM` | Geliştirmede Premium'u zorla açar |

Gizli anahtarlar (service role, RevenueCat `sk_`, Anthropic) uygulamaya ya da repoya yazılmaz; yalnızca Supabase'de durur.

### Supabase

1. `supabase/migrations/` altındaki dosyaları tarih sırasıyla çalıştır (`supabase db push` ya da SQL editörü). Bahçe (`20261027120000_bahce.sql`), aile evi ve Moka sohbeti tabloları dahil.
2. Gizli değişkenleri tanımla:
   ```bash
   supabase secrets set ANTHROPIC_API_KEY=... REVENUECAT_API_KEY=... REVENUECAT_WEBHOOK_SECRET=...
   # isteğe bağlı: SCAN_MODEL, CHAT_MODEL
   ```
3. Fonksiyonları yayınla:
   ```bash
   supabase functions deploy scan
   supabase functions deploy moka-chat
   supabase functions deploy revenuecat-webhook --no-verify-jwt
   supabase functions deploy subscription-sync
   ```
4. RevenueCat webhook adresi: `https://<proje>.supabase.co/functions/v1/revenuecat-webhook`.

Ayrıntılar: [docs/hesap.md](docs/hesap.md), [docs/odeme-kurulumu.md](docs/odeme-kurulumu.md).

### Yayın

```bash
eas build --profile preview --platform android      # test APK
eas build --profile production --platform all
eas submit --platform android
```

---

## Dokümanlar

| Dosya | Konu |
|---|---|
| [CLAUDE.md](CLAUDE.md) | Proje kararları ve kod yapısı |
| [docs/hesap.md](docs/hesap.md) | Hesap, Supabase, RevenueCat kurulumu |
| [docs/odeme-kurulumu.md](docs/odeme-kurulumu.md) | Mağaza ürünleri ve ödeme |
| [docs/premium.md](docs/premium.md) | Premium farkları, tarama hakları, maliyet |
| [docs/reklam.md](docs/reklam.md) | AdMob kurulumu |
| [docs/aile-evi.md](docs/aile-evi.md) | Aile paylaşımı |
| [docs/skeleton-v3.md](docs/skeleton-v3.md), [docs/tasarim-finch.md](docs/tasarim-finch.md), [docs/tasarim-v2.md](docs/tasarim-v2.md) | Tasarım |
| [docs/moka-animasyon.md](docs/moka-animasyon.md), [docs/sahneler.md](docs/sahneler.md) | Moka animasyon ve sahneler |
| [docs/magaza-metni.md](docs/magaza-metni.md) | Mağaza metinleri |
| [docs/yurtdisi-lansman.md](docs/yurtdisi-lansman.md) | Yurt dışı lansman planı |
| [docs/pazar-raporu-2026-10-31.md](docs/pazar-raporu-2026-10-31.md), [docs/premium-retention-plan.md](docs/premium-retention-plan.md) | Pazar ve elde tutma |
| [docs/yasal/](docs/yasal) | Gizlilik politikası ve koşullar (HTML) |

## Repo yapısı

```
app.json / app.config.ts   Expo ayarları
assets/                    Logo, Moka görselleri, sesler
docs/                      Dokümanlar
prototype/homezy.html      Çalışan HTML prototipi (referans)
scripts/                   İkon, sahne, ses, mağaza görseli üreticileri
supabase/                  migrations/ ve functions/ (scan, moka-chat, revenuecat-webhook, subscription-sync)
src/app/                   Ekranlar (Expo Router)
src/components/            House3D, Plan, Moka bileşenleri, grafikler, ortak parçalar
src/domain/                İş kuralları (rutin durumu, puan, seviye, kombin, bildirim)
src/data/ store/ sync/     SQLite, uygulama durumu, Supabase yedeği
src/notifications/         Yerel bildirim zamanlama
src/purchases/ ads/        RevenueCat, AdMob
src/theme/ i18n/           Renkler (açık / koyu), metinler
```
