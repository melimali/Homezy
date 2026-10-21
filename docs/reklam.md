# Reklamlar (sadece ücretsiz plan)

Ücretsiz planda az ve sakin reklam var; Premium'da hiç yok.

- **Nerede:** sadece **Ev** ve **Bugün** sayfalarının en altında, kaydırınca görünen küçük bir afiş (banner). Üstünde "Reklam · Premium'da reklam yok" yazar.
- **Nerede yok:** iş tamamlarken, ödeme ekranında, kurulumda, günlükte, sporda, mağazada. Tam ekran (araya giren) reklam ve ödüllü reklam yok.
- **Kişiselleştirme yok:** reklamlar kişiye göre seçilmiyor (`requestNonPersonalizedAdsOnly`), bu yüzden iOS'ta "takip izni" (ATT) penceresi çıkmıyor. Yetişkin içerik kapalı (`maxAdContentRating: PG`).
- **Avrupa onayı:** Avrupa / İngiltere'deki kullanıcılara Google'ın onay penceresi (UMP) reklamdan önce bir kez çıkar. Onay vermezse reklam istenmez.
- **Expo Go'da reklam yok.** Reklam modülü yerel kod içerir; reklamı görmek için EAS ile development build ya da APK gerekir. Expo Go'da uygulama reklamsız açılır.

Kod: `src/ads/ads.ts` (başlatma, onay, reklam kimliği) ve `src/ads/AdBanner.tsx` (afiş).

## Kurulum (Melih'in yapacakları)

1. **AdMob hesabı aç:** https://admob.google.com (Google hesabıyla). Ödeme bilgisi ve vergi formu AdMob'da istenir.
2. **İki uygulama ekle:** AdMob > Uygulamalar > Uygulama ekle > Android (`com.meikaidigital.layfapp`) ve iOS. Mağazada henüz yoksa "listelenmemiş" seçilir, yayından sonra bağlanır.
3. **Uygulama kimliklerini** (`ca-app-pub-…~…` biçiminde, `~` işaretli olan) `app.json` içindeki `react-native-google-mobile-ads` eklentisine yaz:
   ```json
   ["react-native-google-mobile-ads", { "androidAppId": "ca-app-pub-XXXX~AAAA", "iosAppId": "ca-app-pub-XXXX~BBBB", "delayAppMeasurementInit": true }]
   ```
   Şu an orada Google'ın **test** kimlikleri var; gerçekleri yazmadan mağazaya yükleme.
4. **Her uygulamada bir "Banner" reklam birimi** oluştur. Çıkan reklam birimi kimliklerini (`ca-app-pub-…/…`, `/` işaretli olan) `.env` dosyasına ekle:
   ```
   EXPO_PUBLIC_ADMOB_BANNER_ANDROID=ca-app-pub-XXXX/1111
   EXPO_PUBLIC_ADMOB_BANNER_IOS=ca-app-pub-XXXX/2222
   ```
   Bu kimlikler gizli değil, uygulamaya gömülür (EAS build `.env.local`'i görmediği için `.env`'e yazılır).
   Boş bırakılırsa geliştirme sürümünde Google'ın test reklamı, yayın sürümünde hiç reklam çıkmaz.
5. **AdMob > Gizlilik ve mesajlaşma > GDPR** mesajını oluştur ve yayınla (onay penceresi bu ayardan gelir). İsteğe bağlı olarak ABD eyalet mesajını da aç.
6. **app-ads.txt:** AdMob'un verdiği satırı Meikai Digital sitesinin köküne (`app-ads.txt` adıyla) koy ve mağaza kaydında geliştirici web sitesi olarak bu siteyi göster.
7. Kendi telefonunda gerçek reklama tıklama (hesap kapanabilir). Test için telefonunu AdMob > Ayarlar > Test cihazları'na ekle; emülatör zaten test cihazı sayılır.

## Mağaza formları

- **Google Play > Uygulama içeriği:** "Reklam içeriyor mu?" → Evet. Veri güvenliği formunda "Cihaz veya diğer kimlikler (reklam kimliği)" → toplanıyor, reklam amaçlı, Google AdMob ile paylaşılıyor. Hedef kitle 13 yaş altını içermemeli (çocuklara yönelik uygulamada farklı kurallar var).
- **App Store > App Privacy:** "Identifiers / Device ID" ve "Usage Data / Advertising Data" → Third-Party Advertising, kullanıcıya bağlı değil, takip için kullanılmıyor.
- **Gizlilik politikası:** ücretsiz planda Google AdMob reklamları gösterildiği, reklamların kişiselleştirilmediği ve AdMob'un cihaz bilgisi ile reklam kimliği topladığı yazmalı.

## Gelir beklentisi

Afiş reklamı az kazandırır: Türkiye'de günlük 1.000 aktif ücretsiz kullanıcı ve kişi başı günde 2 gösterimle ayda kabaca 10–30 $ (bin gösterim başına 0,2–0,5 $). Asıl gelir Premium; reklamın ana işi ücretsiz planı biraz daha az cazip yapmak ve sunucu masrafının bir kısmını karşılamak.
