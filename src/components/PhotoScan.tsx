import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { LV, WASH } from '@/domain/constants';
import { uid } from '@/domain/logic';
import { LIMITS } from '@/domain/premium';
import { attLine, COLORS, guessColor, guessFabric, guessKind, KINDS, toColor, toFabric, toHex, toKind } from '@/domain/style';
import type { StockLevel, WashType } from '@/domain/types';
import { pickPhoto } from '@/lib/photos';
import { scanPhoto, trLow } from '@/lib/scan';
import { usePurchases } from '@/purchases/PurchasesProvider';
import { useStore } from '@/store/AppStore';
import { fonts, radius, useColors } from '@/theme';

import type { PhotoLook } from './Outfits';
import { useToast } from './Toast';
import { Btn, SecHead, T } from './ui';

/**
 * Yapay zekâ ile fotoğraf taraması (buzdolabı ve kıyafet). Sonuç önce onay listesi olarak gösterilir;
 * kullanıcı "Listeye işle" / "Ekle ve değerlendir" demeden ev verisi değişmez. Hak sınırı sunucuda.
 */

type Busy = { st: 'busy' };
type Err = { st: 'err'; msg: string; retry: boolean; limit: boolean };

type FridgeItem = { name: string; qty: string; lvl: StockLevel; matchId: string | null; on: boolean };
type FridgeState = null | Busy | Err | {
  st: 'review'; items: FridgeItem[]; missing: { id: string; name: string; on: boolean }[]; note: string; left: number;
};

/** Buzdolabı fotoğrafını tarar; `uri` değişince (yeni fotoğraf) çağrılır. */
export function useFridgeScan(rid: string) {
  const { state, update } = useStore();
  const toast = useToast();
  const [scan, setScan] = useState<FridgeState>(null);
  const run = useRef(0);

  const start = async (uri: string) => {
    const me = ++run.current;
    setScan({ st: 'busy' });
    const stock = state.mod[rid]?.stock || [];
    const r = await scanPhoto('fridge', uri, stock.map(x => x.name));
    if (me !== run.current) return;
    if (!r.ok) return setScan({ st: 'err', msg: r.message, retry: !!r.retry, limit: !!r.limit });
    const byName = new Map(stock.map(x => [trLow(x.name), x]));
    const used = new Set<string>();
    const items: FridgeItem[] = [];
    for (const it of r.result.items) {
      const hit = byName.get(trLow(it.match)) || byName.get(trLow(it.name));
      const matchId = hit && !used.has(hit.id) ? hit.id : null;
      if (matchId) used.add(matchId);
      else if (items.some(x => trLow(x.name) === trLow(it.name))) continue;
      items.push({ name: hit && matchId ? hit.name : it.name, qty: it.qty, lvl: it.lvl, matchId, on: true });
    }
    const missing = r.result.missing
      .map(n => byName.get(trLow(n)))
      .filter((x, i, a): x is NonNullable<typeof x> => !!x && !used.has(x.id) && x.lvl !== 'yok' && a.indexOf(x) === i)
      .map(x => ({ id: x.id, name: x.name, on: false }));
    setScan({ st: 'review', items, missing, note: r.result.note, left: Math.max(0, r.limit - r.used) });
  };

  const apply = () => {
    if (scan?.st !== 'review') return;
    let add = 0, out = 0;
    update(D => {
      const st = (D.mod[rid].stock ||= []);
      for (const x of scan.items) {
        if (!x.on) continue;
        let it = x.matchId ? st.find(y => y.id === x.matchId) : undefined;
        if (!it) {
          it = { id: uid(), name: x.name, lvl: x.lvl };
          st.push(it);
          add++;
        }
        it.lvl = x.lvl;
        if (x.lvl === 'yok') it.exp = null;
      }
      for (const x of scan.missing) {
        if (!x.on) continue;
        const it = st.find(y => y.id === x.id);
        if (it) {
          it.lvl = 'yok';
          it.exp = null;
          out++;
        }
      }
    });
    setScan(null);
    toast(`Liste güncellendi${add ? `, ${add} yeni ürün eklendi` : ''}${out ? `, ${out} ürün bitti` : ''}.`);
  };

  const stop = () => {
    run.current++;
    setScan(null);
  };

  return { scan, setScan, start, apply, stop };
}

