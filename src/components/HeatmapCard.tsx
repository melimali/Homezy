import { StyleSheet, Text, View } from 'react-native';

import { allTasks, doneToday } from '@/domain/logic';
import { addDays, BUILT, dayKey, dayTs, progressOf } from '@/domain/play';
import type { AppState } from '@/domain/types';
import { fonts, radius, useColors } from '@/theme';

type Props = {
  state: AppState;
  now: number;
};

type Badge = {
  id: string;
  emoji: string;
  title: string;
  desc: string;
  unlocked: boolean;
};

/**
 * Son 30 günün görev yoğunluğunu gösteren renkli Işıltı Haritası (Heatmap) ve
 * kullanıcının kazandığı başarı rozetleri (Badges).
 */
export function HeatmapCard({ state: S, now }: Props) {
  const c = useColors();
  const hp = progressOf(S.play, now);
  const todayKey = dayKey(now);

  // Son 30 günün tarihlerini hesapla
  const days: { key: string; date: Date; doneCount: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const k = addDays(todayKey, -i);
    const ts = dayTs(k);
    // O gün tamamlanan iş sayısı
    const all = allTasks(S, ts);
    const doneCount = all.filter(x => doneToday(x.t, ts)).length;
    days.push({ key: k, date: new Date(ts), doneCount });
  }

  // Başarı Rozetleri (Badges)
  const openPlots = S.play.garden.plots.filter(p => p.bloomed).length;
  const totalDone = days.reduce((sum, d) => sum + d.doneCount, 0);

  const badges: Badge[] = [
    {
      id: 'streak',
      emoji: '🔥',
      title: 'Kırılmayan Seri',
      desc: '7 gün üst üste',
      unlocked: hp.streak >= 7,
    },
    {
      id: 'tidy',
      emoji: '🧹',
      title: 'Derli Toplu',
      desc: '30 günde 10+ iş',
      unlocked: totalDone >= 10,
    },
    {
      id: 'garden',
      emoji: '🌸',
      title: 'Bahçe Tutkunu',
      desc: 'İlk çiçek açtı',
      unlocked: openPlots >= 1,
    },
    {
      id: 'builder',
      emoji: '🏡',
      title: 'Ev Ustası',
      desc: 'Ev tamamlandı',
      unlocked: hp.level >= BUILT,
    },
  ];

  const tileColor = (count: number) => {
    if (count === 0) return c.surface2;
    if (count === 1) return c.accentSoft;
    if (count <= 3) return c.accent;
    return c.hi;
  };

  return (
    <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.line }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: c.ink }]}>Işıltı Haritası 📊</Text>
        <Text style={[styles.sub, { color: c.muted }]}>Son 30 günün rutinleri</Text>
      </View>

      {/* 30 Günlük Heatmap Izgarası */}
      <View style={styles.grid}>
        {days.map(d => (
          <View
            key={d.key}
            style={[
              styles.tile,
              {
                backgroundColor: tileColor(d.doneCount),
                borderColor: d.key === todayKey ? c.hi : 'transparent',
              },
            ]}
          >
            {d.doneCount > 0 && (
              <Text style={[styles.tileText, { color: d.doneCount >= 2 ? '#FFF' : c.ink }]}>
                {d.doneCount}
              </Text>
            )}
          </View>
        ))}
      </View>

      <View style={styles.legend}>
        <Text style={[styles.legendText, { color: c.muted }]}>Sakin</Text>
        <View style={[styles.legendDot, { backgroundColor: c.surface2 }]} />
        <View style={[styles.legendDot, { backgroundColor: c.accentSoft }]} />
        <View style={[styles.legendDot, { backgroundColor: c.accent }]} />
        <View style={[styles.legendDot, { backgroundColor: c.hi }]} />
        <Text style={[styles.legendText, { color: c.muted }]}>Işıl ışıl</Text>
      </View>

      {/* Rozetler Bölümü */}
      <View style={styles.badgeSection}>
        <Text style={[styles.badgeHead, { color: c.ink }]}>Rozetlerin 🏆</Text>
        <View style={styles.badgeGrid}>
          {badges.map(b => (
            <View
              key={b.id}
              style={[
                styles.badgeCard,
                {
                  backgroundColor: b.unlocked ? c.accentSoft : c.surface2,
                  opacity: b.unlocked ? 1 : 0.6,
                },
              ]}
            >
              <Text style={styles.badgeEmoji}>{b.emoji}</Text>
              <Text style={[styles.badgeTitle, { color: c.ink }]}>{b.title}</Text>
              <Text style={[styles.badgeDesc, { color: c.muted }]}>
                {b.unlocked ? 'Kazanıldı ✓' : b.desc}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    borderWidth: 1.5,
    padding: 16,
    gap: 12,
  },
  header: {
    gap: 2,
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 20,
    lineHeight: 24,
  },
  sub: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  tile: {
    width: '8.8%',
    aspectRatio: 1,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileText: {
    fontFamily: fonts.bodyBlack,
    fontSize: 9.5,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 5,
  },
  legendText: {
    fontFamily: fonts.bodyBold,
    fontSize: 10.5,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 3,
  },
  badgeSection: {
    marginTop: 8,
    gap: 8,
  },
  badgeHead: {
    fontFamily: fonts.displayBold,
    fontSize: 16,
  },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badgeCard: {
    flex: 1,
    minWidth: '45%',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    gap: 2,
  },
  badgeEmoji: {
    fontSize: 22,
  },
  badgeTitle: {
    fontFamily: fonts.bodyBlack,
    fontSize: 12.5,
  },
  badgeDesc: {
    fontFamily: fonts.bodyBold,
    fontSize: 10.5,
  },
});
