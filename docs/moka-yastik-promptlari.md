# Yastıkta oturan Moka: ChatGPT promptları

Amaç: Moka'nın odasındaki yastığın üstünde otururken görüntüleri (5 poz). Şu an uygulamada geçici olarak mevcut mimikli Moka duruyor; bu görseller gelince yerine geçer.

## Hazırlık (ilk mesaj, 3 görsel ekle)
1. `oda_gunduz_chatgpt.png` (oda, yastık referansı) 
2. `moka_happy.png` (Moka'nın çizimi)
3. Bir de Moka'nın başka bir pozu (örn. `moka_sipping`) istersen, tutarlılık için.

İlk mesaj:
```
Ekteki Moka maskotunun stilini ve yüzünü birebir koru (tombul kakapo, aynı renkler, aynı kontur kalınlığı). Ekteki oda görselindeki yuvarlak krem yastığın üstünde otururken çizeceksin. Bundan sonra her seferinde şu kurallar geçerli: tam boy, oturur pozisyon, ayaklar öne doğru ve yarı gömülü gibi, alt kenar yumuşak bir oturma gölgesiyle bitsin; yastık ÇİZME (sadece Moka ve altında çok hafif sıcak gölge); arka plan TAMAMEN SAYDAM PNG; tuval 1024x1024, Moka tuvalin ortasında, alt kenara 80 piksel kala oturuyor, boyutu her pozda aynı (kafası yaklaşık 380 piksel genişlikte); ışık: sağdan gelen sıcak lamba ışığı, sağ kenarında hafif turuncu parlama, solunda yumuşak gölge; oda stiliyle uyumlu; yazı, çerçeve, ek nesne yok. Anladıysan "hazır" yaz.
```

## 5 poz (her biri ayrı mesaj)
1. **Sakin bekleyen:** `Poz 1: Moka karşıya bakıyor, gözler açık, hafif gülümsüyor, kanatları dizlerinin üstünde, sakin.`
2. **Kahve içen:** `Poz 2: Moka iki kanadıyla krem bir kahve fincanı tutuyor, gözleri yarı kapalı, huzurlu, fincandan hafif buhar.`
3. **El sallayan:** `Poz 3: Moka bir kanadını selam verir gibi kaldırmış, ağzı hafif açık, neşeli, gözler parlak.`
4. **Düşünen:** `Poz 4: Moka bir kanadını çenesine götürmüş, başı hafif yana eğik, gözler yukarı bakıyor, düşünceli.`
5. **Uyuklayan:** `Poz 5: Moka gözleri kapalı, başı hafif öne düşmüş, uykulu ve huzurlu, kanatları karnında.`

İstersen: 6. **Sevinç** (kanatlar havada, gözler kapalı gülüyor) ve 7. **Üzgün** (kaşlar düşük, kanatlar önde).

## Düzeltme listesi
- **Her pozda boyut farklı:** "Moka'nın boyutunu ve tuvaldeki yerini Poz 1 ile aynı yap."
- **Yastık çizildi:** "Yastığı sil, sadece Moka kalsın, saydam arka plan."
- **Arka plan saydam değil:** "Arka planı tamamen saydam PNG olarak ver."
- **Yüz farklı:** "Yüzü ekteki moka_happy ile birebir aynı yap."
- **Işık yanlış:** "Işık sağdan sıcak lamba ışığı olsun, solda yumuşak gölge."

## Teslim
- Adlar: `moka_oda_sakin.png`, `moka_oda_kahve.png`, `moka_oda_selam.png`, `moka_oda_dusunen.png`, `moka_oda_uyuklayan.png` (opsiyonel `moka_oda_sevinc.png`, `moka_oda_uzgun.png`).
- Proje dosyalarına `moka-oda/` klasörüne yükle ve haber ver. Ben WebP'ye çevirir, yastığa hizalar ve yüz animasyonunu (göz kırpma, ağız) bu görsellere göre kurarım.
