import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { DAY } from '@/domain/constants';
import { notifs } from '@/domain/logic';
import type { AppState, Notice } from '@/domain/types';

/** Kaç günlük sabah özeti önceden zamanlanır. Uygulama her açıldığında ve veri değiştikçe yenilenir. */
const DAYS_AHEAD = 7;
const CHANNEL = 'sabah-ozeti';

export const notificationsSupported = Platform.OS !== 'web';

export function configureNotifications() {
  if (!notificationsSupported) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

async function ensureChannel() {
  if (Platform.OS === 'android')
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Sabah özeti',
      // eslint-disable-next-line import/namespace -- export * ile geliyor, eslint-plugin-import göremiyor
      importance: Notifications.AndroidImportance.DEFAULT,
    });
}

export async function getPermission(): Promise<'granted' | 'denied' | 'undetermined'> {
  if (!notificationsSupported) return 'denied';
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

export async function requestPermission(): Promise<boolean> {
  if (!notificationsSupported) return false;
  await ensureChannel();
  const { status } = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: false, allowSound: true },
  });
  return status === 'granted';
}

/** O sabahın bildirim metni. Gösterilecek bir şey yoksa null. */
export function summaryFor(ns: Notice[]): { title: string; body: string; url: string } | null {
  if (!ns.length) return null;
  const urgent = ns.filter(n => n.k !== 'ok').length;
  const title = urgent ? `Günaydın! Bugün ${urgent} iş seni bekliyor` : 'Günaydın! Evde birkaç hatırlatma var';
  const shown = ns.slice(0, 3).map(n => n.title);
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
  if (!notificationsSupported || !S.setup) return;
  if ((await getPermission()) !== 'granted') return;
  await ensureChannel();
  await Notifications.cancelAllScheduledNotificationsAsync();

  const [hh, mm] = S.settings.time.split(':').map(n => parseInt(n, 10));
  const now = Date.now();
  for (let d = 0; d < DAYS_AHEAD; d++) {
    const at = new Date(now + d * DAY);
    at.setHours(hh || 0, mm || 0, 0, 0);
    if (at.getTime() <= now) continue;
    const msg = summaryFor(notifs(S, at.getTime()));
    if (!msg) continue;
    await Notifications.scheduleNotificationAsync({
      content: { title: msg.title, body: msg.body, data: { url: msg.url } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId: CHANNEL },
    });
  }
}
