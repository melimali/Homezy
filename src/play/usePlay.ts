import { useCallback, useEffect } from 'react';
import { AppState as RNAppState } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import { useToast } from '@/components/Toast';
import { ITEM } from '@/domain/items';
import { awardLocal, awardToast, pruneLog, type AwardResult } from '@/domain/play';
import type { AppState, DayKey, PlayKind } from '@/domain/types';
import { supabase } from '@/lib/supabase';
import { usePurchases } from '@/purchases/PurchasesProvider';
import { useStore } from '@/store/AppStore';

/**
 * Puanların sunucuyla eşlenmesi. Puan telefonda hemen görünür, sonra sunucuya gönderilir
 * (`play_award`); sunucunun cevabı (puan, günler, eşyalar) esas alınır. İnternet yoksa sırada
 * bekler, bağlantı gelince gönderilir. Sunucu bağlı değilse (anahtar yoksa) her şey telefonda kalır.
 */
type Summary = { points: number; days: DayKey[]; owned: string[]; awarded?: boolean };

type Update = (fn: (draft: AppState) => void) => AppState;

/** Sunucu bu isteği kesin olarak reddetti (ör. çok eski gün); tekrar denemenin anlamı yok. */
const rejected = (e: { code?: string }) => e.code === 'P0001' || e.code?.startsWith('22') || e.code?.startsWith('23');

function apply(update: Update, s: Summary) {
  update(D => {
    const P = D.play;
    P.points = s.points;
    // Henüz gönderilmemiş günler sunucuda yok; onları kaybetme.
    P.days = [...new Set([...s.days, ...P.pending.map(e => e.day)])].sort();
    P.owned = s.owned;
  });
}

let inflight: Promise<void> | null = null;

/** Aynı anda tek bir eşleme çalışır; ikinci çağrı ilkinin bitmesini bekler. */
function flush(get: () => AppState, update: Update): Promise<void> {
  if (!supabase) return Promise.resolve();
  inflight ||= send(get, update).finally(() => void (inflight = null));
  return inflight;
}

async function send(get: () => AppState, update: Update) {
  if (!supabase) return;
  let summary: Summary | null = null;
  for (;;) {
    const ev = get().play.pending[0];
    if (!ev) break;
    const { data, error } = await supabase.rpc('play_award', { p_kind: ev.kind, p_ref: ev.ref, p_day: ev.day });
    // Ağ hatası ya da sunucuda tablo henüz kurulmamış: sonra tekrar dene.
    if (error && !rejected(error)) return;
    update(D => {
      const i = D.play.pending.findIndex(e => e.kind === ev.kind && e.ref === ev.ref && e.day === ev.day);
      if (i > -1) D.play.pending.splice(i, 1);
    });
    if (!error) summary = data as Summary;
  }
  if (!summary) {
    const { data, error } = await supabase.rpc('play_summary');
    if (error) return;
    summary = data as Summary;
  }
  apply(update, summary);
}

/** Kök layout'ta bir kere çağrılır: girişte, uygulama öne gelince ve yeni puan sıraya girince eşler. */
export function usePlaySync() {
  const { state, update, get } = useStore();
  const { session } = useAuth();
  const uid = session?.user.id;
  const pending = state.play.pending.length;

  useEffect(() => {
    if (uid) flush(get, update).catch(() => {});
  }, [uid, pending, get, update]);

  useEffect(() => {
    if (!uid) return;
    const sub = RNAppState.addEventListener('change', s => {
      if (s === 'active') flush(get, update).catch(() => {});
    });
    return () => sub.remove();
  }, [uid, get, update]);
}

type BuyResult = { ok: true } | { ok: false; error: string };

export function usePlay() {
  const { state, update, get } = useStore();
  const { session } = useAuth();
  const { premium } = usePurchases();
  const toast = useToast();

  /** Bir işi bugün için tamamlar; puan günde bir kez verilir. `what` mesajda görünen ad. */
  const award = useCallback(
    (kind: PlayKind, ref: string, label: string, what: string, extra?: (D: AppState) => void): AwardResult => {
      const out: { r?: AwardResult } = {};
      update(D => {
        extra?.(D);
        out.r = awardLocal(D, kind, ref, label);
        pruneLog(D.play);
      });
      toast(awardToast(out.r!, what));
      return out.r!;
    },
    [update, toast],
  );

  const buy = useCallback(
    async (id: string, room: string | null): Promise<BuyResult> => {
      const item = ITEM[id];
      if (!item) return { ok: false, error: 'Bu eşya bulunamadı.' };
      if (item.premium && !premium.active) return { ok: false, error: `${item.name} Premium üyelere özel ⭐` };
      if (state.play.points < item.price) return { ok: false, error: `${item.price - state.play.points} puan daha lazım. Bir iş tamamla! 💪` };
      const place = (D: AppState) => void (D.play.placed[id] = room);
      if (supabase) {
        if (!session) return { ok: false, error: 'Mağaza için internet bağlantısı gerekiyor.' };
        // Önce sırada bekleyen puanlar gitsin, yoksa sunucu yetersiz puan der.
        await flush(get, update);
        if (get().play.pending.length) return { ok: false, error: 'Puanların henüz sunucuya ulaşmadı. İnternet bağlantını kontrol et.' };
        const { data, error } = await supabase.rpc('play_buy', { p_item: id });
        if (error) {
          const m = error.message || '';
          return {
            ok: false,
            error: m.includes('not enough') ? 'Sunucudaki puanın yetmiyor. Biraz sonra tekrar dene.'
              : m.includes('premium') ? `${item.name} Premium üyelere özel ⭐`
              : 'Satın alınamadı. İnternet bağlantını kontrol edip tekrar dene.',
          };
        }
        apply(update, data as Summary);
        update(place);
      } else {
        update(D => {
          D.play.points -= item.price;
          if (!D.play.owned.includes(id)) D.play.owned.push(id);
          place(D);
        });
      }
      return { ok: true };
    },
    [premium.active, session, state.play.points, get, update],
  );

  return { play: state.play, award, buy };
}
