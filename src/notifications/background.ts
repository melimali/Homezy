import type { NotificationResponse } from 'expo-notifications';
import type * as TaskManagerTypes from 'expo-task-manager';
import { Platform } from 'react-native';

import { handleTaskAction } from './actions';
import { getNotifications, rescheduleMorningSummaries } from './schedule';

/**
 * Android'de uygulama kapalıyken ya da arka plandayken bildirimdeki "Yaptım" / "Yapmadım"
 * düğmeleri bu görevi çalıştırır. Uygulamanın en başında (`index.ts`) tanımlanmalı, çünkü
 * sistem uygulamayı ekransız açıp sadece bu görevi çalıştırır.
 */
const TASK = 'layfapp-bildirim-cevabi';

function load(): typeof TaskManagerTypes | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-task-manager') as typeof TaskManagerTypes;
  } catch {
    // Yerel modül yok (eski geliştirme derlemesi): cevaplar uygulama açılınca işlenir.
    return null;
  }
}

const N = Platform.OS === 'android' ? getNotifications() : null;
const TM = N ? load() : null;
if (N && TM) {
  TM.defineTask<NotificationResponse | Record<string, unknown>>(TASK, async ({ data }) => {
    if (!data || !('actionIdentifier' in data)) return;
    const r = data as NotificationResponse;
    const { request, date } = r.notification;
    await handleTaskAction(N, { id: request.identifier, action: r.actionIdentifier, date, content: request.content }, rescheduleMorningSummaries).catch(e =>
      console.warn('Layfapp: bildirim cevabı işlenemedi', e),
    );
  });
  N.registerTaskAsync(TASK).catch(e => console.warn('Layfapp: bildirim görevi kaydedilemedi', e));
}
