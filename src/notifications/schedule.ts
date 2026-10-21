import type * as NotificationsTypes from 'expo-notifications';
import { Platform } from 'react-native';

import { DAY } from '@/domain/constants';
import { greet, notifs } from '@/domain/logic';
import { sportLine, streakLine, summaryTail } from '@/domain/messages';
import { awardedToday, dayKey, houseProgress } from '@/domain/play';
import type { AppState, Notice } from '@/domain/types';

/** Kaç günlük sabah özeti önceden zamanlanır. Uygulama her açıldığında ve veri değiştikçe yenilenir. */
const DAYS_AHEAD = 7;
const CHANNEL = 'sabah-ozeti';
const NUDGE = 'hatirlatma';
/** Akşam seri hatırlatmasının saati. */
const STREAK_TIME: [number, number] = [20, 30];

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
    console.warn('Layfapp: bildirim modülü yüklenemedi, bildirimler kapalı', e);
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

/** O sabahın bildirim metni. Gösterilecek bir şey yoksa null. */
export function summaryFor(ns: Notice[], at = new Date()): { title: string; body: string; url: string } | null {
  if (!ns.length) return null;
  const urgent = ns.filter(n => n.k !== 'ok').length;
  // Özet saati kullanıcının seçimi; akşama kurduysa "İyi akşamlar" der.
  const title = `${greet(at)} ${summaryTail(urgent)}`;
  // İlk hatırlatmanın tatlı cümlesi de görünsün, diğerleri kısa başlık olarak.
  const shown = ns.slice(0, 3).map((n, i) => (i ? n.title : `${n.title}\n${n.text}`));
  const more = ns.length - shown.length;
  const body = shown.join('\n') + (more > 0 ? `\nve ${more} hatırlatma daha` : '');
  const rooms = new Set(ns.map(n => n.rid));
  const url = rooms.size === 1 ? `/oda/${ns[0].rid}` : '/bugun';
  return { title, body, url };
}

/**
 * Önümüzdeki günlerin sabah özetlerini yeniden zamanlar. Her gün için içerik o günün
 * tarihine göre hesaplanır (bugün yarın, yarın bugün olur), böylece günlük tek bir sabit
 * bildirim yerine o sabaha uygun özet gelir.
 */
export async function rescheduleMorningSummaries(S: AppState) {
  const N = getNotifications();
  if (!N) return;
  if ((await getPermission()) !== 'granted') return;
  // Ev silindiyse eski evin hatırlatmaları gelmesin.
  if (!S.setup) return void (await N.cancelAllScheduledNotificationsAsync());
  await ensureChannel(N);
  await N.cancelAllScheduledNotificationsAsync();

  const [hh, mm] = S.settings.time.split(':').map(n => parseInt(n, 10));
  const now = Date.now();
  for (let d = 0; d < DAYS_AHEAD; d++) {
    const at = new Date(now + d * DAY);
    at.setHours(hh || 0, mm || 0, 0, 0);
    if (at.getTime() <= now) continue;
    const msg = summaryFor(notifs(S, at.getTime()), at);
    if (!msg) continue;
    await N.scheduleNotificationAsync({
      content: { title: msg.title, body: msg.body, data: { url: msg.url } },
      trigger: { type: N.SchedulableTriggerInputTypes.DATE, date: at, channelId: CHANNEL },
    });
  }
  for (const n of nudges(S, now))
    await N.scheduleNotificationAsync({
      content: { title: n.title, body: n.body, data: { url: n.url } },
      trigger: { type: N.SchedulableTriggerInputTypes.DATE, date: n.at, channelId: NUDGE },
    });
}

/**
 * Önümüzdeki günlerin spor ve seri hatırlatmaları. Bugün spor ya da bir iş yapıldıysa
 * bugünkü hatırlatma atlanır; veri değişince hepsi yeniden zamanlanır.
 */
export function nudges(S: AppState, now = Date.now()) {
  const out: { at: Date; title: string; body: string; url: string }[] = [];
  const set = S.settings;
  const today = dayKey(now);
  const hp = houseProgress(S.play.days, now);
  const [sh, sm] = set.sportTime.split(':').map(n => parseInt(n, 10));
  for (let d = 0; d < DAYS_AHEAD; d++) {
    const base = new Date(now + d * DAY);
    const key = dayKey(base.getTime());
    if (set.sport && set.sportDays.includes(base.getDay()) && !(key === today && awardedToday(S.play, 'spor', 'spor', now))) {
      const at = new Date(base);
      at.setHours(sh || 0, sm || 0, 0, 0);
      if (at.getTime() > now) out.push({ at, title: '🏃 Spor vakti', body: sportLine('spor', at.getTime()), url: '/spor' });
    }
    if (set.streak && !(key === today && hp.today)) {
      const at = new Date(base);
      at.setHours(STREAK_TIME[0], STREAK_TIME[1], 0, 0);
      // Bugünkü seriyi biliyoruz; yarın için bugün yapıldıysa aynı seri sürüyor. Daha ilerisi bilinmez.
      const streak = d === 0 ? hp.streak : d === 1 && hp.today ? hp.streak : 0;
      if (at.getTime() > now)
        out.push({
          at,
          title: streak ? `🔥 ${streak} günlük seri` : '🏡 Evin seni bekliyor',
          body: streakLine(streak, hp.level > 0, 'seri', at.getTime()),
          url: '/bugun',
        });
    }
  }
  return out;
}
