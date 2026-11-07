import type { DayKey, Growth } from './types';
import type { DiscAnswers, TypeId } from './kisilik';

/**
 * Mini öneriler: Moka tipine göre kısa, ev dışı ya da beden odaklı isteğe bağlı fikirler
 * (plank, su, yürüyüş, esneme, nefes, bir arkadaşa mesaj). Puan, seri ya da XP yok.
 * Durum `Growth.bonus` içinde `m:<id>` anahtarıyla tutulur: add (güne eklendi) / done / skip.
 */
export type MikroArea = 'spor' | 'saglik' | 'ruh' | 'gelisim' | 'para' | 'ev';
export type Mikro = { id: string; emoji: string; title: string; hint: string; min: number; area: MikroArea };

const M = (id: string, emoji: string, title: string, hint: string, min: number, area: MikroArea): Mikro => ({ id, emoji, title, hint, min, area });

export const MIKRO: Mikro[] = [
  M('su', '💧', 'Bir bardak su iç', 'Şimdi, olduğun yerde.', 1, 'saglik'),
  M('plank', '🧱', '30 saniye plank', 'Dizlerin üstünde de olur.', 1, 'spor'),
  M('squat', '🦵', '10 squat', 'Yavaş ve rahat.', 1, 'spor'),
  M('yuru', '🚶', '5 dakika dışarı çık', 'Kapıdan çık, bir tur at.', 5, 'saglik'),
  M('esne', '🙆', 'Boyun ve omuz esnet', 'Omuzlarını geriye yuvarla.', 2, 'saglik'),
  M('nefes', '🌬️', '1 dakika derin nefes', '4 saniye al, 6 saniye ver.', 1, 'ruh'),
  M('mesaj', '💌', 'Sevdiğin birine mesaj yaz', 'Tek cümle yeter.', 2, 'ruh'),
  M('pencere', '🪟', 'Pencereyi aç, hava al', 'Birkaç derin nefes.', 1, 'ruh'),
  M('ekran', '👀', 'Ekrandan uzağa bak', '20 saniye, uzak bir noktaya.', 1, 'saglik'),
  M('minnet', '🙏', 'Bugünkü güzel bir şeyi yaz', 'Küçük olabilir.', 2, 'ruh'),
  M('ogren', '🧠', 'Yeni bir kelime ya da bilgi öğren', 'Bir tanesi yeter.', 3, 'gelisim'),
  M('masa', '🧹', 'Masanı 3 dakikada topla', 'Sadece üstü.', 3, 'ev'),
  M('plan', '📝', 'Yarın için tek bir iş yaz', 'Yalnızca bir tane.', 2, 'gelisim'),
  M('harca', '🪙', 'Bugün harcadığın en son şeyi yaz', 'Yargısız, sadece not.', 2, 'para'),
  M('saat', '⏱️', '10 dakika tek işe odaklan', 'Telefon başka odada.', 10, 'gelisim'),
  M('uyku', '😴', 'Bu akşam ekranı 30 dk erken kapat', 'Uykun sana teşekkür eder.', 1, 'saglik'),
  M('yapma', '☕', 'Hiçbir şey yapmadan bir kahve iç', 'Telefon yok, 5 dakika.', 5, 'ruh'),
  M('erken', '⚡', 'Beklettiğin küçük işi hemen yap', '2 dakikadan kısa olanı.', 2, 'ev'),
];

/** Tip başına tercih sırası: ilk üçü önce önerilir, alan seçimine göre öne alınır. */
const BY_TYPE: Record<TypeId, string[]> = {
  planli: ['plan', 'su', 'plank', 'esne', 'ekran', 'harca', 'uyku', 'masa'],
  atik: ['squat', 'yuru', 'plank', 'su', 'erken', 'esne', 'nefes', 'mesaj'],
  sakin: ['su', 'nefes', 'yuru', 'esne', 'pencere', 'mesaj', 'yapma', 'minnet'],
  odakli: ['saat', 'su', 'ekran', 'esne', 'plank', 'ogren', 'uyku', 'plan'],
  dalgin: ['nefes', 'su', 'masa', 'ekran', 'yuru', 'squat', 'minnet', 'erken'],
  hirsli: ['plank', 'squat', 'plan', 'saat', 'nefes', 'yapma', 'su', 'uyku'],
  tembel: ['su', 'pencere', 'esne', 'yuru', 'mesaj', 'yapma', 'nefes', 'minnet'],
  dengeli: ['su', 'plank', 'yuru', 'nefes', 'mesaj', 'esne', 'ogren', 'minnet'],
};

const KEYS: Record<string, MikroArea> = { spor: 'spor', saglik: 'saglik', ruh: 'ruh', gelisim: 'gelisim', para: 'para', ev: 'ev' };

const dayNum = (k: DayKey) => {
  const [y, m, d] = k.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
};

/** Bugünün 3 önerisi: tipin listesi, kullanıcının seçtiği alanlar öne, gün geçtikçe döner (deterministik). */
export function mikroToday(day: DayKey, type: TypeId | null | undefined, answers?: DiscAnswers): Mikro[] {
  const pool = BY_TYPE[type ?? 'dengeli'].map(id => MIKRO.find(m => m.id === id)!).filter(Boolean);
  const raw = answers?.areas;
  const areas = (Array.isArray(raw) ? raw : []).map(a => KEYS[a]).filter(Boolean);
  // Odak süresi ya da vakit kısaysa en uzun işleri sona it.
  const budget = Number(answers?.budget) || 30;
  const maxMin = budget <= 15 ? 3 : 10;
  const ranked = [...pool].sort((a, b) => score(b, areas, maxMin) - score(a, areas, maxMin));
  const top = ranked.slice(0, 6);
  const n = dayNum(day);
  return [0, 1, 2].map(i => top[(n + i) % top.length]);
}

const score = (m: Mikro, areas: MikroArea[], maxMin: number) => (areas.includes(m.area) ? 2 : 0) + (m.min <= maxMin ? 1 : 0);

export type MikroState = 'add' | 'done' | 'skip' | null;
export const mikroState = (G: Growth, day: DayKey, id: string): MikroState => (G.bonus?.[day]?.['m:' + id] as MikroState) ?? null;

/** Taslak `Growth` üzerinde işaretler; aynı değere tekrar dokunmak işareti kaldırır. */
export function setMikro(G: Growth, day: DayKey, id: string, v: 'add' | 'done' | 'skip') {
  const bonus = { ...(G.bonus ?? {}) };
  const cur = { ...(bonus[day] ?? {}) };
  const k = 'm:' + id;
  if (cur[k] === v) delete cur[k];
  else cur[k] = v;
  bonus[day] = cur;
  const keep = Object.keys(bonus).sort().slice(-60);
  G.bonus = Object.fromEntries(keep.map(d => [d, bonus[d]]));
}
