# Profesyonelleştirme listesi (2026-11-03)

Kod taraması sonucu. Henüz hiçbiri uygulanmadı. Efor: S = birkaç saat, M = 1 gün, L = birkaç gün. Etki: Y = yüksek, O = orta, D = düşük.
Taramada ölçülenler: 135 dosya/31 bin satır; 103 `Pressable` / 134 `accessibilityLabel`; 185 sabit hex renk (`app`+`components`); `ErrorBoundary`, çökme raporu ve test yok; `FlatList` yok (17 dosyada `ScrollView`); `ActivityIndicator` sadece 2 dosyada; haptik yalnızca `src/lib/sfx.ts` üzerinden.

## A. Kararlılık ve mağaza hazırlığı (önce bunlar)

1. **Hata sınırı (ErrorBoundary) + çökme raporu** — `src/app/_layout.tsx`. Bir ekran patlayınca beyaz ekran yerine Moka'lı "Bir şeyler ters gitti, tekrar dene" ekranı; Expo Router'ın `export function ErrorBoundary`'si ile ekran bazında. Ek olarak Sentry (ya da en azından global `ErrorUtils` kaydı) ile gerçek kullanıcı çökmeleri görünür olur. Native modül gerektirir (Sentry). Efor M, Etki Y.
2. **Kayıt performansı: her değişiklikte tüm tabloları silip yazma** — `src/data/db.ts` `saveState()` (`DELETE FROM … ; INSERT …`). Ev büyüdükçe (çok görev/kıyafet) her dokunuşta tüm veri yeniden yazılıyor; ayrıca yazma sırasında uygulama ölürse veri kaybı riski. Çözüm: debounce (ör. 400 ms) + değişen tabloyu yaz, ya da en azından tek işlemde yedek tablo. Efor M, Etki Y.
3. **Release derlemesi küçültme kapalı** — `app.json` `enableMinifyInReleaseBuilds: false`, `enableShrinkResources…: false`. `assets` 38 MB. R8/shrink açmak APK'yı belirgin küçültür; proguard kurallarını test etmek gerekir. Yeni derleme ister. Efor M, Etki O.
4. **Görsel boyutu/biçimi** — `assets/moka`, `assets/scenes` (PNG/JPG, 38 MB). WebP'ye çevir + `expo-image` (önbellek, geçiş efekti) kullan; ilk açılış ve bellek düşer. Efor M, Etki O.
5. **Otomatik test + CI** — hiç test yok. `src/domain/logic.ts` (`status`, `notifs`, `roomClean`), `growth.ts`, `premium.ts` saf fonksiyon, jest ile hızlıca korunur; GitHub Action'da `typecheck + lint + test`. Efor M, Etki O.
6. **İzin istemleri sırası ve metinleri** — bildirim izni (`schedule.ts`: `requestPermissionsAsync`) ve konum izni uygulama açılır açılmaz değil, değerini anlatan bir ön ekranla ("Sabah özetini kaç gibi göndereyim?") ve ilk gerçek ihtiyaçta istensin. iOS izin metinleri TR+EN, `app.json`'da sadece konum metni var; kamera/galeri metinlerini (`expo-image-picker` eklentisi) elle yaz. Reddedilince "Ayarlardan aç" düğmesi. Efor S, Etki Y.

## B. Tutarlı arayüz

