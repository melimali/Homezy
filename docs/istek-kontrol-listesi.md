# İstek kontrol listesi (2026-11-06)

Kaynak: `docs/1.0.2-plan.md`, proje hafızasındaki istek/yapılacak listeleri (2026-11-02, 11-05, 11-06), kod taraması (`integration/tum-pr`), PR #39–#44. Durumlar: ✅ yapıldı · 🔀 PR'da · ⏳ başka thread'de sürüyor · ❌ eksik · 🧑 Melih'in elle yapacağı.
Not: Kod çalıştırılmadı (bulutta bağımlılık yok); "yapıldı" kod/commit varlığına göre, telefonda doğrulanmadı.

## 1.0.2 planı
| İstek | Durum | Not |
|---|---|---|
| Başlangıç akışı "Nerede yaşıyorsun?" | ✅ | PR #41 birleşti |
| Tek oda modu | ⏳ | "Add single-room focus mode" thread'i (plan: kodlandı) |
| Disiplin seviyeleri, görev grupları | ✅ | `discipline.ts` |
| "Bugün iş kalmadı" ana ekranı (oyunsuz) | ✅ | |
| Gelişim barları | ✅ | |
| Tanıtım kartları | ✅ | |
| Ev / Bugün / Ben sekmeleri sadeleşmesi | ✅ | PR #42, #43, #44 birleşti |
| Sade açılış (intro) | 🔀 | PR #40 açık |
| 3D: Oda 3D, balkon korkuluğu, büyüyen ev | 🔀 | PR #39 açık |
| 3D: odalar sadece antreye açılsın | ✅/⏳ | `House3D.tsx` antre varsa odalar arası kapı yok; "balkon dışarı baksın" PR #39 thread'inde |
| Moka disiplin testi | ⏳ | `docs/moka-disiplin-testi.md`, thread sürüyor |
| Moka görselleri (yatak toplama, uyanma, iş kalmadı) | ❌ | Kod yok; görsel üretimi bekliyor (ChatGPT/Gemini istemleri) |
| Mini oyun | ❌ (bilerek) | En son, 1.0.2'de kapalı; `RestGame.tsx` bağlı değil |
| Detaylı plan PDF | ⏳ | `1.0.2-plan-detayli.pdf` var |

## 2026-11-02 yapılacaklar listesi
| # | İstek | Durum |
|---|---|---|
| 1 | RevenueCat Android anahtarı (EAS env) | 🧑 |
| 2 | AdMob gerçek reklam kimlikleri (EAS env) | 🧑 |
| 3 | Paywall ruh hali penceresiyle çakışmasın | ✅ (e29209f, c05c326) |
| 4 | Paywall'da kelime bölünmesi | ✅ |
| 5 | Alt menü opak, banner boşluğu | ✅ |
| 6 | Misafir 1. gün 5–8 iş | ✅ `staggerFirstDay` (en çok 6) |
| 7 | Gelişim: ev puanı / iş sayısı tutarlılığı | ❌ doğrulanmadı; `gelisim.tsx` `homeScore` kullanıyor, telefonda 0 iş durumu denenmeli |
| 8 | "Evim" boş kart | ✅ boş arsa kartı |
| 9 | "Hesapsız devam et" ekranda sabit | ✅ alt çubukta |
| 10 | Mağaza düğmesi diğer kutularla aynı satırda | ✅ |
| 11 | Genel estetik gözden geçirme | ⏳ PR #42–44 ile kısmen |
| 12 | Widget sadeleşti, MIUI seçici | ✅ (Mini widget + "widget ekle" satırı) |
| 13 | Test edilmeyenler (captcha, satın alma, tarama, bildirim, widget, limit mesajları) | 🧑 |
| 14 | Supabase captcha açma | 🧑 |
| 15 | Kapalı test: 12 tester × 14 gün | 🧑 |
| 16 | Anthropic harcama limiti, Play formları, RevenueCat Google bağlantısı | 🧑 (`docs/melih-yapacaklar.md`) |
| 17 | Adres/gizlilik kararı, iOS hazırlığı | 🧑 / ❌ iOS başlanmadı |

## Diğer istekler
| İstek | Durum |
|---|---|
| İlaç takibi | ✅ `ilac.tsx` |
| Moka evde yürüyor | ✅ `MokaPet.tsx` |
| Dil: EN | ✅ (sözlük + `T` çevirisi) |
| Dil: ES FR DE PT AR KO JA | ❌ "yakında" |
| EN'de fiyat TL görünüyor | ❌ (PurchasesProvider, mağaza fiyatı yerine sabit biçim olabilir; incelenmedi) |
| Lofi oynatıcı gerçek ses dosyaları | ❌ dosya yok (ikili dosya yazılmaz, Melih ekler) |
| Yeni Moka sohbet SQL/deploy (`moka-chat`) | 🧑 |
| iOS widget | ❌ |

## Sonuç
Koda dönüştürülecek, güvenle doğrulanabilir eksik madde çıkmadı; kalanlar Melih'in elle işleri, görsel üretimi, aktif thread'ler veya telefonda doğrulama gerektiriyor. Bu yüzden ek kod PR'ı açılmadı; sadece bu liste.
