import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Appear, Squish } from '@/components/motion';
import { BackLink, Btn, Card, EmptyMsg, ListRow, Screen, T } from '@/components/ui';
import { monthGrid, monthItems, ymd } from '@/domain/calendar';
import { dateLocale } from '@/i18n/runtime';
import { useNow } from '@/hooks/useNow';
import { useRouter } from '@/lib/nav';
import { useStore } from '@/store/AppStore';
import { fonts, hit, radius, useColors } from '@/theme';

/** Takvim: ay görünümü; günlerdeki noktalar iş, fatura, garanti ve evcil bakım vadelerini gösterir. Güne dokununca liste açılır. */
export default function Takvim() {
  const c = useColors();
  const router = useRouter();
  const now = useNow();
  const { state: S } = useStore();
  const base = new Date(now);
  const [ym, setYm] = useState({ y: base.getFullYear(), m: base.getMonth() });
  const [sel, setSel] = useState(ymd(now));
  const items = useMemo(() => monthItems(S, ym.y, ym.m, now), [S, ym, now]);
  const grid = useMemo(() => monthGrid(ym.y, ym.m), [ym]);
  const today = ymd(now);
  const key = (d: number) => `${ym.y}-${String(ym.m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const step = (n: number) => setYm(v => {
    const d = new Date(v.y, v.m + n, 1);
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const title = new Date(ym.y, ym.m, 1).toLocaleDateString(dateLocale(), { month: 'long', year: 'numeric' });
  // Pazartesi başlangıçlı hafta günleri (2024-01-01 pazartesi).
  const heads = Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 1 + i).toLocaleDateString(dateLocale(), { weekday: 'short' }));
  const list = items[sel] ?? [];
  const selDate = new Date(`${sel}T12:00:00`).toLocaleDateString(dateLocale(), { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <Screen header={false}>
      <BackLink />
      <T v="h1">Takvim 🗓️</T>
      <Card>
        <View style={st.nav}>
          <Btn small kind="ghost" label="‹" accessibilityLabel="Önceki ay" onPress={() => step(-1)} />
          <T v="h3" accessibilityRole="header" noTx style={{ flex: 1, textAlign: 'center', textTransform: 'capitalize' }}>{title}</T>
          <Btn small kind="ghost" label="›" accessibilityLabel="Sonraki ay" onPress={() => step(1)} />
        </View>
        <View style={st.row}>
          {heads.map(h => <Text key={h} style={[st.head, { color: c.muted }]} importantForAccessibility="no" maxFontSizeMultiplier={1.2}>{h.slice(0, 2)}</Text>)}
        </View>
        <View style={st.gridWrap}>
          {grid.map((d, i) => {
            if (d == null) return <View key={i} style={st.cell} />;
            const k = key(d);
            const n = items[k]?.length ?? 0;
            const late = items[k]?.some(x => x.late);
            const on = k === sel;
            return (
              <View key={i} style={st.cell}>
                <Squish
                  scaleTo={0.9}
                  onPress={() => setSel(k)}
                  accessibilityLabel={[String(d), n ? `${n} kalem` : '', k === today ? 'bugün' : ''].filter(Boolean).join(', ')}
                  accessibilityState={{ selected: on }}
                  style={[st.day, { backgroundColor: on ? c.accent : k === today ? c.accentSoft : 'transparent' }]}
                >
                  <Text maxFontSizeMultiplier={1.2} style={{ fontFamily: fonts.bodyBlack, fontSize: 14, color: on ? c.onAccent : c.ink }}>{d}</Text>
                  <View style={[st.dot, { backgroundColor: n ? (late ? c.late : on ? c.onAccent : c.warm) : 'transparent' }]} />
                </Squish>
              </View>
            );
          })}
        </View>
      </Card>

      <T v="h3" noTx accessibilityRole="header" style={{ textTransform: 'capitalize' }}>{selDate}</T>
      {list.length === 0 && <EmptyMsg>Bu gün için bir şey yok.</EmptyMsg>}
      {list.map((x, i) => (
        <Appear key={x.id} index={i}>
          <ListRow
            title={x.title}
            sub={x.late ? `${x.sub} · gecikti` : x.sub}
            icon={x.emoji}
            onPress={x.url ? () => router.push(x.url as never) : undefined}
          />
        </Appear>
      ))}
    </Screen>
  );
}

const CELL = `${100 / 7}%` as const;
const st = StyleSheet.create({
  nav: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  row: { flexDirection: 'row' },
  head: { width: CELL, textAlign: 'center', fontFamily: fonts.bodyBlack, fontSize: 12, paddingVertical: 6 },
  gridWrap: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: CELL, aspectRatio: 1, padding: 2, minHeight: hit },
  day: { flex: 1, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', gap: 3 },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
