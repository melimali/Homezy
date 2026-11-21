# İyileştirme planı (2026-11-21)

Kaynak: `integration/tum-pr` kodu, proje notları, `docs/oran-artirma-plani-2026-10-31.md`, `docs/premium-retention-plan.md`. Kod değişikliği yok. Etki/efor **[TAHMİN]**. Efor: S ≤1 gün, M 2–4 gün, L hafta+.

## Önce durum (koda bakınca)
Zaten var: Sentry sarmalayıcısı (`src/lib/crash.ts`), jest testleri (`src/domain/__tests__`), CI (`.github/workflows/ci.yml`), paylaşım (`share.ts`), yorum isteme (`review.ts`), yerel olay sayacı (`events.ts`, sadece telefonda), 9 dil. Eski planın bazı maddeleri bitmiş. Asıl boşluklar: **bulutta ölçüm yok**, **dev dosyalar** (`House3D.tsx` 2410 satır, `moka.tsx` 1426), **tek-oda sadeliği**, **gerçek cihaz testi**.

## A. Yayın ve risk (önce bunlar)
| Madde | Etki | Efor | Bağımlılık | Melih'ten ne lazım |
|---|---|---|---|---|
| Play üretime çıkış (kapalı test bitti ~19 Kas) + Play'de Trader beyanı | Y | S | Mağaza formları hazır | Play Console'da "Üretime başvur", Trader beyanı (son 2027-02-01) |
| RevenueCat Android anahtarı `.env.local`'de geçersiz; iOS ürünleri RC'ye bağlanmadı | Y (gelir) | S | — | Doğru `goog_` anahtarı, iOS ürünlerini premium + offering'e bağla |
| Edge function yeniden yayın (`scan`, `moka-chat` 9 dil) + migration kontrolü | Y | S | Melih onayı | "Deploy" demesi |
| Native değişiklikler (expo-location, expo-sensors, iOS dil plist, AR RTL) tek derlemede toplanır; **son ücretsiz Android EAS kredisi** (yenilenme 2026-12-01) | Y | S | Önce emülatörde hepsini doğrula | Derleme zamanı kararı |
| Bekleyen emülatör dalı (a051d43+40cd5e2) ve Moka odası dalı `integration/tum-pr`'a birleşsin | O | S | Emülatör testi | "push" demesi, PC açık olsun |

## B. Her gün dönme (çekirdek değer)
| Madde | Etki | Efor | Bağımlılık | Melih |
|---|---|---|---|---|
| **Tek oda / sade mod** (not alındı, başlanmadı): gençler ve yurt için "sadece benim odam". Geri bildirim: "çok karmaşık" | Y | M | Onboarding değişir | Başlatma onayı |
| **İlk 60 sn'de ilk iş**: 13 sayfalık tanıtımı kısalt, 7 kurulum sorusunu ertelenebilir yap, ilk iş + Moka kutlaması | Y | M | Analitik varsa ölçülür | Kısaltma kararı |
| **İlk 7 gün bildirim akışı** (gün 1 akşam, 2 Moka selamı, 3 seri, 6 uyarı), günde ≤2; izin istemi ilk değerden sonra | Y | S–M | — | — |
| **Seri kırılma/dönüş akışı**: kırılmadan 1 gün önce uyarı, kırılınca suçlamasız "geri dön", dondurma önerisi | Y | S–M | `discipline.ts` | — |
| **"Bugün iş kalmadı" ekranı + mini oyun** (1.0.2 planı) | O | M | Oyun kapsamı (kart oyunu istenmedi) | Kapsam |
| **Günün kahvesi** | O | M | `docs/moka-kahve-plani.md`, sanat gerekmez | "Go" demesi |
| **iOS widget** (Android var) | O | L | Native derleme | Öncelik kararı |

## C. Para kazanma
| Madde | Etki | Efor | Bağımlılık | Melih |
|---|---|---|---|---|
| Paywall zamanlaması: ilk büyük kutlamadan sonra; yıllık varsayılan seçili; "ne zaman ücret alınır" metni; deneme bitiş hatırlatması | Y | S | 3 günlük deneme mağazada açık | Mağaza ürünlerini doğrula |
| RevenueCat Experiments (deneme var/yok, varsayılan plan) | O–Y | S | Birkaç hafta veri | Panel erişimi |
| Bölgesel fiyat (BR/MX/IN), TR zaten ayrı | O | S | — | Fiyat kararı, mağaza paneli |
| AdMob: iOS "Requires review" (Support/Marketing URL), Android "Finish setup" | O | S | Yeni iOS sürümü / Play yayını | Panel işlemleri |
| Moka sohbet maliyeti izleme (Premium 25/gün) | D–O | S | `docs/moka-sohbet-maliyet.md` | Gelir-gider bakışı |

