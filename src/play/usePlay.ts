import { useCallback, useEffect } from 'react';
import { AppState as RNAppState } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import { useToast } from '@/components/Toast';
import { FERTS, FLOWER } from '@/domain/garden';
import { BUYABLE, ITEM } from '@/domain/items';
import { autoFreeze, awardLocal, awardToast, dayKey, pruneLog, type AwardResult } from '@/domain/play';
import { mokaLevel } from '@/domain/mokaLevel';
import { limits } from '@/domain/premium';
import type { AppState, DayKey, PlayKind } from '@/domain/types';
import { sfx } from '@/lib/sfx';
import { supabase } from '@/lib/supabase';
import { usePurchases } from '@/purchases/PurchasesProvider';
import { useStore } from '@/store/AppStore';

/**
 * Puanların sunucuyla eşlenmesi. Puan telefonda hemen görünür, sonra sunucuya gönderilir
 * (`play_award`); sunucunun cevabı (puan, günler, eşyalar) esas alınır. İnternet yoksa sırada
 * bekler, bağlantı gelince gönderilir. Sunucu bağlı değilse (anahtar yoksa) her şey telefonda kalır.
 */
type Summary = { points: number; days: DayKey[]; owned: string[]; frozen?: DayKey[]; awarded?: boolean };

type Update = (fn: (draft: AppState) => void) => AppState;

/** Sunucu bu isteği kesin olarak reddetti (ör. çok eski gün); tekrar denemenin anlamı yok. */
const rejected = (e: { code?: string }) => e.code === 'P0001' || e.code?.startsWith('22') || e.code?.startsWith('23');

