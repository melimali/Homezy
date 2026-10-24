# Hesap, bulut yedeği ve abonelik

## Ne seçtik, neden

| İş | Servis | Neden |
|---|---|---|
| Hesap (e-posta + şifre, misafir) | **Supabase Auth** | Premium planında (PR #3) yapay zekâ taraması için zaten Supabase seçildi. Tek sunucu, tek fatura. Firebase'in yaptığı her şeyi (hesap, veritabanı, sunucu fonksiyonu) yapıyor, veritabanı sıradan Postgres olduğu için v2'deki aile paylaşımına da uygun. |
| Ev verisinin yedeği | **Supabase Postgres** (`homes` tablosu) | Kullanıcı başına tek satır. Satır düzeyinde güvenlik (RLS) ile herkes sadece kendi evini okuyup yazabilir. |
| Abonelik ve satın alma | **RevenueCat** | App Store ve Google Play aboneliklerini tek yerden yönetir: satın alma, **satın alımları geri yükleme**, yenileme, iptal. |
| Abonelik durumunun kaydı | **Supabase** (`subscriptions` tablosu) | RevenueCat webhook'u her değişiklikte yazar. Sunucu fonksiyonları (ör. tarama kotası) buradan okur. |

**Kart ve ödeme bilgisi hiçbir yerde bizde tutulmaz.** Ödemeyi App Store ve Google Play kendi ödeme ekranıyla alır; mağaza kuralları da bunu zorunlu kılıyor. RevenueCat'e ve bize sadece "bu kullanıcının Premium'u var mı, ne zaman bitiyor" bilgisi gelir.

## Uygulamadaki akış

1. **Tanıtım** (`src/app/tanitim.tsx`): aşağı kaydırılan 4 sayfa. Evini çiz → Rutinler → Odaya özel işler → Sabah özeti. Bir kere görülür.
2. **Giriş** (`src/app/giris.tsx`): Hesap oluştur / Giriş yap / Şifremi unuttum, ya da **Hesapsız devam et**. Apple, uygulamanın temel işlevi hesap gerektirmiyorsa hesabı zorunlu tutmamızı istemiyor (5.1.1), bu yüzden misafir seçeneği var. Misafir için arka planda Supabase anonim oturumu açılır; tarama kotası ve satın alma bu kimliğe bağlanır.
3. **Evini kur** → ana ekran.
4. **Hesabım** (`src/app/hesap.tsx`; her sekmede sağ üstteki yuvarlak düğmeden ve Bildirimler sekmesindeki karttan): profil, Premium durumu, **Satın alımları geri yükle**, Aboneliği yönet, **Hesaptan çık**, **Hesabımı sil** (misafir dahil; Apple 5.1.1(v) uygulama içinden silmeyi zorunlu tutuyor). Çıkış ve silme telefondaki evi temizler ve uygulamayı ilk açılıştaki gibi tanıtımdan başlatır.
   - RevenueCat'teki müşteri kaydı henüz silinmiyor; RevenueCat açılınca webhook fonksiyonuna eklenecek.

### Bulut yedeği nasıl çalışır (`src/sync/cloud.ts`)

- Hesapla giriş yapılınca telefondaki ev, değiştikten 3 saniye sonra (ve uygulama arka plana geçerken) buluta yazılır.
- Bir telefonda bir hesapla ilk kez giriş yapılınca önce buluta bakılır: ev sadece buluttaysa telefona gelir; iki tarafta da varsa kullanıcıya hangisini kullanacağı sorulur. Eşleşme bitmeden hiçbir şey yazılmaz, buluttaki ev yanlışlıkla ezilmez.
- Çıkış yapınca telefondaki ev temizlenir, tekrar giriş yapınca geri gelir.
- Buzdolabı fotoğrafı telefonda kalır, yedeğe girmez.
- İki telefonda aynı anda düzenleme (aile paylaşımı) v2'nin işi; şimdilik son yazan kazanır.

## Kurulum

### 1. Supabase

1. [supabase.com](https://supabase.com) üzerinde proje aç (bölge: Frankfurt, `eu-central-1`).
2. **Authentication > Sign In / Providers**: Email açık. **Allow anonymous sign-ins** açık. "Confirm email" açık kalsın (uygulama onay e-postasını bekliyor).
3. **Authentication > URL Configuration > Site URL**: Meikai Digital sitesinde "E-postan onaylandı, uygulamaya dönebilirsin" yazan basit bir sayfa.
4. **Authentication > Emails**: onay ve şifre yenileme e-postalarını Türkçeye çevir.
5. Tabloları kur: `supabase/migrations/` içindeki dosyaları sırayla SQL Editor'de çalıştır (`20261020210000_hesap.sql`, `20261020230000_delete_me.sql`, `20261021000000_puan.sql`), ya da Supabase CLI ile `supabase db push`. İkincisi uygulama içinden hesap silmeyi sağlayan `delete_me()` fonksiyonu, üçüncüsü puan, seri ve eşya mağazası (`play_award`, `play_buy`, `play_summary`). Üçüncüsü çalıştırılmadan puanlar sadece telefonda kalır, mağaza "Satın alınamadı" der.
6. Abonelik fonksiyonları (`revenuecat-webhook`, `subscription-sync`): bkz. [odeme-kurulumu.md](odeme-kurulumu.md), 5. adım.

### 2. RevenueCat ve mağazalar

Adım adım: [odeme-kurulumu.md](odeme-kurulumu.md). Özet: `premium` entitlement'ı, Google Play'de tek abonelik `layfapp_premium` (temel planlar `aylik`, `yillik`; aylığa ilk ay 4,99 $ teklifi), App Store'da iki ürün, `default` offering'de Monthly ve Annual paketleri, webhook Supabase'e.

### 3. Uygulama

Supabase adresi ve anon anahtarı repodaki `.env` dosyasında. RevenueCat Android anahtarı (`goog_...`) da `.env`'de; iOS anahtarı gelince oraya eklenecek (EAS bulut derlemesi `.env.local`'ı görmüyor). Bunlar uygulamaya gömülen, herkese açık anahtarlar; gizli anahtarlar sadece Supabase'de durur.

Anahtarlar girilmemişse uygulama yine açılır: tanıtım ve giriş ekranları görünür, "Hesapsız devam et" çalışır, veriler sadece telefonda kalır.

## Expo Go ve test

- Hesap ve bulut yedeği **Expo Go'da çalışır** (Supabase saf JavaScript).
- `react-native-purchases` yerel modül içerir. Expo Go'da RevenueCat kendiliğinden **önizleme modunda** açılır, gerçek satın alma ve geri yükleme yapılmaz. Gerçek test için EAS ile development build gerekir (`npx eas-cli@latest build --profile development`), bu da Windows'tan bulutta yapılabilir.
- Satın alımları geri yükleme testi: Google Play kapalı testinde lisans test kullanıcısıyla satın al, uygulamayı sil ve kur, misafir olarak gir, Hesap ekranında "Satın alımları geri yükle".

## Mağaza ve gizlilik notları

- Gizlilik politikasına eklenecekler: e-posta ve ad (hesap için), ev planı ve rutinler (bulut yedeği için, Supabase AB sunucusunda), satın alma durumu (RevenueCat). Kart bilgisi toplanmaz.
- App Store gizlilik formu: "Contact Info > Email", "User Content > Other", "Purchases > Purchase History"; hepsi "App Functionality", takip yok.
- Google Play veri güvenliği formu: aynı maddeler, "veriler aktarım sırasında şifrelenir", "kullanıcı silme isteğinde bulunabilir" (uygulama içinden).
- Gizlilik politikası ve kullanım koşulları adresleri `src/lib/links.ts` içinde; sayfalar yayınlanınca güncellenmeli.
