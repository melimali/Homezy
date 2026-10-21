import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { displayName, useAuth } from '@/auth/AuthProvider';
import { Btn, Card, EmptyMsg, Pill, Screen, T } from '@/components/ui';
import { notifs } from '@/domain/logic';
import type { Settings } from '@/domain/types';
import { getPermission, notificationsAvailable, requestPermission, rescheduleMorningSummaries } from '@/notifications/schedule';
import { useNow } from '@/hooks/useNow';
import { usePurchases } from '@/purchases/PurchasesProvider';
import { useStore } from '@/store/AppStore';
import { fonts, radius, useColors } from '@/theme';

const pad = (n: number) => String(n).padStart(2, '0');

export default function Bildirimler() {
  const c = useColors();
  const router = useRouter();
  const { state: S, update } = useStore();
  const now = useNow();
  const ns = notifs(S, now);
  const s = S.settings;
  const { status, user } = useAuth();
  const { premium } = usePurchases();
  const [perm, setPerm] = useState<'granted' | 'denied' | 'undetermined'>('granted');

  useFocusEffect(
    useCallback(() => {
      getPermission().then(setPerm).catch(() => {});
    }, []),
  );

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => update(D => void (D.settings[k] = v));

  const [hh, mm] = s.time.split(':').map(n => parseInt(n, 10));
  const shift = (dh: number, dm: number) => {
    let total = ((hh * 60 + mm + dh * 60 + dm) % 1440 + 1440) % 1440;
    total = Math.round(total / 15) * 15 % 1440;
    set('time', `${pad(Math.floor(total / 60))}:${pad(total % 60)}`);
  };

  const askPermission = async () => {
    if (perm === 'denied') {
      Linking.openSettings().catch(() => {});
      return;
    }
    const ok = await requestPermission();
    setPerm(ok ? 'granted' : 'denied');
    if (ok) rescheduleMorningSummaries(S).catch(() => {});
  };

  const color = { late: c.late, today: c.warm, ok: c.hi };

  return (
    <Screen>
      <View>
        <T v="h1">Bildirimler</T>
        <T v="lead">
          Layfapp her sabah <Text style={{ fontFamily: fonts.bodyBlack, color: c.ink }}>{s.time}</Text>{"'"}da bunları telefonuna bildirim olarak gönderir.
        </T>
      </View>

      {notificationsAvailable() && perm !== 'granted' && (
        <Card style={{ backgroundColor: c.accentSoft }}>
          <T v="bold">Bildirimler kapalı</T>
          <T style={{ fontSize: 14 }}>
            {perm === 'denied'
              ? 'Sabah özetini alabilmek için telefonun ayarlarından Layfapp bildirimlerini aç.'
              : 'Sabah özetini alabilmek için bildirim izni ver.'}
          </T>
          <Btn label={perm === 'denied' ? 'Ayarları aç' : 'İzin ver'} kind="primary" onPress={askPermission} />
        </Card>
      )}

      <View style={{ gap: 8 }}>
        {ns.map((n, i) => (
          <Pressable
            key={i}
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/oda/[id]', params: { id: n.rid } })}
            style={({ pressed }) => [styles.notif, { backgroundColor: c.surface, borderColor: c.line }, pressed && { transform: [{ translateY: 1 }] }]}
          >
            <View style={[styles.dot, { backgroundColor: color[n.k] }]} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <T v="bold" style={{ fontSize: 14 }}>{n.title}</T>
              <T v="small" style={{ fontSize: 13 }}>{n.text}</T>
            </View>
          </Pressable>
        ))}
        {!ns.length && (
          <Card>
            <EmptyMsg>Bildirim yok. Evde her şey yolunda.</EmptyMsg>
          </Card>
        )}
      </View>

      <Card>
        <T v="h2">Bildirim ayarları</T>
        <View style={[styles.setRow, { borderTopWidth: 0 }]}>
          <View style={{ flex: 1 }}>
            <T v="bold" style={{ fontSize: 14 }}>Günlük özet saati</T>
            <T v="small">Sabah özeti bu saatte gelir</T>
          </View>
          <View style={styles.timeBox}>
            <Step label="−" a11y="Saati 15 dakika geri al" onPress={() => shift(0, -15)} />
            <Text style={[styles.time, { color: c.ink }]}>{s.time}</Text>
            <Step label="+" a11y="Saati 15 dakika ileri al" onPress={() => shift(0, 15)} />
          </View>
        </View>
        <Toggle label="Rutin hatırlatmaları" sub="Geciken ve bugün yapılacak işler, bitki sulama" value={s.routine} onChange={v => set('routine', v)} />
        <Toggle label="Eksik ürünler" sub="Biten ürünler ve eski buzdolabı fotoğrafı" value={s.stock} onChange={v => set('stock', v)} />
        <Toggle label="Çamaşır" sub="3 ve daha fazla kirli parça birikince" value={s.laundry} onChange={v => set('laundry', v)} />
      </Card>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Hesap ve üyelik"
        onPress={() => router.push('/hesap')}
        style={({ pressed }) => [styles.notif, { backgroundColor: c.surface, borderColor: c.line, alignItems: 'center' }, pressed && { transform: [{ translateY: 1 }] }]}
      >
        <View style={[styles.avatar, { backgroundColor: c.accent }]}>
          <Text style={{ fontFamily: fonts.displayBold, fontSize: 17, color: c.onAccent }}>
            {(status === 'account' ? displayName(user) : 'M').slice(0, 1).toLocaleUpperCase('tr-TR')}
          </Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <T v="bold" style={{ fontSize: 14 }}>Hesap ve üyelik</T>
          <T v="small" style={{ fontSize: 13 }} numberOfLines={1}>
            {status === 'account' ? user?.email : 'Hesap oluştur, evin yedeklensin'}
          </T>
        </View>
        {premium.active && <Pill k="ok" label="Premium" />}
        <Text style={{ color: c.muted, fontSize: 18 }}>›</Text>
      </Pressable>

      {!notificationsAvailable() && (
        <T v="small" style={{ textAlign: 'center' }}>Burada bildirim gönderilemiyor (web önizlemesi ya da Expo Go). Telefona kurulan sürümde aynı kurallar bildirim merkezine düşer.</T>
      )}
    </Screen>
  );
}

