import { dayKey, dayTs } from '@/domain/play';
import type { Play } from '@/domain/types';

/** Oda, kullanıcının gününü yansıtır: bugün yapılan iş = daha sıcak; günlerce uğramadı = loş ve tozlu. */
export type RoomState = { done: number; away: number; warm: number; dust: number };

export function roomState(P: Play, now = Date.now()): RoomState {
  const today = dayKey(now);
  const done = Object.values(P.awarded).filter(d => d === today).length;
  const last = P.days.length ? P.days[P.days.length - 1]! : null;
  const away = last ? Math.max(0, Math.round((dayTs(today) - dayTs(last)) / 86400000)) : 0;
  return { done, away, warm: Math.min(1, done / 5), dust: away >= 2 ? Math.min(1, (away - 1) / 4) : 0 };
}

/** 0 = tam gündüz, 1 = tam gece; sabah ve akşam yumuşak geçiş (06:00-08:00, 17:30-19:30). */
export function nightMix(now = new Date()): number {
  const h = now.getHours() + now.getMinutes() / 60;
  if (h < 6 || h >= 19.5) return 1;
  if (h < 8) return 1 - (h - 6) / 2;
  if (h < 17.5) return 0;
  return (h - 17.5) / 2;
}
