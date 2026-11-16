import { useBusy } from '@/components/BusyOverlay';
import { dateLocale } from '@/i18n/runtime';
import { type Href } from 'expo-router';
import { useRouter } from '@/lib/nav';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useToast } from '@/components/Toast';
import { BackLink, Btn, Card, Chip, Screen, SecHead, T, Chevron } from '@/components/ui';
import { ROOM_EMOJI } from '@/domain/constants';
import { ITEMS, type Item, type ItemCategory } from '@/domain/items';
import { POINTS } from '@/domain/play';
import { LIMITS } from '@/domain/premium';
import { usePlay } from '@/play/usePlay';
import { usePurchases } from '@/purchases/PurchasesProvider';
import { useStore } from '@/store/AppStore';
import { fonts, radius, useColors } from '@/theme';
import { Appear, Burst, Float, Pulse, Squish } from '@/components/motion';
import { sfx } from '@/lib/sfx';

const CATEGORIES: [ItemCategory, string][] = [
  ['tum', '✨ Tümü'],
  ['mobilya', '🪑 Mobilya'],
  ['aydinlatma', '🕯️ Işık'],
  ['duvar', '🖼️ Duvar'],
  ['dekor', '🏺 Dekor'],
  ['bitki', '🪴 Bitki'],
  ['hobi', '🎨 Hobi'],
  ['mevsim', '🎄 Mevsim'],
  ['dis', '🏡 Dış mekan'],
  ['elektronik', '🎸 Elektronik'],
  ['evcil', '🐱 Evcil'],
  ['ozel', '👑 Özel'],
];

/**
 * Eşya mağazası: görev yaparak kazanılan puanla evine tatlı eşyalar al. Puan parayla satılmaz.
 * Bazı eşyalar Premium üyelere özel.
 */
export default function Magaza() {
  const c = useColors();
  const { state: S } = useStore();
  const P = S.play;
  const [open, setOpen] = useState<string | null>(null);
  const [cat, setCat] = useState<ItemCategory>('tum');
  const { premium } = usePurchases();
  const router = useRouter();

  const [canBuy, setCanBuy] = useState(false);
  const [bought, setBought] = useState(0);

  const filtered = ITEMS.filter(it => (cat === 'tum' || it.category === cat) && (!canBuy || (!P.owned.includes(it.id) && it.price <= P.points)))
    .sort((a, b) => Number(P.owned.includes(a.id)) - Number(P.owned.includes(b.id)) || a.price - b.price);
  const ownedN = ITEMS.filter(it => P.owned.includes(it.id)).length;

  return (
    <Screen header={false}>
      <BackLink />
      <View>
        <T v="eyebrow">Mağaza</T>
        <T v="h1">Evine eşya al 🛍️</T>
        <T v="lead">Puanlarını her gün iş yaparak kazanırsın: günün ilk 5 işi +{POINTS.gorev} (sonrakiler daha az), spor +{POINTS.spor}, günlük +{POINTS.gunluk}, üst üste günlerde seri bonusu.</T>
        <T v="small" style={{ marginTop: 4 }}>
          {premium.active
            ? `👑 Premium: puanların ${LIMITS.premium.mult.toLocaleString(dateLocale())} kat geliyor, 👑 eşyalar senin için açık.`
            : `👑 Premium'da puanlar ${LIMITS.premium.mult.toLocaleString(dateLocale())} kat gelir ve 👑 işaretli eşyalar açılır.`}
        </T>
      </View>

      <Appear index={1}>
        <View style={[styles.wallet, { backgroundColor: c.todaySoft }]}>
          <Float amp={3} dur={1800}><Text style={{ lineHeight: 36, fontSize: 28 }}>⭐</Text></Float>
          <Pulse on={P.points}><Text style={[styles.walletN, { color: c.today }]}>{P.points}</Text></Pulse>
          <Text style={[styles.walletL, { color: c.today }]}>puanın var</Text>
          <Text style={[styles.walletL, { color: c.muted, marginLeft: 'auto' }]}>{`🎁 ${ownedN}/${ITEMS.length}`}</Text>
        </View>
      </Appear>

      <Appear index={2}>
      <Squish onPress={() => router.push('/bahce' as Href)} accessibilityRole="button" style={[styles.garden, { backgroundColor: c.room.balkon }]}>
        <Text style={{ lineHeight: 39, fontSize: 30 }}>🌷</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.gardenT, { color: c.ink }]}>Moka&apos;nın bahçesi</Text>
          <Text style={[styles.tag, { color: c.muted, textAlign: 'left' }]}>Tohum ek, çiçek büyüt, evinin kişiliğini seç</Text>
        </View>
        <Chevron color={c.muted} size={16} dir="right" />
      </Squish>
      </Appear>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ marginHorizontal: -24, paddingHorizontal: 24 }}>
        {CATEGORIES.map(([k, label]) => (
          <Chip key={k} label={label} on={cat === k} onPress={() => { sfx('tap'); setCat(k); }} />
        ))}
      </ScrollView>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <Chip label={canBuy ? '⭐ Alabileceklerim' : '⭐ Hepsini göster'} on={canBuy} onPress={() => { sfx('tap'); setCanBuy(!canBuy); }} />
        <T v="small" style={{ flex: 1, textAlign: 'right' }}>{filtered.length} eşya</T>
      </View>
      {filtered.length === 0 && (
        <T v="lead" style={{ textAlign: 'center' }}>Burada şimdilik bir şey yok. Biraz daha iş yap, puanlar birikir 🌱</T>
      )}

      <View style={styles.grid}>
        {filtered.map((it, i) => (
          <Appear key={it.id} index={i % 8} style={open === it.id ? { width: '100%' } : { width: '47.5%' }}>
            <ItemCard item={it} selected={open === it.id} onBought={() => setBought(n => n + 1)} onPress={() => setOpen(open === it.id ? null : it.id)} />
          </Appear>
        ))}
      </View>
      <Burst fire={bought} />
    </Screen>
  );
}

