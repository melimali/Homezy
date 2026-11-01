import { tx } from '@/i18n/runtime';
import type * as NotificationsTypes from 'expo-notifications';
import { Platform } from 'react-native';

import { DAY } from '@/domain/constants';
import { isPhotoTask } from '@/domain/home';
import { allTasks, doneToday, greet, notifs, weekSummary } from '@/domain/logic';
import { firstOpenDay } from '@/lib/events';
import { eveningNudge, sportLine, summaryTail, weeklyLine } from '@/domain/messages';
import { AWAY_DAYS, awardedToday, awayAhead, dayKey, freezesUsed, idleAhead, progressOf } from '@/domain/play';
import { limits } from '@/domain/premium';
import type { AppState, Notice } from '@/domain/types';

import { ensureCategories, FEEDBACK_CHANNEL, PLANT_CATEGORY, TASK_CATEGORY, taskDataOf, type TaskData } from './actions';

/** Kaç günlük sabah özeti önceden zamanlanır. Uygulama her açıldığında ve veri değiştikçe yenilenir. */
const DAYS_AHEAD = 7;
const CHANNEL = 'sabah-ozeti';
const NUDGE = 'hatirlatma';
const TASKS = 'isler';
/**
 * Günde en çok bu kadar iş ayrı bildirimle ("Yaptım" / "Yapmadım" düğmeleriyle) gelir, en acilleri;
 * gerisi sabah özetinde kalır. iOS aynı anda en çok 64 zamanlanmış bildirim tutuyor:
 * 7 özet + 7×3 iş + en çok 15 spor/seri/haftalık hatırlatma = 43.
 */
const TASKS_PER_DAY = 3;
/** Akşam seri hatırlatmasının saati. */
const STREAK_TIME: [number, number] = [20, 30];
/** Haftalık özet: pazar akşamı. */
const WEEKLY_TIME: [number, number] = [19, 0];

type NotificationsModule = typeof NotificationsTypes;
let loaded: NotificationsModule | null | undefined;

/**
 * expo-notifications'ı ilk kullanımda yükler. Expo Go'nun bazı sürümlerinde paketin istediği
 * yerel modül bulunmuyor ve içe aktarma hata veriyor; o durumda uygulama bildirimsiz çalışır.
 */
export function getNotifications(): NotificationsModule | null {
  if (loaded !== undefined) return loaded;
  if (Platform.OS === 'web') return (loaded = null);
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    loaded = require('expo-notifications') as NotificationsModule;
  } catch (e) {
    console.warn('Homezy: bildirim modülü yüklenemedi, bildirimler kapalı', e);
    loaded = null;
  }
  return loaded;
}

/** Bu cihazda bildirim zamanlanabiliyor mu (web önizlemesinde ve modül yüklenemezse hayır). */
export const notificationsAvailable = () => getNotifications() != null;

export function configureNotifications() {
  getNotifications()?.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

async function ensureChannel(N: NotificationsModule) {
  if (Platform.OS === 'android') {
    await N.setNotificationChannelAsync(CHANNEL, {
      name: 'Sabah özeti',
      importance: N.AndroidImportance.DEFAULT,
    });
    await N.setNotificationChannelAsync(NUDGE, {
      name: 'Spor ve seri hatırlatmaları',
      importance: N.AndroidImportance.DEFAULT,
    });
    await N.setNotificationChannelAsync(TASKS, {
      name: 'İş hatırlatmaları (Yaptım / Yapmadım)',
      importance: N.AndroidImportance.DEFAULT,
    });
    await N.setNotificationChannelAsync(FEEDBACK_CHANNEL, {
      name: 'Bildirimden tamamlanan işler',
      importance: N.AndroidImportance.LOW,
    });
  }
}

export async function getPermission(): Promise<'granted' | 'denied' | 'undetermined'> {
  const N = getNotifications();
  if (!N) return 'denied';
  const { status } = await N.getPermissionsAsync();
  return status;
}

export async function requestPermission(): Promise<boolean> {
  const N = getNotifications();
  if (!N) return false;
  await ensureChannel(N);
  const { status } = await N.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: false, allowSound: true },
  });
  return status === 'granted';
}

