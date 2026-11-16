# Güvenlik ve yasal denetim, ikinci göz (2026-11-01)

Kapsam: `docs/guvenlik-raporu.md` (22 madde), AI suistimal sınırları ve `docs/yasal/` paketi **tekrarlanmadı**; üstüne bağımsız denetim.
Durum: **Düzeltildi** (kodda) · **Elle** (Melih) · **Kabul** (bilerek) · **Temiz**.
Avukat görüşü değildir.

## Güvenlik

| # | Bulgu | Ciddiyet | Durum |
|---|---|---|---|
| G1 | Sır taraması: izlenen dosyalar ve tüm git geçmişi (`eyJ…`, `sk-ant`, `sk_live`, `goog_`, `appl_`, `AIza`, keystore, google-services, `.p8/.pem/.jks`) tarandı. Tek eşleşme `.env`: Supabase `anon` JWT (rol `anon`) ve RevenueCat `goog_` herkese açık SDK anahtarı. `service_role`, `sk_`, Anthropic anahtarı yok. | - | Temiz |
| G2 | `pc-sync/.env` (paylaşılan klasör): sadece anahtar adları bakıldı: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_KEY`, `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`. Hepsi herkese açık tür; gizli anahtar yok. Önceki rapordaki uyarı kapandı. | - | Temiz |
| G3 | `npm audit`: 16 açık (3 yüksek: `node-forge`, `zod`, 1 başka). `npm audit fix` ile (kırıcı olmayan) yükseltildi; yüksek açık kalmadı. Kalan 14 orta, hepsi `expo`/`glob`/`minimatch` derleme araç zinciri (uygulamaya girmiyor); düzeltme `expo@51`e düşürmek ister, yapılmaz. Not: lockfile'a dokunuldu, EAS `npm ci` ile derlemeden önce emülatörde bir kez aç. | Orta | Düzeltildi / Kabul (kalan) |
| G4 | Deep link `homezy://`: Expo Router her yolu açar. Parametreli ekranlar (`odak`, `is`, `oda/[id]`, `premium`, `evim`) parametreleri doğruluyor (süre en yakın seçeneğe, konu listeden, id yoksa yönlendirme). Premium/puan verecek parametre yok. Gelen bağlantıyla WebView açılmıyor, `Linking.openURL` sadece sabit yasal adreslere, mağaza yönetim adresine ve `mailto:`a gidiyor. | - | Temiz |
| G5 | Yayın bayrakları: `EXPO_PUBLIC_DEV_PREMIUM` sadece `__DEV__`; RevenueCat `test_` anahtarı yayında yok sayılıyor; reklam birimi yoksa yayında reklam yok (test birimi sadece `__DEV__`). `app.json` içindeki AdMob uygulama kimlikleri Google **test** kimliği; gerçeği `app.config.ts` EAS ortam değişkeninden alıyor. | Orta | Elle: EAS production ortamında 4 değişken dolu mu bak (MELIH-MANUEL-ISLER) |
| G6 | Oturum jetonu (Supabase) cihazın yerel deposunda (SQLite tabanlı localStorage), SecureStore değil. SecureStore yeni native modül; kural gereği eklenmedi. Android Auto Backup bu veriyi Google yedeğine alabilir. Risk: cihaz kökleniyorsa jeton okunur; jetonun gücü RLS ile sınırlı (sadece kendi satırların). | Düşük | Kabul. Native yeniden derleme yapılırken `expo-secure-store` değerlendirilsin |
| G7 | Release derlemede R8 küçültme açık (2026-11-04, keep kuralları app.json). Gizli bilgi yok, sadece tersine mühendislik kolay. Kapatma sebebi (androidx.work proguard) belgeli. | Düşük | Kabul |
| G8 | Loglama: `console.warn` sadece hata nesneleri; kullanıcı içeriği, jeton, e-posta yazılmıyor. | - | Temiz |
| G9 | Bildirim içeriği kilit ekranında iş adlarını gösterir (ör. "çamaşır"). Hassas kategori yok. | Düşük | Kabul |
| G10 | Storage `yedek` kovası: yalnız kendi klasörü, Premium yükler, 500 dosya, 3 MB, silince `delete_me()` temizler. Politikalar `auth.uid()` klasör eşlemeli. | - | Temiz |
| G11 | `profiles.persona` (yeni sütun) yazma izni `guvenlik.sql` ile yalnız `name, persona`, boyut 4 KB sınırlı. İstemciden `subscriptions`, puan, sayaç yazılamaz; Premium sahteciliği sadece görsel (sunucu tarama/sohbet sınırını kendisi sayıyor). | - | Temiz |
| G12 | Prompt injection: oda/iş adları sunucu isteminde `<ev>` içinde "veri" diye işaretli, araç sayısı sınırlı, kapsam dışı reddediliyor. Tarama JSON çıktısı şema ile zorlanıyor. | - | Temiz |

