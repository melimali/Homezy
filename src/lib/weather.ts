import { useEffect, useState } from 'react';

import { locationOk } from '@/lib/consent';

/** Evin gökyüzü için sadeleştirilmiş hava durumu. */
export type SkyKind = 'clear' | 'cloudy' | 'rain' | 'snow' | 'storm' | 'fog';
export type Sky = { kind: SkyKind; day: boolean; live: boolean };

const TTL = 30 * 60 * 1000;
let cache: { at: number; sky: Sky } | null = null;
let inflight: Promise<Sky | null> | null = null;
let denied = false;

/** Konum ya da ağ yokken saate göre gökyüzü. */
const byClock = (): Sky => {
  const h = new Date().getHours();
  return { kind: 'clear', day: h >= 6 && h < 20, live: false };
};

/** WMO hava kodunu sadeleştirir (Open-Meteo `weather_code`). */
function kindOf(code: number): SkyKind {
  if (code <= 1) return 'clear';
  if (code <= 3) return 'cloudy';
  if (code === 45 || code === 48) return 'fog';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if (code >= 95) return 'storm';
  if (code >= 51) return 'rain';
  return 'cloudy';
}

async function fetchSky(): Promise<Sky | null> {
  if (denied || !locationOk.get()) return null;
  try {
    // Yerel modül: yeni derleme yoksa require atar, sessizce saate döneriz.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { requireOptionalNativeModule } = require('expo-modules-core');
    if (!requireOptionalNativeModule('ExpoLocation')) return null;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Loc = require('expo-location');
    let perm = await Loc.getForegroundPermissionsAsync();
    if (perm.status !== 'granted' && perm.canAskAgain !== false) perm = await Loc.requestForegroundPermissionsAsync();
    if (perm.status !== 'granted') {
      denied = true;
      return null;
    }
    const pos =
      (await Loc.getLastKnownPositionAsync().catch(() => null)) ??
      (await Loc.getCurrentPositionAsync({ accuracy: Loc.Accuracy.Low }));
    const { latitude, longitude } = pos.coords;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude.toFixed(2)}&longitude=${longitude.toFixed(2)}&current=weather_code,is_day`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const j = await res.json();
    return { kind: kindOf(Number(j.current.weather_code)), day: j.current.is_day === 1, live: true };
  } catch {
    return null;
  }
}

/** Bulunduğun yerin güncel havası; izin ya da ağ yoksa saate göre. 30 dakika önbelleğe alınır. */
export function useSky(enabled = true): Sky {
  const [sky, setSky] = useState<Sky>(() => (cache && Date.now() - cache.at < TTL ? cache.sky : byClock()));
  useEffect(() => {
    if (!enabled) return;
    if (cache && Date.now() - cache.at < TTL) return;
    let on = true;
    inflight ||= fetchSky().finally(() => { inflight = null; });
    inflight
      .then(s => {
        if (s) cache = { at: Date.now(), sky: s };
        if (on && s) setSky(s);
      })
      .catch(() => {});
    return () => { on = false; };
  }, [enabled]);
  return sky;
}
