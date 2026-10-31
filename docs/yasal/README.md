# Homezy yasal paketi

> **Bu bir avukat görüşü değildir.** Metinler iyi niyetli, genel uyum taslağıdır (KVKK, GDPR, CCPA/CPRA, LGPD, Apple ve Google kuralları). Yayından önce bir avukata okutulması önerilir; aşağıda özellikle bakılacak yerler listelendi.

## Dosyalar

| Dosya | İçerik |
|---|---|
| `gizlilik.html` / `privacy.html` | Gizlilik Politikası (TR / EN) |
| `kosullar.html` / `terms.html` | Kullanım Koşulları, abonelik şartları (TR / EN) |
| `hesap-silme.html` | Google Play'in istediği web'den hesap silme sayfası (TR + EN) |
| `style.css`, `index.html` | Ortak stil, içindekiler |
| `veri-envanteri.md` | Hangi veri nerede, ne kadar süre, nasıl silinir |
| `magaza-formlari.md` | Play Data Safety, Apple Privacy Labels, yaş derecelendirmesi, inceleme notları |
| `../../supabase/migrations/20261031150000_yasal_silme.sql` | Hesap silince her şeyi silen `delete_me()` |

## Yayınlamak (GitHub Pages)

1. GitHub › `melimali/layfapp` › Settings › Pages › Source: *Deploy from a branch*, Branch: `main`, Folder: `/docs` › Save. (`integration/tum-pr` main'e birleşmeden sayfa çıkmaz; geçici olarak branch'i `integration/tum-pr` seçebilirsin.) Not: özel (private) repoda Pages ücretli GitHub planı ister; ücretsizde repo public olmalı ya da sayfaları `themeikai.com/homezy/` altına kopyala.
2. Birkaç dakika sonra adresler:
   - Gizlilik (TR): https://melimali.github.io/layfapp/yasal/gizlilik.html
   - Privacy (EN): https://melimali.github.io/layfapp/yasal/privacy.html
   - Koşullar: https://melimali.github.io/layfapp/yasal/kosullar.html · Terms: …/terms.html
   - Hesap silme (Play Console › Veri güvenliği): https://melimali.github.io/layfapp/yasal/hesap-silme.html
3. `src/lib/links.ts` içindeki `BASE` zaten `https://melimali.github.io/layfapp/yasal`. Başka alan adına taşırsan sadece onu değiştir.
4. Bu adresleri Play Console ve App Store Connect formlarına gir.

## Doldurulanlar ve kalanlar

- Veri sorumlusu: Melih Tuğyan (şahıs). Adres **yazılmadı**, iletişim info@themeikai.com. Play bireysel hesapta mağaza sayfasında adres gösterir, Apple de adres ister; bu konuyu avukata/Play'e sor (posta kutusu/sanal adres seçeneği).
- Tarih 31.10.2026; yayın günü güncelle.
- Supabase proje bölgesini doğrula (Frankfurt/AB yazdım).
- Mağaza formlarını `magaza-formlari.md`'ye göre doldur.

## Avukata sorulacaklar

1. **KVKK:** VERBİS kaydı gerekir mi (küçük veri sorumlusu muafiyetleri), aydınlatma metni biçimi, yurt dışı aktarım (m.9, 2024 değişikliği sonrası standart sözleşme bildirimi) ve açık rıza metinleri.
2. **GDPR:** AB'de kullanıcı hedefleniyorsa AB temsilcisi (Art. 27) gerekir mi; DPA'lar (Supabase, RevenueCat, Anthropic, Google) imzalı/kabul edilmiş mi; SCC'ler.
3. **Yapay zekâ:** AB Yapay Zekâ Tüzüğü şeffaflık yükümlülükleri (sohbet botu olduğunun bildirilmesi — uygulamada var); Anthropic ticari şartlarında verinin eğitimde kullanılmadığı ve saklama süresi (anthropic.com'dan güncel hâlini doğrula).
4. **Çocuklar:** 13+ yaş sınırı yeterli mi; AB'de ülkeye göre 13-16 rıza yaşı; COPPA (ABD) — 13 altı bilerek veri toplanmıyor; mağaza yaş derecelendirmeleri.
5. **Abonelik:** Türk Tüketici Mevzuatı (mesafeli sözleşmeler, cayma hakkı — dijital içerikte istisna), AB tüketici hakları, ABD otomatik yenileme yasaları (ör. California ARL), Brezilya CDC. Uygulama içi metin Apple/Google'ın istediği bilgileri veriyor ama yerel zorunlulukları avukat doğrulamalı.
6. **Sorumluluk sınırı** (Koşullar m.10) ve **uygulanacak hukuk / yetki** maddesi.
7. **Open-Meteo:** ücretsiz API **ticari kullanım için değildir**. Reklamlı/abonelikli uygulamada ticari plan (ya da başka sağlayıcı) gerekebilir. Yayından önce çöz.
8. **Telif:** Moka ve diğer görseller yapay zekâ ile üretildiyse telif/marka durumu; Pixabay seslerin gerçekten Pixabay İçerik Lisansı altında olduğunun kaydı (indirme sayfaları); "Homezy" marka taraması.
9. **Vergi:** Türkiye'de bireysel geliştirici olarak mağaza gelirinin vergilendirilmesi (şahıs şirketi gerekebilir) — yasal belge değil ama yayın öncesi muhasebeciye sor.
10. **Silinen veri sonrası yedekler:** Supabase otomatik yedeklerinde silinen kullanıcı verisi bir süre kalabilir; politikaya yansıtmak gerekir mi.

## Kod tarafında yapılanlar

- İlk Moka mesajında / ilk taramada **yapay zekâ rızası** (`src/lib/consent.ts`); Ben › Gizlilik ve yasal'dan geri alınır.
- **Konum** için OS izni + Gizlilik ve yasal'da kapatma düğmesi. Konum yuvarlanıp sadece Open-Meteo'ya gider.
- **Yapay zekâ bildirimi** Moka ekranında sürekli görünür; **🚩 bildir** düğmesi (Google yapay zekâ içeriği kuralı); sistem isteminde **kriz kuralı** (112, tavsiye vermez). Fonksiyonu yeniden dağıt: `supabase functions deploy moka-chat`.
- **Hesap silme** eksiksiz: yeni migration'ı Supabase SQL Editor'de çalıştır.
- **Veri dışa aktarma** (JSON) Gizlilik ve yasal'da.
- **Paywall:** fiyat, dönem, ilk ay teklifi, otomatik yenileme, iptal yolu, geri yükleme, Koşullar/Gizlilik bağlantıları.
- **Kayıt** ekranında Koşullar/Gizlilik + 13 yaş onayı.
- **Lisanslar ve teşekkürler** bölümü (Pixabay, yazı tipleri, kütüphaneler, Open-Meteo). Yeni paket eklenince `src/app/yasal.tsx` içindeki `CREDITS` listesini güncelle.
- Reklam: UMP onayı (AB/UK), kişiselleştirilmemiş, PG sınırı (zaten vardı).