## Yasal

| # | Bulgu | Ciddiyet | Durum |
|---|---|---|---|
| Y1 | **İngilizce kullanıcıya Türkçe gizlilik/koşullar sayfası açılıyordu** (`privacyEn` = `gizlilik`), ayrıca adresler uzantısızdı (`/gizlilik`); statik sitede 404 verebilirdi. EN sayfalar (`privacy.html`, `terms.html`) repoda vardı ama bağlanmamıştı. | Yüksek (mağaza reddi) | Düzeltildi: `src/lib/links.ts` artık `.html` ve EN için `privacy.html` / `terms.html`. E-posta onay adresi de `.html` |
| Y2 | `themeikai.com/homezy/` altında (proje klasörü) sadece eski `gizlilik.html` ve `kosullar.html` var; `privacy`, `terms`, `hesap-silme`, `eposta-onayi`, `style.css` yok. Play hesap silme adresi ve onay maili bağlantısı **çalışmaz**. | Yüksek | Elle |
| Y3 | Yemek önerisinde "sağlık puanı" vardı, uyarı yoktu (beslenme/tıbbi tavsiye değil, alerji). Mağaza metni "sağlık puanlı" diyor. | Orta | Düzeltildi: tarif listesi altında uyarı (TR/EN). Mağaza metni "sağlık puanı" iddiası olduğu gibi kalabilir; "tahmini" kelimesi eklenirse daha güvenli |
| Y4 | Spor: "Ağrın varsa zorlama, doktoruna danış" var. Sohbet: kriz/tıbbi kural sunucu isteminde, ekranda sürekli yapay zekâ uyarısı, bildir düğmesi, rıza. İlaç takibi uygulamada yok (eklenirse ayrı sağlık verisi beyanı + uyarı gerekir). | - | Temiz |
| Y5 | Data Safety (`docs/yasal/magaza-formlari.md`) AdMob'u "reklam kimliği" olarak beyan ediyor. AdMob SDK ayrıca IP'den yaklaşık konum, uygulama etkileşimi, tanılama toplar. Eksik beyan = Play reddi/uyarısı. RevenueCat da satın alma ve cihaz kimliği toplar (satın alma zaten var). | Orta | Elle: formda "Yaklaşık konum", "Uygulama etkileşimleri", "Tanılama" için Reklam amacıyla, Google ile paylaşılıyor, işaretle |
| Y6 | Open-Meteo ücretsiz API ticari kullanıma kapalı; uygulama reklamlı/abonelikli. | Orta | Elle: ticari plan al ya da `src/lib/weather.ts` sağlayıcısını değiştir. İlk yayında en kolay kaçınma: konum özelliğini gizle |
| Y7 | Hesap silme uygulama içinde var, `delete_me()` auth.users cascade + storage + aile kayıtlarını siliyor. Silinen veri Supabase yedeklerinde bir süre kalır, politikaya yazılmalı. | Düşük | Elle (avukat/yazım) |
| Y8 | AdMob: UMP kod var (`gatherConsent`, 8 sn zaman aşımı), kişiselleştirilmemiş, PG. Zaman aşımında `false` döner, reklam gösterilmez (güvenli taraf). Çocuklara yönelik değil: 13+, Play'de "Hedef kitle" 13+ seçilmeli. | - | Temiz / Elle (hedef kitle 13+ ) |
| Y9 | Abonelik şeffaflığı: paywall fiyat, dönem, ücretsiz deneme, otomatik yenileme, iptal, geri yükleme, bağlantılar var. EN'de fiyat TL görünüyor (bilinen, bölgesel fiyatı RevenueCat paketinden alıyor olmalı). | Orta | Kabul / ayrı iş |
| Y10 | Telif: `Finch` adı uygulama dizgilerinde ve asset'te geçmiyor (sadece `docs/tasarim-finch.md` iç tasarım notu ve tema yorumu). Yazı tipleri Baloo 2 / Nunito (OFL), Pixabay sesleri `yasal.tsx` CREDITS'te. Moka görselleri AI üretimi; Play "AI üretilmiş içerik" beyanı sohbet için var, görsel için ayrı beyan gerekmez. | Düşük | Temiz. Elle: Pixabay lisans kayıtlarını sakla; "Homezy" için EUIPO/TÜRKPATENT/USPTO marka taraması yap, çakışma varsa yayından önce öğren |
| Y11 | Paket kimliği `com.meikai.homezy` (CLAUDE.md `com.meikaidigital.layfapp` yazıyor; kurumsal hesap kalktı). İlk yüklemeden sonra değişmez. | Bilgi | Elle: bu kimliğin kalıcı olduğunu onayla, CLAUDE.md'yi güncelle |
| Y12 | Apple (kısa): Gizlilik etiketleri `magaza-formlari.md`'de; takip yok (ATT gerekmez, kişiselleştirilmemiş). Hesap silme uygulama içinde (Apple zorunlu) var. Giriş: e-posta olduğundan "Sign in with Apple" gerekmez. Yapay zekâ veri paylaşımı için Apple 5.1.2(i) açık rıza: var (`ensureAiConsent`). Demo hesap App Review notuna eklenmeli. | - | Temiz / Elle (demo hesap) |

