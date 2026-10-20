# Premium üyelik ve yapay zekâ maliyeti

Yapay zekâ ile fotoğraf taraması (buzdolabı ve kıyafet) ücretli **Premium** üyeliğin içinde. Geri kalan her şey ücretsiz: ev planı, rutinler, gardırop, stok, bitkiler, bildirimler ve kombin önerisi (kombin önerisi telefondaki kurallarla çalışır, yapay zekâ kullanmaz).

Prototipte ödeme ekranı ve kilit taklit ediliyor: `PREMIUM`, `canScan()`, `countScan()`, `gateScan()`, `paywallHTML()`, `premiumCardHTML()`.

---

## İndiren kullanıcıda da aynı kalitede çalışır mı?

Evet. Prototipte fotoğraf doğrudan Claude'a gidiyor. Gerçek uygulamada da fotoğraf aynı Claude modeline, aynı istemle (`fridgePrompt()`, `lookPrompt()`) gidiyor; arada sadece bizim küçük sunucu fonksiyonumuz var. Kaliteyi belirleyen şey **hangi modeli seçtiğimiz**, uygulamanın kendisi değil.

Hız da benzer: bir tarama genelde 5–15 saniye sürer. Farkı yaratanlar:

- **Model:** Haiku en hızlısı, Opus en yavaşı.
- **Fotoğraf boyutu:** Telefonda uzun kenar 1280 px'e küçültülüp JPEG olarak gönderilir. Hem hızlanır hem ucuzlar, ürün ve kıyafet tanımaya yeter.
- **Kullanıcının interneti:** Fotoğraf yaklaşık 200–300 KB, mobil veride de birkaç saniyede gider.

Tek gerçek fark şu: prototipte yapay zekâyı görüntüleyen kişinin Claude hesabı ödüyor, uygulamada ise **her taramayı biz ödüyoruz**. Bu yüzden Premium ve tarama sınırı gerekiyor.

---

## Nasıl çalışacak?

```
Telefon (Expo)                      Sunucu fonksiyonu (Supabase Edge Function)        Claude API
──────────────                      ───────────────────────────────────────────       ──────────
Fotoğrafı çek, 1280 px'e küçült
Supabase anonim oturum jetonu  ──►  1. Jetonu doğrula (kullanıcı kim?)
+ fotoğraf + istem türü             2. Premium mi? (RevenueCat'e sor)
                                    3. Bu ayki hakkı kaldı mı? (scan_usage tablosu)
                                    4. Fotoğrafı istemle birlikte gönder  ─────────►  JSON döner
                                    5. Başarılıysa sayacı 1 artır          ◄─────────
Onay listesini göster  ◄──────────  6. JSON'u telefona döndür
```

### Parçalar

| Parça | Ne yapar | Not |
|---|---|---|
| **RevenueCat** (`react-native-purchases` + `react-native-purchases-ui`) | App Store ve Google Play aboneliklerini tek yerden yönetir. Ödeme ekranı, satın alma, geri yükleme, yenileme, iptal. | `premium` adında tek bir yetki (entitlement). İki ürün: aylık ve yıllık. |
| **Supabase anonim oturum** | Her kuruluma bir kullanıcı kimliği verir, kayıt ekranı gerekmez. Bu kimlik RevenueCat'e de `appUserID` olarak verilir. | v2'de aile paylaşımı geldiğinde aynı kimlik e-posta ile kalıcı hesaba bağlanır. |
| **Supabase Edge Function `scan`** | Anthropic API anahtarını tutar. Yetkiyi ve kotayı kontrol eder, Claude'u çağırır. | "İlk sürüm sunucusuz" kuralının tek istisnası. Ev verileri yine sadece telefonda. |
| **`scan_usage` tablosu** | `user_id, ay, sayı`. Sadece fonksiyon yazar. | Fotoğraf saklanmaz, sadece sayaç tutulur. |
| **RevenueCat webhook** (isteğe bağlı) | Abonelik başlayınca/bitince Supabase'e haber verir, her taramada RevenueCat'e sormaya gerek kalmaz. | İlk sürümde her taramada RevenueCat REST API'ye sormak da yeter. |

### Kurallar ve sınırlar

- **Ücretsiz deneme:** Her kullanıcıya ömür boyu **3 ücretsiz tarama**. Sayaç sunucuda tutulur, uygulamayı silip kurmak sıfırlamaz (aynı cihazda anonim kimlik korunamazsa sıfırlanabilir; kabul edilebilir bir kayıp).
- **Premium kotası:** Ayda **100 tarama**, günde en fazla **15**. Normal kullanım ayda 15–30 tarama; sınır sadece kötüye kullanımı keser.
- **Sadece başarılı tarama sayılır.** Hata, iptal ya da "fotoğraf okunamadı" sonucu hak yemez.
- **Hız sınırı:** Aynı kullanıcıdan dakikada en fazla 5 istek. Fotoğraf en fazla 1600 px ve 1,5 MB, daha büyüğü sunucuda reddedilir.
- **Harcama tavanı:** Anthropic Console'da aylık harcama limiti konur. Limit dolarsa taramalar "şu an kullanılamıyor" mesajına düşer, uygulamanın geri kalanı etkilenmez.
- **Model sunucuda seçilir.** Uygulama güncellemesi beklemeden model değiştirilebilir.

