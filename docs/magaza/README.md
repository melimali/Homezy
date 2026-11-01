# Mağaza paketi / Store pack (EN + TR)

Metinler (başlık, kısa, uzun, anahtar kelime, premium, inceleme notu):
- Türkiye (Türkçe): `docs/magaza-metni.md`
- Diğer ülkeler (İngilizce): `docs/magaza-metni-en.md`

Mağaza dili eşlemesi: Play/App Store "Türkçe (Türkiye)" = TR metinleri; diğer tüm yerel ayarlar = EN (varsayılan dil EN yapılır, TR ayrı yerel ayar olarak eklenir).

## Görseller
`docs/magaza/<tr|en>/`: `play/` (1080×1920, 8 adet), `ios-6.7/` (1290×2796), `ios-6.5/` (1284×2778), `ios-5.5/` (1242×2208), `feature-graphic-1024x500.png`, `play-icon-512.png`.
Sıra: 1 Moka seni tanıyor · 2 Kişisel plan · 3 Bugün · 4 Yemek önerisi · 5 3B ev · 6 Bahçe · 7 Moka sohbeti · 8 Gardırop.

Ekranlar gerçek uygulamadan yakalanır (web çıktısı). Yeniden üretim: `scripts/store/README.md`. Sadece yeniden düzen (yeni metin/renk) için: `python3 scripts/store/make-store-art.py` (ham ekranlar `/tmp/raw` altında olmalı).
iPad desteklenmiyor (`supportsTablet: false`), iPad ekran görüntüsü gerekmez.
