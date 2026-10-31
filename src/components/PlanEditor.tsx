import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ROOM_EMOJI, ROOM_TYPES, TYPES } from '@/domain/constants';
import { cellCount, emptyState, makeRoom, removeRoom } from '@/domain/logic';
import { applyTemplate, GRID, resizeGrid, restoreSnap, snapOf, TEMPLATES, type PlanSnap } from '@/domain/plan-templates';
import type { AppState } from '@/domain/types';
import { sfx } from '@/lib/sfx';
import { useStore } from '@/store/AppStore';
import { fonts, radius, useColors } from '@/theme';

import { MokaMascot } from './MokaMascot';
import { Appear, Squish } from './motion';
import { Plan } from './Plan';
import { useToast } from './Toast';
import { AppHeader, BackLink, Btn, Sheet, styles as ui, T } from './ui';

type Tool = string | 'erase' | null;

/**
 * Evini kur / Ev planını düzenle (docs/skeleton-v3.md). Üç adım tek ekranda: hazır şablon,
 * oda paleti ve fırça, plan. Moka her adımda ne yapılacağını söyler. Geri al, ızgara boyutu,
 * oda adı değiştirme. İlk açılışta ve Ben > Ev planı'nda kullanılır.
 * `footer`: planın altında gösterilir (Plan ekranında "Evi sil ve baştan kur").
 */
