import type { ImageSourcePropType } from 'react-native';

import { MOKA_ASSETS, MOKA_QUOTES, ROOM_POSE, type MokaPose } from '@/constants/moka';

import { allTasks, doneToday, homeScore, placeOf, shopItems } from './logic';
import { dayKey, progressOf } from './play';
import { tipOfDay } from './tips';
import type { AppState, ModeKind, RoomType, TaskList } from './types';

/**
 * Moka'nın o anki pozu ve sözü. Seçim saf bir fonksiyon: önce evin durumu (`mokaStatus`) çıkarılır,
 * sonra `pickMoka` kurallara göre poz ve söz seçer. Ekranlar `useMokaState`, widget ve bildirimler
 * `getWidgetMokaPayload` kullanır.
 */

/** Moka'nın karar verirken baktığı her şey. Widget ya da bildirim de kendi değerleriyle doldurabilir. */
export type MokaHouseStatus = {
  /** Gecikmiş iş sayısı. */
  late: number;
  /** Bugün yapılması gereken iş (gecikenler dahil). */
  due: number;
  /** Bugün tamamlanan iş. */
  done: number;
  /** Ev puanı (0-100, odaların temizlik yüzdesi). */
  score: number;
  streak: number;
  /** Alışveriş listesinde (az ya da bitti) ürün sayısı. */
  shop: number;
  mode: ModeKind | null;
  /** En acil işin yeri: oda adı, türü (ev bakımında null) ve listesi. */
  next: { room: string; type: RoomType | null; list: TaskList } | null;
  /** Açık oda ekranı (varsa): o odanın adı, türü ve bekleyen iş sayısı. */
  room: { name: string; type: RoomType; due: number } | null;
  /** Yerel saat (0-23). */
  hour: number;
  /** Günün anahtarı; aynı gün aynı söz seçilsin diye. */
  day: string;
};

export type MokaState = { pose: MokaPose; title: string; message: string };
export type MokaPayload = MokaState & { image: ImageSourcePropType };

export function mokaStatus(S: AppState, now = Date.now(), roomId?: string | null): MokaHouseStatus {
  const refs = allTasks(S, now);
  const due = refs.filter(x => x.s.k !== 'ok').sort((a, b) => a.s.diff - b.s.diff);
  const first = due[0];
  const place = first ? placeOf(S, first.rid) : null;
  const room = roomId ? S.rooms[roomId] : undefined;
  return {
    late: due.filter(x => x.s.k === 'late').length,
    due: due.length,
    done: refs.filter(x => doneToday(x.t, now)).length,
    score: homeScore(S, now),
    streak: progressOf(S.play, now).streak,
    shop: shopItems(S).length,
    mode: S.mode?.k ?? null,
    next: first && place ? { room: place.name, type: place.type, list: first.list } : null,
    room: room && roomId ? { name: room.name, type: room.type, due: due.filter(x => x.rid === roomId).length } : null,
    hour: new Date(now).getHours(),
    day: dayKey(now),
  };
}

const MODE_POSE: Record<ModeKind, MokaPose> = { tatil: 'blanket', yogun: 'rest', misafir: 'dusting', bayram: 'checklist' };

