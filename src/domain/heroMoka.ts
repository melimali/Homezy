import type { MokaPose } from '@/constants/moka';

/** Ana ekran sahnesi: bir Moka sahnesi + o sahneye yakışan hareket ve süs. */
export type HeroKey = MokaPose | 'sofa' | 'kitchen' | 'study';
export type HeroMotion = 'breath' | 'bob' | 'sway' | 'zoom' | 'beat';
export type HeroFx = 'zzz' | 'hearts' | 'notes' | 'sparkle' | 'steam' | 'stars' | 'bubbles' | 'leaves' | 'rain' | 'snow' | 'none';
export type HeroSlot = 'morning' | 'day' | 'evening' | 'night';
export type HeroFeel = 'calm' | 'busy' | 'proud' | 'tired' | 'sad';
export type HeroSky = 'clear' | 'cloudy' | 'rain' | 'snow' | 'storm' | 'fog';

export type HeroCtx = {
  hour: number;
  feel: HeroFeel;
  sky: HeroSky;
  streak: number;
  level: number;
  /** Son yapılan / sıradaki işe uyan poz (varsa). */
  taskPose?: MokaPose;
  /** Modlar (misafir, tatil, yoğun/hasta, bayram) için poz. */
  modePose?: MokaPose;
};

type Def = {
  key: HeroKey;
  motion: HeroMotion;
  fx: HeroFx;
  slots?: HeroSlot[];
  feels?: HeroFeel[];
  skies?: HeroSky[];
  minStreak?: number;
  minLevel?: number;
};