export function PlanEditor({ onSaved, footer }: { onSaved: (first: boolean, next: AppState) => void; footer?: ReactNode }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { state: S, update } = useStore();
  const toast = useToast();
  const [tool, setTool] = useState<Tool>(null);
  const [painting, setPainting] = useState(false);
  const [clearArm, setClearArm] = useState(false);
  const [tplArm, setTplArm] = useState<string | null>(null);
  const [history, setHistory] = useState<PlanSnap[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const editing = S.setup;

  // Dokunma olaylarında güncel aracı ve durumu okumak için.
  const toolRef = useRef<Tool>(tool);
  const stateRef = useRef(S);
  useLayoutEffect(() => {
    toolRef.current = tool;
    stateRef.current = S;
  });

  useEffect(() => {
    if (!clearArm && !tplArm) return;
    const t = setTimeout(() => {
      setClearArm(false);
      setTplArm(null);
    }, 4000);
    return () => clearTimeout(t);
  }, [clearArm, tplArm]);

  /** Değişiklikten önce planın kopyası; "Geri al" bunu geri koyar. */
  const remember = () => setHistory(h => [...h.slice(-19), snapOf(stateRef.current)]);
  const undo = () => {
    const last = history[history.length - 1];
    if (!last) return;
    setHistory(h => h.slice(0, -1));
    update(D => restoreSnap(D, last));
    if (tool && tool !== 'erase' && !last.rooms[tool]) setTool(null);
    sfx('tap');
  };

  const paint = (i: number, first: boolean) => {
    const cur = toolRef.current;
    if (!cur) {
      if (!first) return;
      const id = stateRef.current.cells[i];
      if (id) setTool(id);
      else toast('Önce aşağıdan bir oda seç.');
      return;
    }
    if (first) remember();
    const val = cur === 'erase' ? null : cur;
    update(D => {
      if (D.cells[i] !== val) D.cells[i] = val;
    });
  };

  const rooms = S.order.filter(id => S.rooms[id]);
  const blocks = S.cells.filter(Boolean).length;
  const cur = tool && tool !== 'erase' ? S.rooms[tool] : null;

  // Moka adım adım yol gösterir.
  const help = !rooms.length
    ? { pose: 'analyzing' as const, title: 'Hadi evini çizelim', message: 'Hazır bir plan seç ya da aşağıdan ilk odanı ekle.' }
    : tool === 'erase'
      ? { pose: 'sweeping' as const, title: 'Silgi elimde', message: 'Boşaltmak istediğin bloklara dokun ya da üstünden kaydır.' }
      : cur
        ? { pose: 'handyman' as const, title: `${ROOM_EMOJI[cur.type]} ${cur.name} çiziliyor`, message: 'Bloklara dokun ya da parmağını sürükle. Her blok ~2 m².' }
        : rooms.length < 3
          ? { pose: 'happy' as const, title: 'Güzel başlangıç!', message: 'Bir odaya dokunup büyüt ya da yeni oda ekle.' }
          : { pose: 'love' as const, title: 'Evin çok tatlı oldu', message: 'Hazırsan kaydet. Sonra Ben > Ev planı\'ndan değiştirebilirsin.' };

  const save = () => {
    const first = !S.setup;
    const next = update(D => {
      for (const id of [...D.order]) if (!cellCount(D, id)) removeRoom(D, id);
      if (D.order.length) D.setup = true;
    });
    if (!next.order.length) {
      toast('Kaydetmek için en az bir oda çiz.');
      return;
    }
    setTool(null);
    sfx('pop');
    onSaved(first, next);
  };

  const clear = () => {
    if (!clearArm) {
      setClearArm(true);
      return;
    }
    setClearArm(false);
    setTool(null);
    remember();
    update(D => {
      const fresh = emptyState();
      D.cols = fresh.cols;
      D.rows = fresh.rows;
      D.cells = fresh.cells;
      D.rooms = {};
      D.order = [];
      D.tasks = {};
      D.mod = {};
    });
    toast('Plan temizlendi. İlk odanı seç.');
  };

  const pickTemplate = (id: string) => {
    const t = TEMPLATES.find(x => x.id === id)!;
    if (rooms.length && tplArm !== id) {
      setTplArm(id);
      return;
    }
    setTplArm(null);
    setTool(null);
    remember();
    update(D => applyTemplate(D, t));
    sfx('pop');
    toast(`${t.label} çizildi. Odalara dokunup düzenleyebilirsin.`);
  };

  const resize = (dc: number, dr: number) => {
    remember();
    update(D => resizeGrid(D, D.cols + dc, D.rows + dr));
  };

  const addRoom = (k: (typeof ROOM_TYPES)[number]) => {
    remember();
    let id = '';
    update(D => {
      id = makeRoom(D, k);
    });
    setTool(id);
    setClearArm(false);
    sfx('tap');
  };

  const er = editId ? S.rooms[editId] : null;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      scrollEnabled={!painting}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[ui.screen, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32 }]}
    >
      {editing ? <BackLink /> : <AppHeader />}
      <View>
        <T v="eyebrow">{editing ? 'Ev planı' : 'Adım 1 / 2'}</T>
        <T v="h1">{editing ? 'Evini düzenle' : 'Evini birlikte çizelim'}</T>
      </View>

      <Appear index={1}>
        <MokaMascot pose={help.pose} title={help.title} message={help.message} size="sm" />
      </Appear>

      {/* 1. Hazır şablon */}
      <View style={{ gap: 8 }}>
        <T v="h3">Hazır plan</T>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.row} style={st.bleed}>
          {TEMPLATES.map(t => {
            const arm = tplArm === t.id;
            return (
              <Squish key={t.id} onPress={() => pickTemplate(t.id)} accessibilityLabel={`${t.label} şablonu`} style={[st.tpl, { backgroundColor: arm ? c.peach : c.surface }]}>
                <Text style={{ fontSize: 26 }}>{t.emoji}</Text>
                <Text style={[st.tplT, { color: c.ink }]}>{t.label}</Text>
                <Text style={[st.tplS, { color: c.muted }]}>{arm ? 'Tekrar dokun' : t.sub}</Text>
              </Squish>
            );
          })}
        </ScrollView>
        {tplArm && <T v="tiny">Şablon mevcut planın yerine geçer. Emin isen tekrar dokun.</T>}
      </View>

      {/* 2. Oda paleti */}
      <View style={{ gap: 8 }}>
        <T v="h3">Oda ekle</T>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.row} style={st.bleed}>
          {ROOM_TYPES.map(k => (
            <Squish key={k} onPress={() => addRoom(k)} accessibilityLabel={`${TYPES[k].label} ekle`} style={st.pal}>
              <View style={[st.palIcon, { backgroundColor: c.room[k] }]}>
                <Text style={{ fontSize: 26 }}>{ROOM_EMOJI[k]}</Text>
                <View style={[st.palPlus, { backgroundColor: c.surface }]}><Text style={[st.palPlusT, { color: c.ink }]}>+</Text></View>
              </View>
              <Text numberOfLines={1} style={[st.palT, { color: c.ink }]}>{TYPES[k].label.replace(' odası', '')}</Text>
            </Squish>
          ))}
        </ScrollView>
      </View>

      {/* Araçlar */}
      <View style={st.tools}>
        <ToolPill on={!!cur} label={cur ? `${ROOM_EMOJI[cur.type]} Çiz` : '✏️ Çiz'} onPress={() => setTool(cur ? null : rooms[rooms.length - 1] ?? null)} />
        <ToolPill on={tool === 'erase'} label="🧽 Silgi" onPress={() => setTool(tool === 'erase' ? null : 'erase')} />
        <ToolPill on={false} disabled={!history.length} label="↩️ Geri al" onPress={undo} />
      </View>

      {/* 3. Plan */}
      <View style={[st.canvas, { backgroundColor: c.surface, shadowColor: c.shadow }]}>
        <Plan state={S} edit activeId={tool} onPaint={paint} onPaintingChange={setPainting} />
      </View>

      <View style={st.sizeRow}>
        <Stepper label="Genişlik" n={S.cols} min={GRID.minCols} max={GRID.maxCols} onStep={d => resize(d, 0)} />
        <Stepper label="Uzunluk" n={S.rows} min={GRID.minRows} max={GRID.maxRows} onStep={d => resize(0, d)} />
      </View>
      <T v="small" style={{ textAlign: 'center' }}>
        {rooms.length} oda · ~{blocks * 2} m² · {S.cols} × {S.rows} blok
      </T>

      {/* Odalar: dokun → çiz, kalem → adı / sil */}
      {rooms.length > 0 && (
        <View style={{ gap: 8 }}>
          <T v="h3">Odaların</T>
          <View style={st.roomWrap}>
            {rooms.map(id => {
              const r = S.rooms[id];
              const on = tool === id;
              const n = cellCount(S, id);
              return (
                <Squish
                  key={id}
                  onPress={() => setTool(on ? null : id)}
                  onLongPress={() => setEditId(id)}
                  accessibilityLabel={`${r.name}, ${n} blok. Çizmek için dokun, düzenlemek için basılı tut.`}
                  style={[st.roomChip, { backgroundColor: on ? c.room[r.type] : c.surface, borderColor: on ? c.ink : 'transparent' }]}
                >
                  <View style={[st.dot, { backgroundColor: c.room[r.type] }]}><Text style={{ fontSize: 14 }}>{ROOM_EMOJI[r.type]}</Text></View>
                  <Text numberOfLines={1} style={[st.roomT, { color: c.ink }]}>{r.name}</Text>
                  <Text style={[st.roomM, { color: c.muted }]}>{n * 2} m²</Text>
                  <Squish quiet onPress={() => setEditId(id)} hitSlop={8} accessibilityLabel={`${r.name} düzenle`} style={[st.pen, { backgroundColor: c.surface2 }]}>
                    <Text style={{ fontSize: 11 }}>✏️</Text>
                  </Squish>
                </Squish>
              );
            })}
          </View>
        </View>
      )}

      <View style={st.actions}>
        <Btn label={clearArm ? 'Emin misin?' : 'Temizle'} kind={clearArm ? 'danger' : 'ghost'} onPress={clear} style={{ flex: 1 }} />
        <Btn label={editing ? 'Kaydet' : 'Evimi kaydet 🏡'} kind="primary" onPress={save} style={{ flex: 1.6 }} />
      </View>
      {footer}

      <Sheet open={!!er} onClose={() => setEditId(null)} pose="handyman">
        {er && editId && (
          <>
            <T v="h2">{ROOM_EMOJI[er.type]} Odayı düzenle</T>
            <TextInput
              value={er.name}
              accessibilityLabel="Oda adı"
              maxLength={40}
              onChangeText={v => update(D => void (D.rooms[editId].name = v || TYPES[D.rooms[editId].type].label))}
              style={[st.rename, { color: c.ink, backgroundColor: c.surface2 }]}
            />
            <T v="small">{TYPES[er.type].label} · {cellCount(S, editId)} blok · ~{cellCount(S, editId) * 2} m²</T>
            <View style={st.actions}>
              <Btn
                label="Odayı sil"
                kind="danger"
                style={{ flex: 1 }}
                onPress={() => {
                  remember();
                  if (tool === editId) setTool(null);
                  update(D => removeRoom(D, editId));
                  setEditId(null);
                }}
              />
              <Btn label="Tamam" kind="primary" style={{ flex: 1 }} onPress={() => setEditId(null)} />
            </View>
          </>
        )}
      </Sheet>
    </ScrollView>
  );
}

