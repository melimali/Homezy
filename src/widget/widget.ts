import 'expo-sqlite/localStorage/install';
import { Platform } from 'react-native';
import type * as WidgetTypes from 'react-native-android-widget';

import { loadState, saveState } from '@/data/db';
import { DONE, applyTaskAction, type ActionOutcome, feedbackFor, liveStore } from '@/notifications/actions';
import { getNotifications, rescheduleMorningSummaries } from '@/notifications/schedule';
import { limits } from '@/domain/premium';
import type { AppState } from '@/domain/types';

import { addWater, hKey, waterMet, waterOf } from '@/domain/habits';
import { addXp } from '@/domain/mokaLevel';
import { awardLocal } from '@/domain/play';

import { shopData, waterData, widgetData } from './data';
import type * as ShopTypes from './ShopWidget';
import type * as TodayTypes from './TodayWidget';
import type * as WaterTypes from './WaterWidget';

/**
 * Android ana ekran widget'ı ("Bugün"). Uygulama kapalıyken de çalışır: sistem widget'ı eklerken,
 * yarım saatte bir ve "✓" düğmesine basılınca uygulamayı ekransız açıp `index.ts`'te kayıtlı
 * görevi çalıştırır. Veri telefondaki veritabanından okunur; uygulama açıksa store kullanılır.
 * Yerel modül Expo Go'da ve iOS'ta yok; o zaman bu dosya hiçbir şey yapmaz.
 */
type Lib = { W: typeof WidgetTypes; UI: typeof TodayTypes; Water: typeof WaterTypes; Shop: typeof ShopTypes };

function load(): Lib | null {
  if (Platform.OS !== 'android') return null;
  try {
    /* eslint-disable @typescript-eslint/no-require-imports */
    const W = require('react-native-android-widget') as typeof WidgetTypes;
    const UI = require('./TodayWidget') as typeof TodayTypes;
    const Water = require('./WaterWidget') as typeof WaterTypes;
    const Shop = require('./ShopWidget') as typeof ShopTypes;
    /* eslint-enable @typescript-eslint/no-require-imports */
    return { W, UI, Water, Shop };
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
  await lib.W.requestWidgetUpdate({ widgetName: lib.Water.WATER_WIDGET_NAME, renderWidget: () => lib.Water.waterWidget(waterData(S, now)) });
  await lib.W.requestWidgetUpdate({
    widgetName: lib.Shop.SHOP_WIDGET_NAME,
    renderWidget: info => lib.Shop.shopWidget(shopData(S), info.height),
  });
}

/** Uygulama açıksa store üzerinden, değilse veritabanında değiştirir. */
async function mutate(fn: (D: AppState) => void): Promise<AppState | null> {
  const live = liveStore();
  if (live) return live.update(D => void fn(D));
  const S = await loadState();
  if (!S) return null;
  fn(S);
  await saveState(S);
  return S;
}

/** Su widget'ı: bardak ekler / çıkarır; hedef tutarsa günde bir kez puan verir. */
async function waterStep(k: number): Promise<AppState | null> {
  const now = Date.now();
  const mult = limits(lastPremium()).mult;
  return mutate(D => {
    const H = D.play.habits;
    const day = hKey(now);
    const willMeet = !waterMet(H, day) && k > 0 && waterOf(H, day) + k >= H.waterGoal;
    addWater(H, day, k);
    if (willMeet && awardLocal(D, 'gorev', 'alisk:su', '💧 Su hedefi', now, mult).awarded) addXp(D.play, 'saglik', 3, now);
  });
}

/** Market widget'ı: ürünü alındı sayar (Var). */
async function boughtItem(id: string): Promise<AppState | null> {
  return mutate(D => {
    for (const rid of D.order) for (const x of D.mod[rid]?.stock ?? []) if (x.id === id) x.lvl = 'var';
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
    if (widgetAction === 'WIDGET_DELETED') return;
    const name = widgetInfo.widgetName;
    try {
      const click = widgetAction === 'WIDGET_CLICK';
      if (name === lib.Water.WATER_WIDGET_NAME) {
        const S = click && clickAction === lib.Water.WATER_ADD ? await waterStep(1) : click && clickAction === lib.Water.WATER_UNDO ? await waterStep(-1) : await loadState();
        if (S) renderWidget(lib.Water.waterWidget(waterData(S)));
        return;
      }
      if (name === lib.Shop.SHOP_WIDGET_NAME) {
        const S = click && clickAction === lib.Shop.SHOP_BOUGHT && typeof clickActionData?.id === 'string' ? await boughtItem(clickActionData.id) : await loadState();
        if (S) renderWidget(lib.Shop.shopWidget(shopData(S), widgetInfo.height));
        return;
      }
      if (name !== lib.UI.WIDGET_NAME) return;
      let S: AppState | null;
      let note: string | null = null;
      if (click && clickAction === lib.UI.DONE_ACTION && typeof clickActionData?.tid === 'string') {
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

/** Ana ekrana "Bugün" widget'ını ekletir (bazı telefonların araç seçicisi widget'ı listelemiyor). Eklenemezse false. */
export async function pinTodayWidget(): Promise<boolean> {
  if (!lib) return false;
  try {
    return await lib.W.requestPinWidget({ widgetName: lib.UI.WIDGET_NAME });
  } catch {
    return false;
  }
}

export const widgetAvailable = () => lib != null;