### Mağaza kuralları

- Uygulama içinde dijital bir özellik satıldığı için **ödeme App Store ve Google Play'in kendi ödeme sistemiyle** alınmak zorunda. Kendi kart formumuz ya da web'e yönlendirme olmaz (Apple 3.1.1, Google Play Payments politikası). RevenueCat bunu iki mağazanın sistemiyle yapıyor.
- **Komisyon:** Apple Small Business Program'a başvurulursa (yıllık 1 milyon $ altı gelir) **%15**. Google Play'de abonelikler zaten **%15**. Başvuru yapılmazsa Apple ilk yıl %30 alır, bu yüzden Small Business Program başvurusu yayından önce yapılmalı.
- **KDV:** Türkiye'de mağaza fiyatına %20 KDV dahil; KDV'yi mağazalar öder, bize KDV'siz tutarın %85'i gelir.
- Ödeme ekranında olması zorunlu olanlar (Apple 3.1.2): fiyat ve dönem, otomatik yenileme açıklaması, **Satın alımları geri yükle** düğmesi, **Kullanım koşulları** ve **Gizlilik politikası** bağlantıları. Prototipteki ödeme ekranında hepsi var.
- Mağaza başvurusunda inceleme ekibi için test hesabı gerekmez (anonim oturum), ama abonelik ürünlerinin inceleme ekran görüntüsü ve açıklaması girilmeli.
- Ücretli uygulama için Apple'da **Paid Apps sözleşmesi**, iki mağazada da **banka ve vergi bilgisi** gerekiyor. Bireysel mi şirket mi kararı (Meikai Digital) bunu da etkiliyor.
- Gizlilik politikası ve mağaza gizlilik formları: fotoğrafın yapay zekâ servisine gönderildiği, saklanmadığı, satın alma bilgisinin RevenueCat'te tutulduğu yazmalı.

### Expo tarafı

- `react-native-purchases` yerel modül içerir. **Expo Go'da gerçek satın alma çalışmaz**, sadece deneme (önizleme) modunda açılır. Gerçek satın alma testi için EAS ile bir **development build** gerekir; bu da Windows'tan bulutta yapılabiliyor.
- Test: Google Play'de kapalı test kanalındaki "lisans test kullanıcıları" ücretsiz satın alma yapabilir; iOS'ta TestFlight'ta sandbox satın alma ücretsizdir.

---

## Ne kadar ödeyeceğim?

Fiyatlar 20 Ekim 2026 itibarıyla. Kur varsayımı **1 $ ≈ 42 TL**; güncel kurla değiştir.

### Sabit giderler

| Kalem | Ücret | Ne zaman |
|---|---|---|
| Apple Developer Program | 99 $/yıl (≈ 4.160 TL) | Her yıl |
| Google Play geliştirici hesabı | 25 $ bir kere (≈ 1.050 TL) | Bir kere |
| Supabase | **0 $** başlangıçta (ücretsiz plan: ayda 500 bin fonksiyon çağrısı). Büyüyünce Pro 25 $/ay (≈ 1.050 TL) | Ücretsiz plan, 1 hafta hareketsiz kalan projeyi durdurur; yayından sonra Pro'ya geçmek mantıklı |
| RevenueCat | **0 $**, aylık mağaza gelirin 2.500 $'a kadar. Üstünde gelirin %1'i | Gelir gelince |
| Gizlilik politikası sayfası | 0 (Meikai Digital sitesinde) | |
| EAS Build | 0 (ücretsiz planda ayda sınırlı bulut derlemesi yetiyor) | |

**İlk yıl sabit gider:** yaklaşık **125 $ ≈ 5.200 TL** (Supabase ücretsiz kalırsa). Supabase Pro'ya geçilirse yılda +300 $ ≈ 12.600 TL.

### Değişken gider: tarama başına yapay zekâ

Bir tarama ≈ 2.600 giriş token'ı (1280 px fotoğraf ≈ 1.650 + istem ve dolap listesi ≈ 950) ve ≈ 700 çıkış token'ı (düşük düşünme seviyesi + JSON).

