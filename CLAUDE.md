# Layfapp

Gündelik ev işlerini tek uygulamada toplayan mobil uygulama. Hedef: App Store ve Google Play'de yayınlamak.
Uygulamanın dili Türkçe. Geliştirici Windows kullanıyor.

## Uygulama fikri

- **İlk açılış:** Kullanıcı evini bloklardan oluşan bir ızgarada çizer. Oda türünü seçer, sonra bloklara dokunup sürükleyerek odayı boyar. Her blok yaklaşık 2 m². Varsayılan ızgara 6 × 8 blok.
- **Ana ekran:** Çizilen ev planı. Her odanın üzerinde bekleyen iş sayısı görünür: gecikmiş iş varsa kırmızı, sadece bugünün işleri varsa sıcak renk. Odaya dokununca oda ekranı açılır.
- **Rutinler:** Her odanın "her N günde bir" tekrarlanan rutinleri var. Her rutin için son yapılma tarihi tutulur. Durumlar: gecikti / bugün / yarın / N gün kaldı. "Yaptım" butonu son yapılma tarihini bugüne çeker.
- **Odaya özel işlevler:**
  - Yatak odası ve çocuk odası: gardırop. Her kıyafet Temiz, Kirli ya da Ütülenecek olarak işaretlenir. 3 ve üzeri kirli parça olunca çamaşır uyarısı verilir. Kıyafet fotoğrafı yapay zekâ ile taranır: her parçanın türü, rengi ve kumaşı çıkarılır, onaylanınca gardıroba eklenir. Kombin önerisi telefondaki kurallarla yapılır (renk uyumu, açık-koyu kontrastı, kumaş eşleşmesi, stil seviyesi, mevsim); fotoğraftaki parçalar dolaptaki temiz parçalarla eşleştirilir.
  - Mutfak: buzdolabı fotoğrafı, ürünlerin Var / Az / Bitti takibi, otomatik alışveriş listesi. Fotoğraf yapay zekâ ile taranır: ürünler ve kalan miktar tahmini çıkarılır, kullanıcı onaylayınca listeye işlenir, her taramanın notu tarihiyle saklanır.
  - Banyo ve çamaşır odası: sarf malzemesi stoğu (Var / Az / Bitti).
  - Salon ve balkon: bitkiler ve sulama aralıkları.
  - Antre ve çalışma odası: sadece rutinler.
- **Sekmeler:** Ev, Bugün (gecikenler / bugün / bu hafta + alınacaklar), Bildirimler, Plan (ev planını düzenleme).
- **Bildirimler:** Günlük sabah özeti, saati kullanıcı seçer. Türler: rutin hatırlatmaları, eksik ürünler, kirli çamaşır. Her tür ayrı ayrı açılıp kapatılabilir.

Çalışan HTML prototipi: `prototype/layfapp.html`. Bütün akış, varsayılan rutinler (`TYPES`) ve bildirim kuralları (`notifs()`) orada. Gerçek uygulamaya taşırken referans olarak kullan.

## Teknik kararlar

