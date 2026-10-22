import type * as NotificationsTypes from 'expo-notifications';
import { Platform } from 'react-native';

import { DAY } from '@/domain/constants';
import { greet, notifs, weekSummary } from '@/domain/logic';
import { sportLine, streakLine, summaryTail, weeklyLine } from '@/domain/messages';
import { awardedToday, dayKey, progressOf } from '@/domain/play';
import type { AppState, Notice } from '@/domain/types';

/** Kaç günlük sabah özeti önceden zamanlanır. Uygulama her açıldığında ve veri değiştikçe yenilenir. */
const DAYS_AHEAD = 7;
const CHANNEL = 'sabah-ozeti';
const NUDGE = 'hatirlatma';
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
  const url = rooms.size === 1 ? ns[0].url ?? `/oda/${ns[0].rid}` : '/bugun';
  return { title, body, url };
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
  await N.cancelAllScheduledNotificationsAsync();

  const [hh, mm] = S.settings.time.split(':').map(n => parseInt(n, 10));
  const now = Date.now();
  for (let d = 0; d < DAYS_AHEAD; d++) {
    const at = new Date(now + d * DAY);
    at.setHours(hh || 0, mm || 0, 0, 0);
    if (at.getTime() <= now) continue;
    const ns = notifs(S, at.getTime());
    // Akıllı bildirim: acil bir şey yoksa sabah özetiyle rahatsız etme.
    if (smart && !ns.some(n => n.k !== 'ok')) continue;
    const msg = summaryFor(ns, at);
    if (!msg) continue;
    await N.scheduleNotificationAsync({
      content: { title: msg.title, body: msg.body, data: { url: msg.url } },
      trigger: { type: N.SchedulableTriggerInputTypes.DATE, date: at, channelId: CHANNEL },
    });
  }
  for (const n of nudges(S, now, smart))
    await N.scheduleNotificationAsync({
      content: { title: n.title, body: n.body, data: { url: n.url } },
      trigger: { type: N.SchedulableTriggerInputTypes.DATE, date: n.at, channelId: NUDGE },
    });
}

/**
 * Önümüzdeki günlerin spor ve seri hatırlatmaları. Bugün spor ya da bir iş yapıldıysa
 * bugünkü hatırlatma atlanır; veri değişince hepsi yeniden zamanlanır.
 */
export function nudges(S: AppState, now = Date.now(), smart = false) {
  const out: { at: Date; title: string; body: string; url: string }[] = [];
  const set = S.settings;
  const today = dayKey(now);
  const hp = progressOf(S.play, now);
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
      if (at.getTime() > now) out.push({ at, title: '📅 Haftan nasıl geçti?', body: weeklyLine(weekSummary(S, now)), url: '/' });
    }
    if (set.streak && !(key === today && hp.today)) {
      const at = new Date(base);
      at.setHours(streakAt[0], streakAt[1], 0, 0);
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
