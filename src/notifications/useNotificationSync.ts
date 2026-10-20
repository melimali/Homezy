import * as Notifications from 'expo-notifications';
import { useRouter, type Href } from 'expo-router';
import { useEffect } from 'react';

import { useStore } from '@/store/AppStore';

import { notificationsSupported, rescheduleMorningSummaries } from './schedule';

/** Veri değiştikçe sabah özetlerini yeniler ve bildirime dokununca ilgili ekranı açar. */
export function useNotificationSync() {
  const { state } = useStore();
  const router = useRouter();

  useEffect(() => {
    if (!notificationsSupported) return;
    const t = setTimeout(() => {
      rescheduleMorningSummaries(state).catch(e => console.warn('Layfapp: bildirim zamanlanamadı', e));
    }, 1500);
    return () => clearTimeout(t);
  }, [state]);

  useEffect(() => {
    if (!notificationsSupported) return;
    const open = (response: Notifications.NotificationResponse) => {
      const url = response.notification.request.content.data?.url;
      if (typeof url === 'string' && response.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
        router.push(url as Href);
        Notifications.clearLastNotificationResponse();
      }
    };
    const last = Notifications.getLastNotificationResponse();
    if (last) open(last);
    const sub = Notifications.addNotificationResponseReceivedListener(open);
    return () => sub.remove();
  }, [router]);
}
