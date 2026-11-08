import { waterOf, hKey } from './habits';
import { allTasks, placeOf, shopItems } from './logic';
import { mokaLevel } from './mokaLevel';
import { dayKey, progressOf } from './play';
import type { AppState, DayKey } from './types';

/**
 * Moka sohbet botunun uygulama tarafı. Sunucu (supabase/functions/moka-chat) modelin araç çağrılarını
 * doğrulayıp `Action` olarak döner; burada ikinci kez, telefondaki gerçek veriye göre doğrulanır ve uygulanır.
 * Model asla doğrudan veriye dokunmaz.
 */

export type ChatMsg = { role: 'user' | 'assistant'; content: string };

export type ChatCtx = {
  today: DayKey;
  rooms: { id: string; name: string }[];
  tasks: { id: string; name: string; room: string; status: string }[];
  level: number;
  streak: number;
  late: number;
  due: number;
  shop: string[];
  meds: { id: string; name: string }[];
  pets: { id: string; name: string; items: { id: string; name: string }[] }[];
  water: { n: number; goal: number };
};

/** Sunucuya giden, kısa özet. Fotoğraf, ad, e-posta gibi kişisel veri yok; sadece oda ve iş adları. */
export function chatCtx(S: AppState, now = Date.now()): ChatCtx {
  const refs = allTasks(S, now);
  // Sadece bekleyen işler (gecikmiş / bugün / yakında), acil olandan başlayarak; sunucu en fazla 20 iş alıyor.
  const open = refs.filter(x => x.s.k !== 'ok');
  const sorted = (open.length ? open : refs).sort((a, b) => a.s.diff - b.s.diff).slice(0, 20);
  return {
    today: dayKey(now),
    rooms: S.order.filter(id => S.rooms[id]).map(id => ({ id, name: S.rooms[id].name })),
    tasks: sorted.map(x => ({ id: x.t.id, name: x.t.name, room: placeOf(S, x.rid).name, status: x.s.label })),
    level: mokaLevel(S.play.moka).level,
    streak: progressOf(S.play, now).streak,
    late: refs.filter(x => x.s.k === 'late').length,
    due: refs.filter(x => x.s.k !== 'ok').length,
    shop: shopItems(S).slice(0, 15).map(x => x.x.name),
    meds: S.meds.slice(0, 8).map(m => ({ id: m.id, name: m.name })),
    pets: S.pets.slice(0, 5).map(p => ({ id: p.id, name: p.name, items: p.items.slice(0, 8).map(i => ({ id: i.id, name: i.name })) })),
    water: { n: waterOf(S.play.habits, hKey(now)), goal: S.play.habits.waterGoal },
  };
}

export { applyChatAction, describeAction, needsConfirm, noteDayLabel, type Applied, type ChatAction } from './chatTools';