/**
 * O sabahın bildirim metni. Gösterilecek bir şey yoksa null. `urgent`: başlıktaki iş sayısı;
 * ayrı bildirimle gelen işler özette yazmasa da sayılır.
 */
export function summaryFor(ns: Notice[], at = new Date(), urgent = ns.filter(n => n.k !== 'ok').length): { title: string; body: string; url: string } | null {
  if (!ns.length) return null;
  // Özet saati kullanıcının seçimi; akşama kurduysa "İyi akşamlar" der.
  const title = `${greet(at)} ${summaryTail(urgent)}`;
  // İlk hatırlatmanın tatlı cümlesi de görünsün, diğerleri kısa başlık olarak.
  const shown = ns.slice(0, 3).map((n, i) => (i ? n.title : `${n.title}\n${n.text}`));
  const more = ns.length - shown.length;
  const body = shown.join('\n') + (more > 0 ? `\nve ${more} hatırlatma daha` : '');
  const rooms = new Set(ns.map(n => n.rid));
  const url = rooms.size === 1 ? ns[0].url ?? `/oda/${ns[0].rid}` : '/bugun';
  return { title, body, url };
}

/**
 * O sabah ayrı bildirimle gelecek işler: sırayla en acilleri, fotoğraf isteyenler hariç
 * (onlar için uygulamayı açıp fotoğraf çekmek gerekiyor).
 */
export function ownNotices(S: AppState, ns: Notice[]): Notice[] {
  if (!S.settings.actions) return [];
  const photo = new Set(allTasks(S).filter(x => isPhotoTask(x.t)).map(x => x.t.id));
  return ns.filter(n => n.tid && n.list && !photo.has(n.tid)).slice(0, TASKS_PER_DAY);
}

/** Bildirim çekmecesinde duran ama artık yapılmış ya da silinmiş işlerin bildirimlerini kaldırır. */
async function dismissStale(N: NotificationsModule, S: AppState) {
  const now = Date.now();
  const tasks = new Map(allTasks(S, now).map(x => [x.t.id, x.t]));
  for (const n of await N.getPresentedNotificationsAsync()) {
    const data = taskDataOf(n.request.content);
    if (!data) continue;
    const t = tasks.get(data.tid);
    if (!t || doneToday(t, now) || (t.snooze != null && t.snooze > now)) await N.dismissNotificationAsync(n.request.identifier);
  }
}

/**
 * Önümüzdeki günlerin sabah özetlerini yeniden zamanlar. Her gün için içerik o günün
 * tarihine göre hesaplanır (bugün yarın, yarın bugün olur), böylece günlük tek bir sabit
 * bildirim yerine o sabaha uygun özet gelir.
 */
