import type { BadgeArt } from '@/constants/badges';
import { homeScore } from './logic';
import { addDays, dayKey, progressOf, stageFor } from './play';
import { BADGES as GROWTH_BADGES } from './growth';
import type { AppState } from './types';

export type AchGroup = 'is' | 'seri' | 'seviye' | 'okuma' | 'aliskanlik';
export type AchTier = 'kolay' | 'orta' | 'zor';
export type Ach = {
  id: string;
  group: AchGroup;
  tier: AchTier;
  name: string;
  hint: string;
  art?: BadgeArt;
  emoji?: string;
  on: boolean;
  /** Kilitliyken ilerleme: [şimdiki, hedef]. */
  prog?: [number, number];
};

export const ACH_GROUPS: { id: AchGroup; title: string; emoji: string }[] = [
  { id: 'is', title: 'İşler', emoji: '🧹' },
  { id: 'seri', title: 'Seri', emoji: '🔥' },
  { id: 'seviye', title: 'Ev seviyesi', emoji: '🏡' },
  { id: 'okuma', title: 'Okuma ve öğrenme', emoji: '📚' },
  { id: 'aliskanlik', title: 'Alışkanlıklar', emoji: '🌱' },
];

export const ACH_TIERS: { id: AchTier; title: string; emoji: string }[] = [
  { id: 'kolay', title: 'Kolay rozetler', emoji: '🥉' },
  { id: 'orta', title: 'Orta rozetler', emoji: '🥈' },
  { id: 'zor', title: 'Zor rozetler', emoji: '🥇' },
];

/** Büyüme (okuma) rozetlerinin kademesi. */
const GROWTH_TIER: Record<string, AchTier> = {
  'ilk-kitap': 'kolay', 'oku-3': 'kolay', huzur: 'kolay',
  'kitap-kurdu': 'orta', 'oku-7': 'orta', sinema: 'orta', merakli: 'orta',
  kutuphane: 'zor',
};

