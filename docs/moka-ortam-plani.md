# Moka ortamı ve kişiselleştirme planı

Karar (Melih, 2026-11-16): Moka çıkartmaların üstüne aksesuar bindirmek kötü göründü, vazgeçildi. Yeni yön: Moka kendi ortamında yaşar. Ana ekran, Moka ile sohbet ve Ben sekmesindeki Moka kişiselleştirilebilir. Sohbet, mesaj listesi gibi değil, Moka'nın karşında durup konuşması gibi olur: tek konuşma balonu, sadece yüz mimiği canlanır.

Bu belge plandır, kod yazılmadı. Melih "başla" deyince uygulanır.

## Mevcut durum (kodda ne var)
- `MokaFace.tsx`: 8 mimikli (`assets/moka/mimik/1-8.webp`) canlı Moka, sohbette kullanılıyor. Mimikler çapraz geçişle değişir, nefes, göz kırpma, konuşurken ağız ritmi var. Sohbet ekranı `src/app/moka.tsx` (balon listesi).
- 54 çıkartma (`assets/moka/*.webp`, 512×512) + 7 kürk rengi × 5 poz (`assets/moka/fur/`, `scripts/make-moka-fur.py`).
- Sahneler `assets/scenes` (640×480, 7,5 MB). Sohbet sınırı: Premium günde 25 mesaj (`LIMITS.premium.chats`), ücretsizde yok.
- Aksesuar katmanı (`MokaAcc.tsx`, `moka-acc.ts`, `moka-tasarim.tsx`) branch `claude/project-thread-71dycw`'da duruyor. Melih beğenmedi, bu plan onun yerine geçer. Kürk rengi (script + varlıklar) tutulabilir, aksesuar katmanı kaldırılır.

## 1. Ortam resmi (Moka'nın odası)

Tek bir oda, sohbette hep aynı. Moka bu odada durur.

- Boyut: 1170×2532 (telefon dikey, 9:19,5) ana kaynak; ekrana `cover` ile oturur. WebP kalite 82, hedef 250-350 KB. Küçük cihaz için 780×1688 ikinci sürüm.
- Güvenli alanlar (dikey ekranın yüzdesi):
  - Üst %0-12: durum çubuğu ve geri düğmesi, boş/sade kalsın.
  - Konuşma balonu: üst %12-38, ortada. Arkada karmaşık nesne olmasın (balon yarı saydam kartla zaten okunur).
  - Moka: alt %42-86, ortada. Ayakları zemine basar, zemin çizgisi %86.
  - Giriş çubuğu ve hızlı cevaplar: alt %86-100, sade zemin (halı/ahşap).
