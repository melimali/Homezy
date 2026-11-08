import { tx } from '@/i18n/runtime';
import type * as NotificationsTypes from 'expo-notifications';
import { Platform } from 'react-native';

import { loadState, saveState } from '@/data/db';
import { DAY } from '@/domain/constants';
import { addWater, hKey, waterMet, waterOf } from '@/domain/habits';
import { allTasks, doneToday, placeOf, sod, uid } from '@/domain/logic';
import { markDose } from '@/domain/meds';
import { markPetDone } from '@/domain/pets';
import { addXp } from '@/domain/mokaLevel';
import { awardedToday, awardLocal, awardToast, dayKey, pruneLog, type AwardResult } from '@/domain/play';
import { isQuiet, QUIET_TO } from '@/domain/formulas';
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

/** İlaç, su ve spor hatırlatmaları: uygulamayı açmadan cevaplanır. */
export const MED_CATEGORY = 'ilac-cevap';
export const WATER_CATEGORY = 'su-cevap';
export const SPORT_CATEGORY = 'spor-cevap';
export const PET_CATEGORY = 'evcil-cevap';
export const TAKEN = 'aldim';
export const DRANK = 'ictim';
export const LATER = 'ertele';
/** "Sonra hatırlat" kaç dakika sonra tekrar çalar. */
export const SNOOZE_MIN = { med: 10, water: 30, sport: 60, pet: 60 } as const;

export type ReminderKind = keyof typeof SNOOZE_MIN;
/** Hatırlatma bildirimine konan veri. `key`: ilaçta doz anahtarı. `snooze`: ertelenmiş kopya (yeniden zamanlamada silinmez). */
export type ReminderData = { url: string; kind: ReminderKind; key?: string; premium: boolean; snooze?: boolean };

export type TaskAction = typeof DONE | typeof SKIP;
type NotificationsModule = typeof NotificationsTypes;

/** Bildirime konan veri. `premium`: zamanlandığı andaki üyelik; arka planda abonelik bilinmiyor. */
export type TaskData = { url: string; tid: string; list: TaskList; premium: boolean; snooze?: boolean };

export async function ensureCategories(N: NotificationsModule) {
  // Web'de ve bazı Expo Go sürümlerinde kategori desteği yok; o zaman bildirimler düğmesiz gelir.
  if (Platform.OS === 'web') return;
  const opts = { opensAppToForeground: false };
  await N.setNotificationCategoryAsync(TASK_CATEGORY, [
    { identifier: DONE, buttonTitle: tx('✅ Yaptım'), options: opts },
    { identifier: LATER, buttonTitle: tx('⏰ 1 saat sonra'), options: opts },
    { identifier: SKIP, buttonTitle: tx('🌙 Yarın'), options: opts },
  ]);
  await N.setNotificationCategoryAsync(PLANT_CATEGORY, [
    { identifier: DONE, buttonTitle: tx('💧 Suladım'), options: opts },
    { identifier: LATER, buttonTitle: tx('⏰ 1 saat sonra'), options: opts },
    { identifier: SKIP, buttonTitle: tx('🌙 Yarın'), options: opts },
  ]);
  await N.setNotificationCategoryAsync(MED_CATEGORY, [
    { identifier: TAKEN, buttonTitle: tx('💊 Aldım'), options: opts },
    { identifier: LATER, buttonTitle: tx('⏰ 10 dk sonra hatırlat'), options: opts },
  ]);
  await N.setNotificationCategoryAsync(WATER_CATEGORY, [
    { identifier: DRANK, buttonTitle: tx('💧 İçtim'), options: opts },
    { identifier: LATER, buttonTitle: tx('⏰ 30 dk sonra'), options: opts },
  ]);
  await N.setNotificationCategoryAsync(SPORT_CATEGORY, [
    { identifier: DONE, buttonTitle: tx('✅ Yaptım'), options: opts },
    { identifier: LATER, buttonTitle: tx('⏰ 1 saat sonra'), options: opts },
  ]);
  await N.setNotificationCategoryAsync(PET_CATEGORY, [
    { identifier: DONE, buttonTitle: tx('✅ Yaptım'), options: opts },
    { identifier: LATER, buttonTitle: tx('⏰ 1 saat sonra'), options: opts },
  ]);
}

export const categoryOf = (k: ReminderKind) => (k === 'med' ? MED_CATEGORY : k === 'water' ? WATER_CATEGORY : k === 'pet' ? PET_CATEGORY : SPORT_CATEGORY);
const channelOf = (k: ReminderKind) => (k === 'med' ? 'ilac' : 'hatirlatma');

/** Bildirim cevabındaki hatırlatma verisi; görev bildirimlerinde null. */
export function reminderDataOf(content: { data?: unknown; dataString?: unknown } | undefined): ReminderData | null {
  let data = content?.data as Partial<ReminderData> | undefined;
  if (!data && typeof content?.dataString === 'string') {
    try {
      data = JSON.parse(content.dataString) as Partial<ReminderData>;
    } catch {
      return null;
    }
  }
  if (!data || (data.kind !== 'med' && data.kind !== 'water' && data.kind !== 'sport' && data.kind !== 'pet')) return null;
  return { url: data.url ?? '/bugun', kind: data.kind, key: data.key, premium: !!data.premium, snooze: !!data.snooze };
}

