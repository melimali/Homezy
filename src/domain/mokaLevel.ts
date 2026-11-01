import type { DayKey, FocusSession, MokaGrowth, MokaStat, Play, PlayKind } from './types';

/**
 * Moka'nın seviyesi ve statları. Veri `Play.moka` içinde durur (telefonda + hesap yedeğinde).
 * - Zeka: odak / ders çalışma (Pomodoro). Disiplin: ev işleri ve günlük. Sağlık: spor.
 * - Seviye üç statın toplam exp'sinden hesaplanır: 1→2 için 10, 2→3 için 15, sonra her seviye +5.
 * - Ev işi başına 1 exp (günde en çok 10): bir günün bütün işleri = 10 exp.
 * Exp sadece `awardLocal` (günde bir kez puan kuralı) ve `addFocus` içinden eklenir, çift sayım olmaz.
 * Moka sohbet botu için okuma yardımcıları: `mokaSummary()`, `mokaLevel()`.
 */

export const MOKA_STATS: { id: MokaStat; name: string; emoji: string; hint: string }[] = [
  { id: 'zeka', name: 'Zeka', emoji: '🧠', hint: 'Odaklan ve çalış' },
  { id: 'disiplin', name: 'Disiplin', emoji: '🧹', hint: 'Ev işlerini yap' },
  { id: 'saglik', name: 'Sağlık', emoji: '💪', hint: 'Spor yap' },
];

/** Bir günde stat başına kazanılabilecek en çok exp. */
export const DAILY_XP_CAP: Record<MokaStat, number> = { zeka: 12, disiplin: 10, saglik: 6 };

export const emptyXp = (): Record<MokaStat, number> => ({ zeka: 0, disiplin: 0, saglik: 0 });
export const emptyMoka = (): MokaGrowth => ({ xp: emptyXp(), today: { day: '', xp: emptyXp() }, seen: 1, focus: [] });

/** `level`'dan sonrakine geçmek için gereken exp: 10, 15, 20, 25 … */
export const needFor = (level: number) => 5 + 5 * level;

export const totalXp = (m: MokaGrowth) => m.xp.zeka + m.xp.disiplin + m.xp.saglik;

export type MokaLevel = { level: number; into: number; need: number; pct: number; total: number };

export function mokaLevel(m: MokaGrowth): MokaLevel {
  const total = totalXp(m);
  let level = 1;
  let rest = total;
  while (rest >= needFor(level)) rest -= needFor(level++);
  return { level, into: rest, need: needFor(level), pct: Math.round((100 * rest) / needFor(level)), total };
}

export const MOKA_TITLES = ['Çaylak Moka', 'Meraklı Moka', 'Çalışkan Moka', 'Düzenli Moka', 'Usta Moka', 'Bilge Moka', 'Efsane Moka'];
export const mokaTitle = (level: number) => MOKA_TITLES[Math.min(MOKA_TITLES.length - 1, Math.floor((level - 1) / 3))];

/** Bir statın seviyesi: aynı eğri, sadece o statın exp'siyle. */
export function statLevel(xp: number) {
  let level = 1;
  let rest = xp;
  while (rest >= needFor(level)) rest -= needFor(level++);
  return { level, into: rest, need: needFor(level), pct: Math.round((100 * rest) / needFor(level)) };
}

/** exp ekler (günlük sınırı uygular). Eklenen exp'yi döner. */
export function addXp(P: Play, stat: MokaStat, n: number, now = Date.now()): number {
  const m = (P.moka ||= emptyMoka());
  const day = dayKeyOf(now);
  if (m.today.day !== day) m.today = { day, xp: emptyXp() };
  const give = Math.max(0, Math.min(n, DAILY_XP_CAP[stat] - m.today.xp[stat]));
  m.today.xp[stat] += give;
  m.xp[stat] += give;
  return give;
}

const pad = (n: number) => String(n).padStart(2, '0');
const dayKeyOf = (ts: number): DayKey => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/** Puan veren bir iş yapılınca: rutin/bitki → Disiplin 1, günlük → Disiplin 1, spor → Sağlık 3. */
export function gainFromAward(P: Play, kind: PlayKind, now = Date.now()) {
  if (kind === 'spor') addXp(P, 'saglik', 3, now);
  else addXp(P, 'disiplin', 1, now);
}

/** Odak süresi → Zeka exp'si: her 25 dakika 2 exp, en az 10 dakikalık oturum sayılır. */
export const focusXp = (min: number) => (min < 10 ? 0 : Math.max(1, Math.round((min / 25) * 2)));

/** Tamamlanan odak oturumunu kaydeder. Kazanılan exp'yi döner. */
export function addFocus(P: Play, min: number, topic: string, now = Date.now()): number {
  const m = (P.moka ||= emptyMoka());
  const s: FocusSession = { day: dayKeyOf(now), min, topic, at: now };
  m.focus = [...m.focus, s].slice(-200);
  return addXp(P, 'zeka', focusXp(min), now);
}

/** Bugünkü odak dakikası. */
export const focusToday = (P: Play, now = Date.now()) => {
  const day = dayKeyOf(now);
  return (P.moka?.focus || []).filter(f => f.day === day).reduce((a, f) => a + f.min, 0);
};

/** Sohbet botu ve widget için kısa özet. */
export function mokaSummary(P: Play, now = Date.now()) {
  const m = P.moka || emptyMoka();
  const lv = mokaLevel(m);
  return {
    level: lv.level, title: mokaTitle(lv.level), xp: lv.into, xpNeeded: lv.need, totalXp: lv.total,
    stats: { zeka: statLevel(m.xp.zeka).level, disiplin: statLevel(m.xp.disiplin).level, saglik: statLevel(m.xp.saglik).level },
    focusMinutesToday: focusToday(P, now),
  };
}
