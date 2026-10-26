import type * as NotificationsTypes from 'expo-notifications';
import { Platform } from 'react-native';

import { loadState, saveState } from '@/data/db';
import { DAY } from '@/domain/constants';
import { allTasks, doneToday, placeOf, sod } from '@/domain/logic';
import { awardLocal, awardToast, dayKey, pruneLog, type AwardResult } from '@/domain/play';
import { limits } from '@/domain/premium';
import type { AppState, TaskList } from '@/domain/types';

/**
 * Bildirimden cevaplanan işler. Her iş bildiriminde iki düğme var:
 * - "Yaptım": uygulamadaki "Tamamladım" ile aynı; son yapılma tarihi bugün olur, puan ve seri işlenir.
 * - "Yapmadım": iş yarına ertelenir (uygulamadaki "Yarına ertele").
 * Düğmeler uygulamayı açmaz. Uygulama açıksa değişiklik doğrudan ekrana yansır; kapalıysa
 * Android'de arka plan görevi (`index.ts`) veriyi telefondaki veritabanında günceller. iOS'ta ve
 * arka plan görevi çalışamadığında cevap, uygulama bir sonraki açılışta işlenir.
 */
export const TASK_CATEGORY = 'gorev';
export const PLANT_CATEGORY = 'bitki';
export const DONE = 'yaptim';
export const SKIP = 'yapmadim';
export const FEEDBACK_CHANNEL = 'geri-bildirim';

export type TaskAction = typeof DONE | typeof SKIP;
type NotificationsModule = typeof NotificationsTypes;

/** Bildirime konan veri. `premium`: zamanlandığı andaki üyelik; arka planda abonelik bilinmiyor. */
export type TaskData = { url: string; tid: string; list: TaskList; premium: boolean };

export async function ensureCategories(N: NotificationsModule) {
  // Web'de ve bazı Expo Go sürümlerinde kategori desteği yok; o zaman bildirimler düğmesiz gelir.
  if (Platform.OS === 'web') return;
  const opts = { opensAppToForeground: false };
  await N.setNotificationCategoryAsync(TASK_CATEGORY, [
    { identifier: DONE, buttonTitle: '✅ Yaptım', options: opts },
    { identifier: SKIP, buttonTitle: '⏰ Yapmadım, yarın', options: opts },
  ]);
  await N.setNotificationCategoryAsync(PLANT_CATEGORY, [
    { identifier: DONE, buttonTitle: '💧 Suladım', options: opts },
    { identifier: SKIP, buttonTitle: '⏰ Sulamadım, yarın', options: opts },
  ]);
}

export type ActionOutcome = { name: string; result: AwardResult | null; already: boolean };

/**
 * İşi taslak state üzerinde tamamlar ya da yarına erteler. İş silinmişse null.
 * Aynı cevap iki kez gelse de (ör. hem arka plan görevi hem dinleyici) sonuç değişmez.
 */
export function applyTaskAction(D: AppState, tid: string, action: TaskAction, now: number, mult = 1): ActionOutcome | null {
  const ref = allTasks(D, now).find(x => x.t.id === tid);
  if (!ref) return null;
  const { t, rid, list } = ref;
  if (action === SKIP) {
    if (!doneToday(t, now)) t.snooze = sod(sod(now) + DAY + DAY / 2);
    return { name: t.name, result: null, already: false };
  }
  if (doneToday(t, now)) return { name: t.name, result: null, already: true };
  const p = placeOf(D, rid);
  t.last = now;
  t.snooze = null;
  const result = awardLocal(D, 'gorev', t.id, `${list === 'plants' ? '🪴' : p.emoji} ${p.name} · ${t.name}`, now, mult);
  pruneLog(D.play);
  return { name: t.name, result, already: false };
}

