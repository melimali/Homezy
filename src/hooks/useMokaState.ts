import { useCallback, useMemo, useState } from 'react';

import { MOKA_ASSETS } from '@/constants/moka';
import { useName } from '@/profile/useName';
import { CALM_POSES, mokaStatus, pickMoka, type MokaHouseStatus, type MokaPayload } from '@/domain/moka';
import { personaLine } from '@/domain/persona';
import { usePersona } from '@/profile/usePersona';
import { useNow } from '@/hooks/useNow';
import { useStore } from '@/store/AppStore';
import { getUiLang, tx } from '@/i18n/runtime';

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
  const lang = getUiLang();
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
    if (lang !== 'tr') {
      const dm = tx(q.message);
      if (lang === 'ja') return { ...q, message: `${name}、${dm}` };
      if (lang === 'ko' || lang === 'ar') return { ...q, message: `${name}, ${dm}` };
      if (lang === 'de') {
        // Almancada isimler büyük yazılır: sadece işlev sözcükleriyle başlayan cümlede ilk harf küçülür.
        const small = /^(ich|du|wir|es|heute|jetzt|hier|schon|noch|nur|gerade|gleich|dein|deine|dir|dich|mein|meine|der|die|das|ein|eine|wenn|dass|komm|lass|mach|fang|hey|hi|na)\b/i.test(dm);
        return { ...q, message: `${name}, ${small ? dm.charAt(0).toLocaleLowerCase('de') : dm.charAt(0)}${dm.slice(1)}` };
      }
      const keep = /^(I\b|[A-Z]{2})/.test(dm);
      return { ...q, message: `${name}, ${keep ? dm.charAt(0) : dm.charAt(0).toLocaleLowerCase(lang)}${dm.slice(1)}` };
    }
    const msg = q.message;
    const first = msg.charAt(0).toLocaleLowerCase('tr');
    return { ...q, message: `${name}, ${first}${msg.slice(1)}` };
  }, [status, shift, name, persona, roomId, lang]);
  const next = useCallback(() => setShift(x => x + 1), []);
  return { ...m, image: MOKA_ASSETS[m.pose], status, next };
}
