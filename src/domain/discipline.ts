import type { TaskRef } from '@/domain/types';

/** Gün gün disiplin: seri günlerine göre seviye. Seviye yükseldikçe ana ekranda daha çok iş görünür. */
export type Level = { n: 1 | 2 | 3; name: string; goal: string; max: number };

export function disciplineLevel(streak: number): Level {
  if (streak < 4) return { n: 1, name: 'Başlangıç', goal: 'Bugün sadece küçük işler. 2 dakikalık bir işle başla.', max: 3 };
  if (streak < 8) return { n: 2, name: 'Alışkanlık', goal: 'Seri güzel gidiyor. Bugün birkaç iş daha.', max: 4 };
  return { n: 3, name: 'Düzen', goal: 'Düzen oturdu. Odanın tamamına bakalım.', max: 5 };
}

export type Cat = 'sabah' | 'oda' | 'ev';
export const CATS: Record<Cat, { title: string; hint: string }> = {
  sabah: { title: '🌅 Uyanınca', hint: '2-5 dakikalık küçük işler' },
  oda: { title: '🛏️ Odam', hint: 'Odanın düzeni' },
  ev: { title: '🏠 Ev', hint: 'Evin ortak işleri ve bakım' },
};

/** Her gün yapılan ve kısa süren işler "uyanınca" sayılır; ev bakımı "ev"; gerisi "odam". */
export function catOf(x: TaskRef): Cat {
  if (x.list === 'care') return 'ev';
  if (x.t.every <= 1 && (x.t.min ?? 5) <= 5) return 'sabah';
  return 'oda';
}

/** Seviyeye göre en çok `max` iş; kısa işler önde, sonra aciliyete göre. */
export function pickForLevel(due: TaskRef[], lv: Level): TaskRef[] {
  const rank = (x: TaskRef) => (catOf(x) === 'sabah' ? 0 : catOf(x) === 'oda' ? 1 : 2);
  return [...due].sort((a, b) => rank(a) - rank(b) || a.s.diff - b.s.diff).slice(0, lv.max);
}
