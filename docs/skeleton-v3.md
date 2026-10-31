# İskelet v3: sade, cozy, Moka önde

Temel: `docs/tasarim-finch.md` (pastel tokenlar), `docs/tasarim-v2.md` (yüzen menü, polaroid, Squish),
`docs/moka-animasyon.md`. Moka gardırobu yok (Melih kaldırdı). Yalnızca JS, yeni yerel paket yok,
yerel sürücü, "hareketi azalt" açıkken döngü yok.

## İlke

- Her ekranda tek bir ana iş. Ekranın üstünde Moka, altında en fazla 3 bölüm.
- Ayrıntı kaybolmaz, bir dokunuş içeride durur: yüzeyde kart, içeride grafik ve liste.
- Her şey yuvarlak (kart 28, kutucuk 24, buton hap). Sert köşe, sert gölge, saf kırmızı yok.
- Aynı şey iki yerde olmaz (ör. seri hem Ev'de hem Hesap'ta değil, sadece Gelişim'de).

## Gezinme haritası

```
Açılış: Meikai → Moka evden çıkar (yeni) → Tanıtım (5 sayfa, yana kaydırmalı) → Giriş → Ev planı → 7 soru → Ücretsiz/Premium → Ev

Alt menü:  Ev · Bugün · (Moka "+") · Gelişim · Ben
```

| Sekme | Ne var | Nereden geldi |
|---|---|---|
| **Ev** | Moka sahnesi + selam, bugünün ilerlemesi ve sıradaki 3 iş, **Odalarım** (polaroid ızgara), 3D ev kartı, 4'lü kısayol (Bahçe, Plak, Günlük, Spor) | Odalar sekmesi buraya taşındı. Bahçe/plak şeritleri kısayola indi. Seri/puan kutucukları Gelişim'e gitti. |
| **Bugün** | Değişmedi (yapışkan notlar, ruh haline göre plan). "Sana bir şey" kartı buraya. | Ev'den geldi |
| **Moka "+"** | Ortadaki yuvarlak düğme: İş ekle, Temizlik başlat | Aynı menü |
| **Gelişim** (yeni) | Grafikler: haftalık iş çubukları, seri halkası + 28 günlük takvim, ruh hali çizgisi, oda tamamlanma çubukları, ev puanı. Altında Haftam ve Evimin hikâyesi | Ev'deki "Günün Özeti", Hesap'taki istatistikler |
| **Ben** | Profil + seviye, rozetler, **kategoriler**: Kendim (Günlük, Spor), Evim (Plan, Bakım, Evimin soruları, Evlerim, Aile), Keyif (Bahçe, Mağaza, Plak çalar, Hikâye), Ayarlar (Bildirimler, Premium, dil, hesap) | Hesap sekmesi |

`odalar` rotası gizli sekme olarak kalır (`href: null`), eski bağlantılar çalışır. `oda/[id]` aynı.

## Ekranlar

1. **Açılış animasyonu** (`IntroSplash`): Meikai bölümü aynı. Sonra pastel gökyüzü, tepe üstünde
   küçük ev zıplayarak belirir, kapı açılır, Moka zıplayarak çıkar, kahve buharı ve kalpler,
   "Homezy" harfleri tek tek zıplar. Dokununca geçer. ~5 sn toplam.
2. **Tanıtım** (`tanitim`): dikey kaydırma yerine yana kaydırılan 5 sayfa. Her sayfa gerçek Moka
   sahnesi (resim) + kısa başlık + tek cümle. Altta hap şeklinde sayfa göstergesi, büyük "Devam".
   Sayfalar: Merhaba Moka · Evini çiz · Küçük işler, büyüyen ev · Fotoğrafla tara · Gelişimini gör.
3. **Ev planı** (`PlanEditor`): üç adım tek ekranda
   - Hazır şablon: Stüdyo, 1+1, 2+1, 3+1 (tek dokunuşla çizilir), ya da boş.
   - Oda paleti: büyük emojili yuvarlak kutucuklar (yatay). Araç şeridi: Çiz, Silgi, Geri al.
   - Izgara boyutu: genişlik/uzunluk ± (5-8 × 6-10). Toplam m² ve oda sayısı canlı.
   - Moka yardımcı balonu: adım adım ne yapacağını söyler, oda sayısı arttıkça sevinir.
   - Oda listesi: renkli haplar; dokun → çiz, uzun bas → yeniden adlandır/sil.
4. **Ev**: yukarıdaki tablo. Moka sahnesi en üstte, kartlar en fazla 4.
5. **Gelişim**: grafik kartları (SVG, `src/components/charts.tsx`), her kartın üstünde tek satır
   Moka yorumu ("Bu hafta 14 iyilik yaptın").
6. **Ben**: kategorili, ikon baloncuklu satırlar; ayarlar en altta.

## Grafikler (`src/components/charts.tsx`)

- `WeekBars`: son 7 gün, yuvarlak uçlu çubuklar, bugünkü çubuk vurgulu, değer etiketi.
- `Ring`: yüzde halkası (ev puanı, günün ilerlemesi).
- `StreakDots`: son 28 gün, yapıldı / donduruldu / kaçtı noktaları.
- `MoodLine`: son 14 günün ruh hali (check-in), yumuşak eğri + emoji noktaları.
- `RoomBars`: odaların temizlik yüzdesi, oda renginde yatay çubuklar.

Hepsi `react-native-svg` ve `useColors()`; animasyon yerel sürücüyle (ölçek/opaklık).

## Sıra

1. Bu belge. 2. Grafikler + Gelişim sekmesi. 3. Alt menü (5 öğe). 4. Ev sadeleşme + Odalarım.
5. Ben kategorileri. 6. Açılış animasyonu. 7. Tanıtım. 8. Ev planı.
Her adım ayrı commit, `npm run typecheck` + `npm run lint`, `integration/tum-pr`'a push.
