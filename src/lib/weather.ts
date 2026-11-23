import { useEffect, useState } from 'react';
import { fetchWithTimeout } from '@/lib/net';

import { locationOk } from '@/lib/consent';
import { permissionBusy, withPermissionGate } from '@/lib/firstRun';

/** Evin gökyüzü için sadeleştirilmiş hava durumu. */
export type SkyKind = 'clear' | 'cloudy' | 'rain' | 'snow' | 'storm' | 'fog';
/** `rise` / `set`: bugünün gün doğumu ve batımı, yerel saat (ondalık, örn. 7,5 = 07:30). Canlı veri yoksa yok. */
export type Sky = { kind: SkyKind; day: boolean; live: boolean; rise?: number; set?: number };

/** Open-Meteo yerel zamanı ("2026-11-23T07:12") ondalık saate çevirir. */
const hourOf = (iso: unknown): number | undefined => {
  const m = /T(\d{2}):(\d{2})/.exec(String(iso ?? ''));
  return m ? Number(m[1]) + Number(m[2]) / 60 : undefined;
};

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
    if (perm.status !== 'granted' && perm.canAskAgain !== false) {
      // Açık bir pencere varken (karşılama, tanıtım...) izin istenmez; sistem izin kutusu üst üste gelince iOS donuyor. Sonraki yenilemede tekrar denenir.
      if (permissionBusy()) return null;
      perm = await withPermissionGate(() => Loc.requestForegroundPermissionsAsync());
    }
    if (perm.status !== 'granted') {
      denied = true;
      return null;
    }
    const pos =
      (await Loc.getLastKnownPositionAsync().catch(() => null)) ??
      (await Loc.getCurrentPositionAsync({ accuracy: Loc.Accuracy.Low }));
    const { latitude, longitude } = pos.coords;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude.toFixed(2)}&longitude=${longitude.toFixed(2)}&current=weather_code,is_day&daily=sunrise,sunset&timezone=auto&forecast_days=1`;
    const res = await fetchWithTimeout(6000)(url);
    if (!res.ok) return null;
    const j = await res.json();
    return { kind: kindOf(Number(j.current.weather_code)), day: j.current.is_day === 1, live: true, rise: hourOf(j.daily?.sunrise?.[0]), set: hourOf(j.daily?.sunset?.[0]) };
  } catch {
    return null;
  }
}

/** Bulunduğun yerin güncel havası; izin ya da ağ yoksa saate göre. 30 dakika önbelleğe alınır. */
export function useSky(enabled = true): Sky {
  const [sky, setSky] = useState<Sky>(() => (cache && Date.now() - cache.at < TTL ? cache.sky : byClock()));
  useEffect(() => {
    if (!enabled) return;
    let on = true;
    const refresh = () => {
      if (cache && Date.now() - cache.at < TTL) {
        setSky(cache.sky);
        return;
      }
      // Canlı veri yokken (ya da eskimişken) saate göre; gün doğumu / batımı uygulama açıkken de yakalansın.
      setSky(prev => {
        const k = byClock();
        return prev.live || prev.day !== k.day ? (prev.live ? { ...prev, day: k.day, live: false } : k) : prev;
      });
      inflight ||= fetchSky().finally(() => { inflight = null; });
      inflight
        .then(s => {
          if (s) cache = { at: Date.now(), sky: s };
          if (on && s) setSky(s);
        })
        .catch(() => {});
    };
    refresh();
    const id = setInterval(refresh, 5 * 60 * 1000);
    return () => { on = false; clearInterval(id); };
  }, [enabled]);
  return sky;
}
