import { dateLocale } from '@/i18n/runtime';
import { DAY } from './constants';
import { allTasks, placeOf, uid } from './logic';
import { applyTaskAction } from '@/notifications/actions';
import { mokaLevel } from './mokaLevel';
import { dayKey, progressOf } from './play';
import type { AppState, DayKey } from './types';

/**
 * Moka sohbet botunun uygulama tarafı. Sunucu (supabase/functions/moka-chat) modelin araç çağrılarını
 * doğrulayıp `Action` olarak döner; burada ikinci kez, telefondaki gerçek veriye göre doğrulanır ve uygulanır.
 * Model asla doğrudan veriye dokunmaz.
 */

export type ChatAction =
  | { type: 'add_task'; room_id: string; name: string; every_days: number }
  | { type: 'complete_task'; task_id: string }
  | { type: 'snooze_task'; task_id: string }
  | { type: 'add_note'; day: DayKey; text: string }
  | { type: 'start_focus'; minutes: number; kind: string };

export type ChatMsg = { role: 'user' | 'assistant'; content: string };

export type ChatCtx = {
  today: DayKey;
  rooms: { id: string; name: string }[];
  tasks: { id: string; name: string; room: string; status: string }[];
  level: number;
  streak: number;
  late: number;
  due: number;
};

/** Sunucuya giden, kısa özet. Fotoğraf, ad, e-posta gibi kişisel veri yok; sadece oda ve iş adları. */
export function chatCtx(S: AppState, now = Date.now()): ChatCtx {
  const refs = allTasks(S, now);
  // Önce acil işler; sunucu en fazla 80 iş alıyor.
  const sorted = [...refs].sort((a, b) => a.s.diff - b.s.diff).slice(0, 80);
  return {
    today: dayKey(now),
    rooms: S.order.filter(id => S.rooms[id]).map(id => ({ id, name: S.rooms[id].name })),
    tasks: sorted.map(x => ({ id: x.t.id, name: x.t.name, room: placeOf(S, x.rid).name, status: x.s.label })),
    level: mokaLevel(S.play.moka).level,
    streak: progressOf(S.play, now).streak,
    late: refs.filter(x => x.s.k === 'late').length,
    due: refs.filter(x => x.s.k !== 'ok').length,
  };
}

export type Applied = { ok: boolean; line: string; focus?: { minutes: number; topic: string } };

const NOTE_CAP = 200;
/** Sunucudaki `start_focus` türleri → Odak ekranındaki konu hapları (src/app/odak.tsx, TOPICS). */
const FOCUS_KINDS: Record<string, { label: string; topic: string }> = {
  ders: { label: 'Ders', topic: '📚 Ders' },
  calisma: { label: 'Çalışma', topic: '💻 İş' },
  spor: { label: 'Spor', topic: '🧘 Diğer' },
  temizlik: { label: 'Temizlik', topic: '🧘 Diğer' },
};

/** Tek bir eylemi taslak state üzerinde uygular. Geçersizse `ok: false` döner, hiçbir şey değişmez. */
export function applyChatAction(D: AppState, a: ChatAction, now = Date.now(), mult = 1): Applied {
  switch (a.type) {
    case 'add_task': {
      const name = String(a.name ?? '').trim().slice(0, 60);
      const every = Math.floor(Number(a.every_days));
      const list = D.tasks[a.room_id];
      if (!D.rooms[a.room_id] || !list || !name || !(every >= 1 && every <= 365)) return { ok: false, line: '' };
      list.push({ id: uid(), name, every, last: null });
      return { ok: true, line: `➕ ${D.rooms[a.room_id].name}: ${name} (${every === 1 ? 'her gün' : `${every} günde bir`})` };
    }
    case 'complete_task': {
      const out = applyTaskAction(D, a.task_id, 'yaptim', now, mult);
      if (!out) return { ok: false, line: '' };
      return { ok: true, line: out.already ? `✓ ${out.name} zaten tamamdı` : `✅ ${out.name} tamam` };
    }
    case 'snooze_task': {
      const out = applyTaskAction(D, a.task_id, 'yapmadim', now);
      return out ? { ok: true, line: `⏰ ${out.name} yarına ertelendi` } : { ok: false, line: '' };
    }
    case 'add_note': {
      const text = String(a.text ?? '').trim().slice(0, 140);
      const t = Date.parse(`${a.day}T12:00:00`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(a.day)) || Number.isNaN(t) || !text) return { ok: false, line: '' };
      if (t < now - 366 * DAY || t > now + 731 * DAY) return { ok: false, line: '' };
      D.play.notes.push({ id: uid(), day: a.day, text, at: now });
      D.play.notes = D.play.notes.slice(-NOTE_CAP);
      return { ok: true, line: `📝 ${noteDayLabel(a.day, now)}: ${text}` };
    }
    case 'start_focus': {
      const minutes = Math.floor(Number(a.minutes));
      const kind = FOCUS_KINDS[a.kind];
      if (!kind || !(minutes >= 10 && minutes <= 90)) return { ok: false, line: '' };
      return { ok: true, line: `🍅 ${kind.label} odağı: ${minutes} dk`, focus: { minutes, topic: kind.topic } };
    }
  }
  return { ok: false, line: '' };
}

export function noteDayLabel(day: DayKey, now = Date.now()) {
  const today = dayKey(now);
  if (day === today) return 'Bugün';
  if (day === dayKey(now + DAY)) return 'Yarın';
  return new Date(`${day}T12:00:00`).toLocaleDateString(dateLocale(), { day: 'numeric', month: 'long' });
}