/** "Yaptım"dan sonra aynı bildirimin yerine konan sessiz teşekkür. */
export function feedbackFor(o: ActionOutcome): { title: string; body: string } | null {
  if (!o.result?.awarded) return null;
  return { title: `✅ ${o.name}`, body: awardToast(o.result, o.name) };
}

/** Bildirim cevabındaki veri. Android'in arka plan görevinde veri JSON metni olarak gelir. */
export function taskDataOf(content: { data?: unknown; dataString?: unknown } | undefined): TaskData | null {
  let data = content?.data as Partial<TaskData> | undefined;
  if (!data && typeof content?.dataString === 'string') {
    try {
      data = JSON.parse(content.dataString) as Partial<TaskData>;
    } catch {
      return null;
    }
  }
  if (!data || typeof data.tid !== 'string' || typeof data.list !== 'string') return null;
  return { url: data.url ?? '/bugun', tid: data.tid, list: data.list, premium: !!data.premium };
}

/** Uygulama açıkken store'a giden yol. Kök layout'taki `useNotificationSync` kaydeder. */
type Live = { update: (fn: (draft: AppState) => void) => AppState; onOutcome?: (o: ActionOutcome, action: TaskAction) => void };
let live: Live | null = null;
export const setLiveStore = (l: Live | null) => void (live = l);
/** Uygulama açıksa store; ana ekran widget'ı da değişikliği bunun üzerinden yapar. */
export const liveStore = () => live;

/** Aynı cevabı iki kez işleme (arka plan görevi ve dinleyici aynı anda gelebilir). */
const handled = new Set<string>();

/**
 * Bir bildirim düğmesine basılınca çağrılır. Uygulama açıksa store üzerinden, değilse doğrudan
 * veritabanında değiştirir. Sonra bildirimi kaldırır ya da puanı gösteren sessiz bir bildirimle değiştirir.
 */
export async function handleTaskAction(
  N: NotificationsModule,
  r: { id: string; action: string; date: number; content: { data?: unknown; dataString?: unknown } | undefined },
  reschedule: (S: AppState, premium: boolean) => Promise<void>,
): Promise<boolean> {
  const { id, action } = r;
  if (action !== DONE && action !== SKIP) return false;
  const data = taskDataOf(r.content);
  if (!data) return false;
  const key = `${id}:${action}`;
  if (handled.has(key)) return true;
  handled.add(key);

  const now = Date.now();
  // Eski bir günün cevabı (ör. arka planda işlenmiş, uygulama ertesi gün açılınca yine gelmiş) bir daha sayılmaz.
  if (dayKey(r.date || now) !== dayKey(now)) {
    await N.dismissNotificationAsync(id).catch(() => {});
    return true;
  }
  const mult = limits(data.premium).mult;
  let outcome: ActionOutcome | null = null;
  if (live) {
    live.update(D => void (outcome = applyTaskAction(D, data.tid, action, now, mult)));
    if (outcome) live.onOutcome?.(outcome, action);
  } else {
    // Uygulama kapalı: veritabanından oku, değiştir, yaz ve bildirimleri yeni veriye göre kur.
    const S = await loadState();
    if (!S) return true;
    outcome = applyTaskAction(S, data.tid, action, now, mult);
    if (outcome) {
      await saveState(S);
      await reschedule(S, data.premium).catch(e => console.warn('Layfapp: bildirim zamanlanamadı', e));
    }
  }

  const fb = outcome ? feedbackFor(outcome) : null;
  if (fb) {
    // Aynı kimlikle göndermek bildirimi yerinde değiştirir; sessiz kanalda ses ve açılır pencere yok.
    await N.scheduleNotificationAsync({
      identifier: id,
      content: { title: fb.title, body: fb.body, data: { url: '/bugun' }, autoDismiss: true },
      trigger: Platform.OS === 'android' ? { channelId: FEEDBACK_CHANNEL } : null,
    }).catch(() => N.dismissNotificationAsync(id));
  } else {
    await N.dismissNotificationAsync(id).catch(() => {});
  }
  return true;
}
