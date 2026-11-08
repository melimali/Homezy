import { useCallback, useMemo, useState } from 'react';

import { MOKA_ASSETS } from '@/constants/moka';
import { useName } from '@/profile/useName';
import { CALM_POSES, mokaStatus, pickMoka, type MokaHouseStatus, type MokaPayload } from '@/domain/moka';
import { personaLine } from '@/domain/persona';
import { usePersona } from '@/profile/usePersona';
import { useNow } from '@/hooks/useNow';
import { useStore } from '@/store/AppStore';
import { getLang, tx } from '@/i18n/runtime';

/**
 * Moka'nın şu anki pozu ve sözü: gecikmiş işler, ev puanı, açık oda, mod ve saate göre.
 * `roomId` verilirse oda ekranına göre seçer. `next()` aynı pozun başka bir sözüne geçer.
 */
export function useMokaState(roomId?: string | null): MokaPayload & { status: MokaHouseStatus; next: () => void } {
  const { state: S } = useStore();
  const name = useName();
  const { persona } = usePersona();
  const now = useNow();
  const [shift, setShift] = useState(0);
  const lang = getLang();
  const status = useMemo(() => mokaStatus(S, now, roomId), [S, now, roomId]);
  const m = useMemo(() => {
    let q = pickMoka(status, shift);
    // Sakin anlarda (ödevi yok, gecikme yok) Moka kişiye özel konuşur; sıkışık anlarda işe odaklı kalır.
    if (persona && !roomId && !status.mode && status.late === 0 && CALM_POSES.includes(q.pose)) {
      const l = personaLine(persona, status.hour, status.day, shift);
      if (l) q = { ...q, title: l.title, message: l.message };
    }
    // Üç günden birinde Moka söze adla başlar (misafirde hitap yok).
    const day = Number(status.day.replace(/\D/g, '')) + shift;
    if (!name || name === 'Misafir' || day % 3 !== 0 || !q.message) return q;
    // Adla birleştirmeden önce çevrilir; yoksa "Melih, ev bekler..." bütün cümle olarak eşleşmez.
    const en = lang === 'en';
    const msg = en ? tx(q.message) : q.message;
    const keepCase = en && /^(I\b|[A-Z]{2})/.test(msg);
    const first = keepCase ? msg.charAt(0) : msg.charAt(0).toLocaleLowerCase(en ? 'en' : 'tr');
    return { ...q, message: `${name}, ${first}${msg.slice(1)}` };
  }, [status, shift, name, persona, roomId, lang]);
  const next = useCallback(() => setShift(x => x + 1), []);
  return { ...m, image: MOKA_ASSETS[m.pose], status, next };
}
