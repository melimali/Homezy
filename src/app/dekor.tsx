import { type Href } from 'expo-router';
import { useRouter } from '@/lib/nav';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { HouseFloors } from '@/components/HouseFloors';
import { Squish } from '@/components/motion';
import { useToast } from '@/components/Toast';
import { BackLink, Btn, Card, Chip, Screen, Tabs, T, Chevron } from '@/components/ui';
import { ROOM_EMOJI } from '@/domain/constants';
import { ITEM } from '@/domain/items';
import {
  applyLookToAll, applyPreset, FACADES, FLOORS, itemsAt, LOOK_PRESETS, placeItem, resetRoomLook, ROOFS, setRoomLook, spotOf, storeItem, turnItem, WALLS, WINDOW_MODES, type Swatch,
} from '@/domain/look';
import { floorCells, hasUpper, roomFloor, type Floor } from '@/domain/plan-templates';
import { themeFor } from '@/domain/premium';
import { useNow } from '@/hooks/useNow';
import { sfx } from '@/lib/sfx';
import { usePurchases } from '@/purchases/PurchasesProvider';
import { useStore } from '@/store/AppStore';
import { tx } from '@/i18n/runtime';
import { fonts, radius, useColors } from '@/theme';

type Tab = 'hazir' | 'oda' | 'dis' | 'esya';