export type ReminderOutcome = { title: string; body: string } | null;

/** İlaç aldım / su içtim / spor yaptım. Aynı cevap iki kez gelse de sonuç değişmez. */
export function applyReminderAction(D: AppState, d: ReminderData, now: number, mult = 1): ReminderOutcome {
  if (d.kind === 'med') {
    if (!d.key) return null;
    markDose(D, dayKey(now), d.key, 'taken', now);
    const med = D.meds.find(m => d.key!.startsWith(`${m.id}@`));
    return { title: `✅ ${med?.name ?? 'İlaç'}`, body: 'Aldın olarak işaretlendi. Moka gurur duyuyor ☕' };
  }
  if (d.kind === 'pet') {
    const f = d.key ? markPetDone(D, ...(d.key.split('@') as [string, string]), now) : null;
    return f ? { title: `✅ ${f.pet.name}: ${f.item.name}`, body: 'Kaydedildi. Bir sonraki vakitte hatırlatırım ☕' } : null;
  }
  if (d.kind === 'water') {
    const H = D.play.habits;
    const day = hKey(now);
    const willMeet = !waterMet(H, day) && waterOf(H, day) + 1 >= H.waterGoal;
    addWater(H, day, 1);
    if (willMeet && awardLocal(D, 'gorev', 'alisk:su', '💧 Su hedefi', now, mult).awarded) addXp(D.play, 'saglik', 3, now);
    return { title: '💧 Su', body: `${waterOf(H, day)}/${H.waterGoal} bardak. Aferin sana!` };
  }
  if (awardedToday(D.play, 'spor', 'spor', now)) return { title: '🏃 Spor', body: 'Bugünkü sporun zaten kayıtlı ✓' };
  D.play.sport.unshift({ id: uid(), day: dayKey(now), type: 'Spor', min: 20, at: now });
  D.play.sport.splice(400);
  const r = awardLocal(D, 'spor', 'spor', '🏃 Spor · 20 dk', now, mult);
  pruneLog(D.play);
  return { title: '🏃 Spor', body: awardToast(r, 'Spor') };
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
  return { url: data.url ?? '/bugun', tid: data.tid, list: data.list, premium: !!data.premium, snooze: !!data.snooze };
}

/** Uygulama açıkken store'a giden yol. Kök layout'taki `useNotificationSync` kaydeder. */
type Live = { update: (fn: (draft: AppState) => void) => AppState; onOutcome?: (o: ActionOutcome, action: TaskAction) => void };
let live: Live | null = null;
export const setLiveStore = (l: Live | null) => void (live = l);
/** Uygulama açıksa store; ana ekran widget'ı da değişikliği bunun üzerinden yapar. */
export const liveStore = () => live;

type ResponseContent = { data?: unknown; dataString?: unknown; title?: string | null; body?: string | null };
type ReminderResponse = { id: string; action: string; date: number; content: ResponseContent };

/** Bu hatırlatmayı `min` dakika sonrası için yeniden kurar. Yeniden zamanlama bunları silmez (`snooze`). */
async function snooze(N: NotificationsModule, r: ReminderResponse, d: ReminderData, now: number) {
  const at = new Date(now + SNOOZE_MIN[d.kind] * 60000);
  const data: ReminderData = { ...d, snooze: true };
  await N.scheduleNotificationAsync({
    identifier: `z-${d.kind}-${d.key ?? ''}-${now}`,
    content: { title: r.content.title ?? '', body: r.content.body ?? '', data, categoryIdentifier: categoryOf(d.kind) },
    trigger: { type: N.SchedulableTriggerInputTypes.DATE, date: at, channelId: channelOf(d.kind) },
  }).catch(e => console.warn('Homezy: erteleme kurulamadı', e));
}