function apply(update: Update, s: Summary) {
  update(D => {
    const P = D.play;
    P.points = s.points;
    // Henüz gönderilmemiş günler sunucuda yok; onları kaybetme.
    P.days = [...new Set([...s.days, ...P.pending.filter(e => e.kind !== 'dondur').map(e => e.day)])].sort();
    P.owned = s.owned;
    if (s.frozen) P.frozen = [...new Set([...s.frozen, ...P.pending.filter(e => e.kind === 'dondur').map(e => e.day)])].sort();
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
    const { data, error } = ev.kind === 'dondur'
      ? await supabase.rpc('play_freeze', { p_day: ev.day })
      : await supabase.rpc('play_award', { p_kind: ev.kind, p_ref: ev.ref, p_day: ev.day });
    // Sunucuda dondurma fonksiyonu henüz yoksa (…_premium.sql çalıştırılmadı) dondurma telefonda kalsın,
    // arkadaki puanları bekletmesin.
    const missing = ev.kind === 'dondur' && error?.code === 'PGRST202';
    // Ağ hatası ya da sunucuda tablo henüz kurulmamış: sonra tekrar dene.
    if (error && !rejected(error) && !missing) return;
    update(D => {
      const i = D.play.pending.findIndex(e => e.kind === ev.kind && e.ref === ev.ref && e.day === ev.day);
      if (i > -1) D.play.pending.splice(i, 1);
    });
    if (!error) summary = data as Summary;
    // Sunucu dondurmayı reddettiyse (ör. bu ayın hakkı dolmuş) telefondaki kaydı da geri al.
    else if (ev.kind === 'dondur' && !missing) update(D => void (D.play.frozen = D.play.frozen.filter(d => d !== ev.day)));
  }
  if (!summary) {
    const { data, error } = await supabase.rpc('play_summary');
    if (error) return;
    summary = data as Summary;
  }
  apply(update, summary);
}

/**
 * Kaçırılan günleri ayın seri dondurma hakkıyla korur (ücretsiz ayda 1, Premium ayda 3).
 * Sunucu da hakkı sayar; reddederse dondurma geri alınır.
 */
function freezeMissed(get: () => AppState, update: Update, premium: boolean): string[] {
  const S = get();
  // Önce kopyada dene; dondurulacak gün yoksa state'e hiç dokunma.
  if (!S.setup || !autoFreeze({ ...S.play, frozen: [...S.play.frozen] }, limits(premium).freezes).length) return [];
  let out: string[] = [];
  update(D => {
    if (!D.setup) return;
    out = autoFreeze(D.play, limits(premium).freezes);
    for (const day of out) D.play.pending.push({ kind: 'dondur', ref: 'dondur', day });
  });
  return out;
}

/** Kök layout'ta bir kere çağrılır: girişte, uygulama öne gelince ve yeni puan sıraya girince eşler. */
export function usePlaySync() {
  const { state, update, get } = useStore();
  const { session } = useAuth();
  const { ready, premium } = usePurchases();
  const toast = useToast();
  const uid = session?.user.id;
  const pending = state.play.pending.length;
  const active = premium.active;

  // Açılışta ve uygulama öne gelince: dün (ya da daha önce) gün kaçırıldıysa seriyi dondur.
  useEffect(() => {
    if (!ready) return;
    const run = () => {
      const out = freezeMissed(get, update, active);
      if (out.length)
        toast(out.length === 1 ? '❄️ Kaçırdığın gün için seri dondurma kullandım. Evin güvende!' : `❄️ Kaçırdığın ${out.length} gün için seri dondurma kullandım.`);
    };
    run();
    const sub = RNAppState.addEventListener('change', s => s === 'active' && run());
    return () => sub.remove();
  }, [ready, active, get, update, toast]);

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
      const out: { r?: AwardResult; up?: number } = {};
      update(D => {
        extra?.(D);
        out.r = awardLocal(D, kind, ref, label, Date.now(), limits(premium.active).mult);
        pruneLog(D.play);
        const lv = mokaLevel(D.play.moka).level;
        if (lv > D.play.moka.seen) {
          out.up = lv;
          D.play.moka.seen = lv;
        }
      });
      const r = out.r!;
      if (r.awarded) sfx(r.after.level > r.before.level ? 'party' : 'done');
      toast(out.up ? `🎉 Moka ${out.up}. seviye oldu! ${awardToast(r, what)}` : awardToast(r, what));
      return out.r!;
    },
    [update, toast, premium.active],
  );

  const buy = useCallback(
    async (id: string, room: string | null): Promise<BuyResult> => {
      const item = BUYABLE[id];
      if (!item) return { ok: false, error: 'Bu eşya bulunamadı.' };
      if (item.premium && !premium.active) return { ok: false, error: `${item.name} Premium üyelere özel ⭐` };
      if (state.play.points < item.price) return { ok: false, error: `${item.price - state.play.points} puan daha lazım. Bir iş tamamla! 💪` };
      // Sadece odaya konan eşyalar yerleşir; bahçe süsleri ve kişilikler odaya girmez.
      const place = (D: AppState) => void (ITEM[id] && (D.play.placed[id] = room));
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

  /**
   * Tekrar alınabilen bahçe harcaması (tohum ya da gübre). Sunucu fiyatı, Premium'u ve günlük sınırı
   * kendi tablosundan kontrol eder (`play_spend`, …_bahce.sql). Başarılı olursa `then` taslakta çalışır.
   */
  const spend = useCallback(
    async (id: string, then: (D: AppState) => void): Promise<BuyResult> => {
      const flower = FLOWER[id];
      const fert = FERTS.find(f => f.id === id);
      const thing = flower ?? fert;
      if (!thing) return { ok: false, error: 'Bulunamadı.' };
      if (flower?.premium && !premium.active) return { ok: false, error: `${flower.name} Premium üyelere özel ⭐` };
      if (state.play.points < thing.price) return { ok: false, error: `${thing.price - state.play.points} puan daha lazım. Bir iş tamamla! 💪` };
      if (supabase) {
        if (!session) return { ok: false, error: "Moka'nın bahçesi için internet bağlantısı gerekiyor." };
        await flush(get, update);
        if (get().play.pending.length) return { ok: false, error: 'Puanların henüz sunucuya ulaşmadı. İnternet bağlantını kontrol et.' };
        const { data, error } = await supabase.rpc('play_spend', { p_item: id, p_day: dayKey() });
        if (error) {
          const m = error.message || '';
          return {
            ok: false,
            error: error.code === 'PGRST202' ? 'Bahçe sunucuda henüz hazır değil. Biraz sonra tekrar dene.'
              : m.includes('not enough') ? 'Sunucudaki puanın yetmiyor. Biraz sonra tekrar dene.'
              : m.includes('premium') ? `${thing.name} Premium üyelere özel ⭐`
              : m.includes('daily limit') ? 'Bugünlük bu gübre hakkın doldu. Yarın tekrar 🌱'
              : 'Alınamadı. İnternet bağlantını kontrol edip tekrar dene.',
          };
        }
        apply(update, data as Summary);
        update(then);
      } else {
        update(D => {
          D.play.points -= thing.price;
          then(D);
        });
      }
      return { ok: true };
    },
    [premium.active, session, state.play.points, get, update],
  );

  return { play: state.play, award, buy, spend };
}
