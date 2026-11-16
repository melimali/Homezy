import type { DayKey, Growth } from './types';

/**
 * Bonus öneriler: günlük işler bitince spor, dizi, film, kitap için küçük, tamamen isteğe bağlı fikirler.
 * Yapmak ya da atlamak puan, seri veya XP'yi etkilemez; sadece `Growth.bonus` içinde işaretlenir.
 */
export type BonusCat = 'spor' | 'dizi' | 'film' | 'kitap';
export type BonusItem = { id: string; cat: BonusCat; emoji: string; title: string; hint: string };

export const BONUS_CATS: { id: BonusCat; emoji: string; name: string }[] = [
  { id: 'spor', emoji: '🏃', name: 'Spor' },
  { id: 'dizi', emoji: '📺', name: 'Dizi' },
  { id: 'film', emoji: '🎬', name: 'Film' },
  { id: 'kitap', emoji: '📖', name: 'Kitap' },
];

const B = (id: string, cat: BonusCat, emoji: string, title: string, hint: string): BonusItem => ({ id, cat, emoji, title, hint });

export const BONUS: BonusItem[] = [
  B('s1', 'spor', '🚶', '15 dakika yürüyüş', 'Telefonu cebine koy, biraz hava al.'),
  B('s2', 'spor', '🧘', '10 dakika esneme', 'Boyun, omuz ve sırtını gevşet.'),
  B('s3', 'spor', '💪', '20 şınav ya da squat', 'İstersen parçalara böl.'),
  B('s4', 'spor', '🪜', 'Asansör yerine merdiven', 'Bugün gördüğün her merdiveni çık.'),
  B('d1', 'dizi', '📺', 'Ted Lasso: bir bölüm', 'Nazik ve moral verici.'),
  B('d2', 'dizi', '🌍', 'Gezegenimiz: bir bölüm', 'Doğa manzaralarıyla sakin bir mola.'),
  B('d3', 'dizi', '🍜', 'Gece Yarısı Lokantası: bir bölüm', 'Sıcak, kısa hikâyeler.'),
  B('d4', 'dizi', '😂', 'Brooklyn Nine-Nine: bir bölüm', 'Gülmek de gelişimdir.'),
  B('f1', 'film', '🎬', 'Soul', 'Hayatın tadı küçük anlarda.'),
  B('f2', 'film', '🌸', 'Amélie', 'Küçük iyiliklerin büyüsü.'),
  B('f3', 'film', '🎓', 'Ölü Ozanlar Derneği', 'Anı yaşamak ve öğrenmek üzerine.'),
  B('f4', 'film', '🐭', 'Ratatouille', 'Tutku ve cesaret, aileyle de olur.'),
  B('k1', 'kitap', '📖', '10 sayfa oku', 'Elindeki kitaptan, ne olursa.'),
  B('k2', 'kitap', '🦊', 'Küçük Prens', 'Kısa, sıcak, her yaşta bir şey bırakır.'),
  B('k3', 'kitap', '🌱', 'Atomik Alışkanlıklar: bir bölüm', 'Küçük adımlarla büyük değişim.'),
  B('k4', 'kitap', '🐟', 'Küçük Kara Balık', '10 dakikada biter, bir ömür kalır.'),
];

const dayNum = (k: DayKey) => {
  const [y, m, d] = k.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
};

/** Bugünün önerisi: her kategoriden bir tane, gün geçtikçe döner (deterministik). */
export function bonusToday(day: DayKey): BonusItem[] {
  const n = dayNum(day);
  return BONUS_CATS.map(c => {
    const list = BONUS.filter(b => b.cat === c.id);
    return list[n % list.length];
  });
}

export const bonusState = (G: Growth, day: DayKey, cat: BonusCat) => G.bonus?.[day]?.[cat] ?? null;

/** Taslak `Growth` üzerinde işaretler; aynı değere tekrar dokunmak işareti kaldırır. Eski günleri temizler. */
export function setBonus(G: Growth, day: DayKey, cat: BonusCat, v: 'done' | 'skip') {
  const bonus = { ...(G.bonus ?? {}) };
  const cur = { ...(bonus[day] ?? {}) };
  if (cur[cat] === v) delete cur[cat];
  else cur[cat] = v;
  bonus[day] = cur;
  const keep = Object.keys(bonus).sort().slice(-60);
  G.bonus = Object.fromEntries(keep.map(k => [k, bonus[k]]));
}