- **Expo (React Native) + TypeScript.** Tek kodla iOS ve Android. iOS derlemesi EAS Build ile bulutta yapılır, Mac gerekmez.
- **Veriler önce telefonda** (expo-sqlite). Hesap açan kullanıcının evi Supabase'e yedeklenir; hesapsız (misafir) kullanım da var. Hesap: Supabase Auth (e-posta + şifre, anonim misafir).
- **Abonelik:** RevenueCat (App Store / Google Play ödeme sistemi, satın alımları geri yükleme). Kart bilgisi bizde tutulmaz. Ayrıntılar ve kurulum: `docs/hesap.md`.
- **Bildirimler** telefonda yerel olarak zamanlanır (expo-notifications), sunucu yok.
- **Buzdolabı fotoğrafı** için kamera ya da galeri (expo-image-picker).
- **Buzdolabı taraması (yapay zekâ):** Prototipte sayfa Claude'a doğrudan soruyor (`fridgePrompt()`, `analyze()`, `applyScan()`). Expo uygulamasında API anahtarı uygulamaya konamaz, bu yüzden tek bir sunucu fonksiyonu gerekir (ör. Supabase Edge Function): fotoğrafı alır, aynı istemle Claude API'ye görsel olarak gönderir, `{items:[{name, qty, lvl, match}], missing, note}` JSON'unu döner. Geri kalan her şey (eşleştirme, onay ekranı, tarama geçmişi) telefonda kalır. Bu, "ilk sürüm sunucusuz" kuralının tek istisnası. Fotoğrafın yapay zekâ servisine gönderildiği gizlilik politikasında yazmalı.
- **Kıyafet taraması ve kombin önerisi:** Tarama aynı sunucu fonksiyonunu kullanır (`lookPrompt()`, `analyzeLook()`, `applyLook()`), dönen JSON `{pieces:[{name, kind, color, hex, fabric, pattern, match}], worn, note}`. Kombin önerisi yapay zekâ kullanmaz, internetsiz çalışır: türler `KINDS`, kumaşlar `FABRICS`, renkler `COLORS` / `NEUTRAL`, kumaş kuralları `FABRIC_RULES`, puanlama `judge()`, seçim `suggest()`. Kişinin üzerindeki kombin fotoğrafı da sunucuya gider; gizlilik politikasında yüz ve beden bilgisinin saklanmadığı, fotoğrafın sadece kıyafet tanıma için kullanıldığı yazmalı.
- **Premium üyelik:** Evin temel işleri ücretsiz. Premium: günde 2 yapay zekâ taraması (ücretsizde haftada 2), ayda 3 seri dondurma (ücretsizde 1), 1,5 kat puan, Premium eşyalar, 5 ev, ev temaları, günlükte fotoğraf / ruh hali grafiği / geçen yıl bugün, spor grafikleri ve antrenman planı, tarif önerisi, haftalık kombin planı, akıllı bildirimler, aile paylaşımı, fotoğraf yedeği ve reklamsızlık. Bütün farklar tek yerde: `src/domain/premium.ts` (`LIMITS`, `FEATURES`); sunucu tarafı `supabase/migrations/20261021100000_premium.sql`; tablo `docs/premium.md`. Ücretsiz planda Ev ve Bugün sayfalarının altında küçük AdMob afişi var (`src/ads/`, kurulum `docs/reklam.md`); iş yaparken, ödeme ekranında ve kurulumda reklam yok, tam ekran reklam yok. Abonelik App Store / Google Play ödeme sistemiyle, RevenueCat üzerinden (`premium` yetkisi, aylık 6,99 $ (ilk ay 4,99 $ giriş teklifi) ve yıllık 59,99 $, ülkeye göre fiyat; kurulum `docs/odeme-kurulumu.md`). Ücretsiz üyelikte haftada 2 tarama (pazartesi yenilenir); Premium'da günde 2 tarama (gece yarısı yenilenir). İki tür (buzdolabı, kıyafet) aynı hakkı paylaşır. Sınırı sunucu fonksiyonu tutar (`scan_usage` tablosunda tek işlemle hak ayırır, hata olursa geri verir), sadece başarılı tarama sayılır. Model sunucuda seçilir, Sonnet 5.5 ile başlanır. Ayrıntılar, gelir-gider hesabı: `docs/premium.md`. Prototipte kilit ve ödeme ekranı taklit ediliyor (`PREMIUM`, `gateScan()`, `paywallHTML()`).
- **Test:** Geliştirirken telefonda Expo Go ile. Yayın için EAS Build ve EAS Submit.
- **Aile paylaşımı (Premium):** ev sahibi evini bir davet koduyla paylaşır (`src/family/FamilyProvider.tsx`, `shared_homes` tablosu). Paylaşılan sadece ev; puan, günlük ve ayarlar kişiye ait.

## Kod yapısı

