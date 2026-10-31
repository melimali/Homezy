# Mağaza gizlilik formları (hazır cevaplar)

> Avukat görüşü değildir. Formlar ürün her değiştiğinde (yeni SDK, yeni veri) güncellenmeli; yanlış beyan mağaza reddi sebebidir. Cevaplar şu koda göre: Supabase, RevenueCat, AdMob (kişiselleştirilmemiş), Anthropic (tarama + sohbet), Open-Meteo, analytics yok.

## 1. Google Play › Veri güvenliği (Data safety)

**Genel sorular**
- Uygulama kullanıcı verisi topluyor / paylaşıyor mu? **Evet.**
- Tüm veriler aktarım sırasında şifreli mi? **Evet** (HTTPS).
- Kullanıcılar veri silme talep edebilir mi? **Evet.** Uygulama içi: Ben › Hesabımı sil. Web adresi: `…/hesap-silme.html`.
- Hesap oluşturma yöntemi: e-posta + parola (ve anonim misafir).

**Veri türleri** (T = toplanıyor, P = paylaşılıyor; "paylaşım" Play tanımında, işleyici olarak bizim adımıza çalışan hizmetler (Supabase, RevenueCat, Anthropic) hariç; yine de avukat doğrulasın)

| Kategori › tür | T | P | Amaç | Zorunlu mu |
|---|---|---|---|---|
| Kişisel bilgi › Ad | Evet | Hayır | Hesap yönetimi, uygulama işlevi | İsteğe bağlı (hesap açarsan) |
| Kişisel bilgi › E-posta | Evet | Hayır | Hesap yönetimi | İsteğe bağlı |
| Kişisel bilgi › Kullanıcı kimlikleri | Evet | Hayır | Hesap, abonelik, uygulama işlevi | Evet |
| Finansal bilgi › Satın alma geçmişi | Evet | Hayır | Abonelik doğrulama | Premium'da |
| Konum › Yaklaşık konum | Evet | Evet (Open-Meteo, hava durumu sorgusu) | Uygulama işlevi | İsteğe bağlı (kapatılabilir) |
| Fotoğraf ve videolar › Fotoğraflar | Evet | Hayır (işleyici: Anthropic, saklanmaz) | Uygulama işlevi (tarama, günlük, yedek) | İsteğe bağlı |
| Mesajlar › Diğer uygulama içi mesajlar | Evet (Moka sohbeti; işleyici: Anthropic, saklanmaz) | Hayır | Uygulama işlevi | İsteğe bağlı |
| Uygulama etkinliği › Diğer kullanıcı tarafından oluşturulan içerik | Evet (ev verisi, notlar, günlük) | Hayır | Uygulama işlevi, yedek | Evet |
| Uygulama etkinliği › Uygulama etkileşimleri | Evet (puan, seri, sayaçlar) | Hayır | Uygulama işlevi, hile önleme | Evet |
| Cihaz veya diğer kimlikler › Cihaz/diğer kimlikler (reklam kimliği) | Evet | Evet (Google AdMob) | Reklam (ücretsiz plan) | Ücretsiz planda |

Analytics, tanılama (çökme günlükleri), sağlık/fitness, rehber, mikrofon: **toplanmıyor.** (Spor özelliği yalnızca kullanıcının girdiği antrenman/hatırlatma; Health Connect/Google Fit kullanılmıyor → "Sağlık ve fitness" beyanı için kullanıcı notlarındaki sağlık bilgisini avukata/Play ekibine göre değerlendir.)

**Politika adresi:** `…/gizlilik.html`

## 2. Google Play diğer beyanlar

