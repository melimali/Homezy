import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { BackLink, Btn, Card, EmptyMsg, Screen, T } from '@/components/ui';
import { notifs } from '@/domain/logic';
import type { Settings } from '@/domain/types';
import { getPermission, notificationsAvailable, requestPermission, rescheduleMorningSummaries } from '@/notifications/schedule';
import { useNow } from '@/hooks/useNow';
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
    <Screen header={false}>
      <BackLink />
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
            onPress={() => (n.url ? router.push(n.url as Href) : router.push({ pathname: '/oda/[id]', params: { id: n.rid } }))}
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
        <Toggle label="Çamaşır ve dolap" sub="Aynı yıkama türünden 3 kirli parça, mevsim değişimi, bağış önerisi" value={s.laundry} onChange={v => set('laundry', v)} />
        <Toggle label="Faturalar ve bakım 🧾" sub="Son ödeme gününe 2 gün kala, garanti bitişine 30 gün kala, kombi ve klima bakımı, mevsimlik işler" value={s.bills} onChange={v => set('bills', v)} />
        <Toggle label="Son kullanma tarihleri ⏳" sub="Buzdolabındaki ürünlere 2 gün kala" value={s.expiry} onChange={v => set('expiry', v)} />
        <Toggle label="Haftalık özet 📅" sub="Pazar akşamı 19:00'da haftanın özeti" value={s.weekly} onChange={v => set('weekly', v)} />
        <Toggle label="Seri hatırlatması 🔥" sub="Akşam 20:30'da, o gün hiçbir şey yapmadıysan" value={s.streak} onChange={v => set('streak', v)} />
        <Toggle label="Spor hatırlatması 🏃" sub={`${s.sportTime}, seçtiğin günlerde`} value={s.sport} onChange={v => set('sport', v)} />
        <Btn label="Spor günlerini ve saatini seç" small onPress={() => router.push('/spor')} />
      </Card>
      <Card>
        <T v="h2">Düzen ve motivasyon</T>
        <Toggle label="Esnek zamanlama" sub="Zamanı geçen iş hemen gecikmiş sayılmaz; sıklığının yarısı kadar gün tolerans (haftalık iş 3 gün)" value={s.flex} onChange={v => set('flex', v)} />
        <Toggle label="Tertemiz oda kutlaması 🎉" sub="Bir odanın bütün işleri bitince kısa bir kutlama" value={s.celebrate} onChange={v => set('celebrate', v)} />
      </Card>
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
  setRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: 1.5 },
  timeBox: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  time: { fontFamily: fonts.bodyBlack, fontSize: 16, fontVariant: ['tabular-nums'], minWidth: 48, textAlign: 'center' },
  step: { width: 34, height: 34, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
});