/** Durumdan poz: önce mod, sonra gecikme, sonra açık oda, sonra günün akışı. */
export function pickPose(h: MokaHouseStatus): { pose: MokaPose; room?: string; n?: number } {
  const night = h.hour >= 22 || h.hour < 5;
  if (h.mode) return { pose: MODE_POSE[h.mode], room: h.room?.name ?? h.next?.room };
  if (h.late >= 5) return { pose: 'panicked', n: h.late };
  if (h.late >= 3) return { pose: 'shocked', n: h.late };
  if (h.room) {
    if (h.room.due) return { pose: ROOM_POSE[h.room.type], room: h.room.name, n: h.room.due };
    return { pose: 'sparkling_complete', room: h.room.name };
  }
  if (h.late > 0) return { pose: 'begging', n: h.due };
  if (h.due > 0) {
    if (night) return { pose: 'sleepy' };
    if (h.hour >= 17 && h.done === 0) return { pose: 'sassy', n: h.due };
    const n = h.next;
    const pose = !n ? 'checklist' : n.list === 'plants' ? 'plants' : n.type ? ROOM_POSE[n.type] : 'maintenance';
    return { pose, room: n?.room, n: h.due };
  }
  if (h.done > 0) return h.streak > 0 && h.streak % 7 === 0 ? { pose: 'party', n: h.streak } : { pose: 'sparkling_complete' };
  if (h.score < 55) return { pose: 'analyzing' };
  if (h.shop > 0 && h.hour >= 10 && h.hour < 20) return { pose: 'chef' };
  if (night) return { pose: 'sleepy' };
  if (h.hour < 12) return { pose: 'happy' };
  if (h.hour >= 17) return { pose: 'cozy_plant' };
  return { pose: 'wink' };
}

/** Basit, kararlı bir karışım: aynı gün ve pozda hep aynı söz. */
function hash(s: string) {
  let x = 0;
  for (let i = 0; i < s.length; i++) x = (x * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(x);
}

const fill = (s: string, n: number, room: string) => s.replace(/\{n\}/g, String(n)).replace(/\{oda\}/g, room);

/** Poz ve söz. `shift` aynı pozun diğer sözlerine geçmek için (ör. Moka'ya dokununca). */
export function pickMoka(h: MokaHouseStatus, shift = 0): MokaState {
  const { pose, room, n } = pickPose(h);
  const pool = MOKA_QUOTES[pose];
  const q = pool[(hash(h.day + pose) + shift) % pool.length];
  const r = room ?? 'Ev';
  return { pose, title: fill(q.title, n ?? h.due, r), message: fill(q.message, n ?? h.due, r) };
}

/**
 * Ana ekran widget'ı ve bildirimler için hazır paket: PNG (require ile gelen yerel görsel), başlık ve mesaj.
 * Durum `mokaStatus(S, now)` ile ya da elle verilebilir.
 */
export function getWidgetMokaPayload(houseStatus: MokaHouseStatus): MokaPayload {
  const m = pickMoka(houseStatus);
  return { ...m, image: MOKA_ASSETS[m.pose] };
}

/** Günün cümlesindeki kelimeye göre iş pozu; eşleşme yoksa spor cümlesinde neşeli, ev cümlesinde göz kırpan Moka. */
const TIP_POSE: [RegExp, MokaPose][] = [
  [/süpür|halı/i, 'vacuuming'],
  [/toz/i, 'dusting'],
  [/bulaşık|tezgâh/i, 'dishes'],
  [/mutfak|buzdolab|yemek/i, 'chef'],
  [/çamaşır|kıyafet|ütü|dolap|çarşaf/i, 'laundry'],
  [/bitki|sula/i, 'plants'],
  [/çöp|bağış/i, 'trash'],
  [/banyo|lavabo|ayna|cam|havlu/i, 'mirror'],
  [/uyku|dinlen|yatak/i, 'rest'],
  [/liste|işaret|adım|küçük iş/i, 'checklist'],
  [/havalandır|pencere|perde|çay/i, 'cozy_plant'],
];

/** Moka'nın söylediği günün cümlesi ve ona uyan poz. */
export function mokaTip(now = Date.now()): { pose: MokaPose; text: string } {
  const tip = tipOfDay(now);
  const home = tip.emoji === '🏡';
  const hit = home ? TIP_POSE.find(([re]) => re.test(tip.text)) : undefined;
  return { pose: hit ? hit[1] : home ? 'wink' : 'happy', text: tip.text };
}

/** Durum pozları içinde "sakin" olanlar: bunlarda Moka günün cümlesine uyan pozu alır. */
export const CALM_POSES: readonly MokaPose[] = ['happy', 'wink', 'cozy_plant'];
