import 'expo-sqlite/localStorage/install';
import { Platform } from 'react-native';
import type * as WidgetTypes from 'react-native-android-widget';

import { loadState, saveState } from '@/data/db';
import { DONE, applyTaskAction, type ActionOutcome, feedbackFor, liveStore } from '@/notifications/actions';
import { getNotifications, rescheduleMorningSummaries } from '@/notifications/schedule';
import { limits } from '@/domain/premium';
import type { AppState } from '@/domain/types';

import { widgetData } from './data';
import type * as TodayTypes from './TodayWidget';

/**
 * Android ana ekran widget'ı ("Bugün"). Uygulama kapalıyken de çalışır: sistem widget'ı eklerken,
 * yarım saatte bir ve "✓" düğmesine basılınca uygulamayı ekransız açıp `index.ts`'te kayıtlı
 * görevi çalıştırır. Veri telefondaki veritabanından okunur; uygulama açıksa store kullanılır.
 * Yerel modül Expo Go'da ve iOS'ta yok; o zaman bu dosya hiçbir şey yapmaz.
 */
type Lib = { W: typeof WidgetTypes; UI: typeof TodayTypes };

function load(): Lib | null {
  if (Platform.OS !== 'android') return null;
  try {
    /* eslint-disable @typescript-eslint/no-require-imports */
    const W = require('react-native-android-widget') as typeof WidgetTypes;
    const UI = require('./TodayWidget') as typeof TodayTypes;
    /* eslint-enable @typescript-eslint/no-require-imports */
    return { W, UI };
  } catch {
    // Eski geliştirme derlemesi ya da Expo Go: widget yok.
    return null;
  }
}

const lib = load();

/** Arka planda üyelik bilinmiyor; uygulama her açılışta son durumu buraya yazar (puan çarpanı için). */
const PREMIUM_KEY = 'layfapp.widget.premium';
function lastPremium() {
  try {
    return globalThis.localStorage?.getItem(PREMIUM_KEY) === '1';
  } catch {
    return false;
  }
}
export function rememberPremium(active: boolean) {
  try {
    globalThis.localStorage?.setItem(PREMIUM_KEY, active ? '1' : '0');
  } catch {
    // Depolama kapalıysa çarpan bir sonraki açılışa kadar 1 kalır.
  }
}

/** Uygulama açıkken veri değişince çağrılır: ekrandaki bütün "Bugün" widget'larını yeniler. */
export async function refreshWidgets(S: AppState, now = Date.now()) {
  if (!lib) return;
  const data = widgetData(S, now);
  await lib.W.requestWidgetUpdate({
    widgetName: lib.UI.WIDGET_NAME,
    renderWidget: info => lib.UI.todayWidget(data, info.height),
  });
}

/** "✓" düğmesi: iş bildirimdeki "Yaptım" ile aynı yoldan tamamlanır (puan, seri, bildirimler). */
async function complete(tid: string): Promise<{ S: AppState | null; note: string | null }> {
  const now = Date.now();
  const premium = lastPremium();
  const mult = limits(premium).mult;
  const live = liveStore();
  if (live) {
    let o: ActionOutcome | null = null;
    const S = live.update(D => void (o = applyTaskAction(D, tid, DONE, now, mult)));
    if (o) live.onOutcome?.(o, DONE);
    return { S, note: o ? (feedbackFor(o)?.body ?? null) : null };
  }
  const S = await loadState();
  if (!S) return { S: null, note: null };
  const o = applyTaskAction(S, tid, DONE, now, mult);
  if (o && !o.already) {
    await saveState(S);
    if (getNotifications()) await rescheduleMorningSummaries(S, premium).catch(e => console.warn('Homezy: bildirim zamanlanamadı', e));
  }
  return { S, note: o ? (feedbackFor(o)?.body ?? null) : null };
}

if (lib) {
  lib.W.registerWidgetTaskHandler(async ({ widgetInfo, widgetAction, clickAction, clickActionData, renderWidget }) => {
    if (widgetInfo.widgetName !== lib.UI.WIDGET_NAME || widgetAction === 'WIDGET_DELETED') return;
    try {
      let S: AppState | null;
      let note: string | null = null;
      if (widgetAction === 'WIDGET_CLICK' && clickAction === lib.UI.DONE_ACTION && typeof clickActionData?.tid === 'string') {
        ({ S, note } = await complete(clickActionData.tid));
      } else {
        S = await loadState();
      }
      if (!S) return;
      renderWidget(lib.UI.todayWidget(widgetData(S), widgetInfo.height, note));
    } catch (e) {
      console.warn('Homezy: widget çizilemedi', e);
    }
  });
}
