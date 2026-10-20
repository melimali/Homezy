import type { NotificationResponse } from 'expo-notifications';
import { useRouter, type Href } from 'expo-router';
import { useEffect } from 'react';

import { useStore } from '@/store/AppStore';

import { getNotifications, rescheduleMorningSummaries } from './schedule';

/** Veri değiştikçe sabah özetlerini yeniler ve bildirime dokununca ilgili ekranı açar. */
export function useNotificationSync() {
  const { state } = useStore();
  const router = useRouter();

  useEffect(() => {
    if (!getNotifications()) return;
    const t = setTimeout(() => {
      rescheduleMorningSummaries(state).catch(e => console.warn('Layfapp: bildirim zamanlanamadı', e));
    }, 1500);
    return () => clearTimeout(t);
  }, [state]);

  useEffect(() => {
    const N = getNotifications();
    if (!N) return;
    const open = (response: NotificationResponse) => {
      const url = response.notification.request.content.data?.url;
      if (typeof url === 'string' && response.actionIdentifier === N.DEFAULT_ACTION_IDENTIFIER) {
        router.push(url as Href);
        N.clearLastNotificationResponse();
      }
    };
    const last = N.getLastNotificationResponse();
    if (last) open(last);
    const sub = N.addNotificationResponseReceivedListener(open);
    return () => sub.remove();
  }, [router]);
}
