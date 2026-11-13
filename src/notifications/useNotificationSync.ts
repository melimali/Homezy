import type { NotificationResponse } from 'expo-notifications';
import { type Href } from 'expo-router';
import { useRouter } from '@/lib/nav';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

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

  // Uygulama saatlerce/günlerce arka planda kaldıysa veri değişmese de özetler (ve 7 günlük ufuk) yenilenmeli.
  const latest = useRef({ state, active });
  useEffect(() => {
    latest.current = { state, active };
  });
  useEffect(() => {
    if (!getNotifications()) return;
    let t: ReturnType<typeof setTimeout> | null = null;
    const sub = AppState.addEventListener('change', st => {
      if (st !== 'active') return;
      if (t) clearTimeout(t);
      t = setTimeout(() => {
        rescheduleMorningSummaries(latest.current.state, latest.current.active).catch(e => console.warn('Homezy: bildirim zamanlanamadı', e));
      }, 2000);
    });
    return () => {
      if (t) clearTimeout(t);
      sub.remove();
    };
  }, []);

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
