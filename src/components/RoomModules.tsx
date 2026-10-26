import { useState } from 'react';
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { CATS, CSTATE, CSTATE_EMOJI, LAUNDRY_THRESHOLD, LV, NEXT_CSTATE, PHOTO_MAX_AGE, TYPES, WASH, WASH_TYPES } from '@/domain/constants';
import { fmtDate, inDays, parseDate, seasonalNow } from '@/domain/home';
import { agoText, daysSince, donateList, expiryText, laundryPlan, sortByDue, uid } from '@/domain/logic';
import { clothEmoji, itemEmoji } from '@/domain/icons';
import type { ClothState, StockLevel, WardrobeFilter, WashType } from '@/domain/types';
import { useNow } from '@/hooks/useNow';
import { persistPhoto, pickPhoto } from '@/lib/photos';
import { useStore } from '@/store/AppStore';
import { fonts, radius, useColors } from '@/theme';

import type { PhotoLook } from './Outfits';
import { FridgeScanPanel, useFridgeScan, WardrobeScan } from './PhotoScan';
import { ShopList } from './ShopList';
import { AddTaskForm, TaskGrid } from './TaskRow';
import { useToast } from './Toast';
import { Appear, Squish } from './motion';
import { Btn, Callout, Card, EmptyMsg, Field, SecHead, Sheet, T } from './ui';

/* ---------- gardırop ---------- */

/**
 * Gardırop: kıyafetler kare kare. Kareye dokununca durum değişir (Temiz → Kirli → Ütülenecek),
 * "⋯" ile yıkama türü, "bununla kombin" ve silme alttan açılır. Kombin önerisi ayrı sekmede
 * (`onAnchor` / `onLook` ile oraya geçilir).
 */
