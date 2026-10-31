import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { MoodLine, Ring, RoomBars, StatPill, StreakDots, WeekBars } from '@/components/charts';
import { MokaMascot } from '@/components/MokaMascot';
import { Appear, Squish } from '@/components/motion';
import { Card, SecHead, Screen, T, TitleBar } from '@/components/ui';
import { ROOM_EMOJI } from '@/domain/constants';
import { allTasks, doneToday, homeScore } from '@/domain/logic';
import { freezesUsed, progressOf } from '@/domain/play';
import { limits } from '@/domain/premium';
import { dayBars, monthDots, moodLineOf, moodSeries, roomScores, weekLine } from '@/domain/stats';
import { useNow } from '@/hooks/useNow';
import { usePurchases } from '@/purchases/PurchasesProvider';
import { useStore } from '@/store/AppStore';
import { radius, useColors } from '@/theme';

/**
 * Gelişim sekmesi (docs/skeleton-v3.md): yüzeyde dört sayı, altında tatlı grafikler.
 * Her grafiğin altında Moka'nın kısa, suçlamayan yorumu.
 */
export default function Gelisim() {
  const c = useColors();
  const router = useRouter();
  const now = useNow();
  const { state: S } = useStore();
  const { premium } = usePurchases();
  const hp = progressOf(S.play, now);
  const bars = dayBars(S.play, now);
  const week = bars.reduce((a, b) => a + b.n, 0);
  const mood = moodSeries(S.play, now);
  const rooms = roomScores(S, now);
  const score = homeScore(S, now);
  const all = allTasks(S, now);
  const doneN = all.filter(x => doneToday(x.t, now)).length;
  const dueN = all.filter(x => x.s.k !== 'ok').length;
  const todayPct = Math.round((100 * doneN) / Math.max(1, doneN + dueN));
  const lim = limits(premium.active);
  const freezeLeft = Math.max(0, lim.freezes - freezesUsed(S.play, now));
  const pose = week >= 10 ? 'party' : week ? 'thumbs_up' : 'sipping';

  return (
    <Screen header={false} tab tone="sky">
      <TitleBar title="Gelişim" sub="Küçük adımların, büyüyen evin" />

      <Appear index={1} style={[st.hero, { backgroundColor: c.surface, shadowColor: c.shadow }]}>
        <MokaMascot pose={pose} size="sm" showBubble={false} />
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <T v="bold">{week ? `Bu hafta ${week} iyilik` : 'Yeni bir hafta'}</T>
          <T v="small" numberOfLines={3}>{weekLine(bars)}</T>
        </View>
      </Appear>

      <Appear index={2} style={st.rings}>
        <View style={[st.ringCard, { backgroundColor: c.surface }]}>
          <Ring pct={todayPct} color={c.peach} label="bugün" size={104} />
          <T v="tiny">{doneN}/{doneN + dueN} iş</T>
        </View>
        <View style={[st.ringCard, { backgroundColor: c.surface }]}>
          <Ring pct={score} color={c.sage} label="ev puanı" size={104} />
          <T v="tiny">odaların ortalaması</T>
        </View>
      </Appear>

      <Appear index={3} style={st.pills}>
        <StatPill emoji="🔥" n={hp.streak} label="gün seri" tint={c.peachSoft} />
        <StatPill emoji="⭐" n={S.play.points} label="puan" tint={c.lavenderSoft} />
        <StatPill emoji="🏠" n={hp.level} label="seviye" tint={c.sageSoft} />
      </Appear>

      <Card index={4}>
        <SecHead title="Bu hafta" h="h3" right={`${week} iş`} />
        <WeekBars bars={bars} />
      </Card>

      <Card index={5}>
        <SecHead title="Seri takvimi" h="h3" right={`❄️ ${freezeLeft}/${lim.freezes}`} />
        <StreakDots dots={monthDots(S.play, now)} />
        <T v="tiny" style={{ textAlign: 'center' }}>🔥 iş yapılan gün · ❄️ dondurma ile korunan gün</T>
      </Card>

      <Card index={6}>
        <SecHead title="Ruh hali" h="h3" right="14 gün" />
        <MoodLine points={mood} />
        <T v="small">{moodLineOf(mood)}</T>
      </Card>

      {rooms.length > 0 && (
        <Card index={7}>
          <SecHead title="Odalar" h="h3" right={`%${score}`} />
          <RoomBars rooms={rooms} emoji={ROOM_EMOJI} />
        </Card>
      )}

      <Appear index={8} style={st.links}>
        <LinkTile emoji="📅" label="Haftam" sub="Paylaşılabilir kart" tint={c.roseSoft} onPress={() => router.push('/hafta')} />
        <LinkTile emoji="🌤️" label="Günüm" sub="Moka ile paylaş" tint={c.roseSoft} onPress={() => router.push('/gunum')} />
        <LinkTile emoji="🎬" label="Evimin hikâyesi" sub="Baştan bugüne" tint={c.lavenderSoft} onPress={() => router.push('/hikaye')} />
      </Appear>
    </Screen>
  );
}

function LinkTile({ emoji, label, sub, tint, onPress }: { emoji: string; label: string; sub: string; tint: string; onPress: () => void }) {
  return (
    <Squish onPress={onPress} accessibilityRole="link" accessibilityLabel={label} style={[st.link, { backgroundColor: tint }]}>
      <T style={{ fontSize: 28 }}>{emoji}</T>
      <T v="bold" numberOfLines={1}>{label}</T>
      <T v="tiny" numberOfLines={1}>{sub}</T>
    </Squish>
  );
}

const st = StyleSheet.create({
  hero: {
    flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: radius.card, padding: 14,
    shadowOffset: { width: 0, height: 8 }, shadowOpacity: 1, shadowRadius: 18, elevation: 3,
  },
  rings: { flexDirection: 'row', gap: 12 },
  ringCard: { flex: 1, alignItems: 'center', gap: 6, borderRadius: radius.card, paddingVertical: 16 },
  pills: { flexDirection: 'row', gap: 10 },
  links: { flexDirection: 'row', gap: 12 },
  link: { flex: 1, borderRadius: radius.card, padding: 16, gap: 2 },
});
