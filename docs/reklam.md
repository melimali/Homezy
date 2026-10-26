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
2. **İki uygulama ekle:** AdMob > Uygulamalar > Uygulama ekle > Android (`com.meikai.homezy`) ve iOS. Mağazada henüz yoksa "listelenmemiş" seçilir, yayından sonra bağlanır.
3. **Her uygulamada bir "Banner" reklam birimi** oluştur.
4. **Kimlikleri gir.** Dört değer var: iki uygulama kimliği (`ca-app-pub-…~…`, `~` işaretli) ve iki banner birimi (`ca-app-pub-…/…`, `/` işaretli).
   - **Bilgisayarda (geliştirme / yerel derleme):** proje klasöründe `.env.local` dosyasına yaz. Bu dosya git'e girmez. `.env`'e yazma, o dosya git'te takip ediliyor.
     ```
     EXPO_PUBLIC_ADMOB_APP_ID_ANDROID=ca-app-pub-XXXX~AAAA
     EXPO_PUBLIC_ADMOB_APP_ID_IOS=ca-app-pub-XXXX~BBBB
     EXPO_PUBLIC_ADMOB_BANNER_ANDROID=ca-app-pub-XXXX/1111
     EXPO_PUBLIC_ADMOB_BANNER_IOS=ca-app-pub-XXXX/2222
     ```
   - **EAS bulut derlemesi:** EAS `.env.local`'i görmez. Aynı dört değeri bir kez EAS'a ekle (görünürlük "plain text" yeterli, gizli değiller):
     ```
     npx.cmd eas env:create --environment production --name EXPO_PUBLIC_ADMOB_APP_ID_ANDROID --value ca-app-pub-XXXX~AAAA --visibility plaintext
     ```
     (dört değişken için tekrarla; `preview` ortamı için de istersen.)
   - `app.config.ts` uygulama kimliklerini `app.json`'daki eklentiye ekler; `src/ads/ads.ts` banner kimliğini okur. Girilmemişse Google'ın test kimlikleri kalır; yayında banner boşsa reklam çıkmaz.
   - Uygulama kimliği yerel koda girer: değiştirince yeniden derleme gerekir (Metro yeniden başlatmak yetmez).
5. **AdMob > Gizlilik ve mesajlaşma > GDPR** mesajını oluştur ve yayınla (onay penceresi bu ayardan gelir). İsteğe bağlı olarak ABD eyalet mesajını da aç.
6. **app-ads.txt:** AdMob'un verdiği satırı Meikai Digital sitesinin köküne (`app-ads.txt` adıyla) koy ve mağaza kaydında geliştirici web sitesi olarak bu siteyi göster.
7. Kendi telefonunda gerçek reklama tıklama (hesap kapanabilir). Test için telefonunu AdMob > Ayarlar > Test cihazları'na ekle; emülatör zaten test cihazı sayılır.

## Mağaza formları

- **Google Play > Uygulama içeriği:** "Reklam içeriyor mu?" → Evet. Veri güvenliği formunda "Cihaz veya diğer kimlikler (reklam kimliği)" → toplanıyor, reklam amaçlı, Google AdMob ile paylaşılıyor. Hedef kitle 13 yaş altını içermemeli (çocuklara yönelik uygulamada farklı kurallar var).
- **App Store > App Privacy:** "Identifiers / Device ID" ve "Usage Data / Advertising Data" → Third-Party Advertising, kullanıcıya bağlı değil, takip için kullanılmıyor.
- **Gizlilik politikası:** ücretsiz planda Google AdMob reklamları gösterildiği, reklamların kişiselleştirilmediği ve AdMob'un cihaz bilgisi ile reklam kimliği topladığı yazmalı.

## Gelir beklentisi

Afiş reklamı az kazandırır: Türkiye'de günlük 1.000 aktif ücretsiz kullanıcı ve kişi başı günde 2 gösterimle ayda kabaca 10–30 $ (bin gösterim başına 0,2–0,5 $). Asıl gelir Premium; reklamın ana işi ücretsiz planı biraz daha az cazip yapmak ve sunucu masrafının bir kısmını karşılamak.
