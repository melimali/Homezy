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
                                    3. Bugünkü hakkı var mı? Varsa ayır (scan_usage)
                                    4. Fotoğrafı istemle birlikte gönder  ─────────►  JSON döner
                                    5. Hata olursa ayrılan hakkı geri ver  ◄─────────
Onay listesini göster  ◄──────────  6. JSON'u telefona döndür
```

### Parçalar

| Parça | Ne yapar | Not |
|---|---|---|
| **RevenueCat** (`react-native-purchases` + `react-native-purchases-ui`) | App Store ve Google Play aboneliklerini tek yerden yönetir. Ödeme ekranı, satın alma, geri yükleme, yenileme, iptal. | `premium` adında tek bir yetki (entitlement). İki ürün: aylık ve yıllık. |
| **Supabase anonim oturum** | Her kuruluma bir kullanıcı kimliği verir, kayıt ekranı gerekmez. Bu kimlik RevenueCat'e de `appUserID` olarak verilir. | v2'de aile paylaşımı geldiğinde aynı kimlik e-posta ile kalıcı hesaba bağlanır. |
| **Supabase Edge Function `scan`** | Anthropic API anahtarını tutar. Yetkiyi ve kotayı kontrol eder, Claude'u çağırır. | "İlk sürüm sunucusuz" kuralının tek istisnası. Ev verileri yine sadece telefonda. |
| **`scan_usage` tablosu** | `user_id, dönem (gün ya da hafta), sayı`. Sadece fonksiyon yazar. | Fotoğraf saklanmaz, sadece sayaç tutulur. |
| **RevenueCat webhook** (isteğe bağlı) | Abonelik başlayınca/bitince Supabase'e haber verir, her taramada RevenueCat'e sormaya gerek kalmaz. | İlk sürümde her taramada RevenueCat REST API'ye sormak da yeter. |

### Ücretsiz ve Premium

| | Ücretsiz | Premium (6,99 $/ay, ilk ay 4,99 $; ya da 59,99 $/yıl) |
|---|---|---|
| Ev planı, rutinler, bildirimler | ✓ | ✓ |
| Gardırop, stok, bitkiler, alışveriş listesi | ✓ | ✓ |
| Kombin önerisi (telefondaki kurallar) | ✓ | ✓ |
| Buzdolabı fotoğrafı saklama (taramasız) | ✓ | ✓ |
| Yapay zekâ ile buzdolabı ya da kıyafet taraması | **Haftada 2** (iki tür ortak) | **Günde 2** (iki tür ortak) |

- Ücretsiz üyelikte haftada 2 tarama var, pazartesi yenilenir. Özelliği tanıtır ve haftalık buzdolabı kontrolüne yeter. Maliyeti kullanıcı başına ayda en fazla ≈ 9 tarama ≈ 0,10 $ (Sonnet).
- Premium'da günde 2 tarama var; buzdolabı ya da kıyafet, kullanıcı istediği gibi dağıtır (ör. iki buzdolabı).
- Premium hakkı gece yarısı (Türkiye saati) yenilenir, kullanılmayan hak ertesi güne devretmez.
- **Sadece başarılı tarama hak yer.** Hata, iptal ya da "fotoğraf okunamadı" sonucu sayılmaz.

### Günlük sınır nasıl uygulanır?

Sınır telefonda değil **sunucuda** tutulur; telefondaki sayaç sadece göstermek için. Uygulama silinip kurulsa da, saat ileri alınsa da sunucu sayacı değişmez.

1. `scan_usage` tablosu: `user_id`, `period` (Premium için Türkiye saatine göre o günün tarihi, ücretsiz için o haftanın pazartesisi), `n`. Birincil anahtar `(user_id, period)`. Taramanın türü (buzdolabı / kıyafet) sadece istatistik için ayrı bir sütunda tutulur, sınıra etki etmez.
2. `scan` fonksiyonu Claude'u çağırmadan önce veritabanında tek bir işlemle hak **ayırır**: satır yoksa `n = 1` ile ekler, varsa `n < sınır` ise `n`'yi bir artırır; artıramazsa 429 döner ve uygulama "Bugünkü 2 taramanı yaptın, gece yarısı yenilenir" (ücretsizde "pazartesi yenilenir") der. Tek işlem olduğu için iki kere hızlı dokunma iki hak kullandırmaz ve sınırı da aşamaz.
3. Claude hata verirse ya da sonuç boşsa ayrılan hak geri verilir (`n - 1`).
4. Premium mi değil mi sorusu RevenueCat'ten gelir (`premium` yetkisi). Abonelik bittiği an ücretsiz kurallara düşer.
5. Ek korumalar: aynı kullanıcıdan dakikada en fazla 5 istek; fotoğraf en fazla 1600 px ve 1,5 MB; Anthropic Console'da aylık harcama tavanı. Tavan dolarsa taramalar "şu an kullanılamıyor" der, uygulamanın geri kalanı çalışır.
6. Uygulamayı silip yeniden kurarak yeni anonim kimlikle 2 ücretsiz tarama daha almak mümkün. Kaybı küçük (≈ 0,02 $), ileride gerekirse Apple DeviceCheck ve Google Play Integrity ile cihaz başına sınırlanır.

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

## Gelir ve gider hesabı

Senaryo: **aylık 6,99 $** (yıllık 59,99 $; mağazalar fiyatı ,99 ile bitirir), Premium kullanıcı günde 2 tarama (buzdolabı ya da kıyafet) yapabiliyor, yani ayda en fazla **60 tarama**; ücretsiz kullanıcı haftada 2. Kur varsayımı **1 $ ≈ 42 TL**. Fiyatlar 20 Ekim 2026 itibarıyla.

### Kullanıcı başına

| | Türkiye'den satış | ABD'den satış |
|---|---|---|
| Mağaza fiyatı | 6,99 $ (KDV dahil) | 6,99 $ (satış vergisi ayrıca eklenir) |
| KDV | −1,17 $ | 0 |
| Mağaza komisyonu %15 | −0,87 $ | −1,05 $ |
| **Elimize geçen** | **≈ 4,95 $ (≈ 208 TL)** | **≈ 5,94 $** |

Aşağıdaki tablolarda temkinli olsun diye Türkiye rakamı (4,95 $) kullanıldı.

Bir tarama ≈ 2.600 giriş + 700 çıkış token'ı:

| Model | Tarama başına | Normal kullanım: ayda 25 tarama | En kötü: ayda 60 tarama |
|---|---|---|---|
| Claude Haiku 5.5 | ≈ 0,0006 $ | ≈ 0,02 $ | ≈ 0,04 $ |
| Claude Sonnet 5.5 | ≈ 0,012 $ | ≈ 0,30 $ | ≈ 0,72 $ |
| Claude Opus 5.5 | ≈ 0,024 $ | ≈ 0,60 $ | ≈ 1,44 $ |

En pahalı modelle ve herkes her gün iki tarama yapsa bile yapay zekâ gideri elimize geçen 4,95 $'ın %30'unu geçmiyor (Sonnet ile %15). Günlük sınır bu fiyatta zararı imkânsız kılıyor.

### Sabit giderler (aylık)

| Kalem | Ücret |
|---|---|
| Apple Developer Program | 99 $/yıl → ≈ 8,25 $/ay |
| Google Play hesabı | 25 $, bir kere |
| Supabase Pro | 25 $/ay (ücretsiz plan bir hafta hareketsiz kalan projeyi durdurduğu için yayında Pro önerilir; 10.000 kullanıcıya kadar yeter) |
| RevenueCat | Aylık 2.500 $ gelire kadar 0; üstünde gelirin %1'i |

### Aylık tablo (Sonnet 5.5)

Her Premium kullanıcıya 5 ücretsiz kullanıcı düştüğü ve ücretsizlerin ayda ortalama 3 tarama yaptığı varsayıldı (hakkın tamamını kullanan ücretsiz kullanıcı ayda ≈ 9 tarama yapar).

| | 100 Premium | 1.000 Premium | 10.000 Premium |
|---|---|---|---|
| Brüt satış | 699 $ | 6.990 $ | 69.900 $ |
| KDV + mağaza komisyonu | −204 $ | −2.040 $ | −20.400 $ |
| **Elimize geçen** | **495 $** | **4.950 $** | **49.500 $** |
| Yapay zekâ, Premium (normal / en kötü) | 30 / 72 $ | 300 / 720 $ | 3.000 / 7.200 $ |
| Yapay zekâ, ücretsiz kullanıcılar | 18 $ | 180 $ | 1.800 $ |
| Supabase + Apple | 33 $ | 33 $ | 33 $ |
| RevenueCat (%1) | 0 | 70 $ | 700 $ |
| **Kalan, normal kullanım** | **≈ 414 $ ≈ 17.400 TL** | **≈ 4.370 $ ≈ 183.000 TL** | **≈ 44.000 $ ≈ 1,85 milyon TL** |
| **Kalan, Premium'lar sınırı doldurursa** | **≈ 372 $ ≈ 15.600 TL** | **≈ 3.950 $ ≈ 166.000 TL** | **≈ 39.800 $ ≈ 1,67 milyon TL** |

Haiku 5.5 yeterli çıkarsa yapay zekâ satırları neredeyse sıfırlanır ve kalan normal kullanımda 100 kullanıcıda ≈ 460 $, 10.000 kullanıcıda ≈ 48.500 $ olur.

Notlar:

- **Vergi dahil değil.** Kalan tutar bireysel hesapta gelir vergisine, şirket hesabında kurumlar vergisine tabi.
- **Apple %15'i yıllık 1 milyon $ gelire kadar.** 10.000 Premium kullanıcı yılda ≈ 840 bin $ eder, sınırın altında kalır; 12.000 kullanıcıyı geçince Apple yılın geri kalanında yeni aboneliklerin ilk yılından %30 alır (bir yılı geçen aboneliklerde yine %15). Google'da abonelik her zaman %15.
- **6,99 $ Türkiye'de ≈ 294 TL/ay.** İki mağaza da ülkeye göre ayrı fiyat koymaya izin veriyor; örneğin ABD ve Avrupa'da 6,99 $, Türkiye'de 149,99 TL olabilir. 149,99 TL'de elimize ≈ 106 TL geçer; Sonnet ile yapay zekâ gideri en kötü durumda bunun ≈ %30'u, normal kullanımda ≈ %12'si.

### Model önerisi

1. **Sonnet 5.5 ile başla.** Prototipteki kaliteye yakın; 6,99 $ fiyatta en kötü durumda bile elimize geçenin %15'i.
2. Kapalı test sırasında 30–50 gerçek buzdolabı ve kıyafet fotoğrafını **Haiku 5.5, Sonnet 5.5 ve Opus 5.5** ile aynı istemle çalıştırıp sonuçları yan yana karşılaştır. Haiku yeterince iyiyse maliyet 20'de birine iner.
3. Opus 5.5 da günlük sınırla zarar ettirmez (en kötü durumda kullanıcı başına 1,44 $); kalite farkı açıksa tercih edilebilir.

Model sunucuda seçildiği için bu karar uygulama güncellemesi gerektirmez.

---

## Yapılacaklar sırası

1. Apple Small Business Program başvurusu, Paid Apps sözleşmesi, iki mağazada banka ve vergi bilgisi.
2. Abonelik ürünleri, ülkeye göre fiyat: Play Console'da tek abonelik `layfapp_premium`, temel planlar `aylik` (6,99 $) ve `yillik` (59,99 $); App Store Connect'te tek grupta `layfapp_premium_aylik` ve `layfapp_premium_yillik`. Aylık plana ilk ay 4,99 $ giriş teklifi. Adım adım: [odeme-kurulumu.md](odeme-kurulumu.md).
3. RevenueCat projesi, `premium` yetkisi, iki ürün, bir "offering".
4. Supabase projesi: anonim oturum, `scan_usage` tablosu ve hak ayırma / geri verme fonksiyonları, `scan` Edge Function, `ANTHROPIC_API_KEY` ve `REVENUECAT_API_KEY` gizli değişkenleri.
5. Uygulamada: ödeme ekranı (prototipteki `paywallHTML()` tasarımı), tarama düğmelerinde kilit, Bildirimler sekmesinde Premium kartı ve günlük sayaçlar.
6. Anthropic Console'da aylık harcama limiti.
7. Gizlilik politikası ve mağaza gizlilik formlarına fotoğraf ve satın alma maddeleri.