export function Wardrobe({ rid, anchor, onAnchor, onLook }: { rid: string; anchor: string[]; onAnchor: (ids: string[]) => void; onLook: (l: PhotoLook) => void }) {
  const c = useColors();
  const { state, update } = useStore();
  const m = state.mod[rid];
  const list = m.wardrobe || [];
  const f: WardrobeFilter = m.filter || 'all';
  const cnt = (k: ClothState) => list.filter(x => x.state === k).length;
  const items = f === 'all' ? list : list.filter(x => x.state === f);
  const dirty = cnt('kirli');
  const [name, setName] = useState('');
  const [cat, setCat] = useState(CATS[0]);
  const [wash, setWash] = useState<WashType>('renkli');
  const [adding, setAdding] = useState(false);
  const [sheet, setSheet] = useState<string | null>(null);
  const sel = list.find(x => x.id === sheet);
  const now = useNow();
  const plan = laundryPlan(list);
  const old = donateList(list, now);
  const season = seasonalNow(state, now).filter(x => x.wardrobe);

  const stateColor: Record<ClothState, [string, string]> = {
    temiz: [c.okSoft, c.ok],
    kirli: [c.lateSoft, c.late],
    utu: [c.todaySoft, c.today],
  };

  const add = () => {
    const n = name.trim();
    if (!n) return;
    update(D => {
      const w = D.mod[rid];
      (w.wardrobe ||= []).push({ id: uid(), name: n, cat, state: 'temiz', wash, added: Date.now(), worn: null });
      if (w.filter !== 'all' && w.filter !== 'temiz') w.filter = 'all';
    });
    setName('');
    setAdding(false);
  };

  const filters: [WardrobeFilter, string, number][] = [
    ['all', '🎒 Tümü', list.length], ['temiz', '🧼 Hazır', cnt('temiz')], ['kirli', '🧟 Kontamine', dirty], ['utu', '💨 Ütü', cnt('utu')],
  ];
  const cycle = (id: string) =>
    update(D => {
      const y = D.mod[rid].wardrobe?.find(z => z.id === id);
      if (!y) return;
      y.state = NEXT_CSTATE[y.state];
      // Kirliye geçtiyse giyildi demektir (bağış önerisi için).
      if (y.state === 'kirli') y.worn = Date.now();
    });

  return (
    <>
      <Card>
        <SecHead title="🎒 Keşif Teçhizatı & Zırh" right={`${list.length} parça`} />
        <View style={styles.wrapRow}>
          {filters.map(([k, l, n]) => (
            <Chip key={k} on={f === k} label={`${l} ${n}`} onPress={() => update(D => void (D.mod[rid].filter = k))} />
          ))}
        </View>
        <View style={styles.grid}>
          {items.map((x, i) => {
            const [bg, fg] = stateColor[x.state];
            const picked = anchor.includes(x.id);
            return (
              <Appear key={x.id} index={i} style={styles.cell}>
                <Squish
                  onPress={() => cycle(x.id)}
                  onLongPress={() => setSheet(x.id)}
                  accessibilityLabel={`${x.name}: ${CSTATE[x.state]}. Durumu değiştirmek için dokun, ayarlar için basılı tut`}
                  style={[styles.cloth, { backgroundColor: bg, borderColor: picked ? c.accent : bg, boxShadow: `0 3px 0 ${c.line}` }]}
                >
                  <Text style={{ fontSize: 30 }}>{clothEmoji(x.cat, x.name)}</Text>
                  <Text numberOfLines={2} style={[styles.clothName, { color: c.ink }]}>{x.name}</Text>
                  <Text style={{ fontFamily: fonts.bodyBlack, fontSize: 11, color: fg }}>{CSTATE_EMOJI[x.state]} {CSTATE[x.state]}</Text>
                </Squish>
                <Pressable onPress={() => setSheet(x.id)} accessibilityRole="button" accessibilityLabel={`${x.name} ayarları`} hitSlop={8} style={styles.more}>
                  <Text style={{ color: c.muted, fontFamily: fonts.bodyBlack, fontSize: 15 }}>⋯</Text>
                </Pressable>
              </Appear>
            );
          })}
        </View>
        {!items.length && <EmptyMsg>{list.length ? 'Bu durumda teçhizat yok.' : 'Teçhizat dolabın boş. Fotoğrafla tara ya da elle ekle 👇'}</EmptyMsg>}
        {list.length > 0 && <T v="tiny">Teçhizata dokun: 🧼 Hazır → 🧟 Kontamine → 💨 Ütülenecek. Basılı tut: ayarlar.</T>}
        {plan.length > 0 && (
          <View style={[styles.shop, { backgroundColor: c.surface2 }]}>
            <T v="bold" style={{ fontSize: 14 }}>🧟 Çamaşır birikti, 2 km&apos;den kokuyorsun</T>
            {plan.map(g => (
              <T key={g.w} style={{ fontSize: 14 }}>
                {WASH[g.w].emoji} {WASH[g.w].label}: {g.items.length} parça{' '}
                {g.full ? `· makine doldu, yıkayabilirsin (${WASH[g.w].hint})` : `· ${LAUNDRY_THRESHOLD - g.items.length} parça daha`}
              </T>
            ))}
          </View>
        )}
        {season.map(x => (
          <Callout key={x.id}>
            {x.emoji} Mevsim değişimi zamanı: {x.name.replace('Dolap değişimi: ', '')}. Bitince Sığınak bakımı ekranından işaretle.
          </Callout>
        ))}
        {old.length > 0 && (
          <View style={[styles.shop, { backgroundColor: c.surface2 }]}>
            <T v="bold" style={{ fontSize: 14 }}>💝 Teçhizat bağışı</T>
            <T v="small">Bunlar bir yıldır keşfe çıkmadı. Başka bir hayatta kalana verebilirsin.</T>
            {old.map(x => (
              <View key={x.id} style={styles.addRow}>
                <T style={{ flex: 1, fontSize: 14 }}>{x.name}</T>
                <Btn small label="Giyiyorum" onPress={() => update(D => {
                  const y = D.mod[rid].wardrobe?.find(z => z.id === x.id);
                  if (y) y.worn = Date.now();
                })} />
                <Btn small kind="primary" label="Bağışladım" onPress={() => update(D => void (D.mod[rid].wardrobe = D.mod[rid].wardrobe?.filter(z => z.id !== x.id)))} />
              </View>
            ))}
          </View>
        )}
        <Sheet open={!!sel} onClose={() => setSheet(null)}>
          {sel && (
            <>
              <View style={styles.sheetHead}>
                <Text style={{ fontSize: 40 }}>{clothEmoji(sel.cat, sel.name)}</Text>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <T v="h2">{sel.name}</T>
                  <T v="small">{sel.cat} · {CSTATE_EMOJI[sel.state]} {CSTATE[sel.state]}</T>
                </View>
              </View>
              <T v="bold" style={{ fontSize: 14 }}>Yıkama</T>
              <View style={styles.wrapRow}>
                {WASH_TYPES.map(k => (
                  <Chip key={k} small on={(sel.wash ?? 'renkli') === k} label={`${WASH[k].emoji} ${WASH[k].label}`} onPress={() => update(D => {
                    const y = D.mod[rid].wardrobe?.find(z => z.id === sel.id);
                    if (y) y.wash = k;
                  })} />
                ))}
              </View>
              <Btn kind="primary" label="🪖 Bununla zırh kombini öner" onPress={() => { onAnchor([sel.id]); setSheet(null); }} block />
              <Btn small kind="ghost" label="🗑️ Sil" onPress={() => { update(D => void (D.mod[rid].wardrobe = D.mod[rid].wardrobe?.filter(z => z.id !== sel.id))); setSheet(null); }} style={{ alignSelf: 'flex-start' }} />
            </>
          )}
        </Sheet>
        {adding ? (
          <View style={{ gap: 8 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {CATS.map(k => <Chip key={k} small on={cat === k} label={k} onPress={() => setCat(k)} />)}
            </ScrollView>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {WASH_TYPES.map(k => <Chip key={k} small on={wash === k} label={`${WASH[k].emoji} ${WASH[k].label}`} onPress={() => setWash(k)} />)}
            </ScrollView>
            <View style={styles.addRow}>
              <Field value={name} onChangeText={setName} placeholder="Kıyafet, ör. Lacivert gömlek" onSubmitEditing={add} returnKeyType="done" autoFocus />
              <Btn label="Ekle" kind="primary" small onPress={add} />
            </View>
            <Btn small kind="ghost" label="Vazgeç" onPress={() => setAdding(false)} style={{ alignSelf: 'flex-start' }} />
          </View>
        ) : (
          <Btn small kind="ghost" label="➕ Teçhizat ekle" onPress={() => setAdding(true)} style={{ alignSelf: 'flex-start' }} />
        )}
        <WardrobeScan rid={rid} onLook={onLook} />
      </Card>
    </>
  );
}

/* ---------- buzdolabı fotoğrafı ---------- */

export function Fridge({ rid }: { rid: string }) {
  const c = useColors();
  const { state, update } = useStore();
  const toast = useToast();
  const m = state.mod[rid];
  const old = m.photoAt != null && daysSince(m.photoAt) > PHOTO_MAX_AGE;
  const scan = useFridgeScan(rid);

  const pick = async (source: 'camera' | 'library') => {
    try {
      const res = await pickPhoto(source);
      if (!res) return;
      if ('error' in res) return toast(res.error);
      const uri = persistPhoto(res.uri, 'buzdolabi', m.photo);
      update(D => {
        D.mod[rid].photo = uri;
        D.mod[rid].photoAt = Date.now();
      });
      // Yeni fotoğraf hemen taranır; sonuç onaylanmadan liste değişmez.
      scan.start(uri);
    } catch (e) {
      console.warn(e);
      toast('Fotoğraf eklenemedi.');
    }
  };

  return (
    <Card>
      <SecHead title="Erzak & Ambar Taraması" right={m.photoAt ? 'çekildi: ' + agoText(m.photoAt) : 'fotoğraf yok'} />
      <View style={[styles.fridge, { backgroundColor: c.surface2 }]}>
        {m.photo ? (
          <Image source={{ uri: m.photo }} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityLabel="Buzdolabının son fotoğrafı" />
        ) : (
          <View style={{ alignItems: 'center', gap: 8 }}>
            <Svg width={40} height={56} viewBox="0 0 40 56" fill="none">
              <Rect x={3} y={3} width={34} height={50} rx={7} stroke={c.muted} strokeWidth={3} />
              <Path d="M3 21h34M10 10v5M10 28v8" stroke={c.muted} strokeWidth={3} strokeLinecap="round" />
            </Svg>
            <T v="small">Keşfe çıkmadan önce erzak deposunun fotoğrafını çek.</T>
          </View>
        )}
      </View>
      {old && <Callout>Bu tarama bir haftadan eski. Erzak bozulmuş olabilir, yeniden tara.</Callout>}
      <FridgeScanPanel s={scan} retry={() => m.photo && scan.start(m.photo)} />
      {!scan.scan && (
        <>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {Platform.OS !== 'web' && (
              <Btn label={m.photo ? 'Yeni fotoğraf çek' : 'Fotoğraf çek'} kind="primary" onPress={() => pick('camera')} style={{ flex: 1 }} />
            )}
            <Btn label="Galeriden seç" kind={Platform.OS === 'web' ? 'primary' : 'soft'} onPress={() => pick('library')} style={{ flex: 1 }} />
          </View>
          {m.photo && (
            <Btn small kind="ghost" label="📸 Bu fotoğrafı yapay zekâ ile tara" onPress={() => scan.start(m.photo!)} style={{ alignSelf: 'flex-start' }} />
          )}
          <T v="tiny">Fotoğrafı çekince yapay zekâ içindekileri ve kalan miktarları tahmin eder. Sen onaylamadan liste değişmez.</T>
        </>
      )}
    </Card>
  );
}

/* ---------- stok (buzdolabı ürünleri, banyo ve çamaşır malzemeleri) ---------- */

export function Stock({ rid, title, placeholder }: { rid: string; title: string; placeholder: string }) {
  const c = useColors();
  const { state, update } = useStore();
  const toast = useToast();
  const st = state.mod[rid].stock || [];
  const need = st.filter(x => x.lvl !== 'var');
  const [name, setName] = useState('');
  const fridge = TYPES[state.rooms[rid].type].mod === 'buzdolabi';
  const now = useNow();
  const [skt, setSkt] = useState<string | null>(null);
  const [sktText, setSktText] = useState('');
  const setExp = (id: string, exp: number | null) => {
    update(D => {
      const y = D.mod[rid].stock?.find(z => z.id === id);
      if (y) y.exp = exp;
    });
    setSkt(null);
  };

  const add = () => {
    const n = name.trim();
    if (!n) return;
    update(D => void (D.mod[rid].stock ||= []).push({ id: uid(), name: n, lvl: 'yok' }));
    setName('');
    toast(`${n} tedarik listesine eklendi.`);
  };

  const lvColor = { var: c.ok, az: c.today, yok: c.late } as const;
  const lvSoft = { var: c.okSoft, az: c.todaySoft, yok: c.lateSoft } as const;
  const lvBars = { var: 3, az: 2, yok: 0 } as const;
  const NEXT_LV = { var: 'az', az: 'yok', yok: 'var' } as const;
  const setLv = (id: string, k: StockLevel) =>
    update(D => {
      const y = D.mod[rid].stock?.find(z => z.id === id);
      if (!y) return;
      y.lvl = k;
      // Biten ürünün tarihi yenisi alınınca geçersiz.
      if (k === 'yok') y.exp = null;
    });
  const sel = st.find(x => x.id === skt);

  return (
    <Card>
      <SecHead title={title} right={need.length ? `${need.length} kritik` : 'ambar dolu ✓'} />
      <View style={styles.grid}>
        {st.map((x, i) => {
          const exp = fridge && x.exp != null && x.lvl !== 'yok' ? expiryText(x.exp, now) : null;
          return (
            <Appear key={x.id} index={i} style={styles.cell}>
              <Squish
                onPress={() => setLv(x.id, NEXT_LV[x.lvl])}
                onLongPress={() => { setSkt(x.id); setSktText(x.exp ? fmtDate(x.exp) : ''); }}
                accessibilityLabel={`${x.name}: ${LV.find(l => l[0] === x.lvl)?.[1]}. Değiştirmek için dokun, ayarlar için basılı tut`}
                style={[styles.cloth, { backgroundColor: lvSoft[x.lvl], borderColor: lvSoft[x.lvl], boxShadow: `0 3px 0 ${c.line}` }]}
              >
                <Text style={[{ fontSize: 30 }, x.lvl === 'yok' && { opacity: 0.45 }]}>{itemEmoji(x.name)}</Text>
                <Text numberOfLines={2} style={[styles.clothName, { color: x.lvl === 'yok' ? c.muted : c.ink }]}>{x.name}</Text>
                <View style={styles.bars} accessibilityElementsHidden>
                  {[0, 1, 2].map(n => (
                    <View key={n} style={[styles.barSeg, { backgroundColor: n < lvBars[x.lvl] ? lvColor[x.lvl] : c.surface }]} />
                  ))}
                </View>
                <Text style={{ fontFamily: fonts.bodyBlack, fontSize: 11, color: exp ? { late: c.late, today: c.today, ok: c.muted }[exp.k] : lvColor[x.lvl] }}>
                  {exp ? `⏳ ${exp.label}` : LV.find(l => l[0] === x.lvl)?.[1]}
                </Text>
              </Squish>
              <Pressable
                onPress={() => { setSkt(x.id); setSktText(x.exp ? fmtDate(x.exp) : ''); }}
                accessibilityRole="button"
                accessibilityLabel={`${x.name} ayarları`}
                hitSlop={8}
                style={styles.more}
              >
                <Text style={{ color: c.muted, fontFamily: fonts.bodyBlack, fontSize: 15 }}>⋯</Text>
              </Pressable>
            </Appear>
          );
        })}
      </View>
      {!st.length && <EmptyMsg>Henüz bir şey eklenmedi.</EmptyMsg>}
      {st.length > 0 && <T v="tiny">Dokun: 🟢 Bol → 🟡 Kritik → 🔴 Tükendi. Tükenen ve kritik olan tedarik listesine düşer.</T>}
      <View style={styles.addRow}>
        <Field value={name} onChangeText={setName} placeholder={placeholder} onSubmitEditing={add} returnKeyType="done" />
        <Btn label="Ekle" kind="primary" small onPress={add} />
      </View>
      {need.length > 0 && (
        <View style={[styles.shop, { backgroundColor: c.surface2 }]}>
          <ShopList items={need} title="🗺️ Keşif / Tedarik Listesi" />
        </View>
      )}
      <Sheet open={!!sel} onClose={() => setSkt(null)}>
        {sel && (
          <>
            <View style={styles.sheetHead}>
              <Text style={{ fontSize: 40 }}>{itemEmoji(sel.name)}</Text>
              <T v="h2" style={{ flex: 1 }}>{sel.name}</T>
            </View>
            <View style={[styles.seg, { backgroundColor: c.surface2 }]} accessibilityRole="radiogroup" accessibilityLabel={`${sel.name} durumu`}>
              {LV.map(([k, l]) => {
                const on = sel.lvl === k;
                return (
                  <Pressable key={k} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => setLv(sel.id, k)}
                    style={[styles.segBtn, { flex: 1, alignItems: 'center' }, on && { backgroundColor: lvColor[k] }]}>
                    <Text style={{ fontFamily: fonts.bodyBlack, fontSize: 14, color: on ? c.onBadge : c.muted }}>{l}</Text>
                  </Pressable>
                );
              })}
            </View>
            {fridge && sel.lvl !== 'yok' && (
              <>
                <T v="bold" style={{ fontSize: 14 }}>⏳ Son kullanma tarihi</T>
                <View style={styles.wrapRow}>
                  {([['Yarın', 1], ['2 gün', 2], ['1 hafta', 7], ['2 hafta', 14], ['1 ay', 30]] as [string, number][]).map(([l, d]) => (
                    <Chip key={l} small on={false} label={l} onPress={() => setExp(sel.id, inDays(d))} />
                  ))}
                </View>
                <View style={styles.addRow}>
                  <Field value={sktText} onChangeText={setSktText} placeholder="GG.AA.YYYY" keyboardType="numbers-and-punctuation" />
                  <Btn small kind="primary" label="Kaydet" onPress={() => {
                    const d = parseDate(sktText);
                    if (d == null) return toast('Tarihi 12.05.2027 gibi yaz.');
                    setExp(sel.id, d);
                  }} />
                  {sel.exp != null && <Btn small label="Kaldır" onPress={() => setExp(sel.id, null)} />}
                </View>
              </>
            )}
            <Btn small kind="ghost" label="🗑️ Sil" onPress={() => { update(D => void (D.mod[rid].stock = D.mod[rid].stock?.filter(z => z.id !== sel.id))); setSkt(null); }} style={{ alignSelf: 'flex-start' }} />
          </>
        )}
      </Sheet>
    </Card>
  );
}

/* ---------- bitkiler ---------- */

export function Plants({ rid }: { rid: string }) {
  const { state } = useStore();
  const plants = sortByDue(state.mod[rid].plants || []);
  return (
    <Card>
      <SecHead title="🪴 Sera" right={`${plants.length} bitki`} />
      <TaskGrid tasks={plants} rid={rid} list="plants" />
      {!plants.length && <EmptyMsg>Bu sektörde bitki yok. Eklediğin bitkilerin sulama gününü takip ederim.</EmptyMsg>}
      {plants.length > 0 && <T v="tiny">Bitkiye dokun: suladım 💧. Basılı tut: ayarlar.</T>}
      <AddTaskForm rid={rid} list="plants" placeholder="Bitki adı, ör. Kaktüs" />
    </Card>
  );
}

/* ---------- ortak ---------- */

function Chip({ label, on, small, onPress }: { label: string; on: boolean; small?: boolean; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      style={[
        styles.chip,
        small && { paddingVertical: 5, paddingHorizontal: 11 },
        { backgroundColor: on ? c.accent : c.surface, borderColor: on ? c.accent : c.line },
      ]}
    >
      <Text style={{ fontFamily: fonts.bodyBold, fontSize: small ? 12.5 : 13, color: on ? c.onAccent : c.ink }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10 },
  state: { borderRadius: radius.pill, paddingVertical: 6, paddingHorizontal: 12 },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chip: { borderRadius: radius.pill, borderWidth: 1.5, paddingVertical: 7, paddingHorizontal: 13 },
  fridge: { height: 200, borderRadius: 18, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', padding: 16 },
  seg: { flexDirection: 'row', borderRadius: radius.pill, padding: 3 },
  segBtn: { borderRadius: radius.pill, paddingVertical: 5, paddingHorizontal: 10 },
  shop: { borderRadius: 16, padding: 12, gap: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cell: { width: '31.6%' },
  cloth: { minHeight: 112, borderRadius: 18, borderWidth: 2, alignItems: 'center', justifyContent: 'center', gap: 3, paddingVertical: 10, paddingHorizontal: 6 },
  clothName: { fontFamily: fonts.bodyBlack, fontSize: 12.5, lineHeight: 16, textAlign: 'center' },
  more: { position: 'absolute', top: 2, right: 4, width: 26, height: 26, alignItems: 'center', justifyContent: 'center' },
  bars: { flexDirection: 'row', gap: 3 },
  barSeg: { width: 12, height: 6, borderRadius: 3 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
