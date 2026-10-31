import type { AppState } from './types';

/**
 * Evin görünümü (Evini kendine benzet): oda başına zemin ve duvar, pencere sayısı, dış cephe rengi.
 * `play.look` içinde durur, JSON olarak kaydedilir (şema değişmez). Çizimi `House3D.tsx`'te.
 * Ücretsiz seçenekler bol; `premium` olanlar sadece ek çeşit, ilerleme duvarı değil.
 */
export type Swatch = { id: string; name: string; emoji: string; color: string; alt?: string; premium?: boolean };

export const FLOORS: Swatch[] = [
  { id: 'parke', name: 'Parke', emoji: '🪵', color: '#D3B99A', alt: '#CBAF8E' },
  { id: 'acik', name: 'Açık meşe', emoji: '🌾', color: '#E6D2B0', alt: '#DEC9A4' },
  { id: 'koyu', name: 'Koyu ceviz', emoji: '🌰', color: '#9A7658', alt: '#8F6D50' },
  { id: 'fayans', name: 'Fayans', emoji: '⬜', color: '#E9EEF0', alt: '#D9E1E5' },
  { id: 'gri', name: 'Beton', emoji: '🩶', color: '#B9BCC0', alt: '#B0B3B8' },
  { id: 'hali_mavi', name: 'Mavi halı', emoji: '🟦', color: '#9CB9D0' },
  { id: 'hali_pembe', name: 'Pembe halı', emoji: '🩷', color: '#E9B7C0' },
  { id: 'hali_yesil', name: 'Yeşil halı', emoji: '🟩', color: '#A9CDA8' },
  { id: 'mermer', name: 'Mermer', emoji: '🤍', color: '#F0EDE8', alt: '#E2DED8', premium: true },
  { id: 'dama', name: 'Dama', emoji: '♟️', color: '#F2EFEA', alt: '#4A4F5C', premium: true },
  { id: 'terrakota', name: 'Terrakota', emoji: '🧱', color: '#C98A6B', alt: '#BE7F61', premium: true },
];

export const WALLS: Swatch[] = [
  { id: 'beyaz', name: 'Beyaz', emoji: '🤍', color: '#FAF8F4' },
  { id: 'krem', name: 'Krem', emoji: '🍦', color: '#F3E8D3' },
  { id: 'mint', name: 'Mint', emoji: '🌿', color: '#D8EBDD' },
  { id: 'mavi', name: 'Bebek mavisi', emoji: '🫧', color: '#D3E4EF' },
  { id: 'pembe', name: 'Pudra', emoji: '🌸', color: '#F4D9DA' },
  { id: 'sari', name: 'Limon', emoji: '🍋', color: '#F6EBB8' },
  { id: 'lavanta', name: 'Lavanta', emoji: '💜', color: '#E0D8F0', premium: true },
  { id: 'adacayi', name: 'Adaçayı', emoji: '🍃', color: '#B8CDB5', premium: true },
  { id: 'toprak', name: 'Toprak', emoji: '🏺', color: '#E1C4B3', premium: true },
  { id: 'lacivert', name: 'Lacivert', emoji: '🌙', color: '#5B6786', premium: true },
];

export const FACADES: Swatch[] = [
  { id: 'varsayilan', name: 'Odanın rengi', emoji: '🎨', color: '' },
  ...WALLS.slice(0, 6),
  ...WALLS.slice(6),
  { id: 'tugla', name: 'Tuğla', emoji: '🧱', color: '#DDA48C' },
];

export type WindowMode = 0 | 1 | 2;
export const WINDOW_MODES: { v: WindowMode; label: string; emoji: string }[] = [
  { v: 0, label: 'Yok', emoji: '🧱' },
  { v: 1, label: 'Normal', emoji: '🪟' },
  { v: 2, label: 'Bol', emoji: '☀️' },
];

export type RoomLook = { floor?: string; wall?: string; win?: WindowMode };
export type HouseLook = { rooms: Record<string, RoomLook>; facade?: string };

export const emptyLook = (): HouseLook => ({ rooms: {} });

const find = (list: Swatch[], id?: string) => list.find(s => s.id === id);
export const floorOf = (S: AppState, rid: string) => find(FLOORS, S.play?.look?.rooms?.[rid]?.floor);
export const wallOf = (S: AppState, rid: string) => find(WALLS, S.play?.look?.rooms?.[rid]?.wall);
export const winOf = (S: AppState, rid: string): WindowMode => S.play?.look?.rooms?.[rid]?.win ?? 1;
export const facadeOf = (S: AppState) => {
  const f = find(FACADES, S.play?.look?.facade);
  return f && f.color ? f : undefined;
};

/** Odanın görünümünü değiştirir (yerinde). `undefined` değer varsayılana döner. */
export function setRoomLook(S: AppState, rid: string, patch: RoomLook) {
  const look = (S.play.look ||= emptyLook());
  const next = { ...(look.rooms[rid] || {}), ...patch };
  for (const k of Object.keys(next) as (keyof RoomLook)[]) if (next[k] === undefined) delete next[k];
  look.rooms[rid] = next;
}

/** Aynı görünümü bütün odalara uygular. */
export function applyLookToAll(S: AppState, patch: RoomLook) {
  for (const id of S.order) setRoomLook(S, id, patch);
}

/**
 * Eşyanın bloğu. `play.spots` değeri kat × blok sayısı + blok sırası: 2. kattakiler `cols * rows` kadar kaydırılır.
 * Plan büyüyüp küçülünce eski yer geçersiz kalabilir; o zaman eşya odada boş bir yere kendisi dizilir.
 */
export function spotOf(S: AppState, item: string): { floor: 0 | 1; i: number } | null {
  const v = S.play.spots?.[item];
  if (v == null) return null;
  const n = S.cols * S.rows;
  return v >= n ? { floor: 1, i: v - n } : { floor: 0, i: v };
}

/** Eşyayı bir bloğa koyar; blok başka odadaysa eşya o odaya geçer. */
export function placeItem(S: AppState, item: string, cell: number, floor: 0 | 1 = 0) {
  const rid = (floor === 1 ? S.cells2 ?? [] : S.cells)[cell];
  if (!rid) return;
  S.play.placed[item] = rid;
  (S.play.spots ||= {})[item] = cell + (floor === 1 ? S.cols * S.rows : 0);
}

/** Eşyayı yerinden alır (depoya). */
export function storeItem(S: AppState, item: string) {
  S.play.placed[item] = null;
  if (S.play.spots) delete S.play.spots[item];
}

/** Bloktaki eşyalar (seçili katta). */
export function itemsAt(S: AppState, cell: number, floor: 0 | 1 = 0) {
  const cells = floor === 1 ? S.cells2 ?? [] : S.cells;
  return S.play.owned.filter(id => {
    const sp = spotOf(S, id);
    return sp && sp.floor === floor && sp.i === cell && S.play.placed[id] === cells[cell];
  });
}