function ToolPill({ label, on, disabled, onPress }: { label: string; on: boolean; disabled?: boolean; onPress: () => void }) {
  const c = useColors();
  return (
    <Squish
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected: on, disabled }}
      style={[st.tool, { backgroundColor: on ? c.ink : c.surface, opacity: disabled ? 0.45 : 1 }]}
    >
      <Text style={[st.toolT, { color: on ? c.bg : c.ink }]}>{label}</Text>
    </Squish>
  );
}

function Stepper({ label, n, min, max, onStep }: { label: string; n: number; min: number; max: number; onStep: (d: number) => void }) {
  const c = useColors();
  const btn = (d: number, s: string, off: boolean) => (
    <Squish onPress={() => onStep(d)} disabled={off} accessibilityLabel={`${label} ${d > 0 ? 'artır' : 'azalt'}`} style={[st.stepB, { backgroundColor: c.surface2, opacity: off ? 0.4 : 1 }]}>
      <Text style={[st.stepBT, { color: c.ink }]}>{s}</Text>
    </Squish>
  );
  return (
    <View style={[st.step, { backgroundColor: c.surface }]}>
      {btn(-1, '−', n <= min)}
      <View style={{ alignItems: 'center', flex: 1 }}>
        <Text style={[st.stepN, { color: c.ink }]}>{n}</Text>
        <Text style={[st.stepL, { color: c.muted }]}>{label}</Text>
      </View>
      {btn(1, '+', n >= max)}
    </View>
  );
}

