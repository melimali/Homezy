# Mağaza paketi / Store pack (EN + TR)

Metinler (başlık, kısa, uzun, anahtar kelime, premium, inceleme notu):
- Türkiye (Türkçe): `docs/magaza-metni.md`
- Diğer ülkeler (İngilizce): `docs/magaza-metni-en.md`

Mağaza dili eşlemesi: Play/App Store "Türkçe (Türkiye)" = TR metinleri; diğer tüm yerel ayarlar = EN (varsayılan dil EN yapılır, TR ayrı yerel ayar olarak eklenir).

## Görseller
`docs/magaza/en/` ve `docs/magaza/tr/`, 8'er adet, 1290×2796 (App Store 6.7" ve Play telefon için uygun).
Sıra: 1 Ev · 2 Bugün · 3 Odalar · 4 Gardırop/çamaşır · 5 Buzdolabı taraması · 6 Seri ve ev inşaatı · 7 Moka · 8 Ev bakımı.

Yeniden üretim: `python3 scripts/make-store-shots.py [yazı tipi klasörü]` (Baloo 2 + Nunito, varsayılan `node_modules/@expo-google-fonts`).

## Not
Bunlar taslak: Moka sahnesi + yerelleştirilmiş arayüz kartı. Gerçek uygulama ekran görüntüleri (EN dilinde emülatörden) hazır olunca ekran kartı yerine konabilir; başlıklar aynı kalır. App Store için iPad (12.9") boyutu gerekiyorsa ayrıca üretilmeli; Play için 1024×500 öne çıkan görsel de gerekir.
