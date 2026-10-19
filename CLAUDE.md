# Layfapp

Gündelik ev işlerini tek uygulamada toplayan mobil uygulama. Hedef: App Store ve Google Play'de yayınlamak.
Uygulamanın dili Türkçe. Geliştirici Windows kullanıyor.

## Uygulama fikri

- **İlk açılış:** Kullanıcı evini bloklardan oluşan bir ızgarada çizer. Oda türünü seçer, sonra bloklara dokunup sürükleyerek odayı boyar. Her blok yaklaşık 2 m². Varsayılan ızgara 6 × 8 blok.
- **Ana ekran:** Çizilen ev planı. Her odanın üzerinde bekleyen iş sayısı görünür: gecikmiş iş varsa kırmızı, sadece bugünün işleri varsa sıcak renk. Odaya dokununca oda ekranı açılır.
- **Rutinler:** Her odanın "her N günde bir" tekrarlanan rutinleri var. Her rutin için son yapılma tarihi tutulur. Durumlar: gecikti / bugün / yarın / N gün kaldı. "Yaptım" butonu son yapılma tarihini bugüne çeker.
- **Odaya özel işlevler:**
  - Yatak odası ve çocuk odası: gardırop. Her kıyafet Temiz, Kirli ya da Ütülenecek olarak işaretlenir. 3 ve üzeri kirli parça olunca çamaşır uyarısı verilir.
  - Mutfak: buzdolabı fotoğrafı, ürünlerin Var / Az / Bitti takibi, otomatik alışveriş listesi.
  - Banyo ve çamaşır odası: sarf malzemesi stoğu (Var / Az / Bitti).
  - Salon ve balkon: bitkiler ve sulama aralıkları.
  - Antre ve çalışma odası: sadece rutinler.
- **Sekmeler:** Ev, Bugün (gecikenler / bugün / bu hafta + alınacaklar), Bildirimler, Plan (ev planını düzenleme).
- **Bildirimler:** Günlük sabah özeti, saati kullanıcı seçer. Türler: rutin hatırlatmaları, eksik ürünler, kirli çamaşır. Her tür ayrı ayrı açılıp kapatılabilir.

Çalışan HTML prototipi: `prototype/layfapp.html`. Bütün akış, varsayılan rutinler (`TYPES`) ve bildirim kuralları (`notifs()`) orada. Gerçek uygulamaya taşırken referans olarak kullan.

## Teknik kararlar

- **Expo (React Native) + TypeScript.** Tek kodla iOS ve Android. iOS derlemesi EAS Build ile bulutta yapılır, Mac gerekmez.
- **İlk sürüm sunucusuz.** Veriler sadece telefonda tutulur (expo-sqlite).
- **Bildirimler** telefonda yerel olarak zamanlanır (expo-notifications), sunucu yok.
- **Buzdolabı fotoğrafı** için kamera ya da galeri (expo-image-picker).
- **Test:** Geliştirirken telefonda Expo Go ile. Yayın için EAS Build ve EAS Submit.
- **İleride (v2):** Aile üyelerinin aynı evi paylaşması. Bunun için sunucu gerekecek (ör. Supabase).

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
- Yazı tipleri: başlıklar Fredoka, metinler Nunito.
- Hem açık hem koyu tema desteklenecek.
- Formlar: butonlar hap şeklinde ve kabarık, kartların köşeleri büyük ve yuvarlak (yaklaşık 22px), ev planında odaların dış köşeleri yuvarlatılmış.

Logolar `assets/` klasöründe: kare logo ve yatay logo.

Logo notları:
- Yatay logodaki "layf" harfleri mint renginde olduğu için açık zeminde kayboluyor. Prototipte açık temada logo lacivert bir zeminin içinde duruyor.
- "p" harfinin içindeki evin pencereleri lacivert olduğu için lacivert zeminde görünmüyor.
- Mağaza ikonu: Apple 1024×1024, saydamlık içermeyen kare bir ikon istiyor. Telefon ekranında küçük boyutta yazı okunmayabileceği için sadeleştirilmiş bir ikon düşünülüyor.
