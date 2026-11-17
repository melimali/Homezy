# Moka odası v6 katmanları

Kaynak: `moka-oda/v6/teslim` (Melih'in PC'sinde; repoda yok). Betikler önce `/mnt/user-data/uploads/moka-oda/v6/` altına kopyalanmış kaynağı okur, ara dosyaları `/tmp/claude-0/v6/` altına yazar. Yeniden üretmek için yolları kendi makinene göre değiştir.

Sıra: `align.py` (akşam/gece resmini sabaha hizalayan afin dönüşüm, sadece noktaları taşımak için) → `gen.py` (her saat için maskeler; `masks.py` yardımcıları) → `export.py` (taban: hareketli parçaların yeri doldurulmuş; parçalar ve dönme noktaları) → `pane.py` (cam maskesi ve cam gözleri) → `oncam.py` (pencerenin önündekiler) → `final.py` (yaprak, noktalar, parçacıklar, `oda.json`) → `check.py` (parçalar en uç açıdayken kontrol resmi).

Teslimdeki hazır nesne kesimleri kullanılmadı: duvar parçaları ve eksikler içeriyordu. Hava arka planları (`temiz_oda_*`) taban resimleriyle hizalı değil; hava efektleri bunun yerine camın üstüne çiziliyor.
