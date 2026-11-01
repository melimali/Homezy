# Tasarım v2: tatlı, profesyonel Cozy

Temel: `docs/tasarim-finch.md` pastel tokenları. Yalnızca JS, yeni yerel bağımlılık yok.

- **ScreenBackground** (`src/components/ScreenBackground.tsx`): SVG degrade + süzülen parçacıklar, sekme başına ton (Ev şeftali, Odalar adaçayı, Bugün gül, Hesap lavanta). `Screen tone tab` ile gelir. Hareketi azalt açıkken parçacık yok.
- **Yüzen alt menü** (`TabBar.tsx`): ekranın üstünde yuvarlak şerit, sekme başına renkli baloncuk, seçilince yaylanır. Sekme ekranları `tab` ile alt boşluk alır.
- **Kart dili**: büyük yuvarlak köşe, tonlu yumuşak gölge, kademeli giriş (`Appear index`).
- **Ev**: odalar polaroid kartı (hafif eğik, bant, altında el yazısı ad).
- **Bugün**: yapışkan not görevler, tamamlayınca damga + konfeti.
- **Hesap**: gruplanmış yumuşak kartlar, renkli ikon baloncukları.
- **Boş durumlar**: Moka (`EmptyMsg`).
- Performans: yerel sürücü, ağır blur yok, parçacık sayısı 8.
