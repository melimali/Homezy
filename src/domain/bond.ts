import { ITEMS, type ItemId } from './items';
import { dayKey } from './play';
import { placeItem } from './look';
import { potState } from './coffee';
import type { AppState, DayKey, Play } from './types';

/**
 * Moka ile bağ: günde bir kere streak'teki kahveyi Moka'ya verirsin, Moka sevinir.
 * Düzenli verdikçe nadiren ev eşyası hediye eder: ilk hediye 7 kahveden sonra, sonrakiler biraz daha seyrek
 * (7, 10, 13, … kahve). Hediyeler sadece ücretsiz, ucuz eşyalardır; puan harcanmaz, sunucuya yazılmaz.
 */
export const GIFT_FIRST = 7;
export const GIFT_STEP = 3;

export const bondOf = (P: Play) => P.bond ?? { given: [], gifts: [] };

/** Bir sonraki hediye için gereken toplam kahve sayısı (önceki hediyelerden sonra). */
const need = (gifts: number) => GIFT_FIRST + GIFT_STEP * gifts;
/** Son hediyeden bu yana verilen kahve sayısı. */
function sinceGift(P: Play): number {
  const b = bondOf(P);
  const last = b.gifts[b.gifts.length - 1]?.day;
  return last ? b.given.filter(d => d > last).length : b.given.length;
}
/** Bir sonraki hediyeye kaç kahve kaldı. */
export const toNextGift = (P: Play) => Math.max(0, need(bondOf(P).gifts.length) - sinceGift(P));

/** Bugün kahve verilebilir mi: sürahi soğuk değilse ve bugün verilmediyse. */
export function canGiveCoffee(P: Play, now = Date.now()): boolean {
  const s = potState(P, now);
  if (s === 'cold' || s === 'first') return false;
  return !bondOf(P).given.includes(dayKey(now));
}

/** Hediye havuzu: ücretsiz, 80 puana kadar, eşya olarak odaya konan, henüz sahip olunmayan şeyler. */
export function giftPool(owned: string[]): ItemId[] {
  return ITEMS.filter(i => !i.premium && i.price <= 80 && !owned.includes(i.id)).map(i => i.id);
}

/** Eşyayı evde ilk boş bloğa koyar (yoksa depoda kalır). */
function dropInHome(S: AppState, id: string) {
  const n = S.cells.length;
  for (let c = 0; c < n; c++) {
    const rid = S.cells[c];
    if (!rid) continue;
    if (S.play.owned.some(o => S.play.placed[o] === rid && S.play.spots?.[o] === c)) continue;
    placeItem(S, id, c, 0);
    return rid;
  }
  S.play.placed[id] = null;
  return null;
}

export type GiveResult = { ok: boolean; gift?: { id: ItemId; room: string | null } };

/** Kahveyi Moka'ya verir. Hediye hakkı dolduysa eşyayı sahipliğe ekler ve eve koyar. */
export function giveCoffee(S: AppState, now = Date.now()): GiveResult {
  const P = S.play;
  if (!canGiveCoffee(P, now)) return { ok: false };
  const day: DayKey = dayKey(now);
  const b = (P.bond ||= { given: [], gifts: [] });
  b.given = [...b.given, day].slice(-400);
  if (toNextGift(P) > 0) return { ok: true };
  const pool = giftPool(P.owned);
  if (!pool.length) return { ok: true };
  // Sabit ama kişiden kişiye değişen seçim: gün sayısı + hediye sayısı ile sıra.
  const id = pool[(b.given.length * 7 + b.gifts.length * 3) % pool.length]!;
  b.gifts = [...b.gifts, { id, day }];
  if (!P.owned.includes(id)) P.owned = [...P.owned, id];
  return { ok: true, gift: { id, room: dropInHome(S, id) } };
}
