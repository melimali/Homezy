import { useEffect } from 'react';

import { dayKey } from '@/domain/play';
import { useNow } from '@/hooks/useNow';
import { usePurchases } from '@/purchases/PurchasesProvider';
import { useStore } from '@/store/AppStore';

import { refreshWidgets, rememberPremium } from './widget';

/** Uygulama açıkken ana ekran widget'ını veriyle (ve gün değişince) güncel tutar. */
export function useWidgetSync() {
  const { state } = useStore();
  const { premium } = usePurchases();
  const day = dayKey(useNow());
  const active = premium.active;

  useEffect(() => rememberPremium(active), [active]);

  useEffect(() => {
    const t = setTimeout(() => {
      refreshWidgets(state).catch(e => console.warn('Homezy: widget yenilenemedi', e));
    }, 800);
    return () => clearTimeout(t);
  }, [state, day]);
}
