import { DAY } from './constants';
import { deviceLang, tx } from '@/i18n/runtime';
import type { Garden } from './garden';
import { emptyGrowth } from './growth';
import { emptyHabits } from './habits';
import { emptyMoka, gainFromAward } from './mokaLevel';
import { baseCare, emptyProfile } from './home';
import type { AppState, DayKey, Play, PlayKind, Settings } from './types';

/**
 * Puan, seri ve seriyle inşa olan ev. Amaç: her gün uygulamaya biraz vakit ayırmak.
 * - Her iş (rutin ya da bitki) günde bir kez "Tamamladım" ile puan verir. Spor ve günlük de günde birer kez.
 * - Bir şey yapılan her gün evin gelişimi ilerler; 7. günde ev biter, 100. günde rüya bahçesine dönüşür.
 * - Gün kaçırılınca ev önce tozlanır, sonra çatlar, 3. günden itibaren her gün bir parçası çöker.
 *   Bir iş yapınca toz ve çatlaklar hemen gider, çöken parçalar her gün biri olmak üzere yeniden yapılır.
 * Hesap varsa puanı sunucu sayar (supabase/migrations/…_puan.sql); telefonun saatiyle oynamak işe yaramaz.
 */

export const POINTS: Record<PlayKind, number> = { gorev: 10, spor: 15, gunluk: 10 };
/**
 * Günün ilk işinde seri bonusu: yumuşak eğri 30·(1−e^(−n/15)); sert tavan yok, 30'a yaklaşır
 * (1. gün 2, 7. gün 11, 15. gün 19, 30. gün 26). Sunucu aynısını hesaplar (supabase/migrations/20261109000000_formuller.sql).
 */
export const streakBonus = (prevStreak: number) => Math.round(30 * (1 - Math.exp(-Math.max(0, prevStreak) / 15)));
/**
 * Azalan getiri: günün `before` işten sonraki işi kaç puan verir. İlk 5 iş 10, sonraki 5 iş 5, kalan 10 iş 2 (en çok 95/gün).
 * Yeni iş ekleyip puan toplamayı caydırır; asıl ödül her gün gelmek (seri) olur. Sunucu aynı tabloyu kullanır.
 */
export const taskPoints = (before: number) => (before >= DAILY_TASK_CAP ? 0 : before < 5 ? POINTS.gorev : before < 10 ? 5 : 2);
/** Bir günde puan veren en fazla iş sayısı (yeni iş ekleyip puan toplamayı sınırlar). */
export const DAILY_TASK_CAP = 20;

const pad = (n: number) => String(n).padStart(2, '0');
export const dayKey = (ts = Date.now()): DayKey => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
/** Gün anahtarını o günün öğlesine çevirir (yaz saati kaymalarından etkilenmesin). */
export const dayTs = (k: DayKey) => {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d, 12).getTime();
};
export const addDays = (k: DayKey, n: number) => dayKey(dayTs(k) + n * DAY);

/**
 * "Bugün" anahtarı, saat dilimi değişimine (uçuş) dayanıklı: batıya uçunca yerel tarih geri gider; kayıtlı en son gün
 * yerel bugünden en fazla 1 gün ilerideyse o gün "bugün" sayılır. Böylece aynı gün iki kez ödüllenmez, seri bozulmaz.
 * Sunucu da bugün+1'e kadar kabul eder. 1 günden fazla ileri bir kayıt (saat oynama) yok sayılır.
 */
export const safeToday = (days: readonly DayKey[], now = Date.now()): DayKey => {
  const local = dayKey(now);
  let last = '';
  for (const d of days) if (d > last) last = d;
  return last > local && last <= addDays(local, 1) ? last : local;
};

export const emptyPlay = (): Play => ({
  points: 0, days: [], owned: [], placed: {}, awarded: {}, log: {}, sport: [], journal: {}, pending: [], celebrated: 0,
  frozen: [], times: [], welcomed: null, weekSeen: null, garden: emptyGarden(), persona: 'sicak', checkins: {}, moka: emptyMoka(), notes: [], growth: emptyGrowth(), habits: emptyHabits(),
});

/**
 * Yeni kullanıcıda sadece iki bildirim açık: sabah özeti (`routine`) ve akşam dönüş hatırlatması (`streak`).
 * Gerisi (su, uyku, spor, okuma, stok…) kişi isteyince açılır: bildirim yorgunluğu bırakmanın ilk sebebi.
 * Kayıtlı ayarı olanlar etkilenmez (normalize kayıtlı değerleri korur).
 */
