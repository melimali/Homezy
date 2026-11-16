import { requireOptionalNativeModule } from 'expo-modules-core';
import { useEffect, useState } from 'react';
import { Animated, Easing, Platform } from 'react-native';

import { useReduceMotion } from '@/components/motion';
import { useActive } from '@/hooks/useActive';

/**
 * Odanın hafif 3B derinliği için eğim: x ve y, -1..1.
 * - Telefonda ivmeölçer varsa (expo-sensors yerel modülü derlemede gömülüyse) telefonu eğince sahne çok az döner.
 *   Modül yoksa (eski derleme, Expo Go) çökmeden aşağıdaki yedeğe düşer: yerel modül önce `requireOptionalNativeModule` ile sorulur.
 * - Yedek: çok yavaş, kendiliğinden süzülme (14 ve 19 sn'lik iki salınım), sahne nefes alıyor gibi.
 * "Hareketi azalt" açıksa ya da ekran odakta değilse eğim 0'da durur.
 */
const hasAccel = Platform.OS !== 'web' && !!requireOptionalNativeModule('ExponentAccelerometer');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Accel: typeof import('expo-sensors').Accelerometer | null = hasAccel ? (() => { try { return require('expo-sensors').Accelerometer; } catch { return null; } })() : null;

export function useTilt() {
  const reduce = useReduceMotion();
  const active = useActive();
  const [tilt] = useState(() => new Animated.ValueXY({ x: 0, y: 0 }));
  const run = !reduce && active;

  useEffect(() => {
    if (!run) {
      Animated.spring(tilt, { toValue: { x: 0, y: 0 }, useNativeDriver: true }).start();
      return;
    }
    if (Accel) {
      let sub: { remove: () => void } | null = null;
      let base: { x: number; y: number } | null = null;
      let sx = 0;
      let sy = 0;
      try {
        Accel.setUpdateInterval(50);
        sub = Accel.addListener(({ x, y }) => {
          // İlk okuma telefonun duruşu kabul edilir; eğim ona göre ölçülür. Yumuşatma ile titreme gider.
          base ??= { x, y };
          const clamp = (v: number) => Math.max(-1, Math.min(1, v));
          sx += (clamp((x - base.x) * 3.2) - sx) * 0.12;
          sy += (clamp((y - base.y) * 3.2) - sy) * 0.12;
          // Duruş yavaşça yeni konuma alışır (telefonu uzun süre eğik tutunca sahne ortalanır).
          base = { x: base.x + (x - base.x) * 0.004, y: base.y + (y - base.y) * 0.004 };
          tilt.setValue({ x: Platform.OS === 'ios' ? sx : -sx, y: sy });
        });
      } catch {
        sub = null;
      }
      if (sub) return () => sub?.remove();
    }
    const sine = Easing.inOut(Easing.sin);
    const drift = (v: Animated.Value, ms: number, amp: number) => Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: amp, duration: ms, easing: sine, useNativeDriver: true }),
      Animated.timing(v, { toValue: -amp, duration: ms * 2, easing: sine, useNativeDriver: true }),
      Animated.timing(v, { toValue: 0, duration: ms, easing: sine, useNativeDriver: true }),
    ]));
    const a = Animated.parallel([drift(tilt.x, 3500, 0.45), drift(tilt.y, 4750, 0.3)]);
    a.start();
    return () => a.stop();
  }, [run, tilt]);

  return tilt;
}
