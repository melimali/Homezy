import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { useColors } from '@/theme';

import { MokaLoading } from './MokaLoading';
import { useReduceMotion } from './motion';

/** Hızlı işlerde perde hiç açılmasın diye bu kadar bekler. */
const SHOW_AFTER_MS = 300;

type Ctx = { push: () => () => void; pause: () => () => void };
const noop = () => () => {};
const BusyCtx = createContext<Ctx>({ push: noop, pause: noop });

/** Yükleme sırasında ekran hafif kararır, küçük Moka animasyonu çıkar; iş bitince yumuşakça söner. */
export function BusyProvider({ children }: { children: ReactNode }) {
  const c = useColors();
  const reduce = useReduceMotion();
  const [count, setCount] = useState(0);
  const [paused, setPaused] = useState(0);
  const [mounted, setMounted] = useState(false);
  const fade = useRef(new Animated.Value(0)).current;

  const push = useCallback(() => {
    setCount(n => n + 1);
    let done = false;
    return () => {
      if (done) return;
      done = true;
      setCount(n => Math.max(0, n - 1));
    };
  }, []);
  const pause = useCallback(() => {
    setPaused(n => n + 1);
    let done = false;
    return () => {
      if (done) return;
      done = true;
      setPaused(n => Math.max(0, n - 1));
    };
  }, []);
  const ctx = useMemo(() => ({ push, pause }), [push, pause]);

  const active = count > 0 && paused === 0;
  useEffect(() => {
    if (active) {
      const t = setTimeout(() => {
        setMounted(true);
        Animated.timing(fade, { toValue: 1, duration: reduce ? 0 : 220, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
      }, SHOW_AFTER_MS);
      return () => clearTimeout(t);
    }
    Animated.timing(fade, { toValue: 0, duration: reduce ? 0 : 200, easing: Easing.in(Easing.quad), useNativeDriver: true }).start(({ finished }) => {
      if (finished) setMounted(false);
    });
    return undefined;
  }, [active, fade, reduce]);

  return (
    <BusyCtx.Provider value={ctx}>
      {children}
      {mounted && (
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, st.wrap, { opacity: fade, backgroundColor: 'rgba(20,24,36,0.38)' }]}>
          <View style={[st.card, { backgroundColor: c.surface }]}>
            <MokaLoading size={72} />
          </View>
        </Animated.View>
      )}
    </BusyCtx.Provider>
  );
}

/** `useBusy(busy)`: true olduğu sürece (300 ms'den uzunsa) karartma + animasyon gösterir. */
export function useBusy(on: boolean) {
  const { push } = useContext(BusyCtx);
  useEffect(() => (on ? push() : undefined), [on, push]);
}

/** `usePauseBusy(on)`: true iken perde gizlenir (ör. robot doğrulama kutusu açıkken). */
export function usePauseBusy(on: boolean) {
  const { pause } = useContext(BusyCtx);
  useEffect(() => (on ? pause() : undefined), [on, pause]);
}

/** Bileşen state'i olmayan yerler için: `await withBusy(promise)`. */
export function useWithBusy() {
  const { push } = useContext(BusyCtx);
  return useCallback(async <T,>(p: Promise<T>): Promise<T> => {
    const off = push();
    try {
      return await p;
    } finally {
      off();
    }
  }, [push]);
}

const st = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', zIndex: 9999, elevation: 9999 },
  card: { borderRadius: 24, paddingHorizontal: 28, paddingVertical: 8 },
});