- Karakter ayakta durabilmesi için odanın zemini düz ve açık renkli olsun (gölge Moka'nın altına koda eklenir, resme çizilmez).
- Gece/gündüz: aynı oda, 2 sürüm (gündüz, gece). İsteğe bağlı 3. sürüm yağmurlu pencere. Saat ve hava durumuna göre seçilir (zaten `timePose` ve hava var). Aynı kompozisyon, sadece ışık ve pencere dışı değişir, bu yüzden resimleri BİRBİRİNE yakın üretmek için "aynı odanın gece hâli" diye düzenleme (edit) istenir.
- Üretim: ChatGPT ya da Gemini'ye Moka stickerlarından birini ekleyip stil için ver. Prompt:
  "Moka'nın stilinde (tombul, yuvarlak hatlı, yumuşak gölgeli, krem ve kil tonları, lacivert yumuşak kontur) sıcak, tatlı bir oda: solda pencere ve perde, arkada raf ve bitkiler, küçük kahve köşesi, yumuşak halı. Dikey 9:19,5 telefon ekranı. Ortada, alt yarıda boş zemin alanı bırak (karakter duracak), üst üçte birlik alanda duvar sade olsun. Kişi ya da hayvan yok. Metin yok."
  Gece için: "Aynı odayı, aynı kompozisyonla gece hâline getir: pencerede ay ve yıldız, sıcak lamba ışığı."

## 2. Moka'yı çizme: hazır görüntü mü, katman mı?

Katman (bindirme) denendi ve çirkin çıktı. Öneri: **her kıyafet × poz için tam, hazır görüntü.** Hizalama sorunu bitiyor, kıyafet Moka'nın vücuduna uygun çizildiği için doğal duruyor.

- Poz sayısı (sohbet ve ana ekran için yeter): 6 poz, hepsi ayakta, yüz önde, kamera yüksekliği aynı: duruş (nötr), el sallama, kahve içme, düşünme, sevinç, uyku. Ayrıca Ben sekmesi için "model" pozu (kollar yanda).
- Kıyafet sayısı: ilk sürümde 6 set (örn. çıplak, bere+atkı, şef, güneş gözlüğü, Noel, kedi kulağı). Sonra mevsim ve rozet setleri eklenir, her set = 6 yeni görüntü.
- Görüntü sayısı: 6 poz × 6 kıyafet = 36 gövde görüntüsü.
- Boyut: 768×768 (ekranda ~320 dp'ye kadar net), WebP kalite 85, saydam. ~60-90 KB her biri → 36 görüntü yaklaşık 2,5-3 MB. Her yeni set ~0,5 MB. Ücretsiz sürümde 2 set ppakette, kalanlar ilk açılışta indirilir (EAS update ya da Supabase Storage CDN), paketi şişirmemek için.
- Kürk rengi: kıyafet resimlerinde kürk rengi tek değil. Renk değişimini koda bırakmak (`make-moka-fur.py` gibi) için kıyafetli resimlerde kürk ve kıyafet renkleri ayrı olmalı; otomatik tonlama kıyafeti de boyar. Seçenekler: (a) kürk rengi sadece çıplak sette, kıyafetli setlerde varsayılan renk; (b) her kürk × her set üretmek (çok iş). Öneri (a) ile başla, kullanıcı sevdiyse (b) ya da "kürk maskesi" ile (kürk bölgesi ayrı PNG) çöz.
- **Risk ve ilk adım:** ChatGPT/Gemini aynı Moka'yı her seferinde birebir aynı çizmiyor. Önce deneme: 1 set × 3 poz üretip yan yana koy, tutarlıysa devam. Tutarsızsa referans olarak hep `moka_happy.webp` ve önceki başarılı kıyafet görseli verilir, "aynı gövde, aynı yüz, sadece kıyafet" istenir. Onay Melih'te.

## 3. Yüz animasyonu (native derleme yok)

Hedef: sadece göz kırpma, ağız konuşma ve duygu mimiği. Yöntem: gövde görüntüsü sabit, yüz bölgesi için küçük "yama" görüntüleri üst üste.

- Her poz için yüz bölgesi sabit bir dikdörtgen (göz+gaga alanı, ~%40×%25). Yamalar o bölgenin aynı hizada çizilmiş kopyaları: açık göz (gövde resminde zaten var), kapalı göz (göz kırpma), mutlu göz (^ ^), şaşkın göz, üzgün kaş, gaga açık / kapalı.
- Yamalar kıyafetten bağımsız, çünkü yüz bölgesi kıyafetle örtüşmüyor (gözlük hariç: gözlüklü setlerde gözlük de yamanın içinde çizilir, setle birlikte üretilir).
- Katmanlama: `Image` gövde + `Image` yama, `Animated` opacity. Göz kırpma 3-6 sn'de bir, 120 ms kapalı. Konuşma: yazı yazılırken gaga yaması açık/kapalı 120-180 ms ritmiyle. Duygu: cevabın tonuna göre (mevcut `mimik` ton çıkarımı) mutlu/şaşkın/üzgün yama, 250 ms çapraz geçiş. "Hareketi azalt" açıksa kırpma ve ağız dursun, sadece duygu geçişi kalsın. Zaten `MokaFace` bunu 8 tam görüntüyle yapıyor, yeni sistem aynı mantığı yama olarak hafifletir.
- Alternatif/ilk sürüm: yamalar için tam görüntüler yerine mevcut 8 mimik (`assets/moka/mimik`) sadece çıplak sette kalsın, kıyafetli setlerde kırpma ve ağız yamayla yapılsın. Böylece ilk teslim hızlı olur.
- Yama sayısı: 6 poz × 5 yama (kapalı göz, mutlu göz, şaşkın, üzgün, ağız açık) = 30 küçük görüntü (~15 KB, toplam <1 MB). Bunlar kıyafetsiz çıplak gövdeden üretilir, tek seferlik.
- **Risk:** yama gövdeyle renk/çizgi olarak tutmazsa kenar görünür. Çözüm: yamaları gövde görüntüsünden otomatik kes (göz kırpan ve ağız açık hâlleri aynı görüntünün "yüz düzenleme" çıktısı olarak üret, sonra sadece o bölgeyi kes ve yumuşak kenarla yapıştır). Denemeyle doğrulanır.

## 4. Sohbet ekranı (karşında duruyor, balonla konuşuyor)

Mevcut liste tabanlı sohbet (`src/app/moka.tsx`) yeniden tasarlanır:

- Arka plan: ortam resmi (gündüz/gece). Üstte geri düğmesi ve ince Premium sayacı ("18/25").
- Ortada Moka (seçili kıyafet), altında hafif gölge. Yukarıda tek konuşma balonu: Moka'nın son cevabı. Yeni cevap gelince önceki kaybolur (soluk geçiş), yazı harf harf yazılır (zaten `typeMs`), bu sırada ağız hareket eder.
- Düşünürken: balonda üç nokta, Moka'nın başı hafif yana eğik.
- Kullanıcı mesajı: balon olarak ekranda kalmaz. Gönderince alt kısımda küçük "sen" baloncuğu 1-2 sn görünür sonra söner (konuşma tek yönlü hissettirmemek için).
- Hızlı cevap hapları (IDEAS): giriş çubuğunun üstünde yatay kayar, dokununca gönderir.
- Giriş çubuğu: alttaki yuvarlak yazı kutusu + gönder. Konuşma durumu: boşta, yazıyor, düşünüyor, konuşuyor. Ses tuşu ilk sürümde yok (sonra).
- Geçmiş: sağ üstte "Geçmiş" düğmesi, alttan açılan sayfada eski mesajlar liste olarak (şimdiki oturum belleği korunur; telefonda saklanmaz kuralı aynen kalır).
- Limitler: Premium günde 25, ücretsizde sohbet yok. Hak bitince Moka "Yarın devam edelim" der, giriş çubuğu kilitlenir, ücretsizde mevcut premium yönlendirmesi (mevcut metinler `CHAT_PREMIUM_*` aynen).
- Moka eylemleri (iş ekleme, işaretleme) şimdiki gibi çalışır, sonuç balonun altında küçük rozet olarak ("✓ Cam silme eklendi").
- Poz seçimi: düşünürken "düşünme", cevap sevinçliyse "sevinç", uykuluysa "uyku", sakin "duruş". Poz değişiminde kısa çapraz geçiş.

## 5. Ana ekran ve Ben sekmesi

- Ana ekran: Moka kartı yerine aynı ortam (oda), Moka kıyafetiyle. Üzerinde günün özeti ve bugünün işleri mevcut kartlar gibi kalır. Saat/hava ile gündüz-gece resmi. Mevcut `MokaMascot` yalnızca küçük yerlerde (boş ekran, kutlama) çıplak çıkartma olarak kalır; kişiselleştirme sadece "hero" noktalarda: ana ekran, sohbet, Ben, rozet penceresi, bahçe girişi.
- Ben sekmesi: "Moka'nı tasarla" ekranı. Üstte büyük Moka (model pozu, dokununca poz değişir), altında sekmeler: Kürk rengi, Kıyafet (set kartları: kilitli/açık), Oda (ileride dekor). Seçim anında Moka değişir. Kıyafetler rozet, seri, puan ya da Premium ile açılır (Faz 2: rozet tablosuyla bağla).
- Yeni kullanıcı: kurulumda 1 adımlık "Moka'nı seç" (kürk rengi, ismi). Sonra Ben'den değiştirir.

## 6. Veri, senkron ve çeviri

- `Play.mokaLook = { fur, outfit, name? }` (şu an `mokaFur` ve `mokaAcc` ayrı alanlar, birleştirilir; eski alanlar için okuma tarafında geçiş). Yerelde zaten `play` tek JSON, `SCHEMA_VERSION` artışı gerekmez, alan opsiyonel.
- Hesap varsa Supabase `profiles` tablosuna `moka_look jsonb` sütunu (migration `YYYYMMDD_moka_look.sql`), ev sahibi yedeğiyle birlikte yazılır, aile paylaşımında kişiye ait kalır (ev ortak, Moka kişisel).
- Çeviri: tüm yeni metinler 9 dilde (`src/i18n/extra.ts` satırları: TR, EN, ES, FR, DE, PT, AR, KO, JA). Konuşma balonu Moka cevapları zaten sunucuda dile göre geliyor (moka-chat edge function). RTL (Arapça): balon ve çubuk aynalanır, ortam resmi simetrik olduğu için aynı kalır.
- Mağaza ekran görüntüleri ve onboarding görselleri yeni ortamla güncellenir (en sonda).

## 7. Aşamalar, süre ve Melih'in üretmesi gerekenler

Süreler Claude'un çalışma tahminidir (Melih'in görsel üretme süresi hariç).

| Aşama | İçerik | Süre |
|---|---|---|
| 0. Deneme | 1 oda + 3 poz × 2 kıyafet; tutarlılık ve yüz yaması testi | yarım gün (Melih: ~1 saat görsel) |
| 1. Ortam + sohbet + oda | Oda resmi, yeni sohbet ekranı (balon, yazma, haplar, geçmiş), orta tuş geçişi ve merkez ekran (bölüm 8), çıplak Moka 6 poz, göz kırpma ve ağız yamaları | 3-4 gün |
| 2. Kıyafetler | 6 set × 6 poz görüntü, Moka'nı tasarla ekranı, ana ekran ve Ben entegrasyonu, Supabase `mokaLook` | 2-3 gün |
| 3. Açılış | Rozet/seri/mevsim kilitleri, Premium setler, kurulumda seçim | 1-2 gün |
| 4. Parlatma | Gece/gündüz, hava, çeviri kontrolü, mağaza görselleri | 1 gün |

Melih'in ChatGPT/Gemini'de üreteceği tam liste (hepsi 1024×1024 saydam PNG, referans `moka_happy.png` + önceki başarılı görsel; prompt şablonu: "Moka'nın aynı gövdesi ve yüzü, aynı stil, saydam arka plan, tam boy, ayakta, [poz], [kıyafet]. Gövde ve yüz hiç değişmesin, sadece kıyafet."):

1. Oda arka planı gündüz (dikey 1170×2532) + gece sürümü (bölüm 1 promptu).
2. Çıplak Moka 6 poz: duruş, el sallama, kahve içme, düşünme, sevinç, uyku (hepsi aynı ölçekte, yüz önde).
3. Çıplak Moka yüz yamaları için her poz için 5 düzenleme: göz kapalı, mutlu göz, şaşkın göz, üzgün kaş, ağız açık ("sadece yüzü değiştir, gövde pikselleri aynı kalsın").
4. 5 kıyafet seti × 6 poz: bere+atkı, şef, güneş gözlüğü, Noel, kedi kulağı (mevcut aksesuar sheet'leri çizim referansı olarak kullanılır).
5. İstersen: Ben sekmesi için "model" pozu (kollar yanda, 6 poz yerine bir poz daha).

Başlama sırası önerisi: Aşama 0 ile başla. Tutarlılık çıkmazsa kıyafet sayısını azaltıp sadece kürk rengi + yüz mimiği + ortam (aksesuarsız) ile devam etmek de çalışan bir yedek yoldur.

## 8. Ortadaki tuş = Moka'nın odası (merkez ekran)

Karar (Melih, 2026-11-16): alt menünün ortasındaki Moka tuşuna basınca doğrudan bir geçişle Moka'nın odasına geçilir. Oda bir merkez ekrandır: aynı ekranda Moka (ortada), **Temizlik başlat**, **Moka ile sohbet** (balonlu, zaten ekranda) ve **İş ekle**.

**Menü değişikliği (`TabBar.tsx`).** Şu an ortadaki tuş "Ne yapalım?" alt sayfasını açıyor (3 seçenek: sohbet, iş ekle, temizlik). Yeni halde alt sayfa kalkar, tuş `/moka-oda` ekranını açar. Sekmeler aynı kalır (Ev, Bugün, Gelişim, Ben). Eski seçeneklerin yeri: sohbet odada ana içerik, iş ekleme odada alt düğme (aynı `AddTaskForm`), temizlik odada ikinci düğme (`/temizlik`). Ev sekmesindeki Moka kartı ve `/moka` rotası: `/moka` odaya yönlendirir, eski sohbet ekranı kaldırılır (derin bağlantılar ve bildirimler kırılmasın diye rota adı kalır). Oda bir sekme değil, tam ekran yığın ekranıdır, alt menü odada gizlenir.

**Geçiş animasyonu.** Tuşa basınca Moka tuşundan büyüyen bir daire (yaklaşık 380 ms) tüm ekranı kaplar, oda resmi yumuşakça açılır, Moka alttan zıplayarak girer ve el sallar (320 ms). Geri dönüşte aynı daire küçülür. Yalnızca `Animated` + native driver, ek paket yok. "Hareketi azalt" açıksa düz çapraz geçiş. Oda resmi önceden yüklenir (uygulama açılışında `Image.prefetch`), geçişte boş kare görünmesin.

**Oda düzeni (dikey).**
- Üst: geri düğmesi, sağda Premium sohbet sayacı (18/25), "Geçmiş" düğmesi.
- Üst üçte bir: Moka'nın konuşma balonu (tek mesaj, harf harf).
- Orta: Moka, kıyafetiyle ve yüz animasyonuyla. Dokunursa tepki verir.
- Moka'nın iki yanında zeminde iki büyük hap düğme: sol **Temizlik başlat** (süre seçtirir: 5/10/15 dk ya da "Ne kadar vaktin var?"), sağ **İş ekle**. Her ikisi de Moka'ya yakın, başparmakla ulaşılır.
- Alt: hızlı cevap hapları ve yazı çubuğu ("Moka'ya yaz…").

**Klavye.** Yazı çubuğuna dokununca klavye açılır: Moka küçülüp yukarı kayar (şimdiki "klavyede kompakt" davranışı, `moka.tsx` satır ~83'teki `keyboardDidShow/WillShow` dinleyicisi), iki büyük düğme gizlenir, balon yukarıda kalır. `KeyboardAvoidingView` iOS'ta `padding`, Android'de `height`. Temizlik ve diğer ekranlardaki "klavye altında kalan sayfa" düzeltmesi (commit 8dddf6f) aynen uygulanır: giriş çubuğu klavyenin üstünde, güvenli alan alt boşluğu klavye açıkken sıfırlanır. **İş ekle** odanın içinde alttan açılan sayfa (`Sheet` + `AddTaskForm`) olur; klavye açılınca sayfa klavyenin üstüne oturur, oda arkada kalır. Emülatörde iOS ve Android klavyesiyle ayrı ayrı test edilmeli (özellikle Android `adjustResize`).

**Aşamaya etkisi.** Aşama 1'e (ortam + sohbet) eklenir: `moka-oda` ekranı, TabBar değişikliği, geçiş animasyonu, düğmelerin bağlanması. Ek süre yaklaşık yarım-bir gün. Eski sohbetteki iş ekleme, not ve işaretleme eylemleri aynen taşınır.