export function FridgeScanPanel({ s, retry }: { s: ReturnType<typeof useFridgeScan>; retry: () => void }) {
  const { scan, setScan, apply, stop } = s;
  if (!scan) return null;
  if (scan.st === 'busy') return <Working text="Fotoğrafa bakıyorum. Ürünleri ve kalan miktarları çıkarıyorum, bu yarım dakika kadar sürebilir." onStop={stop} />;
  if (scan.st === 'err') return <Failed e={scan} onRetry={retry} onClose={stop} />;
  const lvName = (k: StockLevel) => LV.find(x => x[0] === k)![1];
  const toggle = (kind: 'items' | 'missing', i: number) =>
    setScan(p => (p?.st === 'review' ? { ...p, [kind]: p[kind].map((x, j) => (j === i ? { ...x, on: !x.on } : x)) } : p));
  return (
    <Review title="Fotoğrafta gördüklerim" count={`${scan.items.length} ürün`} note={scan.note} left={scan.left}>
      {scan.items.map((x, i) => (
        <Check key={'i' + i} on={x.on} onPress={() => toggle('items', i)} title={x.name}
          sub={[x.qty, x.matchId ? 'ambarda var' : 'ambara eklenecek'].filter(Boolean).join(' · ')} pill={lvName(x.lvl)} pillK={x.lvl} />
      ))}
      {!scan.items.length && <T v="small">Fotoğrafta tanıyabildiğim bir ürün olmadı. Bu tarama hakkından düşmedi.</T>}
      {scan.missing.length > 0 && <T v="bold" style={{ fontSize: 14, marginTop: 4 }}>Göremediklerim</T>}
      {scan.missing.map((x, i) => (
        <Check key={'m' + i} on={x.on} onPress={() => toggle('missing', i)} title={x.name} sub="Fotoğrafta görünmedi. İşaretlersen Bitti olur." pill="Bitti?" pillK="yok" />
      ))}
      <T v="tiny">Miktarlar tahmini. İşaretli olanlar listeye işlenir.</T>
      <View style={styles.row}>
        {scan.items.length + scan.missing.length > 0 && <Btn small kind="primary" label="Listeye işle" onPress={apply} />}
        <Btn small kind="ghost" label="Vazgeç" onPress={stop} />
      </View>
    </Review>
  );
}

/* ---------- gardırop ---------- */

type LookItem = {
  name: string; cat: string; wash: WashType | null; matchId: string | null; on: boolean;
  kind: string | null; color: string | null; hex: string | null; fabric: string | null; pattern: 'düz' | 'desenli';
};
type LookState = null | Busy | Err | { st: 'review'; items: LookItem[]; worn: boolean; note: string; left: number };

/**
 * Gardırop kartının altında: kıyafet fotoğrafından parçaları (türü, rengi, kumaşı) tanır, onaylanınca
 * yenilerini dolaba ekler ve `onLook` ile kombin değerlendirmesine verir (bkz. Outfits).
 */
