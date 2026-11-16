import { tx } from '@/i18n/runtime';

/**
 * Saf formüller: görev zamanı, bildirim saati/sıklığı, sıralama adaleti.
 * Hepsi saf fonksiyon (telefon saati `now` ile dışarıdan gelir), testleri __tests__/formulas.test.ts.
 */

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/* ---------- görev zamanı ---------- */

export type Slot = 'sabah' | 'ogle' | 'aksam' | 'gece';
/** Günün dilimi: sabah 05-11, öğle 11-17, akşam 17-22, gece 22-05. */
export const slotOf = (minute: number): Slot => {
  const h = Math.floor((((minute % 1440) + 1440) % 1440) / 60);
  return h >= 5 && h < 11 ? 'sabah' : h < 17 && h >= 11 ? 'ogle' : h >= 17 && h < 22 ? 'aksam' : 'gece';
};
export const slotLabel = (s: Slot) => tx(({ sabah: 'Sabah', ogle: 'Öğle', aksam: 'Akşam', gece: 'Gece' } as const)[s]);

/** Dakikalar arası dairesel mesafe (23:50 ile 00:10 arası 20). */
const cdist = (a: number, b: number) => {
  const d = Math.abs(a - b) % 1440;
  return Math.min(d, 1440 - d);
};

/**
 * Kişinin işleri en çok hangi saatte yaptığı: son kayıtlardaki dakikalar üzerinde dairesel yoğunluk
 * (±90 dk çan eğrisi; yenilere daha çok ağırlık). En az 5 kayıt gerekir; yoksa null.
 */
export function peakMinute(times: number[]): number | null {
  const t = times.slice(-40);
  if (t.length < 5) return null;
  let best = 0;
  let bestScore = -1;
  for (let m = 0; m < 1440; m += 15) {
    let sc = 0;
    t.forEach((x, i) => {
      const w = 0.5 + (0.5 * (i + 1)) / t.length;
      sc += w * Math.exp(-((cdist(m, x) / 90) ** 2));
    });
    if (sc > bestScore) { bestScore = sc; best = m; }
  }
  return best;
}

/**
 * Bir işin "şimdi" ne kadar uygun olduğu (0-1): kişinin yoğun saatine yakınlık. Alışkanlık verisi yoksa 0.5.
 * İş kendi saatini de taşıyabilir (`pref` günün dilimi: sabah işi sabah öne çıkar).
 */
export function taskFit(times: number[], nowMin: number, pref?: Slot): number {
  const peak = peakMinute(times);
  const base = peak == null ? 0.5 : Math.exp(-((cdist(peak, nowMin) / 180) ** 2));
  const slot = pref ? (slotOf(nowMin) === pref ? 1 : 0.4) : 1;
  return Math.round(base * slot * 100) / 100;
}

/** Görevleri şu anki uygunluğa göre sıralar (eşit puanda sıra bozulmaz). */
export function sortByTime<T extends { slot?: Slot }>(tasks: T[], times: number[], nowMin: number): T[] {
  return tasks
    .map((t, i) => ({ t, i, s: taskFit(times, nowMin, t.slot) }))
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .map(x => x.t);
}

/**
 * Bugün listesi sırası: gecikenler her zaman önde. Sonra kişinin yoğun saatindeyse (uygunluk ≥ 0.6) uzun işler,
 * değilse kısa işler öne gelir (enerji yüksekken zor iş, düşükken kolay iş). Alışkanlık verisi yoksa kısa iş önde.
 */
export function orderByFit<T extends { min: number; diff: number }>(tasks: T[], times: number[], nowMin: number): T[] {
  const long = taskFit(times, nowMin) >= 0.6 && peakMinute(times) != null;
  return [...tasks].sort((a, b) => Number(b.diff < 0) - Number(a.diff < 0) || (long ? b.min - a.min : a.min - b.min) || a.diff - b.diff);
}

/* ---------- bildirim saati ve sıklığı ---------- */

/** Rahatsız etmeme saatleri: 22:00 - 07:30. */
export const QUIET_FROM = 22 * 60;
export const QUIET_TO = 7 * 60 + 30;
export const NOTIF_MIN_GAP = 90;
export const NOTIF_DAY_MAX = 4;
export const isQuiet = (m: number) => m >= QUIET_FROM || m < QUIET_TO;

/**
 * Hatırlatma saati: yoğun saatten `lead` dakika önce, çeyreğe yuvarlanır, [lo, hi] arasında tutulur.
 * Veri yoksa null (sabit saat kullanılır).
 */
export function learnedTime(times: number[], lead: number, lo: number, hi: number): number | null {
  const p = peakMinute(times);
  return p == null ? null : clamp(Math.round((p - lead) / 15) * 15, lo, hi);
}

/**
 * Bildirim ayıklama (spam önleme): sessiz saatteki bildirimler atılır, art arda iki bildirim arası en az
 * 90 dk, günde en çok 4. `items` öncelikle gelir (düşük `rank` önce korunur). Dönen liste dakikaya göre sıralı.
 */
export function thinNotifications<T extends { minute: number; rank: number }>(items: T[], max = NOTIF_DAY_MAX, gap = NOTIF_MIN_GAP): T[] {
  const kept: T[] = [];
  for (const it of [...items].sort((a, b) => a.rank - b.rank || a.minute - b.minute)) {
    if (isQuiet(it.minute)) continue;
    if (kept.length >= max) break;
    if (kept.some(k => Math.abs(k.minute - it.minute) < gap)) continue;
    kept.push(it);
  }
  return kept.sort((a, b) => a.minute - b.minute);
}

/**
 * Üst üste yok sayılan bildirimlerden sonra seyreltme: 0-1 yok sayılırsa her gün, 2-3 ise gün aşırı, 4+ ise haftada 2.
 * Dönen sayı "kaç günde bir gönder"dir; kullanıcı uygulamayı açınca sayaç sıfırlanır.
 */
export const notifEveryDays = (ignored: number) => (ignored >= 4 ? 3 : ignored >= 2 ? 2 : 1);

/* ---------- sıralama adaleti ---------- */

export type FairInput = {
  /** Eşya puanı (harcanan puan / 10). */
  items: number;
  /** Moka bahçesi puanı. */
  garden: number;
  /** Ev temizliği 0-100. */
  clean: number;
  /** Evdeki blok sayısı (plan büyüklüğü). */
  cells: number;
  /** Hesabın yaşı (gün). */
  ageDays: number;
};

/** Varsayılan 6x8 ızgaranın dolu bloğu civarı referans ev. */
export const REF_CELLS = 24;
/** Bir hesabın "gün başına" alabileceği makul eşya+bahçe puanı üst sınırı. */
export const DAILY_EARN_CAP = 12;

/**
 * Adil ev puanı. Büyük evde daha çok eşya kolay olduğu için eşya+bahçe, ev büyüklüğüne göre (√ oranı, 0.6-1.6)
 * küçültülür/büyütülür. Hile ve aşırı birikime karşı: eşya+bahçe toplamı hesap yaşı × 12 puan/gün + 30 ile
 * sınırlanır. Temizlik zaten 0-100'dür, aynen eklenir.
 */
export function fairScore(i: FairInput): number {
  const size = clamp(Math.sqrt(Math.max(1, i.cells) / REF_CELLS), 0.6, 1.6);
  const cap = Math.max(0, i.ageDays) * DAILY_EARN_CAP + 30;
  const earned = Math.min(Math.max(0, i.items) + Math.max(0, i.garden), cap);
  return Math.round(earned / size + clamp(i.clean, 0, 100));
}