function Step({ label, a11y, onPress }: { label: string; a11y: string; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={a11y} hitSlop={4}
      style={({ pressed }) => [styles.step, { backgroundColor: c.surface2 }, pressed && { opacity: 0.7 }]}>
      <Text style={{ fontFamily: fonts.bodyBlack, fontSize: 17, color: c.ink }}>{label}</Text>
    </Pressable>
  );
}

function Toggle({ label, sub, value, onChange }: { label: string; sub: string; value: boolean; onChange: (v: boolean) => void }) {
  const c = useColors();
  return (
    <View style={[styles.setRow, { borderTopColor: c.line }]}>
      <View style={{ flex: 1 }}>
        <T v="bold" style={{ fontSize: 14 }}>{label}</T>
        <T v="small">{sub}</T>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        accessibilityLabel={label}
        trackColor={{ true: c.hi, false: c.line }}
        thumbColor={c.surface}
        ios_backgroundColor={c.line}
        // react-native-web varsayılan olarak yeşil bir düğme çiziyor.
        {...(Platform.OS === 'web' ? ({ activeThumbColor: c.surface } as object) : null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  notif: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14, borderRadius: 18, borderWidth: 1.5 },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: 1.5 },
  timeBox: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  time: { fontFamily: fonts.bodyBlack, fontSize: 16, fontVariant: ['tabular-nums'], minWidth: 48, textAlign: 'center' },
  step: { width: 34, height: 34, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
});