export function WardrobeScan({ rid, onLook }: { rid: string; onLook: (look: PhotoLook) => void }) {
  const c = useColors();
  const { state, update } = useStore();
  const toast = useToast();
  const { premium } = usePurchases();
  const [scan, setScan] = useState<LookState>(null);
  const last = useRef<string | null>(null);
  const run = useRef(0);

  const start = async (uri: string) => {
    last.current = uri;
    const me = ++run.current;
    setScan({ st: 'busy' });
    const w = state.mod[rid]?.wardrobe || [];
    const r = await scanPhoto('look', uri, w.map(x => `${x.name} (${x.cat})`));
    if (me !== run.current) return;
    if (!r.ok) return setScan({ st: 'err', msg: r.message, retry: !!r.retry, limit: !!r.limit });
    // Model dolaptaki adı "Ad (Kategori)" biçiminde de yazabilir.
    const byName = new Map(w.flatMap(x => [[trLow(x.name), x], [trLow(`${x.name} (${x.cat})`), x]] as const));
    const used = new Set<string>();
    const items = r.result.pieces.map((p): LookItem => {
      const hit = byName.get(trLow(p.match)) || byName.get(trLow(p.name));
      const matchId = hit && !used.has(hit.id) ? hit.id : null;
      if (matchId) used.add(matchId);
      // Sunucunun eski sürümü tür, renk ve kumaş yazmıyorsa addan tahmin edilir.
      const kind = toKind(p.kind) || guessKind(p.name);
      const color = toColor(p.color) || guessColor(p.name);
      return {
        name: hit && matchId ? hit.name : p.name, cat: kind ? KINDS[kind].cat : p.cat, wash: p.wash, matchId, on: true,
        kind, color, hex: toHex(p.hex) || (color ? COLORS[color] : null), fabric: toFabric(p.fabric) || guessFabric(p.name, kind),
        pattern: p.pattern === 'desenli' ? 'desenli' : 'düz',
      };
    });
    setScan({ st: 'review', items, worn: !!r.result.worn, note: r.result.note, left: Math.max(0, r.limit - r.used) });
  };

  const pick = async (source: 'camera' | 'library') => {
    const res = await pickPhoto(source);
    if (!res) return;
    if ('error' in res) return toast(res.error);
    start(res.uri);
  };

  const apply = () => {
    if (scan?.st !== 'review') return;
    let add = 0;
    const ids: string[] = [];
    update(D => {
      const w = (D.mod[rid].wardrobe ||= []);
      for (const x of scan.items) {
        if (!x.on) continue;
        let c = x.matchId ? w.find(y => y.id === x.matchId) : undefined;
        if (!c) {
          c = { id: uid(), name: x.name, cat: x.cat, state: 'temiz', wash: x.wash ?? 'renkli', added: Date.now(), worn: null };
          w.push(c);
          add++;
        }
        // Dolapta olan parçanın eksik bilgisi fotoğraftan tamamlanır; kullanıcının seçtiği kategori korunur.
        if (x.kind && !c.kind) c.kind = x.kind;
        if (x.color && !c.color) c.color = x.color;
        if (x.hex && !c.hex) c.hex = x.hex;
        if (x.fabric && !c.fabric) c.fabric = x.fabric;
        if (!c.pattern) c.pattern = x.pattern;
        if (!ids.includes(c.id)) ids.push(c.id);
      }
      if (add) D.mod[rid].filter = 'all';
    });
    if (ids.length) onLook({ ids, worn: scan.worn, note: scan.note });
    setScan(null);
    toast(ids.length ? `${add ? `${add} yeni parça teçhizata eklendi. ` : ''}Zırh değerlendirmesi hazır, aşağıda.` : 'Hiçbir parça seçilmedi.');
  };

  const stop = () => {
    run.current++;
    setScan(null);
  };
  const toggle = (i: number) =>
    setScan(p => (p?.st === 'review' ? { ...p, items: p.items.map((x, j) => (j === i ? { ...x, on: !x.on } : x)) } : p));

  return (
    <View style={[styles.box, { backgroundColor: c.surface2 }]}>
      <T v="bold" style={{ fontSize: 15 }}>📸 Fotoğraftan ekle</T>
      {!scan && (
        <>
          <T v="small">Üzerindeki kombinin ya da yatağa serdiğin kıyafetlerin fotoğrafını çek. Parçaların türünü, rengini ve kumaşını çıkarayım, kombini değerlendirip dolabındakilerle eşleştireyim.</T>
          <View style={styles.row}>
            {Platform.OS !== 'web' && <Btn small kind="primary" label="Fotoğraf çek" onPress={() => pick('camera')} />}
            <Btn small label="Galeriden seç" onPress={() => pick('library')} />
          </View>
          <T v="tiny">{premium.active ? `Premium: her gün ${LIMITS.premium.scans} tarama.` : `Ücretsiz: haftada ${LIMITS.free.scans} tarama. Premium'da her gün ${LIMITS.premium.scans}.`} Erzak ve teçhizat aynı hakkı kullanır.</T>
        </>
      )}
      {scan?.st === 'busy' && <Working text="Fotoğrafa bakıyorum. Her parçanın türünü, rengini ve kumaşını çıkarıyorum." onStop={stop} />}
      {scan?.st === 'err' && <Failed e={scan} onRetry={() => last.current && start(last.current)} onClose={stop} />}
      {scan?.st === 'review' && (
        <Review title="Fotoğrafta gördüklerim" count={`${scan.items.length} parça`} note={scan.note} left={scan.left}>
          {scan.items.map((x, i) => (
            <Check key={i} on={x.on} onPress={() => toggle(i)} title={x.name}
              sub={`${attLine(x)}${x.pattern === 'desenli' ? ' · desenli' : ''}${x.wash ? ` · ${WASH[x.wash].emoji} ${WASH[x.wash].label}` : ''} · ${x.matchId ? 'teçhizatta var' : 'teçhizata eklenecek'}`} />
          ))}
          {!scan.items.length && <T v="small">Fotoğrafta tanıyabildiğim bir kıyafet olmadı. Bu tarama hakkından düşmedi.</T>}
          <T v="tiny">Tür, renk ve kumaş tahmini. İşaretli parçalar teçhizata eklenir (olanlar tekrar eklenmez) ve zırh kombini onlarla değerlendirilir.</T>
          <View style={styles.row}>
            {scan.items.length > 0 && (
              <Btn small kind="primary" label={scan.items.some(x => x.on && !x.matchId) ? 'Ekle ve değerlendir' : 'Zırhı değerlendir'} onPress={apply} />
            )}
            <Btn small kind="ghost" label="Vazgeç" onPress={stop} />
          </View>
        </Review>
      )}
    </View>
  );
}

