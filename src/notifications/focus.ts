import { getNotifications } from './schedule';

const ID = 'odak-bitti';

/** Odak zamanlayıcısı bitince çalacak yerel bildirim (modül yoksa sessizce atlanır). */
export async function scheduleFocusEnd(endsAt: number, topic: string) {
  const N = getNotifications();
  if (!N || endsAt <= Date.now()) return;
  try {
    if ((await N.getPermissionsAsync()).status !== 'granted') return;
    await N.scheduleNotificationAsync({
      identifier: ID,
      content: { title: 'Odak süresi bitti 🎉', body: `${topic} için güzel iş! Moka seninle gurur duyuyor.`, data: { url: '/odak', focus: true } },
      trigger: { type: N.SchedulableTriggerInputTypes.DATE, date: new Date(endsAt) },
    });
  } catch (e) {
    console.warn('Homezy: odak bildirimi zamanlanamadı', e);
  }
}

export async function cancelFocusEnd() {
  try {
    await getNotifications()?.cancelScheduledNotificationAsync(ID);
  } catch {}
}
