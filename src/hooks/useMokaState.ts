import { useCallback, useMemo, useState } from 'react';

import { MOKA_ASSETS } from '@/constants/moka';
import { displayName, useAuth } from '@/auth/AuthProvider';
import { mokaStatus, pickMoka, type MokaHouseStatus, type MokaPayload } from '@/domain/moka';
import { useNow } from '@/hooks/useNow';
import { useStore } from '@/store/AppStore';

/**
 * Moka'nın şu anki pozu ve sözü: gecikmiş işler, ev puanı, açık oda, mod ve saate göre.
 * `roomId` verilirse oda ekranına göre seçer. `next()` aynı pozun başka bir sözüne geçer.
 */
export function useMokaState(roomId?: string | null): MokaPayload & { status: MokaHouseStatus; next: () => void } {
  const { state: S } = useStore();
  const { user } = useAuth();
  const name = displayName(user);
  const now = useNow();
  const [shift, setShift] = useState(0);
  const status = useMemo(() => mokaStatus(S, now, roomId), [S, now, roomId]);
  const m = useMemo(() => {
    const q = pickMoka(status, shift);
    // Üç günden birinde Moka söze adla başlar (misafirde hitap yok).
    const day = Number(status.day.replace(/\D/g, '')) + shift;
    if (name === 'Misafir' || day % 3 !== 0 || !q.message) return q;
    return { ...q, message: `${name}, ${q.message.charAt(0).toLocaleLowerCase('tr')}${q.message.slice(1)}` };
  }, [status, shift, name]);
  const next = useCallback(() => setShift(x => x + 1), []);
  return { ...m, image: MOKA_ASSETS[m.pose], status, next };
}
