import type * as NotificationsTypes from 'expo-notifications';
import { Platform } from 'react-native';

import { DAY } from '@/domain/constants';
import { notifs } from '@/domain/logic';
import type { AppState, Notice } from '@/domain/types';

/** Kaç günlük sabah özeti önceden zamanlanır. Uygulama her açıldığında ve veri değiştikçe yenilenir. */
const DAYS_AHEAD = 7;
const CHANNEL = 'sabah-ozeti';

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
  if (Platform.OS === 'android')
    await N.setNotificationChannelAsync(CHANNEL, {
      name: 'Sabah özeti',
      importance: N.AndroidImportance.DEFAULT,
    });
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
  const N = getNotifications();
  if (!N || !S.setup) return;
  if ((await getPermission()) !== 'granted') return;
  await ensureChannel(N);
  await N.cancelAllScheduledNotificationsAsync();

  const [hh, mm] = S.settings.time.split(':').map(n => parseInt(n, 10));
  const now = Date.now();
  for (let d = 0; d < DAYS_AHEAD; d++) {
    const at = new Date(now + d * DAY);
    at.setHours(hh || 0, mm || 0, 0, 0);
    if (at.getTime() <= now) continue;
    const msg = summaryFor(notifs(S, at.getTime()));
    if (!msg) continue;
    await N.scheduleNotificationAsync({
      content: { title: msg.title, body: msg.body, data: { url: msg.url } },
      trigger: { type: N.SchedulableTriggerInputTypes.DATE, date: at, channelId: CHANNEL },
    });
  }
}
