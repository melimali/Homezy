# Moka canlandırma planı

Moka şu an 54 sticker (PNG). Parçalara ayrılmış vektör henüz yok; ilk adımlar sticker üstünde
`Animated` (native driver) ile yapılır, parçalı (göz/kanat/gövde) vektör sonraki adım.

## Adım 1 (yapıldı): `src/components/MokaLive.tsx`
- Boşta: nefes (gövde hafif genişleyip daralır), yan salınım, ara sıra esneme/uyuklama pozu.
- Dokunma: gıdıklanma sallanması. Uzun basma: sarılma (kalp yağmuru).
- Gece (22:00-06:00): uyku pozu (`blanket`), sabah: kahve (`sipping`).
- "Hareketi azalt" açıksa döngüler kapalı.
- `MokaMascot` bunu kullanır; yeni paket yok.

## Adım 2: tepkiler
İş bitince zıplama/dans, seri kırılınca sarılma, seviye atlayınca konfeti (`reactMoka(kind)` olayı).

## Adım 3: duruma göre
Ruh haline göre yüz (poz), yağmurda şemsiye, adla hitap eden cümleler.

## Adım 4: parçalı Moka
Göz, gövde, kanat katmanları vektör (react-native-svg zaten varsa) ya da ayrı PNG; göz kırpma,
kuyruk sallama. Gardırop (emoji) katmanları sahne görsellerine de oturtulur.

## Adım 5: paylaşım kartı
"Moka ile günüm": günün özeti + Moka, `react-native` Share ile metin (görsel yakalama native
paket gerektirir; önce metin).