const st = StyleSheet.create({
  bleed: { marginHorizontal: -22 },
  row: { gap: 10, paddingHorizontal: 22, paddingVertical: 4 },
  tpl: { width: 92, alignItems: 'center', gap: 2, borderRadius: radius.tile, paddingVertical: 12 },
  tplT: { fontFamily: fonts.displayBold, fontSize: 18, lineHeight: 22 },
  tplS: { fontFamily: fonts.bodyBold, fontSize: 11.5 },
  pal: { width: 72, alignItems: 'center', gap: 6 },
  palIcon: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  palPlus: { position: 'absolute', right: -2, bottom: -2, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  palPlusT: { fontFamily: fonts.bodyBlack, fontSize: 15, lineHeight: 18 },
  palT: { fontFamily: fonts.bodyBold, fontSize: 12 },
  tools: { flexDirection: 'row', gap: 8 },
  tool: { flex: 1, alignItems: 'center', borderRadius: radius.pill, paddingVertical: 11 },
  toolT: { fontFamily: fonts.bodyBlack, fontSize: 13.5 },
  canvas: { borderRadius: radius.card, padding: 12, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 1, shadowRadius: 18, elevation: 3 },
  sizeRow: { flexDirection: 'row', gap: 10 },
  step: { flex: 1, flexDirection: 'row', alignItems: 'center', borderRadius: radius.pill, padding: 6 },
  stepB: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  stepBT: { fontFamily: fonts.bodyBlack, fontSize: 20, lineHeight: 24 },
  stepN: { fontFamily: fonts.displayBold, fontSize: 18, lineHeight: 22 },
  stepL: { fontFamily: fonts.bodyBold, fontSize: 11 },
  roomWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  roomChip: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: radius.pill, paddingVertical: 6, paddingLeft: 6, paddingRight: 6, borderWidth: 2, maxWidth: '100%' },
  dot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  roomT: { fontFamily: fonts.bodyBlack, fontSize: 13.5, flexShrink: 1 },
  roomM: { fontFamily: fonts.bodyBold, fontSize: 11.5 },
  pen: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rename: { fontFamily: fonts.bodyBold, fontSize: 16, borderRadius: radius.tile, paddingVertical: 12, paddingHorizontal: 16 },
  actions: { flexDirection: 'row', gap: 10 },
});