/* ---------- ortak parçalar ---------- */

function Working({ text, onStop }: { text: string; onStop: () => void }) {
  const c = useColors();
  return (
    <View style={{ gap: 8 }} accessibilityRole="progressbar" accessibilityLiveRegion="polite">
      <View style={styles.row}>
        <ActivityIndicator color={c.hi} />
        <T v="small" style={{ flex: 1 }}>{text}</T>
      </View>
      <Btn small kind="ghost" label="Durdur" onPress={onStop} style={{ alignSelf: 'flex-start' }} />
    </View>
  );
}

function Failed({ e, onRetry, onClose }: { e: Err; onRetry: () => void; onClose: () => void }) {
  const router = useRouter();
  const { premium } = usePurchases();
  return (
    <View style={{ gap: 8 }} accessibilityLiveRegion="assertive">
      <T style={{ fontSize: 14 }}>{e.msg}</T>
      <View style={styles.row}>
        {e.retry && <Btn small kind="primary" label="Tekrar dene" onPress={onRetry} />}
        {e.limit && !premium.active && <Btn small kind="primary" label="Premium'a bak ⭐" onPress={() => router.push('/premium')} />}
        <Btn small kind="ghost" label="Kapat" onPress={onClose} />
      </View>
    </View>
  );
}

function Review({ title, count, note, left, children }: { title: string; count: string; note: string; left: number; children: React.ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <SecHead h="h3" title={title} right={count} />
      {!!note && <T style={{ fontSize: 14 }}>{note}</T>}
      {children}
      <T v="tiny">Bu dönem {left} tarama hakkın kaldı.</T>
    </View>
  );
}

function Check({ on, onPress, title, sub, pill, pillK }: { on: boolean; onPress: () => void; title: string; sub: string; pill?: string; pillK?: StockLevel }) {
  const c = useColors();
  const pc = pillK ? { var: [c.okSoft, c.ok], az: [c.todaySoft, c.today], yok: [c.lateSoft, c.late] }[pillK] : null;
  return (
    <Pressable onPress={onPress} accessibilityRole="checkbox" accessibilityState={{ checked: on }} style={styles.check}>
      <View style={[styles.box2, { borderColor: on ? c.accent : c.line, backgroundColor: on ? c.accent : 'transparent' }]}>
        {on && <Text style={{ color: c.onAccent, fontFamily: fonts.bodyBlack, fontSize: 13, lineHeight: 16 }}>✓</Text>}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <T v="bold" style={{ fontSize: 14.5 }}>{title}</T>
        <T v="small">{sub}</T>
      </View>
      {pill && pc && (
        <View style={[styles.pill, { backgroundColor: pc[0] }]}>
          <Text style={{ color: pc[1], fontFamily: fonts.bodyBlack, fontSize: 12 }}>{pill}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  box: { borderRadius: 16, padding: 12, gap: 8 },
  check: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  box2: { width: 22, height: 22, borderRadius: 7, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  pill: { borderRadius: radius.pill, paddingVertical: 3, paddingHorizontal: 10 },
});
