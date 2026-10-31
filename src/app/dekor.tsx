import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';

import { HouseFloors } from '@/components/HouseFloors';
import { Squish } from '@/components/motion';
import { useToast } from '@/components/Toast';
import { BackLink, Btn, Card, Chip, Screen, Tabs, T } from '@/components/ui';
import { ROOM_EMOJI } from '@/domain/constants';
import { ITEM } from '@/domain/items';
import {
  applyLookToAll, FACADES, FLOORS, itemsAt, placeItem, setRoomLook, spotOf, storeItem, WALLS, WINDOW_MODES, type Swatch,
} from '@/domain/look';
import { floorCells, hasUpper, roomFloor, type Floor } from '@/domain/plan-templates';
import { themeFor } from '@/domain/premium';
import { useNow } from '@/hooks/useNow';
import { sfx } from '@/lib/sfx';
import { usePurchases } from '@/purchases/PurchasesProvider';
import { useStore } from '@/store/AppStore';
import { fonts, radius, useColors } from '@/theme';

type Tab = 'oda' | 'dis' | 'esya';

/**
 * Evini kendine benzet: 3B evi gerçek evine benzetmek için oda oda zemin, duvar rengi ve pencere;
 * evin dış cephesi; mağazadan alınan eşyaları istediğin bloğa koyma. Dubleks evde ▲ / ▼ ile kat seçilir.
 * Kurallar src/domain/look.ts'te; çizim House3D.tsx'te. 👑 olanlar Premium'da ek çeşit.
 */