export const defaultSettings = (): Settings => ({
  time: '09:00', routine: true, stock: false, laundry: false,
  streak: true, sport: false, read: false, water: false, sleepRemind: false, sportTime: '18:00', sportDays: [1, 3, 5],
  smart: true, theme: 'gunduz', workout: null,
  bills: false, expiry: false, weekly: false, flex: true, celebrate: true, sound: true,
  actions: false, meds: true, pets: true, shop: true,
  language: deviceLang(),
});

/** Eski sürümlerden ya da buluttan gelen veride eksik alanları tamamlar. */
export function normalize(S: AppState): AppState {
  S.settings = { ...defaultSettings(), ...(S.settings || {}) };
  S.play = { ...emptyPlay(), ...(S.play || {}) };
  S.play.garden = { ...emptyGarden(), ...S.play.garden };
  S.play.moka = { ...emptyMoka(), ...S.play.moka };
  S.play.growth = { ...emptyGrowth(), ...S.play.growth };
  S.play.habits = { ...emptyHabits(), ...S.play.habits };
  S.homeId ||= 'ev1';
  S.homeName ||= 'Evim';
  S.others ||= [];
  S.home = { ...emptyProfile(), ...(S.home || {}) };
  S.mode ??= null;
  // Ev bakımı bu sürümde geldi; eski evlere temel bakım işleri bir kere eklenir.
  S.care ??= baseCare();
  S.bills ??= [];
  S.warranties ??= [];
  S.seasonal ??= {};
  S.meds ??= [];
  S.medLog ??= {};
  S.pets ??= [];
  S.shop ??= [];
  S.shopUsual ??= [];
  S.shopHide ??= '';
  S.budget ??= { limit: 0, log: [] };
  // 2. kat: boyutu planla uyuşmuyorsa (eski kayıt) yok sayılır.
  if (S.cells2 && S.cells2.length !== S.cols * S.rows) S.cells2 = null;
  S.cells2 ??= null;
  // Eski kıyafetlerin eklenme tarihi bilinmiyor; bağış önerisi hemen çıkmasın diye bugünden say.
  const now = Date.now();
  for (const m of Object.values(S.mod || {})) for (const c of m.wardrobe || []) c.added ??= now;
  // Sınırsız büyüyen kayıtlar (100+ gün kullanımda şişmesin): spor 400 kayıt, ilaç işaretleri 200 gün.
  if (Array.isArray(S.play.sport) && S.play.sport.length > 400) S.play.sport = S.play.sport.slice(0, 400);
  prunePending(S.play, now);
  const medMin = dayKey(now - 200 * DAY);
  for (const k of Object.keys(S.medLog)) if (k < medMin) delete S.medLog[k];
  return S;
}

/* ---------- seri ve ev ---------- */

/** Evin inşaatı ve süslenmesi. `level` bu kadar gün yapılınca açılır. */
export const STAGES: { level: number; name: string; emoji: string }[] = [
  { level: 1, name: 'Zemin kalasları döşendi', emoji: '🪵' },
  { level: 2, name: 'İskelet kuruldu', emoji: '🏗️' },
  { level: 3, name: 'Duvarlar yükseliyor', emoji: '🧱' },
  { level: 4, name: 'Duvarlar boyandı, zemin döşendi', emoji: '🎨' },
  { level: 5, name: 'Pencereler takıldı', emoji: '🪟' },
  { level: 6, name: 'Eşyalar yerleşti', emoji: '🛋️' },
  { level: 7, name: 'Evin inşa edildi', emoji: '🎉' },
  { level: 9, name: 'Bahçeye çim ekildi', emoji: '🌱' },
  { level: 12, name: 'Çiçekler açtı', emoji: '🌷' },
  { level: 15, name: 'Çalılar büyüdü', emoji: '🌳' },
  { level: 18, name: 'Bahçeye ağaç dikildi', emoji: '🌲' },
  { level: 22, name: 'Çit çekildi', emoji: '🪵' },
  { level: 26, name: 'Işık zinciri asıldı', emoji: '✨' },
  { level: 30, name: 'Taş yol döşendi', emoji: '🪨' },
  { level: 34, name: 'Kelebekler geldi', emoji: '🦋' },
  { level: 37, name: 'Altın yıldız! Rüya ev', emoji: '⭐' },
  { level: 42, name: 'Bahçe fenerleri yerleşti', emoji: '🏮' },
  { level: 48, name: 'Kuş evi ağaca kondu', emoji: '🐦' },
  { level: 54, name: 'Minik gölet açıldı', emoji: '💧' },
  { level: 60, name: 'Gül bahçesi büyüdü', emoji: '🌹' },
  { level: 66, name: 'Bahçe kemeri kuruldu', emoji: '🌿' },
  { level: 72, name: 'Yeni kelebekler geldi', emoji: '🦋' },
  { level: 78, name: 'Dinlenme köşesi hazır', emoji: '🪑' },
  { level: 84, name: 'Meyve ağacı büyüdü', emoji: '🍎' },
  { level: 90, name: 'Gölete fıskiye eklendi', emoji: '⛲' },
  { level: 95, name: 'Işıklar bahçeyi sardı', emoji: '✨' },
  { level: 100, name: 'Yüz günlük rüya bahçe', emoji: '🏡' },
];
/** Bahçe garden.ts içinde tanımlı; boş hali burada durur ki iki dosya birbirini çalışma anında içe aktarmasın. */
const emptyGarden = (): Garden => ({ plots: [], album: {}, fed: { day: '', n: {} }, loved: { day: '', plotIds: [] } });
export const BUILT = 7;
export const MAX_LEVEL = 100;