/** Gün listesindeki en uzun kesintisiz seri. */
export function longestStreak(days: string[]): number {
  const ds = [...new Set(days)].sort();
  let best = 0, run = 0, prev = '';
  for (const d of ds) {
    run = prev && addDays(prev, 1) === d ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}

/** Tüm rozetler (işler, seri, seviye, okuma) ve kazanılıp kazanılmadığı. Sadece mevcut kayıtlardan hesaplanır. */
export function achievements(S: AppState, now: number): Ach[] {
  const P = S.play;
  const hp = progressOf(P, now);
  const today = dayKey(now);
  const weekDone = [0, 1, 2, 3, 4, 5, 6].reduce((n, i) => n + (P.log[addDays(today, -i)]?.length ?? 0), 0);
  const all = Object.values(P.log).reduce((n, a) => n + a.length, 0);
  const plants = Object.values(P.log).flat().filter(x => x.startsWith('🪴')).length;
  const best = Math.max(longestStreak(P.days), hp.streak);
  const score = homeScore(S, now);
  const sports = P.sport.length;
  const journalN = Object.keys(P.journal).length;
  const notesN = P.notes.length;
  const sessions = P.moka.focus.length;
  const focusMin = P.moka.focus.reduce((n, f) => n + f.min, 0);
  const planted = P.garden.plots.length;
  const flowers = Object.keys(P.garden.album).length;
  const goal = P.habits.waterGoal || 8;
  const waterDays = Object.values(P.habits.water).filter(n => n >= goal).length;
  const out: Ach[] = [
    { id: 'ilk', tier: 'kolay', group: 'is', name: 'İlk Adım', hint: 'İlk işini tamamla', art: 'ilk', on: all >= 1, prog: [all, 1] },
    { id: 'hafta', tier: 'kolay', group: 'is', name: 'Haftanın Yıldızı', hint: 'Bu hafta 10 iş yap', art: 'takvim', on: weekDone >= 10, prog: [weekDone, 10] },
    { id: 'usta', tier: 'kolay', group: 'is', name: 'Temizlik Ustası', hint: '20 iş tamamla', art: 'el', on: all >= 20, prog: [all, 20] },
    { id: 'duzen', tier: 'orta', group: 'is', name: 'Düzen Canavarı', hint: 'Ev puanını %80 yap', art: 'ev', on: score >= 80 && all >= 1, prog: [score, 80] },
    { id: 'bitki', tier: 'kolay', group: 'is', name: 'Bitki Dostu', hint: '3 kez bitki sula', art: 'filiz', on: plants >= 3, prog: [plants, 3] },
    { id: 'yildiz', tier: 'orta', group: 'is', name: 'Yıldız Ev', hint: '100 iş tamamla', art: 'yildiz', on: all >= 100, prog: [all, 100] },
    { id: 'is-250', tier: 'zor', group: 'is', name: 'Ev Kahramanı', hint: '250 iş tamamla', emoji: '🦸', on: all >= 250, prog: [all, 250] },
    { id: 'is-500', tier: 'zor', group: 'is', name: 'Efsane Ev', hint: '500 iş tamamla', emoji: '👑', on: all >= 500, prog: [all, 500] },
    { id: 'seri-3', tier: 'kolay', group: 'seri', name: 'Kahve Sever', hint: '3 gün seri yap', art: 'kus', on: best >= 3, prog: [best, 3] },
    { id: 'seri-7', tier: 'orta', group: 'seri', name: 'Seri Ateşi', hint: '7 gün seri yap', art: 'seri', on: best >= 7, prog: [best, 7] },
    { id: 'seri-14', tier: 'orta', group: 'seri', name: 'İki Hafta', hint: '14 gün seri yap', emoji: '🔥', on: best >= 14, prog: [best, 14] },
    { id: 'seri-30', tier: 'zor', group: 'seri', name: 'Bir Ay Dolu', hint: '30 gün seri yap', emoji: '🌕', on: best >= 30, prog: [best, 30] },
    { id: 'seri-100', tier: 'zor', group: 'seri', name: 'Yüzler Kulübü', hint: '100 gün seri yap', emoji: '💯', on: best >= 100, prog: [best, 100] },
  ];
  const tail = (id: string, tier: AchTier, name: string, hint: string, emoji: string, n: number, goalN: number) =>
    out.push({ id, group: 'aliskanlik', tier, name, hint, emoji, on: n >= goalN, prog: [n, goalN] });
  tail('spor-1', 'kolay', 'İlk Antrenman', 'İlk sporunu kaydet', '👟', sports, 1);
  tail('gunluk-1', 'kolay', 'Günlük Yazarı', 'Günlüğe ilk notunu yaz', '📓', journalN, 1);
  tail('odak-1', 'kolay', 'İlk Odak', 'İlk odak (Pomodoro) oturumunu bitir', '🍅', sessions, 1);
  tail('bahce-1', 'kolay', 'Bahçıvan', "Moka'nın bahçesine ilk çiçeği ek", '🌷', planted, 1);
  tail('su-1', 'kolay', 'Su Kahramanı', 'Bir gün su hedefine ulaş', '💧', waterDays, 1);
  tail('not-1', 'kolay', 'Not Defteri', "Moka sohbetinde bir not aldır", '📝', notesN, 1);
  tail('spor-10', 'orta', 'Spor Sever', '10 antrenman kaydet', '🏃', sports, 10);
  tail('gunluk-7', 'orta', 'Günlük Tutkunu', '7 gün günlük yaz', '✍️', journalN, 7);
  tail('odak-10', 'orta', 'Odak Ustası', '10 odak oturumu bitir', '🎯', sessions, 10);
  tail('bahce-5', 'zor', 'Çiçek Koleksiyoncusu', 'Albümde 5 farklı çiçek topla', '🌸', flowers, 5);
  tail('odak-20s', 'zor', 'Derin Odak', 'Toplam 20 saat odaklan', '🧘‍♂️', Math.floor(focusMin / 60), 20);
  for (const lv of [7, 15, 30]) {
    const s = stageFor(lv);
    out.push({ id: `sev-${lv}`, tier: lv === 7 ? 'kolay' : lv === 15 ? 'orta' : 'zor', group: 'seviye', name: `Seviye ${lv}`, hint: `Evini ${lv}. seviyeye çıkar`, emoji: s?.emoji ?? '🏡', on: hp.level >= lv, prog: [hp.level, lv] });
  }
  for (const b of GROWTH_BADGES) {
    out.push({ id: `g-${b.id}`, tier: GROWTH_TIER[b.id] ?? 'orta', group: 'okuma', name: b.name, hint: b.hint, emoji: b.emoji, on: !!P.growth.badges[b.id] });
  }
  return out;
}
