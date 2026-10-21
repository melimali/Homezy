import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ROOM_EMOJI, ROOM_TYPES, TYPES } from '@/domain/constants';
import { cellCount, emptyState, makeRoom, removeRoom } from '@/domain/logic';
import type { AppState } from '@/domain/types';
import { useStore } from '@/store/AppStore';
import { fonts, radius, useColors } from '@/theme';

import { Plan } from './Plan';
import { useToast } from './Toast';
import { AppHeader, BackLink, Btn, styles as ui, Swatch, T, XBtn } from './ui';

type Tool = string | 'erase' | null;

/** Evini bloklarla kur / Ev planını düzenle. İlk açılışta ve Plan sekmesinde kullanılır. */
export function PlanEditor({ onSaved }: { onSaved: (first: boolean, next: AppState) => void }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { state: S, update } = useStore();
  const toast = useToast();
  const [tool, setTool] = useState<Tool>(null);
  const [painting, setPainting] = useState(false);
  const [clearArm, setClearArm] = useState(false);
  const editing = S.setup;

  // Kayıtlar arasında güncel aracı okumak için.
  const toolRef = useRef<Tool>(tool);
  useLayoutEffect(() => {
    toolRef.current = tool;
  });

  useEffect(() => {
    if (!clearArm) return;
    const t = setTimeout(() => setClearArm(false), 4000);
    return () => clearTimeout(t);
  }, [clearArm]);

  const paint = (i: number, first: boolean) => {
    const cur = toolRef.current;
    if (!cur) {
      if (!first) return;
      const id = S.cells[i];
      if (id) setTool(id);
      else toast('Önce bir oda türü seç.');
      return;
    }
    const val = cur === 'erase' ? null : cur;
    update(D => {
      if (D.cells[i] !== val) D.cells[i] = val;
    });
  };

  const toolText =
    tool === 'erase'
      ? 'Silgi açık. Boşaltmak istediğin bloklara dokun.'
      : tool && S.rooms[tool]
        ? `Çiziyorsun: ${S.rooms[tool].name}. Bloklara dokun ya da parmağını sürükle.`
        : 'Bir oda türü seç ya da plandaki bir odaya dokunup onu büyütmeye devam et.';

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
    onSaved(first, next);
  };

  const clear = () => {
    if (!clearArm) {
      setClearArm(true);
      return;
    }
    setClearArm(false);
    setTool(null);
    update(D => {
      const fresh = emptyState();
      D.cells = fresh.cells.slice(0, D.cols * D.rows);
      D.rooms = {};
      D.order = [];
      D.tasks = {};
      D.mod = {};
    });
    toast('Plan temizlendi. İlk odanı seç.');
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      scrollEnabled={!painting}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[ui.screen, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32 }]}
    >
      {editing ? <BackLink /> : <AppHeader />}
      <View>
        <T v="h1">{editing ? 'Ev planını düzenle' : 'Evini bloklarla kur'}</T>
        <T v="lead">Bir oda türü seç, sonra bloklara dokunup sürükleyerek odayı çiz. Her blok yaklaşık 2 m².</T>
        {!editing && (
          <View style={[styles.note, { backgroundColor: c.accentSoft }]}>
            <T style={{ fontSize: 14 }}>Başlaman için örnek bir ev çizili. İstersen düzenle, istersen temizleyip baştan çiz.</T>
          </View>
        )}
      </View>

      <View style={styles.palette}>
        {ROOM_TYPES.map(k => (
          <Chip
            key={k}
            label={`${ROOM_EMOJI[k]} ${TYPES[k].label}`}
            color={c.room[k]}
            onPress={() => {
              let id = '';
              update(D => {
                id = makeRoom(D, k);
              });
              setTool(id);
              setClearArm(false);
              toast(`${TYPES[k].label} eklendi. Bloklara dokunarak çiz.`);
            }}
          />
        ))}
        <Chip label="Silgi" on={tool === 'erase'} onPress={() => setTool(tool === 'erase' ? null : 'erase')} />
      </View>

      <View style={[styles.toolbar, { backgroundColor: c.surface2 }]}>
        <T style={{ fontSize: 14 }}>{toolText}</T>
      </View>

      <Plan
        state={S}
        edit
        activeId={tool}
        onPaint={paint}
        onPaintingChange={setPainting}
      />
      <T v="small" style={{ textAlign: 'center', marginTop: -8 }}>
        {S.cols} × {S.rows} blok · en fazla ~{S.cols * S.rows * 2} m²
      </T>

      <T v="h2">Odalar</T>
      <View style={{ gap: 8 }}>
        {!S.order.length && <T v="small" style={{ fontSize: 14 }}>Henüz oda yok. Yukarıdan bir oda türü seç.</T>}
        {S.order.map(id => {
          const r = S.rooms[id];
          const n = cellCount(S, id);
          const on = tool === id;
          return (
            <View
              key={id}
              style={[
                styles.redit,
                { backgroundColor: c.surface, borderColor: on ? c.hi : c.line },
                on && { boxShadow: `0 0 0 2px ${c.hi}` },
              ]}
            >
              <Swatch color={c.room[r.type]} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <TextInput
                  value={r.name}
                  accessibilityLabel="Oda adı"
                  maxLength={40}
                  onChangeText={v =>
                    update(D => {
                      D.rooms[id].name = v || TYPES[D.rooms[id].type].label;
                    })
                  }
                  style={[styles.rename, { color: c.ink, borderBottomColor: c.line }]}
                />
                <T v="small">{TYPES[r.type].label} · {n} blok · ~{n * 2} m²</T>
              </View>
              <Btn label="Çiz" small kind={on ? 'primary' : 'ghost'} onPress={() => setTool(on ? null : id)} />
              <XBtn
                label={`${r.name} odasını sil`}
                onPress={() => {
                  if (tool === id) setTool(null);
                  update(D => removeRoom(D, id));
                }}
              />
            </View>
          );
        })}
      </View>

      <View style={styles.actions}>
        <Btn
          label={clearArm ? 'Emin misin? Tekrar dokun' : 'Planı temizle'}
          kind={clearArm ? 'danger' : 'ghost'}
          onPress={clear}
          style={{ flex: 1 }}
        />
        <Btn label={editing ? 'Kaydet' : 'Evimi kaydet'} kind="primary" onPress={save} style={{ flex: 1.4 }} />
      </View>
    </ScrollView>
  );
}

function Chip({ label, color, on, onPress }: { label: string; color?: string; on?: boolean; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.chip,
        { backgroundColor: on ? c.ink : c.surface, borderColor: on ? c.ink : c.line },
        !pressed && { boxShadow: `0 2px 0 ${c.line}` },
        pressed && { transform: [{ translateY: 1 }] },
      ]}
    >
      {color && <View style={{ width: 14, height: 14, borderRadius: 5, borderWidth: 2, borderColor: c.wall, backgroundColor: color }} />}
      <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: on ? c.bg : c.ink }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  note: { marginTop: 12, paddingVertical: 11, paddingHorizontal: 14, borderRadius: 16 },
  palette: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 8, paddingHorizontal: 13,
    borderRadius: radius.pill, borderWidth: 1.5,
  },
  toolbar: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 16 },
  redit: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, paddingHorizontal: 12,
    borderWidth: 1.5, borderRadius: 18,
  },
  rename: { fontFamily: fonts.bodyBold, fontSize: 15, paddingVertical: 3, borderBottomWidth: 1.5, borderStyle: 'dashed' },
  actions: { flexDirection: 'row', gap: 10 },
});