export default function Dekor() {
  const c = useColors();
  const now = useNow();
  const router = useRouter();
  const toast = useToast();
  const { state: S, update } = useStore();
  const { premium } = usePurchases();
  const [tab, setTab] = useState<Tab>('oda');
  const [floor, setFloor] = useState<Floor>(0);
  const f: Floor = hasUpper(S) ? floor : 0;
  const onFloor = S.order.filter(id => S.rooms[id] && floorCells(S, f).includes(id));
  const [pick, setPick] = useState<string | null>(null);
  const rid = pick && S.rooms[pick] ? pick : onFloor[0] ?? S.order[0] ?? null;
  const look = rid ? S.play.look?.rooms?.[rid] ?? {} : {};

  /** 👑 seçenek: Premium değilse ödeme ekranına. */
  const gate = (s: Swatch) => {
    if (!s.premium || premium.active) return true;
    toast(`${s.name} Premium'da açık 👑`);
    router.push('/premium' as Href);
    return false;
  };

  const changeFloor = (n: Floor) => {
    setFloor(n);
    setPick(null);
  };

  return (
    <Screen header={false}>
      <BackLink />
      <View>
        <T v="eyebrow">Ev kurucu</T>
        <T v="h1">Evini kendine benzet 🎨</T>
        <T v="lead">Zemini, duvarları, pencereleri ve eşyaların yerini gerçek evindeki gibi seç.</T>
      </View>

      <View style={[st.preview, { backgroundColor: c.surface }]}>
        <HouseFloors state={S} now={now} theme={themeFor(S.settings.theme, premium.active)} labels={false} floor={f} onFloorChange={changeFloor} />
      </View>
      {!hasUpper(S) && (
        <Squish onPress={() => router.push('/plan')} accessibilityRole="button" style={[st.tip, { backgroundColor: c.surface2 }]}>
          <Text style={{ fontSize: 22 }}>🏘️</Text>
          <T v="small" style={{ flex: 1 }}>Evin dubleks mi? Ev planında 2. kat çizebilirsin{premium.active ? '' : ' (Premium 👑)'}.</T>
          <Text style={[st.chev, { color: c.muted }]}>›</Text>
        </Squish>
      )}

      <Tabs<Tab>
        items={[
          { k: 'oda', emoji: '🎨', label: 'Odalar' },
          { k: 'dis', emoji: '🏠', label: 'Dış cephe' },
          { k: 'esya', emoji: '🛋️', label: 'Eşyalar' },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'oda' && rid && (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={st.bleed}>
            {(onFloor.length ? onFloor : S.order).map(id => (
              <Chip key={id} label={`${ROOM_EMOJI[S.rooms[id].type]} ${S.rooms[id].name}`} on={id === rid} onPress={() => setPick(id)} />
            ))}
          </ScrollView>

          <Card>
            <T v="h3">Zemin</T>
            <Swatches
              list={FLOORS}
              value={look.floor ?? 'parke'}
              premium={premium.active}
              onPick={s => gate(s) && update(D => setRoomLook(D, rid, { floor: s.id }))}
            />
          </Card>

          <Card>
            <T v="h3">Duvar rengi</T>
            <Swatches
              list={WALLS}
              value={look.wall ?? 'beyaz'}
              premium={premium.active}
              onPick={s => gate(s) && update(D => setRoomLook(D, rid, { wall: s.id }))}
            />
          </Card>

          <Card>
            <T v="h3">Pencereler</T>
            <View style={st.row}>
              {WINDOW_MODES.map(m => (
                <Chip key={m.v} label={`${m.emoji} ${m.label}`} on={(look.win ?? 1) === m.v} onPress={() => update(D => setRoomLook(D, rid, { win: m.v }))} />
              ))}
            </View>
            <T v="tiny">Dışarıya bakan duvarlarda. Odalar arasına kapı, antreye giriş kapısı kendiliğinden konur.</T>
          </Card>

          <Btn
            label="Bu görünümü bütün odalara uygula"
            onPress={() => {
              update(D => applyLookToAll(D, { floor: look.floor, wall: look.wall, win: look.win }));
              sfx('pop');
              toast('Bütün odalar aynı oldu ✨');
            }}
          />
        </>
      )}

      {tab === 'dis' && (
        <Card>
          <T v="h3">Dış cephe</T>
          <T v="small">Evin dışarıya bakan duvarları. &quot;Odanın rengi&quot; seçiliyse her oda kendi rengini dışarı da taşır.</T>
          <Swatches
            list={FACADES}
            value={S.play.look?.facade ?? 'varsayilan'}
            premium={premium.active}
            onPick={s => gate(s) && update(D => {
              D.play.look ||= { rooms: {} };
              D.play.look.facade = s.id === 'varsayilan' ? undefined : s.id;
            })}
          />
          <Btn small label="🌙 Evin teması: gündüz, gece, kış…" onPress={() => router.push('/evler' as Href)} />
        </Card>
      )}

      {tab === 'esya' && <Placer floor={f} />}
    </Screen>
  );
}

function Swatches({ list, value, premium, onPick }: { list: Swatch[]; value: string; premium: boolean; onPick: (s: Swatch) => void }) {
  const c = useColors();
  return (
    <View style={st.swWrap}>
      {list.map(s => {
        const on = s.id === value;
        return (
          <Squish key={s.id} onPress={() => onPick(s)} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={s.name} style={st.sw}>
            <View style={[st.swDot, { backgroundColor: s.color || c.surface2, borderColor: on ? c.ink : c.line }]}>
              {s.alt ? <View style={[st.swAlt, { backgroundColor: s.alt }]} /> : null}
              <Text style={{ fontSize: 16 }}>{s.emoji}</Text>
              {s.premium && !premium && <Text style={st.crown}>👑</Text>}
            </View>
            <Text numberOfLines={1} style={[st.swT, { color: on ? c.ink : c.muted }]}>{s.name}</Text>
          </Squish>
        );
      })}
    </View>
  );
}

/** Eşyayı seç, sonra plandaki bir bloğa dokun: eşya oraya taşınır (gerekirse başka odaya). */
function Placer({ floor }: { floor: Floor }) {
  const c = useColors();
  const router = useRouter();
  const toast = useToast();
  const { state: S, update } = useStore();
  const [sel, setSel] = useState<string | null>(null);
  const [w, setW] = useState(0);
  const owned = S.play.owned.filter(id => ITEM[id]);
  const cells = floorCells(S, floor);
  const size = w / S.cols;

  if (!owned.length)
    return (
      <Card>
        <T v="h3">Henüz eşyan yok</T>
        <T v="small">İş yaptıkça puan kazanırsın; mağazadan koltuk, halı, kedi… al, sonra burada istediğin yere koy.</T>
        <Btn kind="primary" label="🛍️ Mağazaya git" onPress={() => router.push('/magaza' as Href)} />
      </Card>
    );

  const where = (id: string) => {
    const rid = S.play.placed[id];
    if (!rid || !S.rooms[rid]) return 'Depoda';
    const sp = spotOf(S, id);
    const fl = sp ? sp.floor : roomFloor(S, rid);
    return `${S.rooms[rid].name}${hasUpper(S) ? ` · ${fl + 1}. kat` : ''}`;
  };

  const tap = (i: number) => {
    if (!sel) {
      const here = itemsAt(S, i, floor);
      if (here.length) setSel(here[0]);
      else toast('Önce aşağıdan bir eşya seç.');
      return;
    }
    if (!cells[i]) return toast('Boş bloğa konmaz; bir odaya dokun.');
    update(D => placeItem(D, sel, i, floor));
    sfx('pop');
    toast(`${ITEM[sel]?.emoji} ${S.rooms[cells[i]!]?.name ?? ''} odasına kondu`);
    setSel(null);
  };

  return (
    <>
      <Card>
        <T v="h3">{sel ? `${ITEM[sel]?.emoji} ${ITEM[sel]?.name}: nereye?` : 'Eşyanı seç'}</T>
        <View style={st.swWrap}>
          {owned.map(id => (
            <Squish key={id} onPress={() => setSel(sel === id ? null : id)} accessibilityLabel={ITEM[id]!.name} style={[st.item, { backgroundColor: sel === id ? c.ink : c.surface2 }]}>
              <Text style={{ fontSize: 22 }}>{ITEM[id]!.emoji}</Text>
              <Text numberOfLines={1} style={[st.itemT, { color: sel === id ? c.bg : c.muted }]}>{where(id)}</Text>
            </Squish>
          ))}
        </View>
        {sel && (
          <View style={st.row}>
            <Btn small label="📦 Depoya kaldır" onPress={() => { update(D => storeItem(D, sel)); setSel(null); }} />
            <Btn small kind="ghost" label="Vazgeç" onPress={() => setSel(null)} />
          </View>
        )}
      </Card>

      <View style={[st.grid, { backgroundColor: c.surface }]} onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width - 24)}>
        {size > 0 && (
          <View style={{ width: size * S.cols, height: size * S.rows }}>
            {cells.map((id, i) => {
              const room = id ? S.rooms[id] : null;
              const here = itemsAt(S, i, floor);
              return (
                <Squish
                  key={i}
                  quiet
                  onPress={() => tap(i)}
                  accessibilityLabel={room ? room.name : 'Boş'}
                  style={[st.cell, {
                    left: (i % S.cols) * size, top: Math.floor(i / S.cols) * size, width: size - 2, height: size - 2,
                    backgroundColor: room ? c.room[room.type] : 'transparent', borderColor: sel && room ? c.ink : c.line,
                    borderStyle: room ? 'solid' : 'dashed',
                  }]}
                >
                  <Text style={{ fontSize: Math.min(18, size * 0.38) }}>{here.map(x => ITEM[x]?.emoji).join('') || ''}</Text>
                </Squish>
              );
            })}
          </View>
        )}
      </View>
      <T v="tiny" style={{ textAlign: 'center' }}>Eşya seç, sonra plandan bir bloğa dokun. Evin 6. seviyesinden sonra 3B evde görünür.</T>
    </>
  );
}

const st = StyleSheet.create({
  preview: { borderRadius: radius.card, overflow: 'hidden', paddingVertical: 6 },
  tip: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: radius.tile, padding: 12 },
  chev: { fontFamily: fonts.bodyBlack, fontSize: 22 },
  bleed: { marginHorizontal: -22, paddingHorizontal: 22 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  swWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  sw: { width: 62, alignItems: 'center', gap: 4 },
  swDot: { width: 50, height: 50, borderRadius: 25, borderWidth: 3, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  swAlt: { position: 'absolute', right: 0, bottom: 0, width: 25, height: 25 },
  swT: { fontFamily: fonts.bodyBold, fontSize: 11 },
  crown: { position: 'absolute', top: 1, right: 3, fontSize: 11 },
  item: { width: 74, alignItems: 'center', gap: 2, borderRadius: radius.tile, paddingVertical: 8, paddingHorizontal: 4 },
  itemT: { fontFamily: fonts.bodyBold, fontSize: 10.5 },
  grid: { borderRadius: radius.card, padding: 12, alignItems: 'center' },
  cell: { position: 'absolute', borderRadius: 8, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
});