/**
 * Evini kendine benzet: 3B evi gerçek evine benzetmek için oda oda zemin, duvar rengi ve pencere;
 * evin dış cephesi; mağazadan alınan eşyaları istediğin bloğa koyma. Hepsi 3B evin üzerinde: odaya dokun = seç,
 * eşyaya dokun = al, bloğa dokun = koy. Dubleks evde ▲ / ▼ ile kat seçilir.
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
    toast(`${tx(s.name)} Premium'da açık 👑`);
    router.push('/premium' as Href);
    return false;
  };

  const changeFloor = (n: Floor) => {
    setFloor(n);
    setPick(null);
  };

  /** Seçili eşya (Eşyalar sekmesi). */
  const [selRaw, setSel] = useState<string | null>(null);
  /** Eşya yerleştirirken seçili oda: kamera ona yaklaşır, bloklar sadece onda seçilir. */
  const [roomRaw, setPlaceRoom] = useState<string | null>(null);
  const placeRoom = tab === 'esya' && roomRaw && S.rooms[roomRaw] && onFloor.includes(roomRaw) ? roomRaw : null;
  const sel = selRaw && S.play.owned.includes(selRaw) ? selRaw : null;
  const cells = floorCells(S, f);
  const selSpot = sel && S.play.placed[sel] ? spotOf(S, sel) : null;
  /** 3B evde bir bloğa (ya da üstündeki eşyaya) dokunuldu. */
  const pickCell = (i: number) => {
    const room = cells[i];
    if (!room) return;
    if (tab !== 'esya') {
      if (tab === 'dis') setTab('oda');
      setPick(room);
      sfx('tap');
      return;
    }
    // Oda oda: başka odaya dokunulunca kamera o odaya geçer, eşya henüz konmaz.
    if (room !== placeRoom) {
      setPlaceRoom(room);
      const inRoom = itemsAt(S, i, f)[0];
      if (inRoom && (!sel || !itemsAt(S, i, f).includes(sel))) setSel(inRoom);
      sfx('tap');
      return;
    }
    const here = itemsAt(S, i, f);
    const other = here.find(x => x !== sel);
    if (other && (!sel || !here.includes(sel))) {
      setSel(other);
      sfx('tap');
      return;
    }
    if (!sel) return toast('Evdeki bir eşyaya dokun ya da aşağıdan seç.');
    if (S.play.placed[sel] === room && spotOf(S, sel)?.i === i && spotOf(S, sel)?.floor === f) return;
    update(D => placeItem(D, sel, i, f));
    sfx('pop');
  };

  return (
    <Screen header={false}>
      <BackLink />
      <View>
        <T v="eyebrow">Ev kurucu</T>
        <T v="h1">Evini kendine benzet 🎨</T>
        <T v="lead">Önce hazır bir görünüm seç, sonra oda oda zemin, duvar, pencere ve çatıyı değiştir. Her değişiklik evin üstünde hemen görünür.</T>
      </View>

      <View style={[st.preview, { backgroundColor: c.surface }]}>
        <HouseFloors state={S} now={now} theme={themeFor(S.settings.theme, premium.active)} labels={false} floor={f} onFloorChange={changeFloor}
          onPickCell={pickCell}
          hiCell={tab === 'esya' && selSpot && selSpot.floor === f ? selSpot.i : null}
          placing={tab === 'esya' && !!sel && !!placeRoom}
          hiRoom={tab === 'esya' ? placeRoom : tab === 'oda' ? rid : null}
          focusRoom={tab === 'esya' ? placeRoom : null}
        />
      </View>
      {!hasUpper(S) && (
        <Squish onPress={() => router.push('/plan')} accessibilityRole="button" style={[st.tip, { backgroundColor: c.surface2 }]}>
          <Text style={{ lineHeight: 29, fontSize: 22 }}>🏘️</Text>
          <T v="small" style={{ flex: 1 }}>Evin dubleks mi? Ev planında 2. kat çizebilirsin{premium.active ? '' : ' (Premium 👑)'}.</T>
          <Chevron color={c.muted} size={16} dir="right" />
        </Squish>
      )}

      <Tabs<Tab>
        items={[
          { k: 'hazir', emoji: '✨', label: 'Hazır görünüm' },
          { k: 'oda', emoji: '🎨', label: 'Oda içi' },
          { k: 'dis', emoji: '🏠', label: 'Dış görünüm' },
          { k: 'esya', emoji: '🛋️', label: 'Eşyalar' },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'hazir' && (
        <Card>
          <T v="h3">Hazır görünümler</T>
          <T v="small">Tek dokunuşla bütün odaların zemini, duvarı, dış cephesi ve çatısı değişir. Sonra istediğin odayı ayrıca düzenleyebilirsin.</T>
          <View style={st.swWrap}>
            {LOOK_PRESETS.map(p => (
              <Squish
                key={p.id}
                accessibilityRole="button"
                accessibilityLabel={p.name}
                onPress={() => {
                  if (p.premium && !premium.active) {
                    toast(`${tx(p.name)} Premium'da açık 👑`);
                    router.push('/premium' as Href);
                    return;
                  }
                  update(D => applyPreset(D, p.id));
                  sfx('pop');
                  toast(`${tx(p.name)} uygulandı ✨`);
                }}
                style={[st.preset, { backgroundColor: c.surface2 }]}>
                <Text style={{ lineHeight: 34, fontSize: 28 }}>{p.emoji}</Text>
                <Text numberOfLines={1} style={[st.swT, { color: c.ink }]}>{p.name}{p.premium && !premium.active ? ' 👑' : ''}</Text>
              </Squish>
            ))}
          </View>
          <Btn
            small
            kind="ghost"
            label="↩️ Hepsini ilk haline döndür"
            onPress={() => {
              update(D => { D.play.look = { rooms: {} }; });
              toast('Ev ilk görünümüne döndü');
            }}
          />
        </Card>
      )}

      {tab === 'oda' && rid && (
        <>
          <T v="small">1. Düzenlenecek odayı seç (evde de dokunabilirsin). 2. Zemin, duvar ve pencereyi seç.</T>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={st.bleed}>
            {(onFloor.length ? onFloor : S.order).map(id => (
              <Chip key={id} label={`${ROOM_EMOJI[S.rooms[id].type]} ${S.rooms[id].name}`} on={id === rid} onPress={() => setPick(id)} />
            ))}
          </ScrollView>

          <Card>
            <View style={st.hd}><T v="h3">Zemin</T><T v="small">{FLOORS.find(x => x.id === (look.floor ?? 'parke'))?.name ?? ''}</T></View>
            <Swatches
              list={FLOORS}
              value={look.floor ?? 'parke'}
              premium={premium.active}
              onPick={s => gate(s) && update(D => setRoomLook(D, rid, { floor: s.id }))}
            />
          </Card>

          <Card>
            <View style={st.hd}><T v="h3">Duvar rengi</T><T v="small">{WALLS.find(x => x.id === (look.wall ?? 'beyaz'))?.name ?? ''}</T></View>
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

          <Btn small kind="ghost" label="↩️ Bu odayı ilk haline döndür" onPress={() => update(D => resetRoomLook(D, rid))} />
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
          <T v="h3">Dış duvar rengi</T>
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
          <T v="h3">Çatı rengi</T>
          <T v="small">Evi iki parmakla yakınlaştırınca çatı görünür.</T>
          <Swatches
            list={ROOFS}
            value={S.play.look?.roof ?? 'kiremit'}
            premium={premium.active}
            onPick={s => gate(s) && update(D => {
              D.play.look ||= { rooms: {} };
              D.play.look.roof = s.id === 'kiremit' ? undefined : s.id;
            })}
          />
          <Btn small label="🌙 Evin teması: gündüz, gece, kış…" onPress={() => router.push('/evler' as Href)} />
        </Card>
      )}

      {tab === 'esya' && <Placer sel={sel} setSel={setSel} room={placeRoom} setRoom={setPlaceRoom} rooms={onFloor} />}
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
            <Text numberOfLines={2} style={[st.swT, { color: on ? c.ink : c.muted, textAlign: 'center' }]}>{s.name}</Text>
          </Squish>
        );
      })}
    </View>
  );
}

