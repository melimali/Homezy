import { addDays, dayKey } from './play';
import type { Cloth, DayKey } from './types';

/**
 * Premium: haftalık kombin planı. Dolaptaki temiz parçalardan önümüzdeki 7 gün için kombin.
 * Kurallar basit: her gün bir üst + bir alt (ya da elbise / takım), varsa ayakkabı, soğuk
 * aylarda dış giyim. Parçalar sırayla döner, aynı parça üst üste iki gün gelmez.
 */
export type DayOutfit = { day: DayKey; pieces: Cloth[] };

const COLD_MONTHS = [0, 1, 2, 9, 10, 11];

export function weekOutfits(wardrobe: Cloth[], now = Date.now()): DayOutfit[] {
  const clean = wardrobe.filter(x => x.state === 'temiz');
  const of = (cat: string) => clean.filter(x => x.cat === cat);
  const tops = of('Üst'), bottoms = of('Alt'), dresses = of('Elbise / Takım'), shoes = of('Ayakkabı'), coats = of('Dış giyim');
  if (!dresses.length && !(tops.length && bottoms.length)) return [];
  const cold = COLD_MONTHS.includes(new Date(now).getMonth());
  const today = dayKey(now);
  const out: DayOutfit[] = [];
  let t = 0, b = 0, d = 0;
  for (let i = 0; i < 7; i++) {
    const pieces: Cloth[] = [];
    // Elbise / takım haftada iki-üç gün; üst-alt yoksa her gün.
    const useDress = dresses.length && (!(tops.length && bottoms.length) || i % 3 === 2);
    if (useDress) pieces.push(dresses[d++ % dresses.length]);
    else pieces.push(tops[t++ % tops.length], bottoms[b++ % bottoms.length]);
    if (shoes.length) pieces.push(shoes[i % shoes.length]);
    if (cold && coats.length) pieces.push(coats[i % coats.length]);
    out.push({ day: addDays(today, i), pieces });
  }
  return out;
}
