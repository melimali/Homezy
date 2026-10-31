# Oran artırma planı (2026-10-31)

Kaynak: `docs/pazar-raporu-2026-10-31.md`, `docs/premium-retention-plan.md`, `docs/yurtdisi-lansman.md`. Etki sütunu **[TAHMİN]**, ölçülmüş veri yok. "Thread" = kodla bir thread yapabilir mi. Henüz kod değişikliği yok; Melih seçecek. İngilizce yerelleştirme sıradaki iş, bu yüzden metin işi en alta bırakıldı.

## 1. Rapordaki oranlar ve hedefler

| Oran | Hedef (rapor, 90. gün) | Kıyas | Bugünkü ölçüm |
|---|---|---|---|
| D1 geri dönüş | ≥ %30 | Ücretli reklam eşiği | Yok |
| D7 | ≥ %12 | Ücretli reklam eşiği | Yok |
| D30 | ~%3–4 (kategori) | H&F ortalaması | Yok |
| Deneme → ücretli | ≥ %35 | H&F medyan ~%40 | Deneme henüz yok |
| İndirme → ücretli | %1,5–3 | Freemium | Yok |
| Mağaza sayfası → kurulum | (rapor vermiyor) | ASO | Mağazada yok |
| Yıllık plan payı | (rapor vermiyor) | H&F gelirin ~%60'ı | Yok |
| Paylaşım / davet (viral) | (rapor vermiyor) | — | Aile evi kodu var, paylaşım görseli yok |

**En büyük boşluk: ölçüm.** `src/lib/events.ts` yalnızca telefonda kalan 6 olay sayıyor (paywall görüntüleme / satın alma / kapama, seri, seviye, mevsim). D1/D7 hesaplanamıyor. Hedeflere ulaştığımızı bilemeyiz.

## 2. Öncelikli eylemler

Etki: Y/O/D = yüksek/orta/düşük [TAHMİN]. Efor: S = ≤1 gün, M = 2–4 gün, L = hafta+.

