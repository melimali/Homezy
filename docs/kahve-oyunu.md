# Kahve Dükkânı Oyunu: Tasarım Taslağı

Durum: TASLAK, Melih onaylamadan kod yazılmaz. Ayrı ekran (`src/app/kahve-oyunu.tsx`), ana menüden bağlantı yok. Kod `src/game/kahve/` altında izole.

## 1. Temel döngü
Müşteri gelir, sipariş balonu çıkar, süre akar. Oyuncu tarifin adımlarını SIRAYLA dokunarak yapar, "Servis" der. Doğru ve hızlıysa puan, geç kalırsa müşteri gider.

## 2. Malzeme / istasyonlar (alt bar)
Kahve makinesi (espresso), süt kaynatıcı, buz, bardak, şurup şişeleri, ekmek/tost makinesi, tezgâh.

## 3. Tarifler (adım sırası zorunlu)
Yanlış adım: bardak sallanır, adım sayılmaz, 1 hata sayacı. Sırayı bozan adım yeni baştan değil, sadece reddedilir.

| Ürün | Adımlar | Hedef süre |
|---|---|---|
| Espresso | 1 Bardak, 2 Espresso çek | 8 sn |
| Americano | 1 Bardak, 2 Espresso, 3 Sıcak su | 12 sn |
| Latte | 1 Bardak, 2 Espresso, 3 Sütü kaynat (basılı tut ~2 sn), 4 Süt dök | 18 sn |
| Iced Latte | 1 Bardak, 2 Espresso, 3 Buz, 4 Soğuk süt | 16 sn |
| Şurup (opsiyonel) | Espresso'dan SONRA, süt/buzdan ÖNCE: 1 pompa şurup | +3 sn |
| Sandviç | 1 Ekmek, 2 Dolgu (peynir/hindi), 3 Tost makinesi (bekle ~3 sn), 4 Tabağa al | 20 sn |
| Tost/kurabiye (sonra) | Tek adımlı yan ürün | 6 sn |

Şuruplar: vanilya, karamel, fındık. Sipariş "Vanilyalı Latte" gibi gelir.

## 4. Zamanlayıcı ve hız kuralları
- Her müşterinin sabır çubuğu: hedef süre x 2.2 (Seviye 1) azalarak x 1.5'e iner.
- Yeşil > sarı > kırmızı. Bitince müşteri küser: puan yok, 1 can gider.
- 3 can; hepsi bitince gün biter.
- Hızlı servis bonusu: sabır çubuğunun %60'ından fazlası kalmışsa x2.
- Aynı anda en fazla 1 (S1) ... 4 (S10) sipariş sırada.

## 5. Seviyeler (müşteri hızlanır)
| Seviye | Menü | Müşteri aralığı | Eşzamanlı |
|---|---|---|---|
| 1-2 | Espresso, Americano | 14 sn | 1-2 |
| 3-4 | + Latte | 11 sn | 2 |
| 5-6 | + Iced Latte | 9 sn | 3 |
| 7-8 | + Şuruplar | 7.5 sn | 3 |
| 9-10 | + Sandviç, tost | 6 sn | 4 |
Her seviye 60 sn'lik bir "gün"; sonunda kısa özet.

## 6. Puan ve yıldız
- Doğru sipariş: taban puan (kolay 10, Latte/Iced 20, sandviç 30) + hız bonusu + seri (art arda hatasız servis x1.1, en çok x2).
- Hata (yanlış adım): -2 puan, seri sıfırlanır.
- Gün sonu yıldızı: 1 yıldız = hedef puana ulaş, 2 = kaybedilen müşteri <= 2, 3 = hiç müşteri kaybetme + hedefin %150'si.
- Yıldızlar ve en iyi skor telefonda saklanır. Ana uygulama puanıyla (ev puanı) BAĞLANTI yok, onay sonrası konuşulur.

## 7. Ekran akışı
Giriş (Moka + Oyna + En iyi skor) > Seviye seç/devam > Oyun ekranı (üstte puan/can/süre, ortada müşteri sırası, altta istasyonlar, tezgâhta yapılan bardak) > Gün sonu (yıldız, skor, Tekrar / Sonraki / Çık).

