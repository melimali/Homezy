import { useCallback, useRef, useState, type ComponentRef } from 'react';
import { type ScrollView, type View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { BenTour, type TourStep } from '@/components/BenTour';
import { useStep } from '@/lib/firstRun';
import { prefs } from '@/lib/supabase';

type Tgt = ComponentRef<typeof View>;

/**
 * Sekmeye ilk girişte Ben sekmesindeki gibi Moka turu (BenTour). Bir kez gösterilir, `tour.<key>` ile saklanır.
 * `mark(k)` hedef View'a yayılır, `screen` Screen'e yayılır, `node` ekranın sonuna konur.
 */
export function useTabTour(key: string, steps: TourStep[]) {
  const storeKey = `tour.${key}`;
  const [wanted, setWanted] = useState(false);
  const scrollY = useRef(0);
  const scroller = useRef<ComponentRef<typeof ScrollView>>(null);
  const [tg] = useState<{ current: Record<string, Tgt | null> }>(() => ({ current: {} }));
  const mark = (k: string) => ({ ref: (v: Tgt | null) => { tg.current[k] = v; }, collapsable: false as const });
  useFocusEffect(
    useCallback(() => {
      if (prefs.get(storeKey) === '1') return;
      const id = setTimeout(() => setWanted(true), 900);
      return () => {
        clearTimeout(id);
        setWanted(false);
      };
    }, [storeKey]),
  );
  const turn = useStep('tour', wanted);
  const end = () => { prefs.set(storeKey, '1'); setWanted(false); };
  const screen = { scrollRef: scroller, onScrollY: (y: number) => { scrollY.current = y; } };
  const node = turn ? (
    <BenTour steps={steps} targets={tg} onDone={end} getY={() => scrollY.current} scrollTo={y => scroller.current?.scrollTo({ y: Math.max(0, y), animated: true })} />
  ) : null;
  return { mark, screen, node };
}