const ALL: Def[] = [
  // Sabah
  { key: 'sipping', motion: 'breath', fx: 'steam', slots: ['morning'] },
  { key: 'lazy_coffee', motion: 'bob', fx: 'steam', slots: ['morning', 'day'], feels: ['calm', 'tired'] },
  { key: 'cheers', motion: 'beat', fx: 'sparkle', slots: ['morning'], feels: ['calm', 'proud'] },
  { key: 'sunny_plant', motion: 'sway', fx: 'leaves', slots: ['morning', 'day'], skies: ['clear'] },
  { key: 'watering', motion: 'sway', fx: 'bubbles', slots: ['morning'], feels: ['calm'] },
  { key: 'wink', motion: 'bob', fx: 'sparkle', slots: ['morning', 'day'] },
  // Gün
  { key: 'sofa', motion: 'breath', fx: 'steam', slots: ['day', 'evening'], feels: ['calm'] },
  { key: 'reading', motion: 'breath', fx: 'none', slots: ['day', 'evening'], feels: ['calm'] },
  { key: 'music', motion: 'sway', fx: 'notes', slots: ['day', 'evening'], feels: ['calm', 'proud'] },
  { key: 'checklist', motion: 'bob', fx: 'none', slots: ['morning', 'day'], feels: ['busy', 'calm'] },
  { key: 'todo', motion: 'bob', fx: 'none', slots: ['morning', 'day'], feels: ['busy'] },
  { key: 'study', motion: 'breath', fx: 'none', slots: ['day'], feels: ['busy', 'calm'] },
  { key: 'laptop', motion: 'bob', fx: 'none', slots: ['day'], feels: ['busy', 'calm'] },
  { key: 'kitchen', motion: 'bob', fx: 'steam', slots: ['morning', 'day', 'evening'] },
  { key: 'baking', motion: 'sway', fx: 'steam', slots: ['day', 'evening'], feels: ['calm', 'proud'] },
  { key: 'cookie', motion: 'sway', fx: 'sparkle', slots: ['day', 'evening'], feels: ['calm', 'proud'] },
  { key: 'chef', motion: 'sway', fx: 'steam', slots: ['day', 'evening'], feels: ['calm', 'busy'] },
  { key: 'pizza', motion: 'beat', fx: 'sparkle', slots: ['evening'], feels: ['calm', 'proud'] },
  { key: 'sweeping', motion: 'sway', fx: 'none', slots: ['morning', 'day'], feels: ['busy'] },
  { key: 'vacuuming', motion: 'sway', fx: 'none', slots: ['day'], feels: ['busy'] },
  { key: 'dusting', motion: 'sway', fx: 'sparkle', slots: ['day'], feels: ['busy'] },
  { key: 'spray_clean', motion: 'sway', fx: 'bubbles', slots: ['day'], feels: ['busy'] },
  { key: 'scrubbing', motion: 'sway', fx: 'bubbles', slots: ['day'], feels: ['busy'] },
  { key: 'dishes', motion: 'bob', fx: 'bubbles', slots: ['day', 'evening'], feels: ['busy'] },
  { key: 'laundry', motion: 'sway', fx: 'bubbles', slots: ['day'], feels: ['busy'] },
  { key: 'laundry_basket', motion: 'bob', fx: 'none', slots: ['day'], feels: ['busy'] },
  { key: 'trash', motion: 'bob', fx: 'none', slots: ['evening'], feels: ['busy'] },
  { key: 'trash_bag', motion: 'bob', fx: 'none', slots: ['evening'], feels: ['busy'] },
  { key: 'dustpan', motion: 'sway', fx: 'none', slots: ['day'], feels: ['busy'] },
  { key: 'handyman', motion: 'sway', fx: 'sparkle', slots: ['day'], feels: ['busy'], minLevel: 3 },
  { key: 'maintenance', motion: 'sway', fx: 'none', slots: ['day'], feels: ['busy'] },
  { key: 'plants', motion: 'sway', fx: 'leaves', slots: ['morning', 'day'], feels: ['calm'] },
  { key: 'iced_vacuum', motion: 'sway', fx: 'snow', slots: ['day'], skies: ['clear', 'cloudy'] },
  { key: 'mirror', motion: 'bob', fx: 'sparkle', slots: ['morning', 'evening'] },
  { key: 'analyzing', motion: 'zoom', fx: 'none', slots: ['day'], feels: ['busy'] },
  // Başarı
  { key: 'thumbs_up', motion: 'beat', fx: 'sparkle', feels: ['proud', 'calm'] },
  { key: 'sparkling_complete', motion: 'beat', fx: 'stars', feels: ['proud'] },
  { key: 'party', motion: 'beat', fx: 'stars', feels: ['proud'], minStreak: 3 },
  { key: 'birthday', motion: 'beat', fx: 'stars', feels: ['proud'], minStreak: 7 },
  { key: 'love', motion: 'beat', fx: 'hearts', feels: ['proud', 'calm'], minStreak: 2 },
  { key: 'amazed', motion: 'zoom', fx: 'stars', feels: ['proud'], minLevel: 2 },
  { key: 'happy', motion: 'bob', fx: 'sparkle', feels: ['calm', 'proud'] },
  { key: 'sassy', motion: 'sway', fx: 'none', feels: ['proud', 'calm'], minStreak: 5 },
  // Yoğun / gecikme
  { key: 'panicked', motion: 'beat', fx: 'none', feels: ['busy'] },
  { key: 'shocked', motion: 'beat', fx: 'none', feels: ['busy'] },
  { key: 'begging', motion: 'bob', fx: 'none', feels: ['busy', 'sad'] },
  { key: 'unimpressed', motion: 'zoom', fx: 'none', feels: ['sad', 'busy'] },
  // Akşam / gece / yağmur
  { key: 'plaid_coffee', motion: 'breath', fx: 'steam', slots: ['evening', 'night'], skies: ['rain', 'storm', 'snow', 'fog', 'cloudy'] },
  { key: 'blanket_coffee', motion: 'breath', fx: 'steam', slots: ['evening', 'night'], skies: ['rain', 'snow', 'storm'] },
  { key: 'blanket', motion: 'breath', fx: 'zzz', slots: ['evening', 'night'], feels: ['tired', 'calm'] },
  { key: 'scarf', motion: 'sway', fx: 'snow', slots: ['morning', 'day', 'evening'], skies: ['snow', 'fog'] },
  { key: 'cozy_plant', motion: 'breath', fx: 'leaves', slots: ['evening'], feels: ['calm'] },
  { key: 'bubble_bath', motion: 'bob', fx: 'bubbles', slots: ['evening', 'night'], feels: ['tired', 'calm'] },
  { key: 'shower', motion: 'bob', fx: 'bubbles', slots: ['morning', 'evening'] },
  { key: 'rest', motion: 'breath', fx: 'zzz', slots: ['evening', 'night'], feels: ['tired', 'calm'] },
  { key: 'sleepy', motion: 'breath', fx: 'zzz', slots: ['night', 'morning'], feels: ['tired', 'calm'] },
  { key: 'nap', motion: 'breath', fx: 'zzz', slots: ['night', 'day'], feels: ['tired'] },
];