## 8. Moka'nın rolü
Barista Moka: ekranın köşesinde. Doğru servis: sevinir; geç kalınca üzülür; seri: coşar. Seviye 1'de kısa öğretici balonları ("önce espresso!"). Mevcut Moka pozları kullanılır, yeni görsel gerekmez.

## 9. Teknik not (kodlamaya geçilirse)
Oyun mantığı saf TS (`logic.ts`: tarif doğrulama, seviye tablosu, puan) + Jest testi (repoda jest var). Ekran ayrı dosya. Ses/titreşim mevcut `sfx`. Yeni paket yok.

## 10. Melih'e açık sorular
1. Dokunma mı (adım butonları) yoksa sürükle-bırak mı?
2. Süt kaynatma: basılı tut mu, sadece bekle mi?
3. Oyun ödülü: ana uygulamada puan/Moka kıyafeti vermeli mi, yoksa tamamen ayrı mı?
4. Sandviç çeşitleri ve ek yemekler (tost, kurabiye) ilk sürümde olsun mu?
5. Can sistemi mi, sadece süre/gün hedefi mi?
6. Premium/reklam: oyun ücretsiz mi kalsın?
7. Giriş noktası (Ev, Moka sekmesi, Ben) ne zaman, onaydan sonra neresi?

## 11. Görsel yön: 2D, sabit tezgâh (öneri)
- Tek sabit 2D arka plan: kafe tezgâhı yandan/önden. Kamera hareket etmez.
- Level atladıkça tezgâha yeni 2D katmanlar eklenir (PNG, üst üste): Sv 3 türk ocağı, Sv 4 süt kaynatıcı, Sv 6 blender, Sv 7 şurup rafı, Sv 9 vitrin, Sv 11 shaker/bar rafı. Katman = yeni ürün/istasyon açılışı, oyuncu görerek ilerlemeyi hisseder.
- Neden 2D: üretim ucuz (sticker tarzı Moka ile uyumlu, Gemini/ChatGPT ile üretilir), 3D'ye göre hızlı, düşük telefonlarda sorunsuz, dokunma hedefleri net. Yeni native paket gerekmez.
- Teknik: React Native View + Image katmanları, Reanimated yok (mevcut motion.tsx). Katman listesi tek tabloda (`LAYERS: {level, asset, x, y}`).
- Görsel ihtiyaç listesi (onaydan sonra çıkarılır): 1 arka plan, ~8 ekipman katmanı, ~25 bardak/yiyecek durumu, müşteri 6-8 çeşit.

## 12. Süt kaynatma mekaniği (Melih kararı)
- Süt pitcher'ı sürüklenip kaynatıcının (buhar kolu) üstüne bırakılır, kendi kendine ısınır. Basılı tutmak yok.
- Pitcher üstünde sıcaklık göstergesi (soğuk mavi > ideal yeşil bölge > aşırı kırmızı). İdeal bölgede oyuncu pitcher'ı kaynatıcıdan alır (geri sürükler/dokunur).
- Erken alınca: ılık süt (puan düşer). Geç alınca: yanık süt (süt yenilenir, +süre kaybı).
- Süreler ideal bölgeye göre; bölge genişliği (tolerans) seviyeyle daralır:
| Ürün | Kaynama süresi (ideal) | Not |
|---|---|---|
| Cappuccino | kısa, ~3 sn | köpüklü |
| Latte | orta, ~5 sn | |
| Flat White | uzun, ~7 sn | |
| Sıcak çikolata / Matcha / Chai latte | orta, ~5 sn | |
- Aynı anda ikinci pitcher (Sv 6+): iki süt aynı anda kaynar, oyuncu zamanı paylaşır.
- Soğuk süt (Iced Latte vb.) kaynatılmaz, sadece dökülür.
- Açık: bölge toleransı Sv1'de ±1 sn, Sv10'da ±0.4 sn önerisi.