/** Affedilen boşluktan sonra bir sonraki affa kadar geçmesi gereken gün. */
export const FORGIVE_COOLDOWN = 14;
/** Affedilmek için boşluktan önce üst üste kaç gün yapılmış olmalı (7 günlük seri). */
export const FORGIVE_MIN_RUN = 6;

/**
 * Seri affı: en az 7 günlük bir serinin ortasındaki TEK günlük boşluk (sonraki gün yine iş yapıldıysa)
 * otomatik affedilir, dondurma hakkı harcanmaz. İki affın arası en az 14 gün. Dondurulan günler zinciri bozmaz.
 * Ceza yerine "hata payı": uzun seriyi tek bir unutkanlık bozmasın.
 */
export function forgivenGaps(days: DayKey[], frozen: DayKey[], today: DayKey): Set<DayKey> {
  const out = new Set<DayKey>();
  const done = new Set(days);
  const ice = new Set(frozen);
  const sorted = [...done].filter(d => d <= today).sort();
  if (!sorted.length) return out;
  let run = 0;
  let last: DayKey | null = null;
  for (let d = sorted[0]; d <= today; d = addDays(d, 1)) {
    if (done.has(d)) run++;
    else if (ice.has(d)) continue;
    else if (d < today && done.has(addDays(d, 1)) && run >= FORGIVE_MIN_RUN && (!last || Math.round((dayTs(d) - dayTs(last)) / DAY) >= FORGIVE_COOLDOWN)) {
      out.add(d);
      last = d;
    } else run = 0;
  }
  return out;
}

export type HouseProgress = {
  /** Evin şu anki seviyesi (0: boş arsa). */
  level: number;
  /** Üst üste bir şey yapılan gün sayısı (bugün ya da dün biten). */
  streak: number;
  /** Bugün bir şey yapıldı mı. */
  today: boolean;
  /** Sadece hafif toz: 0 ya da 1 (kaçırılan günden sonra 1, bir iş yapılınca hemen 0). Çatlak ve yıkım yok; seviye düşmez. */
  idle: number;
  /** Dünden geriye kaç gün iş yapılmadı (ceza yok; sadece "Moka uyuyor" gibi yumuşak bir cümle için). */
  resting: number;
};

/**
 * Seri ve ev seviyesi, yapılan günlerin listesinden her seferinde baştan hesaplanır.
 * Bugün henüz bir şey yapılmadıysa bugün ceza sayılmaz; gün bitince sayılır.
 */
export function houseProgress(days: DayKey[], now = Date.now(), frozen: DayKey[] = []): HouseProgress {
  const today = safeToday(days, now);
  const set = new Set(days);
  // Dondurulan gün ne ilerletir ne bozar: seri ve ev olduğu gibi kalır. Affedilen tek boşluk da öyle.
  const ice = new Set(frozen);
  for (const g of forgivenGaps(days, frozen, today)) ice.add(g);
  const sorted = [...set].filter(d => d <= today).sort();
  const active = set.has(today);
  let level = 0;
  let miss = 0;
  if (sorted.length) {
    for (let d = sorted[0]; d <= today; d = addDays(d, 1)) {
      if (set.has(d)) {
        level = Math.min(MAX_LEVEL, level + 1);
        miss = 0;
      } else if (ice.has(d)) {
        miss = 0;
      } else if (d !== today) {
        // Ev geri gitmez: kaçırılan gün sadece "dinleniyor" sayılır (araştırma: suçluluk bırakmayı artırır).
        miss++;
      }
    }
  }
  let streak = 0;
  for (let d = active ? today : addDays(today, -1); set.has(d) || ice.has(d); d = addDays(d, -1)) if (set.has(d)) streak++;
  const resting = active || !sorted.length ? 0 : miss;
  return { level, streak, today: active, idle: Math.min(1, resting), resting };
}