| Model | Fiyat (giriş / çıkış, 1 milyon token) | Tarama başına | 1.000 tarama |
|---|---|---|---|
| Claude Haiku 5.5 | 0,10 $ / 0,50 $ | ≈ 0,0006 $ (≈ 0,03 TL) | ≈ 0,60 $ (≈ 25 TL) |
| Claude Sonnet 5.5 | 2 $ / 10 $ | ≈ 0,012 $ (≈ 0,50 TL) | ≈ 12 $ (≈ 500 TL) |
| Claude Opus 5.5 | 4 $ / 20 $ | ≈ 0,024 $ (≈ 1 TL) | ≈ 24 $ (≈ 1.000 TL) |

Gerçek token sayısı ilk testlerde Claude API'nin `usage` alanından ölçülüp bu tablo güncellenmeli.

### Önerilen fiyat ve kullanıcı başına kâr

| | Aylık | Yıllık |
|---|---|---|
| Mağaza fiyatı (KDV dahil) | 79,99 TL | 599,99 TL (aylığa göre %37 indirim) |
| KDV'siz | 66,66 TL | 500 TL |
| Mağaza %15 sonrası elimize geçen | **≈ 56,70 TL/ay** | **≈ 425 TL/yıl ≈ 35,40 TL/ay** |

Bir Premium kullanıcının aylık yapay zekâ maliyeti:

| Kullanım | Haiku 5.5 | Sonnet 5.5 | Opus 5.5 |
|---|---|---|---|
| Normal: ayda 20 tarama | ≈ 0,50 TL | ≈ 10 TL | ≈ 20 TL |
| En kötü: kotanın tamamı, ayda 100 tarama | ≈ 2,50 TL | ≈ 50 TL | ≈ 100 TL ⚠️ |

Opus ile kotayı dolduran bir kullanıcı zarar ettirir. Sonnet ile yıllık abonede en kötü durumda da maliyet gelire yakın kalır (50 TL'ye karşı 35 TL); normal kullanımda rahat kârlı.

### Örnek aylık tablo (Sonnet 5.5, ayda kişi başı 20 tarama, yarısı yıllık abone)

| Premium kullanıcı | Taramalar | Yapay zekâ | Elimize geçen gelir | Supabase + RevenueCat | Kalan (vergi öncesi) |
|---|---|---|---|---|---|
| 100 | 2.000 | ≈ 24 $ ≈ 1.000 TL | ≈ 4.600 TL | 0 TL | ≈ **3.600 TL/ay** |
| 1.000 | 20.000 | ≈ 240 $ ≈ 10.000 TL | ≈ 46.000 TL | ≈ 1.050 TL Supabase + ≈ 0 RevenueCat (gelir 2.500 $ altında) | ≈ **35.000 TL/ay** |

Ücretsiz kullanıcılar: her biri en fazla 3 tarama ≈ 1,50 TL (Sonnet). 10.000 indirmede en fazla ≈ 15.000 TL; çoğu üç hakkı da kullanmayacağı için gerçekte bunun altında. Ücretsiz denemeleri Haiku ile yapmak bu kalemi neredeyse sıfırlar.

Vergi: elimize geçen gelir bireysel hesapta gelir vergisine, şirket hesabında kurumlar vergisine tabi. Bu tablo vergiyi içermiyor.

### Model önerisi

1. **Sonnet 5.5 ile başla.** Prototipteki kaliteye yakın, maliyeti fiyatın içinde kalıyor.
2. Kapalı test sırasında 30–50 gerçek buzdolabı ve kıyafet fotoğrafını **Haiku 5.5, Sonnet 5.5 ve Opus 5.5** ile aynı istemle çalıştırıp sonuçları yan yana karşılaştır. Haiku yeterince iyiyse maliyet 20'de birine iner.
3. Opus 5.5'i sadece kalite farkı açıksa ve kota ayda 50'ye düşürülürse kullan.

Model sunucuda seçildiği için bu karar uygulama güncellemesi gerektirmez.

---

## Yapılacaklar sırası

1. Apple Small Business Program başvurusu, Paid Apps sözleşmesi, iki mağazada banka ve vergi bilgisi.
2. App Store Connect ve Play Console'da iki abonelik ürünü: `layfapp_premium_aylik`, `layfapp_premium_yillik` (tek abonelik grubu).
3. RevenueCat projesi, `premium` yetkisi, iki ürün, bir "offering".
4. Supabase projesi: anonim oturum, `scan_usage` tablosu, `scan` Edge Function, `ANTHROPIC_API_KEY` ve `REVENUECAT_API_KEY` gizli değişkenleri.
5. Uygulamada: ödeme ekranı (prototipteki `paywallHTML()` tasarımı), tarama düğmelerinde kilit, Bildirimler sekmesinde Premium kartı ve aylık sayaç.
6. Anthropic Console'da aylık harcama limiti.
7. Gizlilik politikası ve mağaza gizlilik formlarına fotoğraf ve satın alma maddeleri.
