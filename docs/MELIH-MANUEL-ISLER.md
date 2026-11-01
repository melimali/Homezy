# MELİH'İN MANUEL İŞLERİ (eve gidince, PC başında)

Sıra önemli: üstten alta git. Her maddeyi bitirince kutuyu işaretle. Komutlar Windows'ta `npx.cmd` ile, proje klasöründe (OneDrive dışı kopya `C:\lf-wt`) çalışır.
Kod tarafı kontrol edildi (`docs/yayin-kontrol-listesi.md`). Aşağıdakiler sadece senin hesaplarınla yapılabilir.

> Gizli anahtarları (Anthropic `sk-ant…`, RevenueCat `sk_…`, service_role) **asla** sohbete, repoya ya da `.env` dosyasına yazma.

---

## 0. Hazırlık (5 dk)

- [ ] `cd C:\lf-wt` → `git pull origin integration/tum-pr` (bu işleri içeren son sürüm)
- [ ] `npm install` → `npm run typecheck` (hatasız olmalı)
- [ ] `npx.cmd eas login` (hesap `@meikai`) → `npx.cmd eas whoami`
- [ ] `docs/yayin-kontrol-listesi.md` dosyasını bir kez göz at

---

## 1. Yasal sayfaları yayınla (Play ve Auth bunsuz ilerlemez) ⏱ 15 dk

- [ ] Hazır paket: repoda `docs/yasal/site/` (proje klasöründe `themeikai-yasal/homezy/` aynısı). İçinde 6 klasör var: `gizlilik`, `kosullar`, `hesap-silme`, `eposta-onayi` (zorunlu 4) ve `privacy`, `terms` (İngilizce, sayfalardaki "English" bağlantısı için). Her klasörde `index.html` var; stil içinde, ek dosya gerekmez.
- [ ] Yükle: themeikai.com hosting panelinde (Dosya Yöneticisi/FTP) site köküne `homezy` klasörü aç, 6 klasörü **klasör olarak** içine at (`.../homezy/gizlilik/index.html` gibi). Son adresler (tarayıcıda aç, çalıştığını gör):
  - https://themeikai.com/homezy/gizlilik
  - https://themeikai.com/homezy/kosullar
  - https://themeikai.com/homezy/hesap-silme
  - https://themeikai.com/homezy/eposta-onayi (e-posta onay linkinin düştüğü sayfa)
  - (ek) /homezy/privacy ve /homezy/terms
  Adres uzantısız açılmazsa hosting klasör yönlendirmesi kapalıdır; hosting desteğine sor.
- [ ] Sayfalarda iletişim adresinin gerçek ve **okuduğun** bir kutu olduğunu doğrula (kodda `info@themeikai.com`). Farklıysa hem sayfalarda hem `src/lib/links.ts` `SUPPORT_EMAIL` içinde değiştir.
- [ ] Sayfalarda yayıncı **Melih Tuğyan (şahıs)** yazıyor, "Meikai Digital" yayıncı olarak geçmiyor mu bak. Tarihi yayın gününe güncelle.

## 2. Supabase (https://supabase.com/dashboard/project/gkccsimguzabfrsumjtv) ⏱ 45 dk

### 2.1 SQL
- [ ] SQL Editor > New query. Repodaki `supabase/tum-sql.sql` dosyasının **tamamını** yapıştır > Run. Tekrar çalıştırmak güvenli; hata çıkarsa hata metnini bana gönder.
- [ ] Doğrula (Table Editor): `scan_usage`, `chat_usage`, `shared_homes`, `play_garden_items` tabloları var; `profiles` tablosunda `persona` sütunu var.

