<p align="center">
  <img src="assets/logo-kare.png" alt="Layfapp logosu" width="160">
</p>

# Layfapp

Evin bütün gündelik işleri tek uygulamada.

Layfapp, evini bloklarla çizdiğin ve her odanın kendi işlerini takip ettiğin bir mobil uygulama. Çarşafı en son ne zaman değiştirdin, buzdolabında ne bitti, hangi kıyafetler kirli, bitkiler ne zaman sulanacak: hepsini odasında görürsün. Zamanı gelen işler için de telefonuna bildirim gelir.

Hedef: App Store ve Google Play'de yayınlamak.

> **Durum:** Expo (React Native) uygulaması kuruldu ve prototipteki akışın tamamı taşındı: ev planı editörü, odalar, rutinler, gardırop, buzdolabı, stok, bitkiler, Bugün ve Bildirimler sekmeleri. Veriler telefonda SQLite'ta, sabah özeti telefonda yerel bildirim olarak zamanlanıyor. Sıradaki adım telefonda Expo Go ile denemek.

---

## İçindekiler

- [Uygulama nasıl çalışıyor?](#uygulama-nasıl-çalışıyor)
  - [1. Evini bloklarla kur](#1-evini-bloklarla-kur)
  - [2. Ana ekran: ev planın](#2-ana-ekran-ev-planın)
  - [3. Odalar ve rutinler](#3-odalar-ve-rutinler)
  - [4. Odaya özel işlevler](#4-odaya-özel-işlevler)
  - [5. Bugün sekmesi](#5-bugün-sekmesi)
  - [6. Bildirimler](#6-bildirimler)
- [Varsayılan rutinler](#varsayılan-rutinler)
- [Görsel kimlik](#görsel-kimlik)
- [Teknik yapı](#teknik-yapı)
- [Yol planı](#yol-planı)
- [Repo yapısı](#repo-yapısı)
- [Prototipi açmak](#prototipi-açmak)

---

## Uygulama nasıl çalışıyor?

Uygulamanın alt kısmında dört sekme var: **Ev**, **Bugün**, **Bildirimler** ve **Plan**.

### 1. Evini bloklarla kur

Uygulama ilk açıldığında kullanıcıdan evini çizmesini ister.

- Ekranda bloklardan oluşan bir ızgara var. Varsayılan boyut 6 × 8 blok, her blok yaklaşık 2 m².
- Kullanıcı önce bir **oda türü** seçer: yatak odası, mutfak, banyo, salon, çalışma odası, çocuk odası, antre, balkon ya da çamaşır odası.
- Sonra bloklara dokunarak ya da parmağını sürükleyerek odayı boyar. Aynı odaya ait bloklar birleşir, odalar arasında duvar çizgisi oluşur.
- Aynı türden birden fazla oda olabilir (örneğin iki yatak odası). Her odanın adı değiştirilebilir, örneğin "Yatak odası" yerine "Yatak odam".
- **Silgi** ile yanlış boyanan bloklar temizlenir.
- Başlangıçta örnek bir ev çizili gelir. Kullanıcı onu düzenleyebilir ya da temizleyip baştan çizebilir.
- Ev planı daha sonra **Plan** sekmesinden her zaman düzenlenebilir.

### 2. Ana ekran: ev planın

Ev kurulduktan sonra açılış ekranı ev planı olur.

- En üstte günün özeti: kaç iş gecikmiş, kaçı bugün yapılacak, alışveriş listesinde kaç ürün var.
- Planda her odanın üzerinde bekleyen iş sayısı yazar. Gecikmiş iş varsa rozet kırmızı, sadece bugünün işleri varsa sıcak renkte.
- Plandaki bir odaya dokununca o odanın ekranı açılır.
- Planın altında odaların listesi var. Her odada durum özeti görünür, örneğin "2 gecikmiş · 1 bugün" ya da "Sıradaki: Toz alma, 3 gün kaldı".

### 3. Odalar ve rutinler

Her odanın kendi **rutinleri** var. Rutin, belli aralıklarla tekrarlanan bir ev işi: "her 7 günde bir çarşaf değişimi" gibi.

Her rutin için şunlar tutulur:

- **Ad:** Çarşaf değişimi
- **Sıklık:** Kaç günde bir yapılacağı
- **Son yapılma tarihi**

Uygulama bunlardan rutinin durumunu hesaplar:

| Durum | Anlamı |
|---|---|
| **N gün gecikti** | Sıklık süresi geçti, iş yapılmadı |
| **Bugün** | Bugün yapılması gerekiyor |
| **Yarın** | Yarın yapılacak |
| **N gün kaldı** | Henüz zamanı gelmedi |
| **Başlanmadı** | Hiç işaretlenmedi, bugün yapılacaklar arasında görünür |

- İş yapıldığında **Yaptım** butonuna basılır. Son yapılma tarihi bugüne çekilir ve sıradaki tarih gösterilir.
- Oda ekranında rutinler en acil olandan başlayarak sıralanır.
- Her odaya kendi rutinini ve sıklığını ekleyebilirsin, istemediğin rutini silebilirsin.

### 4. Odaya özel işlevler

Rutinlerin yanında her oda türünün kendi işlevi var.

#### Yatak odası ve çocuk odası: gardırop

- Dolaptaki kıyafetler kategoriyle eklenir: Üst, Alt, Elbise / Takım, Dış giyim, Ev / Pijama, İç giyim, Ayakkabı, Aksesuar.
- Her kıyafetin bir durumu var: **Temiz**, **Kirli** ya da **Ütülenecek**. Durum etikete dokunarak değiştirilir.
- Kıyafetler duruma göre filtrelenebilir.
- 3 ve daha fazla kirli parça birikince "çamaşır zamanı" uyarısı çıkar.
- **Fotoğraftan dolaba ekleme:** Kullanıcı kombinini aynada çeker ya da parçaları yatağa serip çeker. Yapay zekâ her parçayı ayrı ayrı çıkarır: türü (tişört, gömlek, kot pantolon, ceket, spor ayakkabı…), rengi ve kumaşı (pamuk, keten, yün, kot, deri…). Sonuç önce onay listesinde görünür; dolapta olan parçalar eşleşir, yeniler eklenir. Elle eklenen parçalarda renk ve kumaş addan anlaşılır ("Lacivert keten gömlek").
- **Kombin önerisi:** Temiz parçalardan üst + alt (ya da elbise / takım) + ayakkabı, mevsime göre bir de dış giyim seçilir. Her kombin şu kurallarla puanlanır ve neden uyduğu yazılır:
  - Renk: nötrler (siyah, beyaz, gri, lacivert, bej, kahve, kot mavisi…) her şeyle gider; tek canlı renk dengeli durur; komşu tonlar ve karşıt renkler uyumludur; üç canlı renk kalabalık; siyah ile lacivert yan yana karışır.
  - Kontrast: açık üst ile koyu alt (ya da tersi) net durur; üst ve alt aynı tonsa tek parça gibi görünür.
  - Kumaş: keten üst chino ya da şortla; kalın örgü kazak kot, chino ya da kumaş pantolonla; saten üst mat bir altla; spor kumaş klasik ayakkabıyla olmaz; dış katman alttakinden ince olmamalı; yazlık ve kışlık kumaşlar karışmamalı.
  - Stil seviyesi: her parçanın spor / günlük / şık / resmi aralığı örtüşmeli. Kullanıcı Günlük, Şık ya da Spor seçer.
  - Mevsim: yazın kalın kumaş, kışın dış giyimsiz kombin puan kaybeder.
- **Sonraki fotoğraflar:** Yeni bir kombin fotoğrafı çekilince fotoğraftaki kombin değerlendirilir ve aynı parçalar dolaptaki diğer parçalarla yeniden eşleştirilir ("bu gömlek dolabındaki bej chinoyla da olur"). Herhangi bir parçanın adına dokununca da o parçayla kombin önerilir.

#### Mutfak: buzdolabı

- **Buzdolabı fotoğrafı:** Kullanıcı buzdolabını açıp fotoğrafını çeker. Marketteyken evde ne olduğunu uygulamadan görür. Fotoğraf bir haftadan eskiyse yenisini çekmesi hatırlatılır.
- **Yapay zekâ ile tarama:** Fotoğraf çekilince yapay zekâ içindeki ürünleri ve her birinden yaklaşık ne kadar kaldığını çıkarır (ör. "Süt · yarım şişe · Az"). Sonuç önce bir onay listesinde görünür: listede olanların durumu güncellenir, yeni ürünler eklenir, fotoğrafta görünmeyenler istenirse **Bitti** yapılır. Kullanıcı onaylamadan liste değişmez. Her taramanın kısa notu ("Süt azalmış, domates yok") tarihiyle saklanır, böylece buzdolabının zaman içindeki durumu izlenir.
- **Ürün takibi:** Her ürün **Var**, **Az** ya da **Bitti** olarak işaretlenir. Tarama ile gelen miktar tahmini ve son görülme tarihi ürünün altında görünür.
- **Alışveriş listesi:** Az kalan ve biten ürünler otomatik olarak listeye düşer. Liste tek dokunuşla kopyalanabilir.

#### Banyo ve çamaşır odası: malzeme stoğu

- Tuvalet kağıdı, şampuan, diş macunu, deterjan gibi malzemeler **Var / Az / Bitti** olarak takip edilir.
- Eksikler alışveriş listesine eklenir.

#### Salon ve balkon: bitkiler

- Her bitki kendi sulama aralığıyla eklenir, örneğin "Monstera, 7 günde bir".
- Sulama zamanı gelen bitkiler rutinler gibi görünür, sulanınca **Sulandı** butonuna basılır.

#### Antre ve çalışma odası

- Sadece rutinler var.

### 5. Bugün sekmesi

Bütün odalardaki işler tek listede, aciliyete göre gruplanmış halde:

- **Gecikenler**
- **Bugün**
- **Bu hafta**

Her işin yanında hangi odaya ait olduğu yazar ve iş doğrudan buradan "yapıldı" olarak işaretlenebilir. Altta bütün odaların eksiklerinden oluşan **ortak alışveriş listesi** var.

### 6. Bildirimler

- Her sabah, kullanıcının seçtiği saatte bir **günlük özet** gelir.
- Bildirim türleri ayrı ayrı açılıp kapatılabilir:

| Tür | Ne zaman gelir? |
|---|---|
| **Rutin hatırlatmaları** | Geciken ve bugün yapılacak işler, sulama zamanı gelen bitkiler |
| **Eksik ürünler** | Biten ürünler, eski ya da hiç çekilmemiş buzdolabı fotoğrafı |
| **Çamaşır** | 3 ve daha fazla kirli kıyafet biriktiğinde |

- Bildirimler sekmesinde bekleyen bütün bildirimler aciliyete göre sıralanır. Bir bildirime dokununca ilgili oda açılır.

---

## Varsayılan rutinler

Bir oda eklendiğinde aşağıdaki rutinler otomatik gelir. Kullanıcı hepsini değiştirebilir ya da silebilir.

| Oda | Rutinler (kaç günde bir) |
|---|---|
| **Yatak odası** | Odayı süpür ve sil (7), Çarşaf değişimi (7), Toz alma (7), Havalandırma (1), Yastık ve yorgan havalandırma (30) |
| **Mutfak** | Bulaşık (1), Tezgah silme (1), Çöpü çıkar (2), Buzdolabı temizliği (30), Fırın temizliği (30), Yer silme (7) |
| **Banyo** | Lavabo ve ayna (3), Klozet (3), Duş / küvet (7), Havlu değişimi (4), Yer silme (7) |
| **Salon** | Süpürme (3), Toz alma (7), Koltuk minderleri (14), Cam silme (30) |
| **Çalışma odası** | Masa düzeni (7), Toz alma (7), Kablo ve şarj düzeni (30) |
| **Çocuk odası** | Oyuncak toplama (1), Çarşaf değişimi (7), Süpürme (3) |
| **Antre** | Ayakkabılık düzeni (7), Yer silme (7) |
| **Balkon** | Süpürme (7), Cam ve korkuluk (30) |
| **Çamaşır odası** | Çamaşır yıkama (3), Makine filtresi (30), Ütü (7) |

---

## Görsel kimlik

<p align="center">
  <img src="assets/logo-yatay.png" alt="Layfapp yatay logo" width="420">
</p>

Tarz logodan geliyor: tombul, yuvarlak hatlı, hafif kabarık ve yumuşak gölgeli.

| Renk | Kod | Kullanım |
|---|---|---|
| Lacivert | `#283044` | Yazılar, ana butonlar, alt menü, oda duvarları. Koyu temada zemin. |
| Açık mint | `#EBF5EE` | Açık temada zemin. Koyu temada yazılar ve duvarlar. |
| Mavi | `#78A1BB` | Vurgular, açma-kapama düğmeleri, yolunda giden işler. |
| Kil | `#BFA89E` | Rozetler, sıcak vurgular. |
| Kahve | `#8B786D` | "Bugün" durumu, başlık üstü etiketler. |

- **Gecikmiş işler:** Paletin dışında yumuşak bir kırmızı kullanılıyor, açık temada `#B8584C`, koyu temada `#E58C7E`.
- **Yazı tipleri:** Başlıklarda Baloo 2, metinlerde Nunito. (Fredoka denendi ama Türkçe ş, ğ ve İ harflerini içermiyor.)
- **Temalar:** Açık ve koyu tema desteklenecek.
- **Formlar:** Hap şeklinde butonlar, büyük köşe yuvarlaklıkları, ev planında yuvarlatılmış oda köşeleri.

---

## Teknik yapı

| Konu | Seçim |
|---|---|
| Çatı | Expo (React Native) + TypeScript |
| Platformlar | iOS ve Android, tek kod |
| Veri | Telefonda yerel veritabanı (expo-sqlite). İlk sürümde sunucu yok. |
| Bildirimler | Telefonda yerel olarak zamanlanır (expo-notifications) |
| Kamera | Buzdolabı fotoğrafı için kamera ya da galeri (expo-image-picker) |
| Buzdolabı taraması | Fotoğraf, API anahtarını tutan küçük bir sunucu fonksiyonuna (ör. Supabase Edge Function) gider, o da Claude API'ye görsel olarak gönderir ve JSON ürün listesi döner. Anahtar uygulamanın içine konmaz. |
| Kıyafet taraması | Buzdolabıyla aynı sunucu fonksiyonu. Kombin önerisi ise kurallarla telefonda hesaplanır, sunucu ve internet gerekmez. |
| Premium üyelik | Yapay zekâ taramaları ücretli abonelikte. App Store / Google Play aboneliği RevenueCat ile; sunucu fonksiyonu yetkiyi ve günlük tarama hakkını kontrol eder. Plan, mağaza kuralları ve gelir-gider hesabı: [docs/premium.md](docs/premium.md) |
| Derleme ve yayın | EAS Build, EAS Submit. iOS derlemesi bulutta yapılır, Mac gerekmez. |
| Geliştirme sırasında test | Telefonda Expo Go |

**Neden sunucusuz?** İlk sürüm hızlı ve ücretsiz çıkar, veriler kullanıcının telefonundan çıkmaz, mağaza gizlilik formları kolay geçer. Aile üyelerinin aynı evi paylaşması gibi özellikler ikinci sürümde, bir sunucuyla (ör. Supabase) gelecek.

---

## Yol planı

- [x] **Aşama 0: Fikir ve prototip.** HTML prototip, renk paleti, logo.
- [x] **Aşama 1: Proje iskeleti.** Expo + TypeScript kurulumu, sekmeler ve ekran iskeletleri, Expo Go ile telefonda açılış.
- [x] **Aşama 2: Prototipi taşıma.** Ev planı editörü, odalar, rutinler, gardırop, buzdolabı ve stok takibi, yerel veritabanı.
- [ ] **Aşama 3: Telefona özel özellikler.** Gerçek bildirimler, sabah özeti, kamera. (Kodu yazıldı, telefonda denenmesi gerekiyor.)
- [ ] **Aşama 4: Kimlik.** Uygulama ikonu, açılış ekranı, mağaza ekran görüntüleri ve tanıtım metni.
- [ ] **Aşama 5: Test.** Google Play kapalı testi ve iOS için TestFlight.
- [ ] **Aşama 6: Yayın.** Gizlilik politikası, mağaza kayıtları, inceleme.
- [ ] **Aşama 7: Yayın sonrası.** EAS Update ile güncellemeler, v2 planı.

**Yayın sırası:** Önce Google Play süreci başlatılacak. Yeni kişisel geliştirici hesaplarında, yayına çıkmadan önce 12 test kullanıcısının 14 gün kesintisiz kapalı teste kayıtlı kalması gerekiyor. Bu süre içinde iOS sürümü TestFlight'ta hazırlanacak ve iki mağazaya aynı hafta başvurulacak.

**Açık kararlar:**
- Yapay zekâ modeli: Sonnet 5.5 ile başla, kapalı testte Haiku 5.5 ve Opus 5.5 ile karşılaştır ([docs/premium.md](docs/premium.md)).
- Geliştirici hesapları bireysel mi olacak, Meikai Digital adına mı?
- Mağaza ikonu için logonun sadeleştirilmiş bir versiyonu.
- Yatay logonun açık zemin versiyonu ("layf" harfleri açık zeminde kayboluyor).

---

## Repo yapısı

```
layfapp/
├── README.md              Bu dosya
├── CLAUDE.md              Claude Code için proje notları ve alınan kararlar
├── AGENTS.md              Expo'nun yapay zekâ ajanları için notları
├── app.json               Expo ayarları (ad, ikon, izin metinleri, eklentiler)
├── docs/
│   ├── hesap.md           Hesap, Supabase ve RevenueCat kurulumu
│   └── premium.md         Premium üyelik, mağaza kuralları ve yapay zekâ maliyeti
├── prototype/
│   └── layfapp.html       Çalışan HTML prototipi
├── assets/
│   ├── logo-kare.png      Kare logo (şimdilik uygulama ikonu ve açılış ekranı)
│   └── logo-yatay.png     Yatay logo
└── src/
    ├── app/               Ekranlar (Expo Router: her dosya bir ekran)
    │   ├── _layout.tsx    Fontlar, veri, ilk açılışta kurulum ekranına yönlendirme
    │   ├── kurulum.tsx    Evini bloklarla kur
    │   ├── oda/[id].tsx   Oda ekranı
    │   └── (tabs)/        Ev, Bugün, Bildirimler, Plan sekmeleri
    ├── components/        Plan, plan editörü, rutin satırı, oda modülleri, ortak parçalar
    ├── domain/            Prototipteki kurallar: varsayılan rutinler, durum hesabı, bildirim kuralları
    ├── data/              SQLite kaydı (web önizlemesinde localStorage)
    ├── notifications/     Sabah özetinin zamanlanması
    ├── store/             Uygulama verisinin tutulduğu yer
    └── theme/             Renkler (açık / koyu tema) ve yazı tipleri
```

---

## Geliştirme

Gerekenler: Node.js ve telefonda **Expo Go** uygulaması.

```bash
npm install
npx expo start
```

Terminalde çıkan QR kodu telefonda Expo Go ile (iPhone'da kamerayla) okut, uygulama telefonda açılır. Bilgisayarla telefon aynı Wi-Fi ağında olmalı; olmuyorsa `npx expo start --tunnel` dene.

- `npm run web`: Tarayıcıda önizleme. Veriler tarayıcıda tutulur, bildirim gönderilmez.
- `npm run typecheck` ve `npm run lint`: Değişikliklerden sonra çalıştır.
- Paket eklerken `npm install` yerine `npx expo install <paket>` kullan; Expo sürümüne uygun sürümü seçer.

Nasıl çalışıyor:
- **Veri:** Bütün veriler telefondaki `layfapp.db` SQLite dosyasında (odalar, plan hücreleri, rutinler, kıyafetler, stok). Buzdolabı fotoğrafı uygulamanın kendi klasörüne kopyalanır, veritabanında yalnızca yolu tutulur.
- **Bildirimler:** Sunucu yok. Uygulama her açıldığında ve veri değiştiğinde önümüzdeki 7 sabahın özetini o güne göre hesaplayıp telefona zamanlar. Bildirime dokununca ilgili oda ya da Bugün sekmesi açılır.

---

## Prototipi açmak

`prototype/layfapp.html` tek bir dosya, kurulum gerektirmiyor. Bilgisayarda çift tıklayıp tarayıcıda açabilirsin. Telefon görünümü için tarayıcının geliştirici araçlarındaki mobil görünümü kullan.

Prototip verileri tarayıcıda `layfapp.v1` anahtarıyla saklıyor. Varsayılan verilerde değişiklik yaptıysan ve uygulamayı sıfırdan görmek istiyorsan bu anahtarı değiştir ya da tarayıcının site verisini temizle.