/** Oyun durumundan evin ilerlemesi (dondurulan günler dahil). */
export const progressOf = (P: Play, now = Date.now()) => {
  const res = houseProgress(P.days, now, P.frozen);
  // Sadece sahip hesabın gizli "seviye atla" aracı (hesap sekmesi) bunu ayarlar; normalde boştur.
  return P.debugLevel == null ? res : { ...res, level: Math.max(0, Math.min(MAX_LEVEL, P.debugLevel)) };
};

/* ---------- seri dondurma ---------- */

/** Bu ay kullanılmış dondurma sayısı. */
export const freezesUsed = (P: Play, now = Date.now()) => {
  const month = dayKey(now).slice(0, 7);
  return P.frozen.filter(d => d.startsWith(month)).length;
};

/**
 * Kaçırılan günleri (en fazla son 7 gün) ayın dondurma hakkıyla korur. Uygulama açılınca çağrılır.
 * Sadece korunacak bir ev ya da seri varsa kullanılır; en eski kaçırılan günden başlar.
 * Dondurulan günleri döner. Hak `limit` (ücretsiz 1, Premium 3) ile sınırlı; sunucu da aynısını sayar.
 */
export function autoFreeze(P: Play, limit: number, now = Date.now()): DayKey[] {
  const today = safeToday(P.days, now);
  const done = new Set(P.days);
  const ice = new Set(P.frozen);
  const last = [...P.days].filter(d => d < today).sort().pop();
  if (!last || done.has(today)) return [];
  const out: DayKey[] = [];
  for (let d = addDays(last, 1); d < today; d = addDays(d, 1)) {
    if (d < addDays(today, -7) || done.has(d) || ice.has(d)) continue;
    const month = d.slice(0, 7);
    const used = [...ice].filter(x => x.startsWith(month)).length;
    if (used >= limit) continue;
    ice.add(d);
    out.push(d);
  }
  if (out.length) P.frozen = [...ice].sort();
  return out;
}

/* ---------- seri koruma ve geri dönüş ---------- */

/**
 * `d` gün sonraki akşam, o zamana kadar hiçbir şey yapılmazsa evin kaç gündür bekleyeceği
 * (`HouseProgress.resting` ile aynı anlam). Ev artık geriye gitmediği için sadece metin seçiminde kullanılır.
 */
export function idleAhead(p: HouseProgress, d: number, freezeLeft = 0) {
  if (!p.level) return 0;
  const missed = p.today ? Math.max(0, d - 1) : p.idle + d;
  return Math.max(0, missed - freezeLeft);
}

/** `d` gün sonra, son bir şey yapılan günün üstünden kaç gün geçmiş olacak (hiç yapılmadıysa null). */
export function awayAhead(P: Play, d: number, now = Date.now()) {
  const today = safeToday(P.days, now);
  const last = [...P.days].filter(x => x <= today).sort().pop();
  if (!last) return null;
  return Math.round((dayTs(today) - dayTs(last)) / DAY) + d;
}

/** Kaç gün uzak kalınca "tekrar hoş geldin" karşılaması ve geri dönüş bildirimi başlar. */
export const AWAY_DAYS = 3;

export type DayMark = { key: DayKey; mark: 'done' | 'ice' | 'miss' | 'today'; n: number };

/** Son 7 günün her biri: iş yapıldı, dondurmayla korundu, kaçırıldı ya da bugün (henüz bir şey yok). */
export function lastWeek(P: Play, now = Date.now()): DayMark[] {
  const today = safeToday(P.days, now);
  const done = new Set(P.days);
  const ice = new Set([...P.frozen, ...forgivenGaps(P.days, P.frozen, today)]);
  return Array.from({ length: 7 }, (_, i) => {
    const key = addDays(today, i - 6);
    const n = P.log[key]?.length ?? 0;
    const mark = done.has(key) ? 'done' : ice.has(key) ? 'ice' : key === today ? 'today' : 'miss';
    return { key, mark, n };
  });
}

export const stageFor = (level: number) => [...STAGES].reverse().find(s => s.level <= level) ?? null;
export const nextStage = (level: number) => STAGES.find(s => s.level > level) ?? null;

