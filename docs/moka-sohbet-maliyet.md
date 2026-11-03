# Moka sohbet: sınır ve kâr hesabı

Varsayımlar (fiyatlar `docs/premium.md` ile aynı kaynak; Anthropic fiyat listesiyle bir kez doğrula): 1 $ ≈ 42 TL, mağaza komisyonu %15, Haiku 5.5 ile tarama ≈ 0,0006 $, Sohbet mesajı en kötü durumda ≈ 5.000 giriş (sistem istemi + 80 iş listesi + 8 mesaj geçmişi) + 500 çıkış token ≈ **0,0006 $** (`docs/pazar-raporu-2026-10-31.md`: 2.000 girişle ≈ 0,0003 $). Güvenli tarafta kalmak için hesapta 0,001 $ kullanıldı.

| Plan | Brüt | Mağaza sonrası (net) | AI gider payı (%30) |
|---|---|---|---|
| Aylık 6,99 $ | 6,99 $ | ≈ 5,94 $ (TR: 149,99 TL ≈ 4,95 $) | ≈ 1,49 $ (TR 1,49 $) |
| Yıllık 59,99 $ / 12 | 5,00 $ | ≈ 4,25 $ | ≈ 1,27 $ |
| Yıllık TR 1.564,99 TL / 12 | ≈ 3,10 $ | ≈ 2,64 $ | ≈ 0,79 $ |

Kullanıcı başına aylık en kötü durum (Haiku):

| Kalem | Sınır | Maliyet |
|---|---|---|
| Sohbet (eski: 150/gün = 4.500/ay) | 4.500 × 0,001 | **4,50 $ (zarar)** |
| Sohbet (yeni: 40/gün, 600/ay) | 600 × 0,001 | **0,60 $** |
| Tarama (günde 50 = 1.500/ay) | 1.500 × 0,0006 | 0,90 $ |
| **Toplam en kötü durum** | | **1,50 $** |

1,50 $ = net 4,95 $'ın ≈ %30'u → brüt kâr ≈ %70. Gerçekçi kullanımda (ayda ~150 mesaj, 25 tarama) AI gideri ≈ 0,17 $ (%96+ marj).

Kararlar: günlük 40, aylık 600, dakikada 6, mesaj 400 karakter, geçmiş 8, cevap ≤ 500 token. Sınırları değiştirirsen `premium.ts`, SQL ve bu tablo birlikte güncellenmeli. Sonnet'e geçilirse (≈ 20× pahalı) sohbet aylık ≈ 100 mesaja, taramalar düşürülmeli. Yıllık TR planında en kötü durum payı biraz aşar (1,50 > 0,79 $) ama hem sohbet hem tarama sınırını aynı ay dolduran kullanıcı çok nadirdir; Anthropic Console aylık harcama tavanı son güvence.