export const HERO_COUNT = ALL.length;
const MOTION_OF = new Map(ALL.map(d => [d.key, d]));
export const heroDef = (k: HeroKey): Def => MOTION_OF.get(k) ?? ALL[0];

export const heroSlot = (h: number): HeroSlot => (h >= 5 && h < 11 ? 'morning' : h < 17 ? 'day' : h < 22 ? 'evening' : 'night');

/** Oturum boyunca (sekme değişse de) son gösterilenler; art arda tekrarı önler. */
const recent: HeroKey[] = [];
const REMEMBER = 8;

function score(d: Def, c: HeroCtx): number {
  if (d.minStreak != null && c.streak < d.minStreak) return 0;
  if (d.minLevel != null && c.level < d.minLevel) return 0;
  let s = 1;
  const slot = heroSlot(c.hour);
  if (d.slots) s *= d.slots.includes(slot) ? 3 : 0.15;
  if (d.feels) s *= d.feels.includes(c.feel) ? 3 : 0.2;
  else if (c.feel === 'busy' || c.feel === 'sad') s *= 0.5;
  if (d.skies) s *= d.skies.includes(c.sky) ? 2.5 : 0.4;
  // Yağmur/kar günü açık hava pozları gerilir.
  if ((c.sky === 'rain' || c.sky === 'snow' || c.sky === 'storm') && d.key === 'sunny_plant') s *= 0.2;
  if (c.taskPose && d.key === c.taskPose) s *= 4;
  if (c.modePose && d.key === c.modePose) s *= 5;
  // Seri ve seviye: uzun seride kutlama pozları ağırlaşır.
  if (c.streak >= 7 && (d.fx === 'stars' || d.fx === 'hearts')) s *= 1.5;
  if (c.level >= 10 && (d.key === 'sofa' || d.key === 'cozy_plant' || d.key === 'sunny_plant')) s *= 1.3;
  const i = recent.lastIndexOf(d.key);
  if (i >= 0) s *= i >= recent.length - 1 ? 0 : 0.1 + 0.9 * (1 - (i + 1) / (recent.length + 1)) * 0.6;
  return s;
}

/** Duruma uyanları ağırlıklı seçer; son sekiz sahneyi pek tekrarlamaz, hemen öncekini asla. */
export function pickHero(c: HeroCtx, rnd: () => number = Math.random): HeroKey {
  const ws = ALL.map(d => score(d, c));
  const total = ws.reduce((a, b) => a + b, 0);
  let key: HeroKey = ALL[0].key;
  if (total > 0) {
    let r = rnd() * total;
    for (let i = 0; i < ALL.length; i++) {
      r -= ws[i];
      if (r <= 0 && ws[i] > 0) { key = ALL[i].key; break; }
    }
  }
  recent.push(key);
  if (recent.length > REMEMBER) recent.shift();
  return key;
}

export const lastHero = (): HeroKey | undefined => recent[recent.length - 1];