- Expo SDK 58, Expo Router, ekranlar `src/app/` altında. Expo API'leri sürümden sürüme değişiyor; yeni bir API kullanmadan önce `AGENTS.md`'deki gibi o sürümün belgesine bak. Paket eklerken `npx expo install`.
- Prototipin kuralları `src/domain/` altında (`constants.ts`: `TYPES`, `STOCK_DEF`; `logic.ts`: `status()`, `notifs()`, `seed()`). Fonksiyonlar `now` parametresi alır, böylece ileri bir günün durumu da hesaplanabilir.
- Uygulama verisi tek bir `AppState` nesnesi (prototipteki `S` ile aynı şekil). `useStore().update(draft => ...)` ile değiştirilir; her değişiklik `src/data/db.ts` ile SQLite tablolarına baştan yazılır. Web önizlemesinde `db.web.ts` localStorage kullanır. Şemayı değiştirirsen `SCHEMA_VERSION`'ı artır ve okuma tarafına geçiş ekle.
- Sabah özeti: `src/notifications/schedule.ts` önümüzdeki 7 sabahı o günün tarihine göre hesaplayıp tek seferlik bildirim olarak zamanlar; veri değiştikçe yeniden zamanlanır.
- Renkler `src/theme/index.ts`'te açık ve koyu tema için. Bileşenlerde renk kodu yazma, `useColors()` kullan.
- Değişiklikten sonra: `npm run typecheck` ve `npm run lint`.
- Paket kimliği şimdilik `com.meikaidigital.layfapp`. Hesap kararı (bireysel / şirket) netleşince gerekirse değişecek; mağazaya ilk yüklemeden sonra değiştirilemez.

## Yayın sırası

1. Uygulamayı iki platform için birlikte geliştir.
2. Kullanılabilir ilk sürüm hazır olunca hemen Google Play kapalı testine gir. Yeni kişisel hesaplarda 12 test kullanıcısının 14 gün kesintisiz kayıtlı kalması gerekiyor. Takvimin en uzun kalemi bu.
3. Bu sürede iOS'u TestFlight'a gönder.
4. Google testi bitince iki mağazaya aynı hafta başvur.

Ayrıca gerekenler:
- Gizlilik politikası sayfası (Meikai Digital sitesinde yayınlanabilir).
- Mağaza ekran görüntüleri ve tanıtım metni.
- Açık karar: geliştirici hesapları bireysel mi olacak, Meikai Digital şirketi adına mı? Apple şirket hesabı D-U-N-S numarası istiyor.

## Görsel kimlik

Logodaki tarz: tombul, yuvarlak hatlı, hafif kabarık, yumuşak gölgeli.

| Renk | Kod | Kullanım |
|---|---|---|
| Lacivert | `#283044` | Yazı, ana butonlar, alt menü, oda duvarları. Koyu temada zemin. |
| Açık mint | `#EBF5EE` | Açık temada zemin. Koyu temada yazı ve duvarlar. |
| Mavi | `#78A1BB` | Vurgular, açma-kapama düğmeleri, yolunda giden işler. |
| Kil | `#BFA89E` | Rozetler, sıcak vurgular. |
| Kahve | `#8B786D` | "Bugün" durumu, başlık üstü etiketler, "app" kelimesi. |

- Gecikmiş işler için paletin dışında yumuşak bir kırmızı kullanılıyor: açık temada `#B8584C`, koyu temada `#E58C7E`.
- Yazı tipleri: başlıklar Baloo 2, metinler Nunito. İlk karar Fredoka idi ama Fredoka'da Türkçe "ş", "ğ" ve "İ" harfleri yok; bu yüzden Baloo 2 seçildi (Türkçe harflerin hepsi var). Yeni bir yazı tipi düşünürsen önce Türkçe harfleri içerdiğini kontrol et.
- Hem açık hem koyu tema desteklenecek.
- Formlar: butonlar hap şeklinde ve kabarık, kartların köşeleri büyük ve yuvarlak (yaklaşık 22px), ev planında odaların dış köşeleri yuvarlatılmış.

Logolar `assets/` klasöründe: kare logo ve yatay logo.

Logo notları:
- Yatay logodaki "layf" harfleri mint renginde olduğu için açık zeminde kayboluyor. Prototipte açık temada logo lacivert bir zeminin içinde duruyor.
- "p" harfinin içindeki evin pencereleri lacivert olduğu için lacivert zeminde görünmüyor.
- Mağaza ikonu: Apple 1024×1024, saydamlık içermeyen kare bir ikon istiyor. Telefon ekranında küçük boyutta yazı okunmayabileceği için sadeleştirilmiş bir ikon düşünülüyor.
