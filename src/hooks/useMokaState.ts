import { useCallback, useMemo, useState } from 'react';

import { MOKA_ASSETS } from '@/constants/moka';
import { mokaStatus, pickMoka, type MokaHouseStatus, type MokaPayload } from '@/domain/moka';
import { useNow } from '@/hooks/useNow';
import { useStore } from '@/store/AppStore';

/**
 * Moka'nın şu anki pozu ve sözü: gecikmiş işler, ev puanı, açık oda, mod ve saate göre.
 * `roomId` verilirse oda ekranına göre seçer. `next()` aynı pozun başka bir sözüne geçer.
 */
export function useMokaState(roomId?: string | null): MokaPayload & { status: MokaHouseStatus; next: () => void } {
  const { state: S } = useStore();
  const now = useNow();
  const [shift, setShift] = useState(0);
  const status = useMemo(() => mokaStatus(S, now, roomId), [S, now, roomId]);
  const m = useMemo(() => pickMoka(status, shift), [status, shift]);
  const next = useCallback(() => setShift(x => x + 1), []);
  return { ...m, image: MOKA_ASSETS[m.pose], status, next };
}