### 2.2 Edge function'lar (hepsi, son kodla)
```
npx.cmd supabase login
npx.cmd supabase link --project-ref gkccsimguzabfrsumjtv
npx.cmd supabase functions deploy scan
npx.cmd supabase functions deploy moka-chat
npx.cmd supabase functions deploy subscription-sync
npx.cmd supabase functions deploy revenuecat-webhook --no-verify-jwt
```
- [ ] Dördü de deploy edildi (Dashboard > Edge Functions'ta görünüyor).
- [ ] `revenuecat-webhook`'ta **Verify JWT kapalı**, diğer üçünde **açık**.

### 2.3 Secret'lar
```
npx.cmd supabase secrets list
```
Şu üçü listede olmalı (yoksa ekle):
```
npx.cmd supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
npx.cmd supabase secrets set REVENUECAT_API_KEY=sk_...
npx.cmd supabase secrets set REVENUECAT_WEBHOOK_SECRET=uzun-rastgele-bir-metin
```
- [ ] `ANTHROPIC_API_KEY`  - [ ] `REVENUECAT_API_KEY` (RevenueCat > API keys > Secret)  - [ ] `REVENUECAT_WEBHOOK_SECRET` (8. adımda RevenueCat'e de aynısı girilecek, bir yere not et)
- Acil durdurma: `supabase secrets set AI_DISABLED=1` (geri açmak: `supabase secrets unset AI_DISABLED`).

### 2.4 Auth ayarları (Authentication menüsü)
- [ ] **Sign In / Providers > Email**: etkin, "Confirm email" **açık**, şifre en az 8 karakter.
- [ ] **Sign In / Providers**: "Allow anonymous sign-ins" **açık** (misafir kullanım bunsuz çalışmaz).
- [ ] **URL Configuration**: Site URL = `https://themeikai.com/homezy/eposta-onayi`; Redirect URLs listesine aynı adresi ekle.
- [ ] **Emails > Templates**: Confirm signup, Reset password, Magic link şablonlarını Türkçe yap (konu + metin). Linki `{{ .ConfirmationURL }}` bırak.
- [ ] **Emails > SMTP Settings**: kendi SMTP'ni bağla (Resend/Brevo ücretsiz katmanı yeter; gönderen `info@themeikai.com`, alan adı DNS doğrulaması gerekir). Varsayılan Supabase e-postası saatte birkaç mail ile sınırlı, yayında kayıt e-postaları gitmeyebilir.
- [ ] **Rate Limits**: anonim giriş saatte IP başına 30; kayıt/giriş 30 / 5 dk; e-posta gönderimi saatte ~10.
- [ ] (Sonra, istersen) **Attack Protection > CAPTCHA**: uygulamada henüz yok, açma. Önce rate limit yetiyor mu bak.
- [ ] Paylaşılan proje klasöründeki `pc-sync/.env` dosyasını aç: içinde `service_role`, `sk_`, `sk-ant` varsa **dosyayı sil ve o anahtarı yenile** (Supabase > Settings > API; RevenueCat; Anthropic), sonra 2.3'teki secret'ları yeni değerlerle yaz.

## 3. Anthropic

- [ ] https://console.anthropic.com > Settings > Limits: **aylık harcama limiti** koy (ör. 20–50 $). Tarama ve Moka sohbeti bu anahtarla çalışıyor.

## 4. AdMob (https://admob.google.com)

- [ ] Hesap ödeme bilgisi, vergi formu doldurulmuş mu (Ödemeler).
- [ ] Android uygulaması **Homezy** (`com.meikai.homezy`) ve bir Banner reklam birimi var. Kimlikler: uygulama `ca-app-pub-6763724339604565~6223192132`, banner `ca-app-pub-6763724339604565/6167351815`.
- [ ] **Gizlilik ve mesajlaşma > Avrupa düzenlemeleri (GDPR)**: mesajı oluştur ve **Yayınla**. Yoksa Avrupa'da onay penceresi çıkmaz, reklam da gelmez.
- [ ] **app-ads.txt**: AdMob > Uygulamalar > Homezy > "app-ads.txt'yi ayarla" ekranındaki satırı kopyala, themeikai.com kökünde `https://themeikai.com/app-ads.txt` olarak yayınla. Play mağaza kaydında "Web sitesi" = `https://themeikai.com`.
- [ ] Uygulama Play'de test sürümüne çıkınca AdMob'da uygulamayı mağazaya bağla. Reklamlar onay bekleyebilir; test sürümünde reklam gelmemesi normal olabilir.
- [ ] Kendi telefonunu AdMob > Ayarlar > Test cihazları'na ekle. **Kendi reklamına tıklama** (hesap kapanabilir).

## 5. EAS ortam değişkenleri (production) ⏱ 10 dk

```
npx.cmd eas env:list production
```
Listede şu ikisi **mutlaka** olmalı (yoksa production derlemesi artık hata verip durur, bu koruma bilerek eklendi):
```
npx.cmd eas env:create --environment production --name EXPO_PUBLIC_ADMOB_APP_ID_ANDROID --value ca-app-pub-6763724339604565~6223192132 --visibility plaintext
npx.cmd eas env:create --environment production --name EXPO_PUBLIC_ADMOB_BANNER_ANDROID --value ca-app-pub-6763724339604565/6167351815 --visibility plaintext
```
- [ ] `EXPO_PUBLIC_ADMOB_APP_ID_ANDROID` ve `EXPO_PUBLIC_ADMOB_BANNER_ANDROID` tanımlı.
- [ ] (Supabase URL/anahtar ve `goog_` anahtarı repodaki `.env` dosyasından geliyor, ayrıca girmen gerekmiyor.)

## 6. Google Play Console ⏱ 1–2 saat (hesap onayı ayrı)

### 6.1 Hesap
- [ ] Kişisel geliştirici hesabı **onaylı** (kimlik + telefon/cihaz doğrulaması tamam).
- [ ] **Güncel kuralı oku:** Pano'da "Production erişimi" kartı. Yeni kişisel hesaplar genelde **en az 12 test kullanıcısı ile 14 gün kesintisiz kapalı test** ister. Şimdiden 12+ Gmail adresi topla (aile, arkadaş) ve bir Google Grubu aç; süre ilk kapalı test yüklemesinde başlar.
- [ ] Kişisel hesapta adın/adresin mağazada görünebileceğini kabul ettin ya da posta kutusu/sanal adres aldın. Destek e-postası: `info@themeikai.com`.

### 6.2 Uygulamayı oluştur
- [ ] Tüm uygulamalar > Uygulama oluştur: ad **Homezy: Rutin ve Ev İşleri**, varsayılan dil Türkçe, Uygulama, Ücretsiz, bildirimleri kabul et.

### 6.3 Politika > Uygulama içeriği (hepsini doldur)
Hazır cevaplar: `docs/yasal/magaza-formlari.md`.
- [ ] Gizlilik politikası URL'si: `https://themeikai.com/homezy/gizlilik`
- [ ] Hesap silme: uygulama içi (Ben > Hesabımı sil) + web adresi `https://themeikai.com/homezy/hesap-silme`
- [ ] Reklamlar: **Evet, reklam içeriyor**
- [ ] Hedef kitle: **13+**; "çocuklara yönelik" **değil**, Aile programına girme
- [ ] Veri güvenliği: `magaza-formlari.md` tablosuna göre (e-posta, ad, kimlikler, satın alma geçmişi, yaklaşık konum, fotoğraflar, uygulama içi mesajlar, kullanıcı içeriği, etkileşim, **reklam kimliği → AdMob ile paylaşılıyor**). Aktarım şifreli: Evet. Silme talebi: Evet.
- [ ] İçerik derecelendirme anketi (IARC): şiddet/cinsellik yok; yapay zekâ sohbeti var, dürüst işaretle.
- [ ] Reklam kimliği beyanı: **kullanıyor** (reklam amaçlı).
- [ ] Haber / COVID / finans / sağlık uygulaması: **hayır** (sağlık sorusunda sadece alışkanlık/spor kaydı olduğunu düşün, tıbbi iddia yok).
- [ ] Konum izni gerekçesi (sorarsa): "hava durumuna göre ev gökyüzünü göstermek", sadece ön planda.

### 6.4 Mağaza sayfası
- [ ] Metinler: `docs/magaza-metni.md` (TR, ana dil). İngilizce yerel ayar ekle: `docs/magaza-metni-en.md` (başlık "Homezy: Routine & Chores").
- [ ] Uygulama simgesi 512×512: `docs/magaza/tr/play-icon-512.png`
- [ ] Öne çıkan görsel 1024×500: `docs/magaza/tr/feature-graphic-1024x500.png` (EN için `en/` klasörü)
- [ ] Telefon ekran görüntüleri 8 adet: `docs/magaza/tr/play/` (EN: `en/play/`)
- [ ] Kategori: Yaşam tarzı (ya da Ev ve Dekorasyon); iletişim e-postası, web sitesi.

### 6.5 Abonelik ürünleri (Para kazanma > Ürünler > Abonelikler)
Önce uygulama oluşturulmuş olmalı; abonelik eklemek için ilk .aab'nin yüklenmesi gerekebilir (8. adımdan sonra geri dön).
- [ ] Ürün kimliği `homezy_premium`, ad "Homezy Premium"
- [ ] Temel plan **`aylik`** (otomatik yenilenen, aylık): ABD 6,99 $, **Türkiye 149,99 TL**; diğer ülkeler "fiyatları dönüştür" ile
- [ ] Temel plan **`yillik`** (yıllık): 59,99 $, **Türkiye 1.564,99 TL**
- [ ] `aylik` planına **Teklif `ilk-ay`**: yeni müşteriler, 1 ay indirimli: 4,99 $, **Türkiye 119,99 TL**
- [ ] Planları ve teklifi **etkinleştir**
- [ ] Ayarlar > **Lisans testi**: kendi Gmail'ini ekle (para çekilmeden satın alma denemek için)

### 6.6 Servis hesabı (RevenueCat için)
- [ ] Play Console > Kullanıcılar ve izinler / API erişimi: Google Cloud'da servis hesabı oluştur, JSON anahtar indir. Play Console'da bu hesaba izin ver: **Mali verileri görüntüle**, **Siparişleri ve abonelikleri yönet**, uygulamaya erişim.
- [ ] Hesabı **JSON dosyasını** repoya koyma. RevenueCat'e (7. adım) ve EAS Submit'e (isteğe bağlı) yüklenir.

## 7. RevenueCat (https://app.revenuecat.com) ⏱ 30 dk

- [ ] Proje > Apps > Android uygulaması paket adı **`com.meikai.homezy`**
- [ ] Android uygulamasında **Service credentials**: 6.6'daki JSON'u yükle. "Credentials valid" yazana kadar bekle (36 saate kadar sürebilir).
- [ ] Products: Play'den içe aktar → `homezy_premium:aylik` ve `homezy_premium:yillik` göründüğünü doğrula. (Eski kayıtlarda `layfapp_premium` kalmışsa sil ya da kullanma.)
- [ ] Entitlements: **`premium`** (tam bu yazım). İki ürünü buna bağla.
- [ ] Offerings: **default** offering **Current** olarak işaretli; paketler **Monthly (`$rc_monthly`) → aylik**, **Annual (`$rc_annual`) → yillik**.
- [ ] API keys: Android **`goog_…`** public anahtarı, repodaki `.env` içindeki `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` ile **aynı** mı bak.
- [ ] Integrations > Webhooks: URL `https://gkccsimguzabfrsumjtv.supabase.co/functions/v1/revenuecat-webhook`, Authorization header: `Bearer ` + 2.3'te seçtiğin `REVENUECAT_WEBHOOK_SECRET` değeri. **Send test event** > 200 dönmeli.
- [ ] Project settings'te sandbox/test mağaza anahtarı (`test_…`) kullanma; yayında yok sayılır.

## 8. Derleme ve ilk yükleme ⏱ 30 dk + bekleme

```
cd C:\lf-wt
git pull origin integration/tum-pr
npm install
npm run typecheck
npx.cmd eas build -p android --profile production
```
- [ ] EAS build başarılı (AdMob ID eksikse build bilerek durur: 5. adıma dön).
- [ ] İlk .aab'yi indir ve Play Console > Test > **Dahili test** > Yeni sürüm oluştur > yükle (**ilk yükleme elle olmalı**). Play App Signing'i kabul et.
- [ ] Dahili test için kendi Gmail'ini test kullanıcısı olarak ekle, davet bağlantısını telefonuna aç, yükle.
- [ ] 6.5'teki abonelik ürünleri artık eklenebiliyorsa onları tamamla ve 7. adımı bitir.
- [ ] Sonraki sürümlerde: `npx.cmd eas submit -p android --profile production` (servis hesabı JSON'u ister).

## 9. Telefonda test (dahili test sürümüyle)

- [ ] Tanıtım ve ev çizme; hesap aç (e-posta onay maili **Türkçe geldi mi**, link themeikai.com/homezy/eposta-onayi sayfasını açtı mı) ve misafir devam
- [ ] Bir iş tamamla: puan, seri, Bugün, Gelişim
- [ ] Buzdolabı ve kıyafet taraması (hesaplı), Moka sohbeti (Premium dışında sadece tanıtım mesajı), misafir ise tarama/sohbet kapalı
- [ ] Ücretsiz planda Ev ve Bugün altında **afiş reklam** çıkıyor mu (test cihazı olarak); Premium'da çıkmıyor
- [ ] Avrupa onay penceresi (VPN ile ya da AdMob test cihazı + "EEA" ayarıyla) — çıkıyor mu
- [ ] Satın alma (lisans testi hesabıyla): aylık, yıllık, "ilk ay" teklifi, **Premium açıldı mı**; Supabase `subscriptions` tablosunda satır oluştu mu; "Satın alımı geri yükle"; iptal edince Premium düşüyor mu
- [ ] Bildirim izni + sabah özeti saati; konum izni reddedince de çalışıyor
- [ ] Hesabı sil → tekrar giriş yapılamaz, veri gitti
- [ ] Koyu tema, küçük ekran, uygulamayı kapat-aç

## 10. Kapalı test ve production

- [ ] Play Console > Test > **Kapalı test**: sürümü yükle, 12+ test kullanıcısını (Google Grubu/e-posta listesi) ekle, davet linkini gönder.
- [ ] Hepsi katıldı mı ve **14 gün** dolana kadar çıkmadılar mı, her gün takip et.
- [ ] Süre bitince Pano > "Production erişimi için başvur" formunu doldur (test geri bildirimi ve yaptığın değişiklikleri yaz).
- [ ] Onaydan sonra Production sürümü oluştur, ülkeleri seç (önce Türkiye), incelemeye gönder.

## 11. Apple (kısa, sonra)

- [ ] Apple Developer Program (kişisel, 99 $/yıl) ve Ücretli Uygulamalar sözleşmesi + banka/vergi
- [ ] App Store Connect'te uygulama, bundle ID `com.meikai.homezy`, ad "Homezy: Günlük Rutin ve İşler"
- [ ] Abonelik grubu, ürünler `homezy_premium_aylik` ve `homezy_premium_yillik`, aylık için giriş teklifi
- [ ] RevenueCat'e iOS uygulaması, `appl_…` anahtarı → `.env` ve EAS: `EXPO_PUBLIC_REVENUECAT_IOS_KEY`
- [ ] AdMob iOS uygulaması + banner → `EXPO_PUBLIC_ADMOB_APP_ID_IOS`, `EXPO_PUBLIC_ADMOB_BANNER_IOS` (EAS). `app.json` içindeki iOS test kimliği gerçekle değişecek.
- [ ] `npx.cmd eas build -p ios --profile production`, `npx.cmd eas submit -p ios` → TestFlight
- [ ] App Privacy etiketleri (`docs/yasal/magaza-formlari.md` bölüm 3), demo hesap + inceleme notu, ekran görüntüleri (`docs/magaza/*/ios-6.7`, `ios-6.5`, `ios-5.5`)

---

## Takılırsan

- Edge function hatası: Supabase > Edge Functions > ilgili fonksiyon > Logs.
- Satın alma "ürün bulunamadı": Play'de ürün/plan etkin mi, RevenueCat offering Current mi, uygulama Play'den (dahili test) mi kuruldu, lisans test hesabıyla mı girdin.
- Build "AdMob" hatası: 5. adım.
- Her şey tamam deyince bana "Play'e yüklendi" de, sıradaki adımları birlikte yaparız.


## Güvenlik ve yasal denetim (2026-11-01)
1. **Yasal sayfaları yükle** ✅ yapıldı: `docs/yasal/site/` içindeki 6 klasör `themeikai.com/homezy/` altında (gizlilik, kosullar, hesap-silme, eposta-onayi, privacy, terms; `.html` yok).
2. **Supabase** > Authentication > URL Configuration: Site URL `https://themeikai.com/homezy/eposta-onayi`; Redirect URLs'e aynısını ekle.
3. **Play Console > Veri güvenliği**: hesap silme adresi `https://themeikai.com/homezy/hesap-silme`. Ayrıca "Yaklaşık konum", "Uygulama etkileşimleri", "Tanılama" verilerini AdMob (Google ile paylaşım, amaç: reklam) için işaretle. Hedef kitle 13+.
4. **EAS production ortamı**: `EXPO_PUBLIC_ADMOB_APP_ID_ANDROID`, `EXPO_PUBLIC_ADMOB_BANNER_ANDROID` dolu mu bak (`eas env:list production`). Boşsa yayında Google test uygulama kimliği kalır.
5. **Open-Meteo**: ticari plan al (open-meteo.com) ya da konum/hava özelliğini ilk yayında kapat.
6. **Marka**: "Homezy" adını marka veri tabanlarında ara (TÜRKPATENT, EUIPO, USPTO), çakışma notunu bana ilet.
7. **Pixabay**: kullandığın seslerin indirme sayfası bağlantılarını bir dosyaya kaydet.
8. **npm**: package-lock güncellendi; PC'de `npm ci` sonra emülatörde bir kez aç, sonra EAS derlemesi.
9. App Store için App Review notuna demo hesap (e-posta + şifre) ekle.