async function handleReminder(
  N: NotificationsModule,
  r: ReminderResponse,
  d: ReminderData,
  reschedule: (S: AppState, premium: boolean) => Promise<void>,
): Promise<boolean> {
  const now = Date.now();
  const key = `${r.id}:${r.action}`;
  if (handled.has(key)) return true;
  handled.add(key);
  const known = r.action === LATER || r.action === TAKEN || r.action === DRANK || r.action === DONE;
  if (!known) return false;
  // Eski bir günün cevabı sayılmaz.
  if (d.kind !== 'pet' && dayKey(toMs(r.date) || now) !== dayKey(now)) {
    await N.dismissNotificationAsync(r.id).catch(() => {});
    return true;
  }
  if (r.action === LATER) {
    await snooze(N, r, d, now);
    await N.dismissNotificationAsync(r.id).catch(() => {});
    return true;
  }
  const mult = limits(d.premium).mult;
  let out: ReminderOutcome = null;
  if (live) {
    live.update(D => void (out = applyReminderAction(D, d, now, mult)));
  } else {
    const S = await loadState();
    if (!S) return true;
    out = applyReminderAction(S, d, now, mult);
    await saveState(S);
    await reschedule(S, d.premium).catch(e => console.warn('Homezy: bildirim zamanlanamadı', e));
  }
  // Alınan dozun / yapılan bakımın bekleyen ertelemeleri de susar.
  if ((d.kind === 'med' || d.kind === 'pet') && d.key)
    for (const n of await N.getAllScheduledNotificationsAsync().catch(() => [])) {
      const nd = reminderDataOf(n.content as ResponseContent);
      if (nd?.snooze && nd.key === d.key) await N.cancelScheduledNotificationAsync(n.identifier).catch(() => {});
    }
  const fb = out as ReminderOutcome;
  if (fb && d.kind !== 'med' && d.kind !== 'pet') {
    await N.scheduleNotificationAsync({
      identifier: r.id,
      content: { title: tx(fb.title), body: tx(fb.body), data: { url: d.url }, autoDismiss: true },
      trigger: Platform.OS === 'android' ? { channelId: FEEDBACK_CHANNEL } : null,
    }).catch(() => N.dismissNotificationAsync(r.id));
  } else {
    await N.dismissNotificationAsync(r.id).catch(() => {});
  }
  return true;
}

/** Bildirim zamanı bazı platformlarda saniye olarak gelir; milisaniyeye çevirir. */
const toMs = (t: number) => (t > 0 && t < 1e11 ? t * 1000 : t);

/** Aynı cevabı iki kez işleme (arka plan görevi ve dinleyici aynı anda gelebilir). */
const handled = new Set<string>();

/**
 * Bir bildirim düğmesine basılınca çağrılır. Uygulama açıksa store üzerinden, değilse doğrudan
 * veritabanında değiştirir. Sonra bildirimi kaldırır ya da puanı gösteren sessiz bir bildirimle değiştirir.
 */
export async function handleTaskAction(
  N: NotificationsModule,
  r: { id: string; action: string; date: number; content: ResponseContent | undefined },
  reschedule: (S: AppState, premium: boolean) => Promise<void>,
): Promise<boolean> {
  const { id, action } = r;
  const rem = reminderDataOf(r.content);
  if (rem) return handleReminder(N, r as ReminderResponse, rem, reschedule);
  if (action !== DONE && action !== SKIP && action !== LATER) return false;
  const data = taskDataOf(r.content);
  if (!data) return false;
  const key = `${id}:${action}`;
  if (handled.has(key)) return true;
  handled.add(key);

  const now = Date.now();
  // Eski bir günün cevabı (ör. arka planda işlenmiş, uygulama ertesi gün açılınca yine gelmiş) bir daha sayılmaz.
  if (dayKey(toMs(r.date) || now) !== dayKey(now)) {
    await N.dismissNotificationAsync(id).catch(() => {});
    return true;
  }
  if (action === LATER) {
    // 1 saat sonrasına aynı bildirimi yeniden kurar; sessiz saate denk gelirse sabaha kaydırır.
    let at = new Date(now + 60 * 60000);
    if (isQuiet(at.getHours() * 60 + at.getMinutes())) {
      at = new Date(at.getHours() * 60 + at.getMinutes() >= QUIET_TO ? at.getTime() + DAY : at.getTime());
      at.setHours(Math.floor(QUIET_TO / 60), QUIET_TO % 60, 0, 0);
    }
    await N.scheduleNotificationAsync({
      identifier: `z-gorev-${data.tid}-${now}`,
      content: {
        title: r.content?.title ?? '',
        body: r.content?.body ?? '',
        data: { ...data, snooze: true },
        categoryIdentifier: data.list === 'plants' ? PLANT_CATEGORY : TASK_CATEGORY,
      },
      trigger: { type: N.SchedulableTriggerInputTypes.DATE, date: at, channelId: 'isler' },
    }).catch(e => console.warn('Homezy: erteleme kurulamadı', e));
    await N.dismissNotificationAsync(id).catch(() => {});
    return true;
  }
  // Yapıldı / yarına ertelendi: bekleyen "1 saat sonra" kopyaları susar.
  for (const n of await N.getAllScheduledNotificationsAsync().catch(() => [])) {
    const nd = taskDataOf(n.content as ResponseContent);
    if (nd?.snooze && nd.tid === data.tid) await N.cancelScheduledNotificationAsync(n.identifier).catch(() => {});
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
      await reschedule(S, data.premium).catch(e => console.warn('Homezy: bildirim zamanlanamadı', e));
    }
  }

  const fb = outcome ? feedbackFor(outcome) : null;
  if (fb) {
    // Aynı kimlikle göndermek bildirimi yerinde değiştirir; sessiz kanalda ses ve açılır pencere yok.
    await N.scheduleNotificationAsync({
      identifier: id,
      content: { title: tx(fb.title), body: tx(fb.body), data: { url: '/bugun' }, autoDismiss: true },
      trigger: Platform.OS === 'android' ? { channelId: FEEDBACK_CHANNEL } : null,
    }).catch(() => N.dismissNotificationAsync(id));
  } else {
    await N.dismissNotificationAsync(id).catch(() => {});
  }
  return true;
}
