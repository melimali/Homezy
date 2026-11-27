# Google Play'e ilk yayın: kontrol listesi

Kod tarafı hazır. Aşağıdakiler Melih'in elle yapacakları, sırasıyla. Kimlik ve şifreler bu dosyaya yazılmaz.

| | |
|---|---|
| Paket kimliği | `com.meikai.homezy` (ilk yüklemeden sonra değişmez) |
| Play adı | Homezy: Rutin ve Ev İşleri (TR) · Homezy: Routine & Chores (EN) |
| Mağaza metinleri | [magaza-metni.md](magaza-metni.md) |
| Yasal sayfalar | `docs/yasal/` → themeikai.com/homezy/gizlilik, /kosullar, /hesap-silme |
| Ödeme | [odeme-kurulumu.md](odeme-kurulumu.md) |
| Reklam | [reklam.md](reklam.md) |

## 1. Hesaplar (beklemede)

- [ ] Karar (Melih, 2026-10-31): hesap kişisel (Melih Tuğyan), D-U-N-S gerekmez. Play Console kişisel hesap onayı ve ödeme profili (banka, vergi).
- [ ] Yeni kişisel hesaplarda 12 test kullanıcılı 14 günlük kapalı test şartı var mı, Play Console'da kontrol et.

## 2. Yasal sayfaları yayınla

- [x] Yasal sayfalarda iletişim e-postası `info@themeikai.com` (köşeli parantez kalmadığını yayından önce yine kontrol et).
- [ ] Sayfaları sitede `homezy/gizlilik/index.html`, `homezy/kosullar/index.html`, `homezy/hesap-silme/index.html` olarak yükle; üç adresi tarayıcıda aç.
- [ ] Sitenin köküne `app-ads.txt`: AdMob > Uygulamalar > app-ads.txt'deki satır (`google.com, pub-…, DIRECT, f08c47fec0942fa0`).

## 3. AdMob

- [ ] Android uygulamasının AdMob'da `com.meikai.homezy` paketine bağlı olduğunu kontrol et.
- [ ] Android uygulama kimliği ve banner birimi EAS'ta `production` ortamında (`EXPO_PUBLIC_ADMOB_APP_ID_ANDROID`, `EXPO_PUBLIC_ADMOB_BANNER_ANDROID`). Eksikse production derlemesi bilerek hata verir (`app.config.ts`).
- [ ] GDPR mesajı yayında (AdMob > Gizlilik ve mesajlaşma).
- [ ] iOS uygulaması ve banner birimi: iOS'a geçerken (Android'i beklemez).

## 4. EAS ve ilk derleme

- [ ] `npx.cmd eas-cli@latest login`, `npx.cmd eas-cli@latest init` (proje `homezy` slug'ıyla bağlı olmalı).
- [ ] EAS `production` ortamında: Supabase ve RevenueCat `EXPO_PUBLIC_…` değerleri (`.env` repoda değilse) ve AdMob değerleri.
- [ ] `npx.cmd eas-cli@latest build --platform android --profile production` → `.aab`.
- [ ] İlk `.aab`'ı Play Console'a **elle** yükle (Test ve yayın → Dahili test). Google ilk yüklemeyi API'yle kabul etmiyor; sonrakiler `eas submit` ile gidebilir.

## 5. Play Console uygulama kaydı

- [ ] Uygulama oluştur: ad "Homezy: Rutin ve Ev İşleri", varsayılan dil Türkçe, Uygulama, Ücretsiz.
- [ ] Mağaza kaydı: kısa ve uzun açıklama, ikon 512×512, öne çıkan görsel 1024×500, en az 2 telefon ekran görüntüsü (sıra `magaza-metni.md`'de).
- [ ] Uygulama içeriği:
  - Gizlilik politikası: `https://themeikai.com/homezy/gizlilik`
  - Uygulama erişimi: kısıtlama yok (hesapsız kullanılabiliyor).
  - Reklam: Evet.
  - İçerik derecelendirmesi anketi.
  - Hedef kitle: 13 yaş ve üstü (çocuklara yönelik değil).
  - Veri güvenliği: `magaza-metni.md` > Gizlilik formları; hesap silme adresi `https://themeikai.com/homezy/hesap-silme`.
  - Sağlık uygulaması beyanı: spor takibi var, tıbbi amaç yok; sorulursa "fitness" olarak işaretle.
  - Finansal özellik: yok. Haber uygulaması: hayır.

## 6. Abonelik ve RevenueCat

- [ ] Play Console → Abonelikler: `homezy_premium`, temel planlar `aylik` / `yillik`, her plana 3 gün deneme teklifi, Türkiye fiyatları elle ([odeme-kurulumu.md](odeme-kurulumu.md) adım 3).
- [ ] RevenueCat: Google Play uygulaması paket `com.meikai.homezy`, servis hesabı JSON'u, gerçek zamanlı bildirimler (Pub/Sub), ürünleri içe aktar, `premium` yetkisi, `default` offering.
- [ ] RevenueCat'te daha önce `layfapp_premium` ürünleri açıldıysa onları sil ya da arşivle; uygulama sadece paket türüne (Monthly / Annual) bakıyor, ürün kimliği kodda yok.
- [ ] RevenueCat Android public anahtarı (`goog_…`) `.env`'de ve EAS ortamında.
- [ ] Dahili testte satın alma ve geri yüklemeyi dene (lisans test kullanıcısı olarak kendi Gmail'in).

## 7. Supabase

- [ ] Auth > URL Configuration: yönlendirme adreslerine `homezy://` ekle.
- [ ] Bekleyen SQL'ler çalıştırılmış olsun (ör. `20261027120000_bahce.sql`).
- [ ] Tarama fonksiyonu deploy edilmiş ve Anthropic anahtarı Supabase secret'ında.

## 8. Emülatör ve son deneme

- [ ] Eski `com.meikaidigital.layfapp` uygulamasını kaldır, `npx.cmd expo run:android` ile yeniden kur (paket değişti; eski veriler gelmez).
- [ ] Dahili test bağlantısından gerçek telefona kur: açılış, ev çizme, iş tamamlama, bildirim, tarama, satın alma, hesap silme.
- [ ] Sorun yoksa kapalı ya da açık teste, sonra üretime yükselt.

## Takviye takibi, tıbbi kategori değil (2026-11-27)

İlaç takibi kaldırıldı. Uygulamada artık sadece **takviye (vitamin, mineral vb.) hatırlatıcısı** var. Amaç: Google Play'in ilaç yönetimini "tıbbi" kategorisinde sayıp kurumsal hesap istemesinden kaçınmak (Melih bireysel hesap). Mağaza metinlerinde, ekran görüntülerinde ve formlarda "ilaç, doz, reçete, tedavi" kelimeleri geçmemeli. Sağlık beyanı formunda: sadece spor ve basit takviye hatırlatması, tıbbi işlev yok.