function ItemCard({ item, selected, onPress, onBought }: { item: Item; selected: boolean; onPress: () => void; onBought: () => void }) {
  const c = useColors();
  const router = useRouter();
  const toast = useToast();
  const { state: S, update } = useStore();
  const { buy } = usePlay();
  const { premium } = usePurchases();
  const [busy, setBusy] = useState(false);
  useBusy(!!busy);
  const owned = S.play.owned.includes(item.id);
  const room = S.play.placed[item.id];
  const locked = item.premium && !premium.active;
  const short = item.price - S.play.points;
  const firstRoom = S.order[0] ?? null;

  const doBuy = async () => {
    setBusy(true);
    const r = await buy(item.id, firstRoom);
    setBusy(false);
    if (!r.ok) return toast(r.error);
    sfx('coin');
    onBought();
    toast(`${item.emoji} ${item.name} evinde! Hangi odada duracağını seçebilirsin.`);
  };
  const place = (rid: string | null) => update(D => void (D.play.placed[item.id] = rid));

  return (
    <Card style={[styles.item, { width: '100%' }, owned && { opacity: selected ? 1 : 0.85 }]}>
      <Squish onPress={onPress} accessibilityRole="button" accessibilityLabel={`${item.name}, ${item.price} puan`} style={{ alignItems: 'center', gap: 4 }}>
        <View style={[styles.bubble, { backgroundColor: locked ? c.surface2 : c.peachSoft }]}>
          <Text style={{ lineHeight: 49, fontSize: 38 }}>{item.emoji}</Text>
          {item.premium && <Text style={styles.crown}>👑</Text>}
        </View>
        <T v="bold" style={{ textAlign: 'center', fontSize: 14 }}>{item.name}</T>
        {owned ? (
          <Text style={[styles.tag, { color: c.ok }]}>✓ Senin {room && S.rooms[room] ? `· ${S.rooms[room].name}` : '· depoda'}</Text>
        ) : (
          <>
            <Text style={[styles.tag, { color: locked ? c.warm : c.ink }]}>⭐ {item.price}</Text>
            {!locked && short > 0 && (
              <View style={[styles.meter, { backgroundColor: c.surface2 }]}>
                <View style={[styles.meterFill, { width: `${Math.max(6, Math.min(100, (S.play.points / item.price) * 100))}%`, backgroundColor: c.today }]} />
              </View>
            )}
            {!locked && short <= 0 && <Text style={[styles.tag, { color: c.ok }]}>Alabilirsin ✨</Text>}
          </>
        )}
      </Squish>

      {selected && !owned && (
        <View style={{ gap: 8, alignSelf: 'stretch' }}>
          {locked ? (
            <>
              <T v="small" style={{ textAlign: 'center' }}>Bu eşya Premium üyelere özel.</T>
              <Btn kind="primary" label="Premium'a bak ⭐" onPress={() => router.push('/premium')} />
            </>
          ) : (
            <Btn
              kind="primary"
              label={busy ? 'Alınıyor…' : short > 0 ? `${short} puan daha lazım` : `${item.price} puana al`}
              disabled={busy || short > 0}
              onPress={doBuy}
            />
          )}
        </View>
      )}

      {selected && owned && (
        <View style={{ gap: 8, alignSelf: 'stretch' }}>
          <SecHead title="Hangi odada dursun?" h="h3" />
          <View style={styles.rooms}>
            {S.order.map(rid => (
              <Chip key={rid} label={`${ROOM_EMOJI[S.rooms[rid].type]} ${S.rooms[rid].name}`} on={room === rid} onPress={() => place(rid)} />
            ))}
            <Chip label="📦 Depoya kaldır" on={!room} onPress={() => place(null)} />
          </View>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  wallet: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, borderRadius: radius.card, justifyContent: 'center' },
  walletN: { fontFamily: fonts.displayBold, fontSize: 30, lineHeight: 34 },
  walletL: { fontFamily: fonts.bodyBlack, fontSize: 15 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },
  item: { alignItems: 'center', padding: 14, gap: 10 },
  bubble: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center' },
  crown: { position: 'absolute', top: -4, right: -4, fontSize: 16 },
  meter: { width: 64, height: 6, borderRadius: 3, overflow: 'hidden' },
  meterFill: { height: 6, borderRadius: 3 },
  tag: { fontFamily: fonts.bodyBlack, fontSize: 13.5, textAlign: 'center' },
  garden: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: radius.card, paddingVertical: 14, paddingHorizontal: 18 },
  gardenT: { fontFamily: fonts.bodyBlack, fontSize: 16 },
  rooms: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
