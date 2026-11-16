import type { AppState } from '@/domain/types';

/** Ara sıra çıkan "özellik ipucu" pencereleri: hangi ipucu, ne zaman, hangi sırayla (src/components/FeatureTip.tsx). */
export type TipId = 'journal' | 'meds' | 'sport' | 'garden' | 'house' | 'recipes' | 'moka' | 'widget' | 'notifs';

export type Tip = {
  id: TipId;
  emoji: string;
  title: string;
  text: string;
  cta: string;
  href: string;
};

export const TIPS: readonly Tip[] = [
  { id: 'journal', emoji: '📔', title: 'Günlük tutmayı dene', text: 'Günlük tutmak ruhsal sağlığın için çok iyi olabilir. Günde bir cümle bile yeter.', cta: 'Günlüğü aç', href: '/gunluk' },
  { id: 'meds', emoji: '💊', title: 'İlaç takibi ekle', text: 'İlaçlarını ekle, saati gelince hatırlatayım. Bildirimden tek dokunuşla "Aldım" diyebilirsin.', cta: 'İlaç ekle', href: '/ilac' },
  { id: 'sport', emoji: '🏃', title: 'Hareket vakti', text: 'Spor kaydı tut, antrenman planını gör. Küçük hareketler de puan kazandırır.', cta: 'Spora git', href: '/spor' },
  { id: 'garden', emoji: '🌷', title: "Moka'nın bahçesi", text: 'Çiçek ek, işlerini yaptıkça büyüsün. Albümünü doldur, evin bahçesi renklensin.', cta: 'Bahçeye git', href: '/bahce' },
  { id: 'house', emoji: '🏡', title: 'Evini süsle', text: 'Zemini, duvarı ve pencereyi değiştir; puanla aldığın eşyaları odalara yerleştir.', cta: 'Evi düzenle', href: '/dekor' },
  { id: 'recipes', emoji: '🍳', title: 'Ne pişirsem?', text: 'Buzdolabındakilere göre tarif önerileri var. İnternetsiz de çalışır.', cta: 'Tariflere bak', href: '/yemek' },
  { id: 'moka', emoji: '💬', title: "Moka'yla sohbet et", text: "Moka'ya evini, planını ya da gününü sorabilirsin. Sohbet Premium üyelere özel.", cta: "Moka'ya yaz", href: '/moka' },
  { id: 'widget', emoji: '📲', title: 'Ana ekran widget’ı', text: 'Bugünün işlerini telefonu açmadan gör ve ✓ ile tamamla (Android).', cta: 'Ben sayfasına git', href: '/hesap' },
  { id: 'notifs', emoji: '🔔', title: 'Bildirimden hızlı iş', text: 'Bildirimlerdeki "Yaptım" düğmeleriyle uygulamayı açmadan işi bitir. Hangilerinin geleceğini sen seç.', cta: 'Bildirim ayarları', href: '/bildirimler' },
];

export type TipMem = {
  /** Son gösterilenler, en yenisi sonda. */
  seen: TipId[];
  /** En son ipucu gösterilen gün (YYYY-MM-DD). */
  day: string | null;
  /** En son ipucu gösterilen açılış numarası (art arda iki açılışta çıkmasın). */
  session: number;
};

export const EMPTY_MEM: TipMem = { seen: [], day: null, session: 0 };
export const TIP_CHANCE = 0.35;

export function parseMem(raw: string | null): TipMem {
  try {
    const m = JSON.parse(raw ?? '') as Partial<TipMem>;
    const ids = new Set<string>(TIPS.map(t => t.id));
    return {
      seen: Array.isArray(m.seen) ? m.seen.filter((x): x is TipId => ids.has(x)) : [],
      day: typeof m.day === 'string' ? m.day : null,
      session: typeof m.session === 'number' ? m.session : 0,
    };
  } catch {
    return { ...EMPTY_MEM };
  }
}

export type TipCtx = { android: boolean; sportOpen: boolean };

/** Kullanıcının zaten kullandığı özelliğin ipucu çıkmaz. */
export function used(id: TipId, S: AppState): boolean {
  switch (id) {
    case 'journal': return Object.keys(S.play.journal ?? {}).length > 0;
    case 'meds': return (S.meds ?? []).length > 0;
    case 'sport': return (S.play.sport ?? []).length > 0;
    case 'garden': return (S.play.garden?.plots ?? []).length > 0;
    case 'house': return S.play.look != null || Object.values(S.play.placed ?? {}).some(r => r != null);
    default: return false;
  }
}

export function eligible(S: AppState, ctx: TipCtx): Tip[] {
  return TIPS.filter(t => {
    if (used(t.id, S)) return false;
    if (t.id === 'widget' && !ctx.android) return false;
    if (t.id === 'sport' && !ctx.sportOpen) return false;
    return true;
  });
}

/** Son gösterilenlerden kaçınır (uygun ipuçlarının yarısı kadar geriye bakar); hepsi yeniyse en eskisini seçer. */
export function pickTip(S: AppState, mem: TipMem, ctx: TipCtx, rnd: () => number = Math.random): Tip | null {
  const all = eligible(S, ctx);
  if (!all.length) return null;
  const recent = new Set(mem.seen.slice(-Math.max(1, Math.floor(all.length / 2))));
  const fresh = all.filter(t => !recent.has(t.id));
  const pool = fresh.length ? fresh : all;
  return pool[Math.min(pool.length - 1, Math.floor(rnd() * pool.length))];
}

/** Bugün ve bu açılışta ipucu çıkabilir mi? Günün ilk açılışı, ilk kurulum oturumu, günde ikinci ipucu ve art arda açılış hariç. */
export function mayShow(o: { today: string; firstOfDay: boolean; sessionNo: number; mem: TipMem; roll: number }): boolean {
  if (o.firstOfDay || o.sessionNo < 2) return false;
  if (o.mem.day === o.today) return false;
  if (o.mem.session >= o.sessionNo - 1) return false;
  return o.roll < TIP_CHANCE;
}

export function remember(mem: TipMem, id: TipId, today: string, sessionNo: number): TipMem {
  return { seen: [...mem.seen.filter(x => x !== id), id].slice(-TIPS.length), day: today, session: sessionNo };
}
