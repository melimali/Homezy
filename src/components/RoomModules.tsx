import { useState } from 'react';
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { CATS, CSTATE, LAUNDRY_THRESHOLD, LV, NEXT_CSTATE, PHOTO_MAX_AGE } from '@/domain/constants';
import { agoText, daysSince, sortByDue, uid } from '@/domain/logic';
import { persistPhoto, pickPhoto } from '@/lib/photos';
import type { ClothState, WardrobeFilter } from '@/domain/types';
import { useStore } from '@/store/AppStore';
import { fonts, radius, useColors } from '@/theme';

import { ShopList } from './ShopList';
import { AddTaskForm, TaskRow } from './TaskRow';
import { useToast } from './Toast';
import { Btn, Callout, Card, EmptyMsg, Field, SecHead, T, XBtn } from './ui';

/* ---------- gardırop ---------- */

export function Wardrobe({ rid }: { rid: string }) {
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
      (w.wardrobe ||= []).push({ id: uid(), name: n, cat, state: 'temiz' });
      if (w.filter !== 'all' && w.filter !== 'temiz') w.filter = 'all';
    });
    setName('');
  };

  const filters: [WardrobeFilter, string, number][] = [
    ['all', 'Tümü', list.length], ['temiz', 'Temiz', cnt('temiz')], ['kirli', 'Kirli', dirty], ['utu', 'Ütülenecek', cnt('utu')],
  ];

  return (
    <Card>
      <SecHead title="Gardırop" right={`${list.length} parça`} />
      {dirty >= LAUNDRY_THRESHOLD && <Callout>{dirty} parça kirli. Bir makine dolusu birikti.</Callout>}
      <View style={styles.wrapRow}>
        {filters.map(([k, l, n]) => (
          <Chip key={k} on={f === k} label={`${l} ${n}`} onPress={() => update(D => void (D.mod[rid].filter = k))} />
        ))}
      </View>
      <View>
        {items.map((x, i) => {
          const [bg, fg] = stateColor[x.state];
          return (
            <View key={x.id} style={[styles.line, i > 0 && { borderTopWidth: 1.5, borderTopColor: c.line }]}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <T v="bold">{x.name}</T>
                <T v="small">{x.cat}</T>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${x.name}: ${CSTATE[x.state]}. Durumu değiştir`}
                onPress={() => update(D => {
                  const y = D.mod[rid].wardrobe?.find(z => z.id === x.id);
                  if (y) y.state = NEXT_CSTATE[y.state];
                })}
                style={[styles.state, { backgroundColor: bg }]}
              >
                <Text style={{ color: fg, fontFamily: fonts.bodyBlack, fontSize: 12.5 }}>{CSTATE[x.state]}</Text>
              </Pressable>
              <XBtn label={`${x.name} sil`} onPress={() => update(D => void (D.mod[rid].wardrobe = D.mod[rid].wardrobe?.filter(z => z.id !== x.id)))} />
            </View>
          );
        })}
        {!items.length && <EmptyMsg>{list.length ? 'Bu durumda kıyafet yok.' : 'Dolabın boş. Aşağıdan kıyafet ekle.'}</EmptyMsg>}
      </View>
      <T v="tiny">Etikete dokunarak durumu değiştir: Temiz, Kirli, Ütülenecek.</T>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
        {CATS.map(k => <Chip key={k} small on={cat === k} label={k} onPress={() => setCat(k)} />)}
      </ScrollView>
      <View style={styles.addRow}>
        <Field value={name} onChangeText={setName} placeholder="Kıyafet, ör. Lacivert gömlek" onSubmitEditing={add} returnKeyType="done" />
        <Btn label="Ekle" kind="primary" small onPress={add} />
      </View>
    </Card>
  );
}

/* ---------- buzdolabı fotoğrafı ---------- */

export function Fridge({ rid }: { rid: string }) {
  const c = useColors();
  const { state, update } = useStore();
  const toast = useToast();
  const m = state.mod[rid];
  const old = m.photoAt != null && daysSince(m.photoAt) > PHOTO_MAX_AGE;

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
      toast('Buzdolabı fotoğrafı güncellendi.');
    } catch (e) {
      console.warn(e);
      toast('Fotoğraf eklenemedi.');
    }
  };

  return (
    <Card>
      <SecHead title="Buzdolabı" right={m.photoAt ? 'çekildi: ' + agoText(m.photoAt) : 'fotoğraf yok'} />
      <View style={[styles.fridge, { backgroundColor: c.surface2 }]}>
        {m.photo ? (
          <Image source={{ uri: m.photo }} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityLabel="Buzdolabının son fotoğrafı" />
        ) : (
          <View style={{ alignItems: 'center', gap: 8 }}>
            <Svg width={40} height={56} viewBox="0 0 40 56" fill="none">
              <Rect x={3} y={3} width={34} height={50} rx={7} stroke={c.muted} strokeWidth={3} />
              <Path d="M3 21h34M10 10v5M10 28v8" stroke={c.muted} strokeWidth={3} strokeLinecap="round" />
            </Svg>
            <T v="small">Markete gitmeden önce buzdolabının fotoğrafını çek.</T>
          </View>
        )}
      </View>
      {old && <Callout>Bu fotoğraf bir haftadan eski. Yenisini çekmek iyi olur.</Callout>}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {Platform.OS !== 'web' && (
          <Btn label={m.photo ? 'Yeni fotoğraf çek' : 'Fotoğraf çek'} kind="primary" onPress={() => pick('camera')} style={{ flex: 1 }} />
        )}
        <Btn label="Galeriden seç" kind={Platform.OS === 'web' ? 'primary' : 'soft'} onPress={() => pick('library')} style={{ flex: 1 }} />
      </View>
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

  const add = () => {
    const n = name.trim();
    if (!n) return;
    update(D => void (D.mod[rid].stock ||= []).push({ id: uid(), name: n, lvl: 'yok' }));
    setName('');
    toast(`${n} alışveriş listesine eklendi.`);
  };

  const lvColor = { var: c.ok, az: c.today, yok: c.late } as const;

  return (
    <Card>
      <SecHead title={title} right={`${need.length} eksik`} />
      <View>
        {st.map((x, i) => (
          <View key={x.id} style={[styles.line, i > 0 && { borderTopWidth: 1.5, borderTopColor: c.line }]}>
            <T v="bold" style={[{ flex: 1, minWidth: 0 }, x.lvl === 'yok' && { color: c.muted, textDecorationLine: 'line-through' }]}>{x.name}</T>
            <View style={[styles.seg, { backgroundColor: c.surface2 }]} accessibilityRole="radiogroup" accessibilityLabel={`${x.name} durumu`}>
              {LV.map(([k, l]) => {
                const on = x.lvl === k;
                return (
                  <Pressable
                    key={k}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                    onPress={() => update(D => {
                      const y = D.mod[rid].stock?.find(z => z.id === x.id);
                      if (y) y.lvl = k;
                    })}
                    style={[styles.segBtn, on && { backgroundColor: lvColor[k] }]}
                  >
                    <Text style={{ fontFamily: fonts.bodyBlack, fontSize: 12, color: on ? c.onBadge : c.muted }}>{l}</Text>
                  </Pressable>
                );
              })}
            </View>
            <XBtn label={`${x.name} sil`} onPress={() => update(D => void (D.mod[rid].stock = D.mod[rid].stock?.filter(z => z.id !== x.id)))} />
          </View>
        ))}
        {!st.length && <EmptyMsg>Henüz bir şey eklenmedi.</EmptyMsg>}
      </View>
      <View style={styles.addRow}>
        <Field value={name} onChangeText={setName} placeholder={placeholder} onSubmitEditing={add} returnKeyType="done" />
        <Btn label="Ekle" kind="primary" small onPress={add} />
      </View>
      {need.length > 0 && (
        <View style={[styles.shop, { backgroundColor: c.surface2 }]}>
          <ShopList items={need} title="Alışveriş listesi" />
        </View>
      )}
    </Card>
  );
}

/* ---------- bitkiler ---------- */

export function Plants({ rid }: { rid: string }) {
  const { state } = useStore();
  const plants = sortByDue(state.mod[rid].plants || []);
  return (
    <Card>
      <SecHead title="Bitkiler" right={`${plants.length} bitki`} />
      <View>
        {plants.map((t, i) => <TaskRow key={t.id} t={t} rid={rid} list="plants" first={i === 0} />)}
        {!plants.length && <EmptyMsg>Bu odada bitki yok. Eklediğin bitkilerin sulama gününü takip ederim.</EmptyMsg>}
      </View>
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
});