export async function rescheduleMorningSummaries(S: AppState, premium = false) {
  const smart = premium && S.settings.smart;
  const N = getNotifications();
  if (!N) return;
  if ((await getPermission()) !== 'granted') return;
  // Ev silindiyse eski evin hatırlatmaları gelmesin.
  if (!S.setup) return void (await N.cancelAllScheduledNotificationsAsync());
  await ensureChannel(N);
  await ensureCategories(N).catch(e => console.warn('Homezy: bildirim düğmeleri kurulamadı', e));
  // Çalışan odak zamanlayıcısının bitiş bildirimi silinmesin.
  for (const n of await N.getAllScheduledNotificationsAsync())
    if ((n.content.data as { focus?: boolean } | undefined)?.focus !== true) await N.cancelScheduledNotificationAsync(n.identifier);
  await dismissStale(N, S).catch(() => {});

  const [hh, mm] = S.settings.time.split(':').map(n => parseInt(n, 10));
  const now = Date.now();
  for (let d = 0; d < DAYS_AHEAD; d++) {
    const at = new Date(now + d * DAY);
    at.setHours(hh || 0, mm || 0, 0, 0);
    if (at.getTime() <= now) continue;
    const ns = notifs(S, at.getTime());
    // Akıllı bildirim: acil bir şey yoksa sabah özetiyle rahatsız etme.
    if (smart && !ns.some(n => n.k !== 'ok')) continue;
    // En acil işler kendi bildirimiyle, düğmeleriyle gelir; özet geri kalanları toplar.
    const own = ownNotices(S, ns);
    for (const n of own) {
      const data: TaskData = { url: n.url ?? `/oda/${n.rid}`, tid: n.tid!, list: n.list!, premium };
      await N.scheduleNotificationAsync({
        identifier: `gorev-${n.tid}-${dayKey(at.getTime())}`,
        content: {
          title: tx(n.title),
          body: tx(n.text),
          data,
          categoryIdentifier: n.list === 'plants' ? PLANT_CATEGORY : TASK_CATEGORY,
          threadIdentifier: 'isler',
        },
        trigger: { type: N.SchedulableTriggerInputTypes.DATE, date: at, channelId: TASKS },
      });
    }
    const msg = summaryFor(ns.filter(n => !own.includes(n)), at, ns.filter(n => n.k !== 'ok').length);
    if (!msg) continue;
    await N.scheduleNotificationAsync({
      content: { title: tx(msg.title), body: tx(msg.body), data: { url: msg.url } },
      trigger: { type: N.SchedulableTriggerInputTypes.DATE, date: at, channelId: CHANNEL },
    });
  }
  for (const n of nudges(S, now, smart, premium))
    await N.scheduleNotificationAsync({
      content: { title: tx(n.title), body: tx(n.body), data: { url: n.url } },
      trigger: { type: N.SchedulableTriggerInputTypes.DATE, date: n.at, channelId: NUDGE },
    });
}

/**
 * Önümüzdeki günlerin spor ve seri hatırlatmaları. Bugün spor ya da bir iş yapıldıysa
 * bugünkü hatırlatma atlanır; veri değişince hepsi yeniden zamanlanır.
 * Akşam hatırlatması evin durumuna göre değişir: toz, çatlak, "son şans". Birkaç gün gelmeyene
 * her akşam değil, 3., 5. ve 7. gün nazik bir "kaldığın yerden devam" gider.
 */
export function nudges(S: AppState, now = Date.now(), smart = false, premium = false) {
  const out: { at: Date; title: string; body: string; url: string }[] = [];
  const set = S.settings;
  const today = dayKey(now);
  const hp = progressOf(S.play, now);
  const freezeLeft = Math.max(0, limits(premium).freezes - freezesUsed(S.play, now));
  const learned = smart ? smartTimes(S) : null;
  const [sh, sm] = learned?.sport ? [Math.floor(learned.sport / 60), learned.sport % 60] : set.sportTime.split(':').map(n => parseInt(n, 10));
  const streakAt = learned?.streak ? [Math.floor(learned.streak / 60), learned.streak % 60] : STREAK_TIME;
  for (let d = 0; d < DAYS_AHEAD; d++) {
    const base = new Date(now + d * DAY);
    const key = dayKey(base.getTime());
    if (set.sport && set.sportDays.includes(base.getDay()) && !(key === today && awardedToday(S.play, 'spor', 'spor', now))) {
      const at = new Date(base);
      at.setHours(sh || 0, sm || 0, 0, 0);
      if (at.getTime() > now) out.push({ at, title: '🏃 Spor vakti', body: sportLine('spor', at.getTime()), url: '/spor' });
    }
    if (set.weekly && base.getDay() === 0) {
      const at = new Date(base);
      at.setHours(WEEKLY_TIME[0], WEEKLY_TIME[1], 0, 0);
      // Özet, zamanlandığı andaki veriyle yazılır; veri değiştikçe yeniden zamanlanır.
      if (at.getTime() > now) out.push({ at, title: '📅 Haftan nasıl geçti?', body: weeklyLine(weekSummary(S, now)), url: '/hafta' });
    }
    const away = awayAhead(S.play, d, now);
    const quiet = away != null && away >= AWAY_DAYS && away % 2 === 0;
    if (set.streak && !(key === today && hp.today) && !quiet) {
      const at = new Date(base);
      at.setHours(streakAt[0], streakAt[1], 0, 0);
      // Bugünkü seriyi biliyoruz; yarın için bugün yapıldıysa aynı seri sürüyor. Daha ilerisi bilinmez.
      const streak = d === 0 ? hp.streak : d === 1 && hp.today ? hp.streak : 0;
      const msg = eveningNudge({ streak, idle: idleAhead(hp, d, freezeLeft), away, built: hp.level > 0, key: 'seri', now: at.getTime() });
      if (at.getTime() > now) out.push({ at, ...msg, url: '/bugun' });
    }
  }
  out.push(...welcomeNudges(S, now));
  return out;
}