/** Eşya tepsisi: eşyayı buradan ya da 3B evde üstüne dokunarak seç, sonra evde bir bloğa dokun. Çevir ve depoya kaldır düğmeleri. */
function Placer({ sel, setSel, room, setRoom, rooms }: {
  sel: string | null; setSel: (id: string | null) => void; room: string | null; setRoom: (id: string | null) => void; rooms: string[];
}) {
  const c = useColors();
  const router = useRouter();
  const { state: S, update } = useStore();
  const owned = S.play.owned.filter(id => ITEM[id]);

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
  const pet = sel === 'kedi' || sel === 'kopek';
  const placed = sel && S.play.placed[sel] ? S.play.placed[sel] : null;

  return (
    <Card>
      <T v="h3">1. Odayı seç</T>
      <T v="small">Odayı seçince kamera ona yaklaşır. Evde odaya dokunarak da seçebilirsin.</T>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={st.bleed}>
        {rooms.map(id => (
          <Chip key={id} label={`${ROOM_EMOJI[S.rooms[id].type]} ${S.rooms[id].name}`} on={id === room} onPress={() => setRoom(id === room ? null : id)} />
        ))}
      </ScrollView>
      {room ? <Btn small kind="ghost" label="🔭 Bütün eve uzaklaş" onPress={() => setRoom(null)} /> : null}
      <T v="h3">{sel ? `2. ${ITEM[sel]?.emoji} ${tx(ITEM[sel]?.name ?? '')}` : '2. Eşyanı seç'}</T>
      <T v="small">
        {!sel ? 'Aşağıdan bir eşya seç ya da odadaki eşyaya dokun.'
          : !room ? 'Önce yukarıdan eşyayı koyacağın odayı seç.'
          : placed === room ? 'Taşımak için odada boş bir bloğa dokun. Çevirebilir ya da depoya kaldırabilirsin.'
          : 'Odada eşyayı koymak istediğin bloğa dokun.'}
      </T>
      {sel && (
        <View style={st.row}>
          {!pet && <Btn small label="🔄 Çevir" onPress={() => { update(D => turnItem(D, sel)); sfx('tap'); }} />}
          <Btn small label="📦 Depoya kaldır" onPress={() => { update(D => storeItem(D, sel)); setSel(null); }} />
          <Btn small kind="ghost" label="Tamam" onPress={() => setSel(null)} />
        </View>
      )}
      <View style={st.swWrap}>
        {owned.map(id => (
          <Squish key={id} onPress={() => setSel(sel === id ? null : id)} accessibilityLabel={ITEM[id]!.name} style={[st.item, { backgroundColor: sel === id ? c.ink : c.surface2 }]}>
            <Text style={{ lineHeight: 29, fontSize: 22 }}>{ITEM[id]!.emoji}</Text>
            <Text numberOfLines={1} style={[st.itemT, { color: sel === id ? c.bg : c.muted }]}>{where(id)}</Text>
          </Squish>
        ))}
      </View>
    </Card>
  );
}

const st = StyleSheet.create({
  preview: { borderRadius: radius.card, overflow: 'hidden', paddingVertical: 6 },
  tip: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: radius.tile, padding: 12 },
  chev: { fontFamily: fonts.bodyBlack, fontSize: 22 },
  bleed: { marginHorizontal: -22, paddingHorizontal: 22 },
  hd: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  swWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  preset: { width: 92, alignItems: 'center', gap: 4, borderRadius: radius.tile, paddingVertical: 12, paddingHorizontal: 4 },
  sw: { width: 66, alignItems: 'center', gap: 4 },
  swDot: { width: 50, height: 50, borderRadius: 25, borderWidth: 3, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  swAlt: { position: 'absolute', right: 0, bottom: 0, width: 25, height: 25 },
  swT: { fontFamily: fonts.bodyBold, fontSize: 12 },
  crown: { position: 'absolute', top: 1, right: 3, fontSize: 12 },
  item: { width: 74, alignItems: 'center', gap: 2, borderRadius: radius.tile, paddingVertical: 8, paddingHorizontal: 4 },
  itemT: { fontFamily: fonts.bodyBold, fontSize: 12 },
});