| # | Eylem | Hangi oranı artırır | Etki | Efor | Thread yapar mı |
|---|---|---|---|---|---|
| 1 | **Analitik + çökme izleme**: bulutta olay gönderimi (örn. PostHog ya da Firebase; KVKK/GDPR onayıyla), açılış, onboarding adımları, ilk iş, D1/D7 kohortu, paywall, tarama, sohbet. Sentry/Crashlytics. | Hepsi (ölçmeden iyileştirilmez) | Y (dolaylı) | M | Evet (kod), karar: hangi servis; native modül gerekebilir, emülatörde yeniden derleme |
| 2 | **Onboarding'i kısalt, ilk değeri 60 sn'ye indir**: ev çiz → ilk oda → "ilk iş" yapıldı → Moka kutlaması. Sihirbaz sorularını (7 kurulum sorusu) ertelenebilir yap. Hedef: ilk oturumda en az 1 iş tamamlanması. | D1, D7 | Y | M | Evet |
| 3 | **7 günlük deneme + yıllık varsayılan + paywall'da "ne zaman ücret alınır" şeffaflığı**: Play/App Store tarafı elle (Melih), uygulama tarafı kod. Deneme bitiş hatırlatması (gün 5). | Deneme→ücretli, yıllık payı | Y | S (kod) + Melih (mağaza) | Kısmen (kod evet; ürün kurulumu Play onayı sonrası) |
| 4 | **Bildirim ritmi**: yeni kullanıcıya ilk 7 gün özel akış (gün 1 akşam "ilk işini yaptın mı", gün 2 Moka selamı, gün 3 seri, gün 6 deneme/seri uyarısı); izin istemi, ilk değeri gördükten sonra (açılışta değil). Günde en çok 2. | D1, D7, D30 | Y | S–M | Evet |
| 5 | **Seri kırılma ve geri dönüş akışı**: "evim çöktü" kancası zaten var; kırılmadan 1 gün önce uyarı, kırılınca suçlamasız "geri dön" kartı, Premium'da dondurma önerisi (kırılma anında). | D7, D30, Premium dönüşümü | Y | S–M | Evet |
| 6 | **Paylaşılabilir "evim" görseli**: 3D ev + Moka + seri, tek dokunuşla Story/Reels boyutlu PNG, filigran "Homezy" + mağaza bağlantısı. Aile davet koduna "ev arkadaşını çağır" paylaşım sayfası. | Viral/kurulum, ücretsiz edinme | Y | M | Evet (native paylaşım modülü, yeniden derleme gerekebilir) |
| 7 | **Ana ekran widget'ı** (CLAUDE.md'de "ücretsiz, yakında" kartı var): bugünkü iş sayısı + Moka. | D7–D30 (görünürlük) | O–Y | L (iOS/Android ayrı, native) | Kısmen; ayrı native iş, Expo yapılandırması gerekir |
| 8 | **Paywall zamanlaması ve A/B**: mevcut anlar (`paywall.ts`) çalışıyor; RevenueCat Experiments ile (a) deneme var/yok, (b) varsayılan plan, (c) hangi an. Birkaç hafta veri sonrası. | Paywall→deneme, deneme→ücretli | O–Y | S (kod) + Melih (panel) | Kısmen |
| 9 | **Bölgesel fiyat**: BR/MX için ABD fiyatının ~%50–70'i, TR ayrı. Mağaza yerel fiyat şablonu. Kararı Melih verecek. | İndirme→ücretli (BR/MX), gelir | O | S (mağaza paneli) | Hayır (mağaza paneli, Melih kararı) |
| 10 | **ASO**: anahtar kelime (rutin, ev işleri, temizlik planı, odak), ilk 3 ekran görüntüsü = 3D ev + Moka + Bugün, 15 sn video. Metinler `docs/magaza-metni.md`'de; EN ile birlikte. | Mağaza sayfası → kurulum | O–Y | S–M | Kısmen (görseller ve metin evet, mağazaya yükleme Melih) |
| 11 | **Premium değerini tek cümleye indir**: "Evini ve Moka'yı sınırsız kişiselleştir + AI". Paywall ilk ekranında 3 madde, uzun tablo ikinci ekranda. | Paywall→deneme | O | S | Evet (metin, EN sonrası daha az iş) |
| 12 | **Kullanıcı yorumu isteme**: ilk büyük kutlamadan sonra (seri 7, seviye 3) `StoreReview` ile bir kez; olumsuz cevapta geri bildirim formu. | Puan → ASO → kurulum | O | S | Evet (expo-store-review, native) |
| 13 | **Kısa video içerik motoru**: uygulama içi "kayıt dostu" mod (UI'sız ev gösterimi) ya da hazır şablonlar; haftada 5 video (Melih/içerik). | Kurulum (organik) | Y (dağıtım ana risk) | L (içerik) | Hayır (kod değil); thread senaryo/başlık listesi yazabilir |
| 14 | **Premium bitince/deneme bitince kart** (var) + **geri kazanma bildirimi** (gün 3, 14). | Churn, geri dönüş | D–O | S | Evet |
| 15 | **AI sınırı sıkılaştırma** (günde 50 → 20–25): oran değil maliyet koruması. | Marj | D | S | Evet (`premium.ts` + SQL birlikte) |

## 3. Önerilen sıra (ilk 3 hafta)

1. **Hafta 1:** #1 analitik/çökme (diğerlerini ölçmek için), #3 deneme kodu, #11 paywall sadeleştirme.
2. **Hafta 2:** #2 onboarding kısaltma, #4 ilk 7 gün bildirim akışı, #5 seri kırılma akışı.
3. **Hafta 3:** #6 paylaşılabilir ev görseli, #12 yorum isteme, #10 ASO görselleri. Sonra #7 widget ve #8 A/B (veri gelince).

Ön koşullar (Melih): Play Console onayı ve D-U-N-S, Google/Apple abonelik ürünleri ve deneme teklifi, İngilizce yerelleştirme. İngilizce olmadan #6, #10 ve #9 yurt dışında işe yaramaz.

## 4. Ölçülecek olaylar (#1 için)

`app_open`, `onboarding_step` (adım no), `onboarding_done`, `first_task_done` (kurulumdan itibaren süre), `task_done`, `day_n_return` (gün 1/3/7/14/30, kohort için kurulum tarihi), `notif_permission` (izin / ret), `notif_open` (tür), `streak_milestone`, `streak_break`, `paywall_view` (an), `trial_start`, `purchase` (aylık/yıllık), `scan_start/scan_done`, `chat_msg`, `share_house`, `invite_sent/accepted`, `review_prompt`. Kullanıcı kimliği anonim; fotoğraf ve sohbet içeriği asla gönderilmez; gizlilik politikası ve onay güncellenir.

## 5. Not ve belirsizlikler

- Etki seviyeleri tahmin; D1/D7 henüz hiç ölçülmedi. #1 yapılmadan hedef oranlar tutmayabilir, görünmez.
- En büyük çarpan dağıtım (kurulum sayısı) ve dil; oran artışı küçük kurulum tabanında anlamsız kalır.
- #7 widget ve #6 paylaşım native modül isteyebilir: emülatör dev build yeniden derlenmeli (`npx.cmd expo run:android`, `C:\lf-wt`).
- Rapordaki dönüşüm rakamları dış kaynak ve ±%30–50 hatalı; kendi verimiz gelene kadar sadece yön gösterir.