/**
 * İlk 7 gün: kullanıcıyı alışkanlığa sokan 3 nazik hatırlatma (1. gün akşam, 2. gün öğle, 5. gün akşam).
 * Bugün zaten iş yapıldıysa 1. gündeki atlanır. Günde en çok 2 bildirim kuralını bozmaz (sabah özeti + bir tane).
 */
export function welcomeNudges(S: AppState, now = Date.now()) {
  const first = firstOpenDay();
  if (!first) return [];
  const steps: { age: number; h: number; m: number; title: string; body: string; url: string }[] = [
    { age: 0, h: 19, m: 0, title: '🏡 Evin seni bekliyor', body: 'Bugün tek bir küçük iş yeter. Moka sevinsin!', url: '/bugun' },
    { age: 1, h: 12, m: 30, title: '☕ Moka selam söylüyor', body: 'Dün evini kurdun. Bugün de bir iş yap, serin başlasın.', url: '/bugun' },
    { age: 4, h: 19, m: 0, title: '✨ Evin güzelleşiyor', body: 'Serin sürüyor mu? Bugün bir iş daha, ev bir adım büyüsün.', url: '/bugun' },
  ];
  const out: { at: Date; title: string; body: string; url: string }[] = [];
  const hp = progressOf(S.play, now);
  for (const st of steps) {
    const at = new Date(`${first}T00:00:00`);
    at.setDate(at.getDate() + st.age);
    at.setHours(st.h, st.m, 0, 0);
    if (at.getTime() <= now) continue;
    if (dayKey(at.getTime()) === dayKey(now) && hp.today) continue;
    out.push({ at, title: st.title, body: st.body, url: st.url });
  }
  return out;
}

const median = (xs: number[]) => {
  const a = [...xs].sort((x, y) => x - y);
  return a[Math.floor(a.length / 2)];
};
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const q15 = (n: number) => Math.round(n / 15) * 15;

/**
 * Premium akıllı bildirimler: kişinin alışkanlığından öğrenilen saatler (günün dakikası).
 * - Seri hatırlatması: işleri genelde yaptığı saatten bir saat önce (17:00–21:30 arası).
 * - Spor hatırlatması: sporu genelde kaydettiği saatten yarım saat önce.
 * Yeterli kayıt yoksa (5 iş, 3 spor) null; o zaman sabit saatler kullanılır.
 */
export function smartTimes(S: AppState): { streak: number | null; sport: number | null } {
  const t = S.play.times ?? [];
  const sp = S.play.sport.slice(0, 20).map(x => {
    const d = new Date(x.at);
    return d.getHours() * 60 + d.getMinutes();
  });
  return {
    streak: t.length >= 5 ? clamp(q15(median(t) - 60), 17 * 60, 21 * 60 + 30) : null,
    sport: sp.length >= 3 ? clamp(q15(median(sp) - 30), 6 * 60, 22 * 60) : null,
  };
}

export const fmtMinute = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
