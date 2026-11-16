# Moka aksesuar promptları (Gemini + ChatGPT)

## Kural (önce oku)
- Tam kıyafet YOK, sadece küçük aksesuar (yapay durdu).
- Her görsel: 1024x1024, SAYDAM arka plan, sadece aksesuar (Moka yok).
- Aksesuar, Moka'nın "base" pozuna (moka_happy.png, önden, ayakta) takılmış gibi çizilir; tek başına çıkar.
- Aynı oturumda (aynı sohbet) üret, ilk adımda moka_happy.png'yi yükle.

## 1) ANA STİL PROMPTU (sohbetin ilk mesajı, moka_happy.png ekli)
Ekli görseldeki kakapo maskotu Moka'nın çizim stilini aynen incele: tombul, yuvarlak hatlı, hafif kabarık, yumuşak gölgeli sticker; koyu lacivert (#283044) yumuşak kontur, sabit kontur kalınlığı, pastel krem/kil/mavi/kahve tonları, düz renk + tek kademe yumuşak gölge. Bundan sonra istediğim her aksesuarı BU stilde çizeceksin. Kurallar: 1024x1024 kare tuval, tamamen saydam arka plan (PNG), sadece aksesuar çizilecek, Moka çizilmeyecek, aksesuar tuvalin ortasında, Moka'nın başına/gözüne/boynuna takılacağı doğal ölçü ve konumda dursun, her seferinde aynı konumda ve aynı ölçüde. Metin, çerçeve, zemin gölgesi, ek nesne yok. Anladıysan "hazır" yaz.

## 2) AKSESUAR PROMPTLARI (tek tek yaz)
Hepsinin sonuna ekle: "Moka'nın stilinde, saydam arka plan, 1024x1024, sabit kontur kalınlığı, yumuşak gölge, ortada."

- şapka-bere: Pastel kil renkli tombul örgü bere, ponponlu, başa oturan form, önden görünüm.
- şapka-şef: Beyaz yumuşak şef şapkası, önden, başa oturan.
- gözlük-yuvarlak: Yuvarlak ince lacivert çerçeveli gözlük, önden, iki cam şeffaf-açık mavi parıltılı.
- gözlük-güneş: Kil renkli yuvarlak güneş gözlüğü, koyu camlı, önden.
- atkı: Mavi (#78A1BB) kalın örgü atkı, boyna dolanmış, ucu sarkık, önden.
- kulaklık: Kremsi krem rengi büyük kulaklık, başın üstünden iki yana, önden.
- papyon: Kahve (#8B786D) küçük papyon, boyun hizasında, önden.
- çiçek-taç: Küçük pastel çiçeklerden taç, başın üstünde.
- yıldız-tokası: Küçük sarı yıldız tokası, başın sağ üstünde.
- kahve-fincanı-şapka (Premium): Başta duran minik kahve fincanı, buhar çıkıyor.
- kış-seti (Premium): Bere + atkı birlikte tek görselde, aynı konumlarda.
- bahar-seti (Premium): Çiçek taç + minik kelebek.

Her aksesuar için 3-4 varyant iste, en tutarlı olanı seç.

## 3) Hangi araç
- ChatGPT (GPT image): saydam arka plan desteği iyi, "transparent background PNG" de.
- Gemini: bazen saydam vermez, düz beyaz verirse ChatGPT'ye geç ya da arka planı sildir (remove.bg / Photoshop Express). Kenarlarda beyaz halka kalmasın.

## 4) Geri verme
- Dosya adı: `moka_acc_<ad>.png` (örnek: `moka_acc_bere.png`, `moka_acc_gozluk-yuvarlak.png`), küçük harf, Türkçe karakter yok.
- Klasör: proje dosyalarında `moka-kiyafet/gelen/`
- Boyut tam 1024x1024, PNG, saydam. Bozuksa ben otomatik kontrol edip uyarırım.

## 5) Uygulamada nasıl yerleşir
- Dosyalar `assets/moka/acc/` altına, 512x512'ye küçülür.
- Tüm aksesuar aynı tuvalde olduğu için Moka sticker'ının üstüne aynı boyutta bindirilir (Image katmanı, `position:absolute`, aynı hizalama), ekstra koordinat gerekmez.
- Sorun: aksesuar sadece "base" poza oturur. Başka pozlarda (yatan, eğilen) kayar. Çözüm: aksesuar sadece kafa-yüzü gören pozlarda (happy, wink, sipping, thumbs_up vb.) gösterilir; diğerlerinde gizlenir. Tüm 54 poza uydurmak istersen her poz için ayrı üretim gerekir (çok iş).
- Tüketilen yer: Ev'de Moka kartı, bahçe, sohbet, rozet popup; hepsi tek `<MokaAvatar>` bileşeninden.