- **Hedef kitle:** 13+ (çocuklara yönelik değil). "Aile" programına girme.
- **İçerik derecelendirme (IARC):** kullanıcı etkileşimi yok (aile paylaşımı özel, davet kodlu), yapay zekâ sohbeti var; şiddet/cinsellik yok. Beklenen: PEGI 3 / Everyone, ama sohbet botu sorusunu dürüst işaretle.
- **Yapay zekâ ile oluşturulan içerik:** Moka cevapları yapay zekâdır; uygulama içinde **bildirme düğmesi (🚩)** var, zararlı içerik filtresi sistem isteminde.
- **Reklam beyanı:** Evet, reklam var (ücretsiz planda).
- **Hesap silme:** uygulama içi + web adresi (yukarıda).
- **Abonelik:** Play Console'da fiyat/deneme/iptal bilgisi ürün sayfasında doldurulur; uygulama metni uyumlu.
- **Konum izni:** yalnızca ön planda (`ACCESS_BACKGROUND_LOCATION` engellenmiş); izin beyanı: "hava durumuna göre ev gökyüzünü göstermek".
- **Kullanılan izinler:** CAMERA, POST_NOTIFICATIONS, SCHEDULE_EXACT_ALARM (varsa gerekçe: sabah özeti), VIBRATE, INTERNET, ACCESS_COARSE/FINE_LOCATION, READ_MEDIA_* **yok** (blockedPermissions).

## 3. Apple App Store Connect › App Privacy

**"Takip" (tracking): Hayır.** Reklamlar kişiselleştirilmiyor, ATT izni istenmiyor, veri veri komisyoncularıyla paylaşılmıyor. (Avukat/AdMob belgesiyle doğrula: iOS'ta AdMob kişiselleştirilmemiş reklam + ATT yok senaryosu.)

**Kullanıcıya bağlı toplanan veriler (Data Linked to You)**

| Tür | Amaç |
|---|---|
| İletişim bilgisi › Ad, E-posta | Uygulama işlevi, hesap |
| Tanımlayıcılar › Kullanıcı kimliği | Uygulama işlevi |
| Satın almalar › Satın alma geçmişi | Uygulama işlevi |
| Kullanıcı içeriği › Fotoğraflar veya videolar | Uygulama işlevi |
| Kullanıcı içeriği › Diğer kullanıcı içeriği (ev verisi, notlar, sohbet) | Uygulama işlevi |
| Konum › Yaklaşık konum | Uygulama işlevi (bağlı değil: Open-Meteo'ya hesap bilgisiyle gönderilmiyor → "Bağlı değil" de işaretlenebilir) |

**Kullanıcıya bağlı olmayan:** Tanımlayıcılar › Cihaz kimliği, Kullanım verisi › Ürün etkileşimi / reklam verisi → *Üçüncü taraf reklamcılık* (AdMob, ücretsiz plan).

Politika adresi: `…/gizlilik.html`. Kullanıcı gizlilik seçenekleri / silme adresi: `…/hesap-silme.html`.

## 4. Apple inceleme notları (App Review)

- Hesap silme uygulama içinde (5.1.1(v)): Ben › Hesabımı sil.
- Abonelik (3.1.2): fiyat, dönem, otomatik yenileme, iptal, Koşullar ve Gizlilik bağlantıları satın alma ekranında; "Satın alımları geri yükle" var.
- Yapay zekâ (5.1.1 / 5.1.2(i)): veriyi üçüncü taraf yapay zekâya göndermeden önce açık rıza ekranı var (ilk sohbet/tarama). Rıza Ben › Gizlilik ve yasal'dan geri alınır.
- Test hesabı: gerek yok (misafir kullanım açık); Premium test için sandbox hesabı ver.
- Yaş derecelendirmesi: 12+ öner (sohbet botu + reklam). "Sınırsız web erişimi" Hayır.

## 5. Uygulama içi açıklama metinleri (mağaza listesine)

- TR: "Moka bir yapay zekâdır; tıbbi ya da psikolojik tavsiye vermez. Premium aylık/yıllık aboneliktir, dönem sonundan en az 24 saat önce iptal edilmezse otomatik yenilenir; Google Play / App Store ayarlarından iptal edebilirsin."
- EN: "Moka is an AI and does not give medical or psychological advice. Premium is a monthly/yearly subscription that renews automatically unless cancelled at least 24 hours before the period ends; cancel anytime in Google Play / App Store settings."
