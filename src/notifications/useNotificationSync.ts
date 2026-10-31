import type { NotificationResponse } from 'expo-notifications';
import { useRouter, type Href } from 'expo-router';
import { useEffect } from 'react';

import { useToast } from '@/components/Toast';
import { sfx } from '@/lib/sfx';
import { usePurchases } from '@/purchases/PurchasesProvider';
import { useStore } from '@/store/AppStore';

import { DONE, feedbackFor, handleTaskAction, setLiveStore } from './actions';
import { getNotifications, rescheduleMorningSummaries } from './schedule';

/**
 * Veri değiştikçe sabah özetlerini yeniler, bildirime dokununca ilgili ekranı açar ve
 * bildirimdeki "Yaptım" / "Yapmadım" düğmelerini işler.
 */
export function useNotificationSync() {
  const { state, update } = useStore();
  const { premium } = usePurchases();
  const router = useRouter();
  const toast = useToast();
  const active = premium.active;

  // Uygulama açıkken bildirim cevapları store üzerinden işlensin (ekran hemen yenilenir).
  useEffect(() => {
    setLiveStore({
      update,
      onOutcome: (o, action) => {
        const fb = feedbackFor(o);
        if (action === DONE && fb) {
          sfx(o.result!.after.level > o.result!.before.level ? 'party' : 'done');
          toast(fb.body);
        }
      },
    });
    return () => setLiveStore(null);
  }, [update, toast]);

  useEffect(() => {
    if (!getNotifications()) return;
    const t = setTimeout(() => {
      rescheduleMorningSummaries(state, active).catch(e => console.warn('Homezy: bildirim zamanlanamadı', e));
    }, 1500);
    return () => clearTimeout(t);
  }, [state, active]);

  useEffect(() => {
    const N = getNotifications();
    if (!N) return;
    const open = (response: NotificationResponse) => {
      const { request, date } = response.notification;
      if (response.actionIdentifier !== N.DEFAULT_ACTION_IDENTIFIER) {
        handleTaskAction(N, { id: request.identifier, action: response.actionIdentifier, date, content: request.content }, rescheduleMorningSummaries)
          .catch(e => console.warn('Homezy: bildirim cevabı işlenemedi', e))
          .finally(() => N.clearLastNotificationResponse());
        return;
      }
      const url = request.content.data?.url;
      if (typeof url === 'string') {
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