7. **Sabit renk kodlarını temaya taşı** — `app`+`components` içinde 185 `#xxxxxx`. Koyu temada bozulma ve ton kayması kaynağı. `useColors()` + birkaç yeni belirteç (`glassBg`, `scrim`, `onDark`). CLAUDE.md zaten "bileşende renk yazma" diyor. Efor M, Etki Y.
8. **Tek bileşen seti: Button / Card / Sheet / Chip varyantları** — `src/components/ui.tsx` (448 satır) var ama `Glass.tsx`, `PremiumLock.tsx`, `TabBar.tsx` kendi stillerini taşıyor. Köşe yarıçapı (22), gölge, dolgu, hap yüksekliği tek yerde olsun; yeni ekran "hazır parça"dan kurulsun. Efor L, Etki Y.
9. **Boşluk ve tipografi ölçeği** — Sayfa kenar boşluğu, bölüm başlığı boyutu, `T v=` varyantları ekrandan ekrana değişiyor (`gunluk`, `bahce`, `buyume` en yoğun). `space = [4,8,12,16,24]` ve `T` varyant tablosunu zorunlu kıl; lint kuralı ile sabit px'i yakala. Efor M, Etki O.
10. **Dokunma hedefleri ≥ 44 dp** — `ui.tsx` kapatma düğmesi 30×30 (`x`), rozetler ve küçük hap'ler; 103 Pressable'a karşı 21 `hitSlop`. Küçük hedeflere `hitSlop` ya da min 44 boyutu. Efor S, Etki O.
11. **Yazı büyütme (font scale) denetimi** — `allowFontScaling/maxFontSizeMultiplier` sadece 2 yerde. Sistem yazısı büyük olan kullanıcıda alt menü, rozetler, hap'ler taşar. Üst sınır (ör. 1.3) koy ve `TabBar`, `RoomGrid`, `TaskRow`'u büyük yazıyla dene. Efor M, Etki O.

## C. Durumlar ve geri bildirim

12. **Yükleme / boş / hata durumları için ortak bileşenler** — `ActivityIndicator` yalnızca 2 dosyada; çoğu ağ işlemi (tarama, Moka sohbeti, senkron, satın alma) sessiz bekliyor. `Skeleton`, `EmptyState` (Moka pozu + tek cümle + tek eylem), `ErrorState` (yeniden dene). Boş liste metinleri örn. `GrowthLog.tsx:76` düz yazı. Efor M, Etki Y.
13. **Sistem `Alert.alert` yerine uygulama içi onay sayfası** — 7 yerde (`moka.tsx`, `TaskRow.tsx`, `PlanEditor.tsx`, `hesap.tsx`, `cloud.ts`, `consent.ts`). Tema dışı görünüyor, koyu temada kopuk; `Sheet` + Moka pozu ile "Sil / Vazgeç" onayı. `moka.tsx:143` metni sabit Türkçe (çeviri `patch.tsx` ile yakalanıyor ama `tr()` yok). Efor M, Etki O.
14. **Geri alma (undo) toast'ı** — silme, "Yaptım", atla gibi geri dönüşü zor eylemlerde `Toast.tsx` ile "Geri al" (5 sn). Yanlış dokunma kaygısını azaltır, ek olarak onay penceresi sayısını düşürür. Efor M, Etki Y.
15. **Çevrimdışı/ağ hatası dili** — `net.ts` var; tarama, sohbet, satın alma, giriş hatalarında tek tip, insan diliyle mesaj ("İnternet yok gibi, biraz sonra tekrar dene") ve Premium'da kota/limit mesajları aynı üslupta. Ham Supabase/RevenueCat hata metni kullanıcıya hiç gösterilmesin. Efor S, Etki O.

## D. His: hareket, ses, dokunuş

16. **Haptik haritası** — Şu an haptik sadece `sfx.ts` `tap` ve birkaç ses olayında. İş bitti = `notificationAsync(Success)`, seviye atlama = güçlü, silme = uyarı, sekme geçişi = hafif. Ayarlarda "Titreşim" anahtarı. `expo-haptics` korumalı zaten. Efor S, Etki O.
17. **Hareketi azalt desteği her yerde** — `motion.tsx` saygı gösteriyor ama `House3D`, `gardenFx`, `HomeMokaAnimation`, `MokaPet`, `IntroSplash` kendi döngülerini kuruyor. Hepsi `reduceMotion` + arka plana geçince durma (AppState) kontrol etsin; pil ve erişilebilirlik kazancı. Efor M, Etki O.
18. **Ekran geçişleri** — Expo Router varsayılan kaydırma geçişi; Moka sheet'leri ve `is.tsx` (iş ekranı) için tutarlı alttan açılma/`fade` ve paylaşılan "yaylanma" değerleri. Efor S, Etki D.