## Bu turda koddan yapılanlar
- `npm audit fix` (yüksek açıklar kapandı).
- Gizlilik/koşullar/hesap silme/e-posta onay adresleri `.html`, EN sayfalar bağlandı.
- Yemek ekranına sağlık/alerji uyarısı.

## Marka taraması: "Homezy" (2026-11-01, web araması, resmî sorgu değil)
- **Apple App Store'da "Homezy.ai"** (Cloudvalley Technologies LLP): ev belgeleri, envanter, harcama ve aile görev/alışveriş listeleri uygulaması. **Bizimle aynı alan ve benzer işlev, yüksek çakışma riski.**
- App Store'da "Homezy – Bất động sản 4.0": Vietnam emlak uygulaması (farklı alan).
- ABD (USPTO), sadece ikincil sitelerden: HOMEZY, LLC (Orlando) başvuru 99662604, şubat 2026, bekliyor, mobilya (sınıf 20); 1330165 B.C. LTD (Surrey) başvuru 98219610, 2023, bekliyor, sınıf 20. Yazılım (sınıf 9/42) kaydı bulunmadı ama doğrulanmadı.
- EUIPO ve TÜRKPATENT: sonuç bulunamadı (sorgulanabilir veri tabanlarına erişim yok).
- **Karar:** Resmî sorgu şart: TMview (tmdn.org/tmview), TÜRKPATENT, USPTO. Sınıf 9, 42, 35 ve "Homezy"/"Homzy"/"Homesy" yazımlarını ara. Homezy.ai ile aynı mağazada aynı isim ret/şikayet sebebi olabilir; yayından önce ad değişikliği (ör. alt başlıkla ayrışma ya da yeni ad) düşünülmeli. Ad mağazaya ilk yüklemeden önce değişmesi en ucuzu.