## D. Ölçüm
| Madde | Etki | Efor | Bağımlılık | Melih |
|---|---|---|---|---|
| **Bulutta anonim olay + D1/D7 kohortu** (Supabase tablosu önerilir: yeni SDK/native modül yok, rıza ekranıyla uyumlu) | Y (dolaylı, her karar buna bağlı) | M | Gizlilik politikası + `veri-envanteri.md` güncellenir | Servis seçimi |
| Sentry DSN'in canlı derlemede dolu olduğunu doğrula, sürüm etiketi | O | S | EAS env | DSN kontrolü |

## E. Mağaza ve büyüme (ASO)
| Madde | Etki | Efor | Bağımlılık | Melih |
|---|---|---|---|---|
| Play listesini 9 dile çevir (anahtar kelime: rutin, ev işleri, temizlik planı) | O–Y | S | `magaza-metni*.md` hazır | Yükleme |
| İlk 3 ekran görüntüsü = 3D ev + Moka + Bugün; 15 sn video | O–Y | S | — | Yükleme |
| Paylaşılabilir "evim" kartı (share.ts var; Story boyutu, filigran, mağaza linki) | Y | S–M | — | — |
| Kısa video içerik (haftada 3–5): senaryo/başlık listesini ben yazabilirim | Y | L (içerik) | — | Çekim/yayın |
| Yorum isteme: seri 7'de bir kez, olumsuzda geri bildirim formu | O | S | `review.ts` tetik kontrolü | — |

## F. Moka odası ve sanat
| Madde | Etki | Efor | Bağımlılık | Melih |
|---|---|---|---|---|
| Usta plan F0–F3 (dock, ☕ rozeti, tüy renkleri puanla, sohbet geçmişi) | O–Y | M (~2,5 gün) | Sanat gerekmez | "Go" + 4 karar (`moka-oda-usta-plan.md` §7) |
| 5 oturur poz, 13 yüz, 8 eşya çıkartması | O | M | Higgsfield kredisi 0 | ChatGPT/Gemini ile üretmek |
| Gerçek ses dosyaları (lofi çalar sessiz) | D–O | S | Lisanslı/ücretsiz ses | Ses seçimi/yükleme |

## G. Performans
| Madde | Etki | Efor | Bağımlılık | Melih |
|---|---|---|---|---|
| **3D ev**: saf SVG, 2410 satır; düşük cihazda kare hızı. Hava/bulut/kuş için "düşük efekt" otomatik mod | Y | M | Düşük seviye cihaz | Eski telefonla test |
| `db.ts`: her değişiklikte tablolar baştan yazılıyor (~satır 215–280). Büyük evde takılır; fark yazımına geç | O–Y | M | Şema testleri | — |
| Açılış süresi, paket boyutu (9 dil + büyük görseller): sahne PNG'lerini küçült/WebP | O | S–M | — | — |

## H. Kod kalitesi ve güvenlik
| Madde | Etki | Efor | Bağımlılık | Melih |
|---|---|---|---|---|
| `House3D.tsx` ve `moka.tsx` bölünmesi | O | M | Önce regresyon testi | — |
| Test: `db.ts` geçişleri, `premium.ts` sınırları, edge function birim testleri | O | M | CI var | — |
| i18n: eksik anahtar kontrolü CI'da (9 dil) | O | S | — | — |
| Edge function güvenliği: oran sınırı, JWT, fotoğraf boyut sınırı, RLS taraması (`get_advisors`) | Y | S | Supabase erişimi | — |
| Yeni native modüller için `requireOptionalNativeModule` şablonu | D–O | S | — | — |
| Bağımlılık/lisans + `veri-envanteri.md` güncel (Sentry, konum, sensör) | O | S | Yasal | Avukat gözden geçirme |

## Önerilen ilk 5 sıra
1. **A: Play üretim + RevenueCat anahtar/iOS ürün düzeltmesi + edge deploy.** Gelir ve yayın buna bağlı, efor küçük.
2. **D: Bulutta anonim ölçüm (Supabase tablosu).** Sonraki her karar (onboarding, paywall) buna dayanır.
3. **B: Onboarding kısaltma + tek oda modu.** En büyük geri bildirim "karmaşık"; D1/D7'yi en çok bu oynatır.
4. **B/C: İlk 7 gün bildirim akışı + seri dönüş kartı + paywall zamanlaması.** Küçük efor, tutundurma ve dönüşüm.
5. **G: 3D ev düşük efekt modu + `db.ts` fark yazımı.** Eski telefonda takılma düşük puan getirir; erken kapat.

Ardından: ASO/paylaşım kartı, Moka usta plan F0–F3, kod bölme + test.

## Melih'ten bekleyenler (özet)
Play üretim başvurusu + Trader beyanı · RC Android anahtarı + iOS ürünleri · "deploy" onayı · native derleme zamanı (1 Aralık kredisi) · "push" · tek oda modu go · kahve go · analitik servis seçimi · eski telefonla test.
