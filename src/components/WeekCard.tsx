import type { ComponentRef, Ref } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { House3D } from '@/components/House3D';
import { weekSummary } from '@/domain/logic';
import { BUILT, dayTs, lastWeek, progressOf, stageFor } from '@/domain/play';
import type { AppState, HouseTheme } from '@/domain/types';
import { brand, fonts, radius, useColors } from '@/theme';

const DAY_LETTER = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];

/**
 * Son 7 günün paylaşılabilir özeti: günler, yapılan iş sayısı, seri ve ev. Görsel olarak
 * paylaşıldığı için kendi zemini, logosu ve sloganı var; ekrandaki diğer şeylere dayanmaz.
 */
export function WeekCard({ state: S, now, theme, ref }: { state: AppState; now: number; theme: HouseTheme; ref?: Ref<ComponentRef<typeof View>> }) {
  const c = useColors();
  const sum = weekSummary(S, now);
  const hp = progressOf(S.play, now);
  const week = lastWeek(S.play, now);
  const stage = stageFor(hp.level);
  return (
    <View ref={ref} collapsable={false} style={[styles.card, { backgroundColor: c.bg, borderColor: c.line }]}>
      <View style={styles.head}>
        <View style={[styles.logo, { backgroundColor: brand.mint }]}>
          <Image source={require('../../assets/logo-yatay.png')} style={styles.wordmark} resizeMode="contain" accessibilityLabel="Homezy" />
        </View>
        <Text style={[styles.eyebrow, { color: c.warm }]}>Son 7 gün</Text>
      </View>
      <Text style={[styles.title, { color: c.ink }]}>
        {sum.done ? `${sum.done} iş yaptım 💪` : 'Sakin bir hafta 🌙'}
      </Text>

      <View style={styles.days}>
        {week.map(d => {
          const bg = d.mark === 'done' ? c.hi : d.mark === 'ice' ? c.accentSoft : c.surface2;
          return (
            <View key={d.key} style={styles.day}>
              <View style={[styles.dot, { backgroundColor: bg, borderColor: d.mark === 'today' ? c.hi : bg }]}>
                <Text style={styles.dotText}>{d.mark === 'done' ? '✓' : d.mark === 'ice' ? '❄️' : ''}</Text>
              </View>
              <Text style={[styles.dayL, { color: c.muted }]}>{DAY_LETTER[new Date(dayTs(d.key)).getDay()]}</Text>
            </View>
          );
        })}
      </View>

      <House3D state={S} now={now} build={hp} theme={theme} labels={false} />

      <View style={styles.stats}>
        <Stat c={c} n={`${sum.days}/7`} l="gün" />
        <Stat c={c} n={`🔥 ${hp.streak}`} l="günlük seri" />
        <Stat c={c} n={hp.level >= BUILT ? `Sv. ${hp.level}` : `${hp.level}/${BUILT}`} l={hp.level >= BUILT ? 'ev' : 'inşaat'} />
      </View>
      {(stage || sum.best) && (
        <Text style={[styles.line, { color: c.ink }]}>
          {stage ? `${stage.emoji} ${stage.name}` : ''}
          {stage && sum.best ? ' · ' : ''}
          {sum.best ? `En parlak oda: ${sum.best} ✨` : ''}
        </Text>
      )}
      <Text style={[styles.slogan, { color: c.muted }]}>Evini topla, evin büyüsün 🏡</Text>
    </View>
  );
}

function Stat({ c, n, l }: { c: ReturnType<typeof useColors>; n: string; l: string }) {
  return (
    <View style={[styles.stat, { backgroundColor: c.surface }]}>
      <Text style={[styles.statN, { color: c.ink }]}>{n}</Text>
      <Text style={[styles.statL, { color: c.muted }]}>{l}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.card, borderWidth: 1.5, padding: 16, gap: 12 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  logo: { borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 5 },
  wordmark: { width: 92, height: 24 },
  eyebrow: { fontFamily: fonts.bodyBlack, fontSize: 11, letterSpacing: 1.1, textTransform: 'uppercase' },
  title: { fontFamily: fonts.displayBold, fontSize: 28, lineHeight: 33 },
  days: { flexDirection: 'row', justifyContent: 'space-between' },
  day: { alignItems: 'center', gap: 3 },
  dot: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  dotText: { fontFamily: fonts.bodyBlack, fontSize: 14, color: '#fff' },
  dayL: { fontFamily: fonts.bodyBold, fontSize: 11 },
  stats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, borderRadius: 16, paddingVertical: 8, alignItems: 'center' },
  statN: { fontFamily: fonts.displayBold, fontSize: 18, lineHeight: 22 },
  statL: { fontFamily: fonts.bodyBold, fontSize: 11 },
  line: { fontFamily: fonts.bodyBold, fontSize: 13, textAlign: 'center' },
  slogan: { fontFamily: fonts.bodyBlack, fontSize: 13, textAlign: 'center' },
});
