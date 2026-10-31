/** Moka'nın aksesuarları: ev seviyesiyle açılır, bir tanesi giyilir. Resim değil emoji katmanı. */
export type Wear = {
  id: string;
  name: string;
  emoji: string;
  /** Açılması için ev seviyesi (gün). */
  level: number;
  premium?: boolean;
  /** Moka'nın boyuna göre konumu: `top` baş, `neck` boyun, `side` kulak yanı. */
  at: 'top' | 'neck' | 'side';
};

export const WEARS: Wear[] = [
  { id: 'cicek', name: 'Papatya', emoji: '🌼', level: 0, at: 'side' },
  { id: 'fiyonk', name: 'Fiyonk', emoji: '🎀', level: 2, at: 'top' },
  { id: 'atki', name: 'Atkı', emoji: '🧣', level: 4, at: 'neck' },
  { id: 'sapka', name: 'Bere', emoji: '🧢', level: 6, at: 'top' },
  { id: 'gozluk', name: 'Gözlük', emoji: '👓', level: 8, at: 'top' },
  { id: 'tac', name: 'Taç', emoji: '👑', level: 12, premium: true, at: 'top' },
  { id: 'kiraz', name: 'Kiraz', emoji: '🍒', level: 3, premium: true, at: 'side' },
  { id: 'kar', name: 'Kar tanesi', emoji: '❄️', level: 5, premium: true, at: 'side' },
];

export const wearOf = (id: string | undefined) => WEARS.find(w => w.id === id);

/** Seviye yetiyor ve (Premium gerekiyorsa) üyelik var mı. */
export const wearOpen = (w: Wear, level: number, premium: boolean) => level >= w.level && (!w.premium || premium);
