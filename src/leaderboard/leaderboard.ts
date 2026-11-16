import { useEffect } from 'react';

import { useAuth } from '@/auth/AuthProvider';
import { totalXp } from '@/domain/mokaLevel';
import { homeScore } from '@/domain/logic';
import { useNow } from '@/hooks/useNow';
import { prefs, supabase } from '@/lib/supabase';
import { useStore } from '@/store/AppStore';

/**
 * Global ev sıralaması (isteğe bağlı, yalnız hesaplı kullanıcı). Tek "ev puanı":
 * (eşyalar + Moka bahçesi) hesap yaşına göre sınırlı ve ev büyüklüğüne göre normalize (src/domain/formulas.ts `fairScore`) + ev temizliği (0-100).
 * Hesap sunucuda (supabase/migrations/20261108000000_siralama.sql); uygulama sadece temizlik yüzdesini gönderir.
 */
export type LbRow = { rank: number; nick: string; score: number; items?: number; garden?: number; clean?: number; xp?: number; level: number; streak: number; me?: boolean };
export type LbData = { top: LbRow[]; me: LbRow | null; joined: boolean; nick: string | null; total: number };
export type LbPeriod = 'hafta' | 'hepsi';

const ON = 'lb.on';
export const lbOn = () => prefs.get(ON) === '1';

export type LbBoard = 'ev' | 'moka';

/** Ev puanı ('ev', haftalık/tüm zamanlar) ya da Moka Şampiyonları ('moka', tüm zamanlar). */
export async function lbTop(period: LbPeriod, board: LbBoard = 'ev'): Promise<LbData | null> {
  if (!supabase) return null;
  const { data, error } = board === 'moka' ? await supabase.rpc('lb_moka_top') : await supabase.rpc('lb_top', { p_period: period });
  if (error || !data) return null;
  return data as LbData;
}

/** Katıl (ya da takma adı değiştir). Hata metni ya da null. */
export async function lbJoin(nick: string): Promise<string | null> {
  if (!supabase) return 'offline';
  const { error } = await supabase.rpc('lb_join', { p_nick: nick });
  if (error) return /bad nick/.test(error.message) ? 'nick' : 'fail';
  prefs.set(ON, '1');
  return null;
}

export async function lbLeave(): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.rpc('lb_leave');
  if (!error) prefs.set(ON, null);
  return !error;
}

/** Katılmış kullanıcının temizlik yüzdesini buluta gönderir (sunucu en çok 10 dakikada bir işler). */
export function useLeaderboardSync() {
  const { status } = useAuth();
  const { state } = useStore();
  const now = useNow();
  const score = homeScore(state, now);
  const xp = totalXp(state.play.moka);
  const cells = Math.max(1, state.cells.filter(Boolean).length);
  useEffect(() => {
    if (!supabase || status !== 'account' || !lbOn()) return;
    const t = setTimeout(() => {
      const sb = supabase!;
      // Yeni sunucu (adil sıralama) ev büyüklüğünü de ister; eski sunucu tanımazsa eski çağrıya düşer.
      void sb.rpc('lb_publish', { p_clean: score, p_xp: xp, p_cells: cells }).then(r => (r.error ? sb.rpc('lb_publish', { p_clean: score, p_xp: xp }) : r)).then(() => {}, () => {});
    }, 5000);
    return () => clearTimeout(t);
  }, [status, score, xp, cells]);
}
