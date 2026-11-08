import { requireOptionalNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

import { prefs } from '@/lib/supabase';

const KEY = 'reviewAsk';
const GAP = 90 * 86400000;

/**
 * Mağaza puanlama penceresi. Sadece güzel bir andan sonra (ör. 7 günlük seri kutlaması) çağır;
 * 90 günde en fazla bir kez, toplamda 3 kez sorar. Yerel modül bu derlemede yoksa sessizce geçer.
 */
export async function maybeAskReview(now = Date.now()) {
  if (Platform.OS === 'web') return;
  try {
    const mem = JSON.parse(prefs.get(KEY) ?? '{"n":0,"at":0}') as { n: number; at: number };
    if (mem.n >= 3 || now - mem.at < GAP) return;
    if (!requireOptionalNativeModule('ExpoStoreReview')) return;
    const SR = require('expo-store-review') as typeof import('expo-store-review'); // eslint-disable-line @typescript-eslint/no-require-imports
    if (!(await SR.hasAction())) return;
    prefs.set(KEY, JSON.stringify({ n: mem.n + 1, at: now }));
    await SR.requestReview();
  } catch {
    // Puanlama penceresi açılamazsa sorun değil.
  }
}
