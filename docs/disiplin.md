# Disiplin planı (2026-11-07)

Kaynak: "Homezy: Building Discipline" araştırması. Ilke: ceza yok, küçük başla, yavaş büyü.

- **Ev geri gitmez** (`houseProgress`): kaçırılan gün seviye düşürmez; toz/çatlak/yıkım yok, ev "dinleniyor". `idle` hep 0, `resting` gün sayısı.
- **Kademeli başlangıç** (`src/domain/ramp.ts`, `RampCard`): toplam çalışılan güne göre Tohum (1 iş) → Filiz (3. gün, 2 iş) → Fidan (7. gün, 3) → Çiçek (14. gün, 5) → Düzen (28. gün, hepsi). Bir gün kaçırmak aşamayı düşürmez. "Hepsini aç" ile atlanır (`Settings.rampOff`). Her yeni aşamada Moka kutlama kartı (`rampSeen`).
- **Bugün**: en kısa iş "tek iş" kartında, liste aşama sınırına göre kısalır, "İstersen göster" ile açılır. Ev'de de aynı sınır.
- **Hafif gün**: Bugün'de düğme ya da sabah sorusunda yorgun/bunalmış/keyifsiz/yoğun → en çok 2 iş, gün yine sayılır.
- **Metrikler** (Gelişim): seri, toplam gün (silinmez), en iyi seri, haftalık hedef (aşamaya göre 3-5 gün).
- **Bildirimler**: yeni kullanıcıda sadece sabah özeti + akşam dönüş açık; gerisi isteğe bağlı. Kırmızı sadece fatura/garantide.
- **Quiz**: "neden" ve "mola anı" soruları; cevap sabah saatini ve Moka'nın hatırlatmasını belirler.
- **Haftalık değerlendirme** (`WeekReflect`): "ne zorladı?" tek dokunuş, tek küçük ayar.
- **Ölçüm** (`src/lib/events.ts`, telefonda): active_day, task_hour, comeback, stage_up, light_day, ramp_skip, D1/D7.
- **Ücretsiz dondurma 2**: `20261107000000_dondurma_2.sql` Supabase SQL Editor'de çalıştırılmalı.