/** Evin durumu için tek satırlık, tatlı bir açıklama. */
export function houseLine(p: HouseProgress) {
  if (!p.level) return 'Bugün bir iş tamamla, evinin inşaatı başlasın 🏗️';
  if (!p.today && p.resting >= 1) return 'Ev biraz tozlandı 🌫️ Küçük bir işle tozu alırız, seviyen yerinde duruyor.';
  if (!p.today) return 'Bugün için küçük bir işin seni bekliyor 🤍';
  const next = nextStage(p.level);
  return next ? `Sıradaki: ${next.emoji} ${next.name}` : 'Rüya evin tamam! Seriyi sürdür ⭐';
}

/* ---------- puan ---------- */

export const awardKey = (kind: PlayKind, ref: string) => (kind === 'gorev' ? `gorev:${ref}` : kind);
export const awardedToday = (P: Play, kind: PlayKind, ref: string, now = Date.now()) => P.awarded[awardKey(kind, ref)] === safeToday(P.days, now);

export type AwardResult = { awarded: boolean; points: number; before: HouseProgress; after: HouseProgress };

/**
 * Taslak state üzerinde puanı telefonda hemen verir ve sunucuya gönderilmek üzere sıraya koyar.
 * Sunucu cevap verince puan, günler ve eşyalar sunucudaki değerle değiştirilir.
 */
export function awardLocal(S: AppState, kind: PlayKind, ref: string, label: string, now = Date.now(), mult = 1): AwardResult {
  const P = S.play;
  const day = safeToday(P.days, now);
  const before = progressOf(P, now);
  const key = awardKey(kind, ref);
  if (P.awarded[key] === day) return { awarded: false, points: 0, before, after: before };

  // Sadece bugünün kayıtları tutulur.
  for (const k of Object.keys(P.awarded)) if (P.awarded[k] !== day) delete P.awarded[k];
  P.awarded[key] = day;
  const tasksToday = Object.keys(P.awarded).filter(k => k.startsWith('gorev:')).length;
  let pts = kind === 'gorev' ? taskPoints(tasksToday - 1) : POINTS[kind];
  if (!before.today) {
    pts += streakBonus(before.streak);
    P.days = [...P.days, day].sort();
  }
  pts = Math.round(pts * mult);
  P.points += pts;
  (P.log[day] ||= []).push(label);
  P.pending.push({ kind, ref: kind === 'gorev' ? ref : kind, day });
  prunePending(P, now);
  const d = new Date(now);
  if (pts > 0 || kind !== 'gorev') gainFromAward(P, kind, now);
  P.times = [...P.times, d.getHours() * 60 + d.getMinutes()].slice(-40);
  return { awarded: true, points: pts, before, after: progressOf(P, now) };
}

/** Sunucu bugün-7'den eski günü reddeder; bekleyen kuyruk da sınırsız büyümesin. */
export const PENDING_MAX = 200;
export const PENDING_DAYS = 7;

/** Sunucunun kabul etmeyeceği kadar eski ya da sınırı aşan en eski bekleyen olayları eler (puan zaten telefonda yazılı). */
export function prunePending(P: Play, now = Date.now()) {
  if (!Array.isArray(P.pending) || !P.pending.length) return;
  const min = addDays(safeToday(P.days, now), -PENDING_DAYS);
  let next = P.pending.filter(e => e.day >= min);
  if (next.length > PENDING_MAX) next = next.slice(next.length - PENDING_MAX);
  if (next.length !== P.pending.length) P.pending = next;
}

/** Puan alındıktan sonraki kısa mesaj; ev bir seviye atladıysa onu söyler. */
export function awardToast(r: AwardResult, what: string) {
  if (!r.awarded) return `${what} bugün zaten tamam ✓`;
  const up = r.after.level > r.before.level ? stageFor(r.after.level) : null;
  const repaired = r.before.idle > 0 ? ' Ev toparlanıyor 🔨' : '';
  if (up && up.level === r.after.level) return `+${r.points} puan ⭐ ${up.emoji} ${tx(up.name)}!${repaired}`;
  if (!r.before.today && r.after.streak > 1) return `+${r.points} puan ⭐ 🔥 ${r.after.streak} günlük seri!${repaired}`;
  return `+${r.points} puan ⭐ ${what} tamam.${repaired}`;
}

/** "Bugün neler yaptım" kayıtlarını son 120 günle sınırlar. */
export function pruneLog(P: Play, now = Date.now()) {
  const min = dayKey(now - 120 * DAY);
  for (const k of Object.keys(P.log)) if (k < min) delete P.log[k];
}
