import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useToast } from '@/components/Toast';
import { BackLink, Btn, Card, Chip, Screen, SecHead, T } from '@/components/ui';
import { ROOM_EMOJI } from '@/domain/constants';
import { ITEMS, type Item } from '@/domain/items';
import { POINTS } from '@/domain/play';
import { LIMITS } from '@/domain/premium';
import { usePlay } from '@/play/usePlay';
import { usePurchases } from '@/purchases/PurchasesProvider';
import { useStore } from '@/store/AppStore';
import { fonts, radius, useColors } from '@/theme';

/**
 * Eşya mağazası: görev yaparak kazanılan puanla evine tatlı eşyalar al. Puan parayla satılmaz.
 * Bazı eşyalar Premium üyelere özel.
 */
export default function Magaza() {
  const c = useColors();
  const { state: S } = useStore();
  const P = S.play;
  const [open, setOpen] = useState<string | null>(null);
  const { premium } = usePurchases();
  const router = useRouter();

  return (
    <Screen header={false}>
      <BackLink />
      <View>
        <T v="eyebrow">Mağaza</T>
        <T v="h1">Evine eşya al 🛍️</T>
        <T v="lead">Puanlarını her gün iş yaparak kazanırsın: bir iş +{POINTS.gorev}, spor +{POINTS.spor}, günlük +{POINTS.gunluk}, üst üste günlerde seri bonusu.</T>
        <T v="small" style={{ marginTop: 4 }}>
          {premium.active
            ? `👑 Premium: puanların ${LIMITS.premium.mult.toLocaleString('tr-TR')} kat geliyor, 👑 eşyalar senin için açık.`
            : `👑 Premium'da puanlar ${LIMITS.premium.mult.toLocaleString('tr-TR')} kat gelir ve 👑 işaretli eşyalar açılır.`}
        </T>
      </View>

      <View style={[styles.wallet, { backgroundColor: c.todaySoft }]}>
        <Text style={{ fontSize: 28 }}>⭐</Text>
        <Text style={[styles.walletN, { color: c.today }]}>{P.points}</Text>
        <Text style={[styles.walletL, { color: c.today }]}>puanın var</Text>
      </View>

      <Pressable onPress={() => router.push('/bahce')} accessibilityRole="button" style={[styles.garden, { backgroundColor: c.room.balkon }]}>
        <Text style={{ fontSize: 30 }}>🌷</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.gardenT, { color: c.ink }]}>Moka&apos;nın bahçesi</Text>
          <Text style={[styles.tag, { color: c.muted, textAlign: 'left' }]}>Tohum ek, çiçek büyüt, evinin kişiliğini seç</Text>
        </View>
        <Text style={[styles.gardenT, { color: c.muted }]}>›</Text>
      </Pressable>

      <View style={styles.grid}>
        {ITEMS.map(it => (
          <ItemCard key={it.id} item={it} selected={open === it.id} onPress={() => setOpen(open === it.id ? null : it.id)} />
        ))}
      </View>
    </Screen>
  );
}

function ItemCard({ item, selected, onPress }: { item: Item; selected: boolean; onPress: () => void }) {
  const c = useColors();
  const router = useRouter();
  const toast = useToast();
  const { state: S, update } = useStore();
  const { buy } = usePlay();
  const { premium } = usePurchases();
  const [busy, setBusy] = useState(false);
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
    toast(`${item.emoji} ${item.name} evinde! Hangi odada duracağını seçebilirsin.`);
  };
  const place = (rid: string | null) => update(D => void (D.play.placed[item.id] = rid));

  return (
    <Card style={[styles.item, selected && { width: '100%' }]}>
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${item.name}, ${item.price} puan`} style={{ alignItems: 'center', gap: 4 }}>
        <Text style={{ fontSize: 40 }}>{item.emoji}</Text>
        <T v="bold" style={{ textAlign: 'center', fontSize: 14 }}>{item.name}</T>
        {owned ? (
          <Text style={[styles.tag, { color: c.ok }]}>✓ Senin {room && S.rooms[room] ? `· ${S.rooms[room].name}` : '· depoda'}</Text>
        ) : (
          <Text style={[styles.tag, { color: locked ? c.warm : c.ink }]}>{item.premium ? '👑 ' : ''}⭐ {item.price}</Text>
        )}
      </Pressable>

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
  item: { width: '47.5%', alignItems: 'center', padding: 14, gap: 10 },
  tag: { fontFamily: fonts.bodyBlack, fontSize: 13, textAlign: 'center' },
  garden: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: radius.card, paddingVertical: 14, paddingHorizontal: 18 },
  gardenT: { fontFamily: fonts.bodyBlack, fontSize: 16 },
  rooms: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