## E. Erişilebilirlik, çeviri, performans

19. **Ekran okuyucu (TalkBack/VoiceOver) turu** — Etiketler var ama emoji-tek düğmeler (`TabBar` +, oda kartları, çıkartma satırları) okuyucuda "yıldız emojisi" diye okunabilir; `accessibilityLabel/Role/State` (seçili, tamamlandı) tamamla; kontrast: kil `#BFA89E` üzerinde açık yazı ve pastel kartlarda gri alt metin için WCAG 4.5:1 kontrolü. Efor M, Etki O.
20. **Çeviri açıkları** — EN sözlüğü (`src/i18n/en/*.ts`, ~2.5 bin satır) çalışma zamanı yamasıyla (`patch.tsx`) çeviriyor; dinamik cümleler ("seni bekliyor", Sağlıklı, Tümü/Temiz/Kirli) ve TL fiyatlar Türkçe kalıyor (hafızadaki açık madde). Eksik anahtar tespiti için dev'de konsola "çevrilmemiş" uyarısı, `Intl` ile tarih/sayı/para biçimi, ES/FR/DE/PT/AR/KO/JA için "yakında" yerine dil seçici gizle. AR için RTL ayrıca iş. Efor L, Etki Y (yurtdışı lansman için).
21. **Büyük ekranların bölünmesi** — `House3D.tsx` 1702 satır, `buyume.tsx` 517, `bahce.tsx` 586, `TaskRow.tsx` 484. Hata ayıklama ve render maliyeti; `React.memo`/`useMemo` ile ağır alt bileşenleri ayır, `ScrollView` içindeki uzun listeleri (`gunluk`, `bugun`, oda görevleri) `FlatList`'e çevir. Efor L, Etki O.
22. **Konsol sızıntıları ve sessiz hatalar** — 24 `console.log/warn`, bazı `.catch(() => {})`. Üretimde kapat/sentry'ye yönlendir; kritik yollarda (kayıt, senkron, satın alma) sessiz yutma yerine kullanıcıya hata ve rapor. Efor S, Etki O.

## F. İlk izlenim

23. **İlk 60 saniye ölçümü ve kısaltma** — Açılış: `IntroSplash` + 13 sayfalık `tanitim.tsx` + kurulum soruları + ruh hali penceresi + paywall üst üste biniyor (açık hatalar: paywall ruh hali penceresiyle çakışıyor, ilk gün 29 iş). Hedef: ilk iş tamamlanana kadar ≤ 90 sn, tanıtımı atlanabilir/kısa, paywall'u ilk "başardım" anından sonraya al, ilk gün 5–8 iş (mevcut yapılacaklar listesi madde 3, 4, 6, 7). Efor M, Etki Y.
24. **Mağaza listesi cilası** — Tanıtım görsellerini ve metinleri uygulamanın son hâliyle yenile (`docs/magaza/`), `play-yayin.md` formlarını (veri güvenliği, içerik derecelendirme) doldur, uygulama içi "Oyla" istemi (`expo-store-review`) ilk büyük başarıdan sonra, haftada 1'den fazla sormadan. Efor S, Etki O.

## Önerilen sıra

1. 6, 12, 14, 23 (kullanıcı ilk hissi, düşük risk)
2. 1, 2, 22 (çökme ve veri güvenliği)
3. 7, 8, 10, 11 (görsel tutarlılık)
4. 16, 17, 19 (his ve erişilebilirlik)
5. 3, 4, 5, 20, 21 (yeni derleme ve büyük işler; yurtdışı lansmandan önce)

Yeni derleme gerektirenler: 1 (Sentry), 3, 4 (`expo-image` zaten varsa gerekmez), 24 (`expo-store-review`). Diğerleri JS ile çözülür.
