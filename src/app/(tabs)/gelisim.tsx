import { useRouter } from '@/lib/nav';
import { useFocusEffect, type Href } from 'expo-router';
import { Fragment, useCallback, useState, type ReactNode } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { EditTabBtn } from '@/components/TabEditor';
import { useTabLayout } from '@/lib/tabLayout';
import { HeatmapCard } from '@/components/HeatmapCard';
import { MoodLine, Ring, RoomBars, StatPill, StreakDots, WeekBars } from '@/components/charts';
import { MokaWeekCard, MoodWeekCard } from '@/components/MokaReport';
import { MokaMascot } from '@/components/MokaMascot';
import { Appear, Squish } from '@/components/motion';
import { useTabTour } from '@/components/useTabTour';
import { Bar, Btn, Card, SecHead, Screen, T, TitleBar, Chevron } from '@/components/ui';
import { ROOM_EMOJI } from '@/domain/constants';
import { allTasks, doneToday, homeScore } from '@/domain/logic';
import { DAILY_XP_CAP, MOKA_STATS, mokaLevel, mokaTitle, statLevel } from '@/domain/mokaLevel';
import { dayKey, freezesUsed, progressOf } from '@/domain/play';
import { limits } from '@/domain/premium';
import { gKey, goalMet, goalPct, readMin, readStreak } from '@/domain/growth';
import { dayBars, monthDots, moodLineOf, moodSeries, roomScores, weekLine } from '@/domain/stats';
import { extrasUnlocked } from '@/lib/events';
import { useNow } from '@/hooks/useNow';
import { bestStreak, weekGoal } from '@/domain/ramp';
import { TYPES } from '@/domain/kisilik';
import { usePersona } from '@/profile/usePersona';
import { usePurchases } from '@/purchases/PurchasesProvider';
import { useStore } from '@/store/AppStore';
import { radius, useColors, elevation, fonts } from '@/theme';

const NAVY = '#283044';

/**
 * Gelişim sekmesi (docs/skeleton-v3.md): yüzeyde dört sayı, altında tatlı grafikler.
 * Her grafiğin altında Moka'nın kısa, suçlamayan yorumu.
 */
const TOUR = [
  { key: 'hero', pose: 'happy', text: 'Selam, ben Moka! Burası Gelişim: küçük adımların burada büyür.' },
  { key: 'moka', pose: 'cheers', text: 'Moka seviyen ve becerilerin. İş yaptıkça deneyim kazanırsın.' },
  { key: 'hafta', pose: 'cozy_plant', text: 'Haftalık işlerin ve seri takvimin. Seriyi bozma, ev büyüsün.' },
  { key: 'ruh', pose: 'love', text: 'Ruh halin ve oda puanların da burada. Hadi başlayalım!' },
] as const;

export default function Gelisim() {
  const c = useColors();
  const router = useRouter();
  const now = useNow();
  const { state: S } = useStore();
  const { premium } = usePurchases();
  const { disc } = usePersona();
  const tipe = disc ? TYPES[disc.type] : null;
  const hp = progressOf(S.play, now);
  const best = bestStreak(S.play);
  const wk = weekGoal(S, now);
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
  const ml = mokaLevel(S.play.moka);
  const pose = week >= 10 ? 'party' : week ? 'thumbs_up' : 'sipping';
  // Yetenek satırına dokununca kısa açıklama açılır (nasıl artar + Moka'nın notu).
  const [openStat, setOpenStat] = useState<string | null>(null);

  // Sekmeye her dönüşte grafikler sıfırdan yeniden yükselir.
  const [rk, setRk] = useState(0);
  useFocusEffect(useCallback(() => { setRk(k => k + 1); }, []));

  const tour = useTabTour('gelisim', [...TOUR]);
  const layout = useTabLayout('gelisim');
  const blk: Record<string, ReactNode> = {
    hero: <>
      <View {...tour.mark('hero')}><Appear index={1} style={[st.hero, { backgroundColor: c.surface, shadowColor: c.shadow }]}>
        <MokaMascot pose={pose} size="sm" showBubble={false} />
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <T v="bold">{week ? `Bu hafta ${week} iyilik` : 'Yeni bir hafta'}</T>
          <T v="small" numberOfLines={3}>{weekLine(bars)}</T>
        </View>
      </Appear></View>
</>,
    tip: <>
      <Appear index={2}>
        <View style={[st.hero, { backgroundColor: tipe?.bg ?? c.surface, shadowColor: c.shadow }]}>
          {tipe && <Image source={tipe.img} style={{ width: 72, height: 72 }} resizeMode="contain" accessibilityIgnoresInvertColors />}
          <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
            <T v="tiny" style={{ color: NAVY, opacity: 0.7 }}>Senin tipin</T>
            <T v="bold" style={{ color: NAVY }}>{tipe ? tipe.name : 'Henüz test çözülmedi'}</T>
            {tipe ? <T v="small" numberOfLines={3} style={{ color: NAVY }}>{tipe.says}</T> : <T v="small">Moka seni tanısın, sana göre öneri yapsın.</T>}
            <Squish onPress={() => router.push('/taniyalim')} accessibilityRole="button" style={{ alignSelf: 'flex-start', backgroundColor: NAVY, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8, marginTop: 4 }}>
              <T v="small" style={{ color: '#EBF5EE', fontFamily: fonts.bodyBlack }}>{tipe ? 'Testi tekrar çöz' : 'Testi çöz'}</T>
            </Squish>
          </View>
        </View>
      </Appear>
</>,
    buyume: <>
      <Appear index={2}>
        <Squish onPress={() => router.push('/buyume')} accessibilityRole="link" accessibilityLabel="Kendini geliştir" style={[st.hero, { backgroundColor: c.sageSoft, shadowColor: c.shadow }]}>
          <Ring pct={goalPct(S.play.growth, gKey(now))} size={64} stroke={9} color={c.sage} />
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <T v="bold">📚 Kendini geliştir</T>
            <T v="small" numberOfLines={2}>
              {goalMet(S.play.growth, gKey(now))
                ? `Okuma hedefi tamam${readStreak(S.play.growth, now) > 1 ? ` · 🔥 ${readStreak(S.play.growth, now)} gün` : ''}`
                : `${readMin(S.play.growth, gKey(now))}/${S.play.growth.goalMin} dk · Moka bugün bir öneri bıraktı`}
            </T>
          </View>
        </Squish>
      </Appear>
</>,
    moka: <>
      <View {...tour.mark('moka')}><Card index={2}>
        <SecHead title={`Moka seviye ${ml.level}`} h="h3" right={mokaTitle(ml.level)} />
        <Bar value={ml.pct / 100} />
        <T v="tiny">Sonraki seviyeye {ml.need - ml.into} exp</T>
        {MOKA_STATS.map(m => {
          const sl = statLevel(S.play.moka.xp[m.id]);
          const open = openStat === m.id;
          const todayXp = S.play.moka.today.day === dayKey(now) ? S.play.moka.today.xp[m.id] : 0;
          return (
            <Squish
              key={m.id}
              onPress={() => setOpenStat(open ? null : m.id)}
              accessibilityRole="button"
              accessibilityState={{ expanded: open }}
              accessibilityLabel={`${m.name}: ${m.hint}`}
              style={[st.stat, { backgroundColor: c.surface2 }]}
            >
              <View style={st.statHead}>
                <T v="bold" style={{ flex: 1 }}>{`${m.emoji} ${m.name} · sv. ${sl.level}`}</T>
                <View style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}><Chevron color={c.muted} size={16} dir="down" /></View>
              </View>
              <Bar value={sl.pct / 100} />
              <T v="tiny">{m.hint}</T>
              <T v="tiny">{`Bugün ${todayXp}/${DAILY_XP_CAP[m.id]} exp`}</T>
              {open && (
                <View style={{ gap: 6, paddingTop: 4 }}>
                  <T v="small">{m.why}</T>
                  <T v="tiny" style={{ fontStyle: 'italic' }}>{`💛 ${m.care}`}</T>
                </View>
              )}
            </Squish>
          );
        })}
        {extrasUnlocked(S.play.days.length, now) && <Btn kind="primary" label="🍅 Odaklan (Pomodoro)" block onPress={() => router.push('/odak')} />}
      </Card></View>
</>,
    halkalar: <>
      <Appear key={`r${rk}`} index={2} style={st.rings}>
        <View style={[st.ringCard, { backgroundColor: c.surface }]}>
          <Ring pct={todayPct} color={c.peach} label="bugün" size={104} />
          <T v="tiny">{doneN}/{doneN + dueN} iş</T>
        </View>
        <View style={[st.ringCard, { backgroundColor: c.surface }]}>
          <Ring pct={score} color={c.sage} label="ev puanı" size={104} />
          <T v="tiny">{week || doneN ? 'rutinlerin tazeliği' : 'ilk işini yapınca başlar'}</T>
        </View>
      </Appear>
</>,
    seri: <>
      <Appear key={`p${rk}`} index={3} style={st.pills}>
        <StatPill emoji="🔥" n={hp.streak} label="gün seri" tint={c.peachSoft} />
        <StatPill emoji="📅" n={S.play.days.length} label="toplam gün" tint={c.lavenderSoft} />
        <StatPill emoji="🏅" n={Math.max(best, hp.streak)} label="en iyi seri" tint={c.sageSoft} />
      </Appear>
</>,
    bars: <>
      <View {...tour.mark('hafta')}><Card index={4}>
        <SecHead title="Bu hafta" h="h3" right={`${week} iş`} />
        <WeekBars key={`w${rk}`} bars={bars} />
      </Card></View>
</>,
    takvim: <>
      <Card index={5}>
        <SecHead title="Seri takvimi" h="h3" right={`❄️ ${freezeLeft}/${lim.freezes}`} />
        <T v="small">{`Bu hafta hedefin ${wk.goal} gün: ${Math.min(wk.done, wk.goal)}/${wk.goal} ✓ Toplam ${S.play.days.length} günün hiç silinmez.`}</T>
        <StreakDots key={`s${rk}`} dots={monthDots(S.play, now)} />
        <T v="tiny" style={{ textAlign: 'center' }}>🔥 iş yapılan gün · ❄️ dondurma ile korunan gün</T>
      </Card>
</>,
    isi: <>
      <HeatmapCard key={`h${rk}`} state={S} now={now} />
</>,
    mokahafta: <>
      <MokaWeekCard index={5} />

      <MoodWeekCard index={6} />
</>,
    ruh: <>
      <View {...tour.mark('ruh')}><Card index={6}>
        <SecHead title="Ruh hali" h="h3" right="14 gün" />
        <MoodLine key={`m${rk}`} points={mood} />
        <T v="small">{moodLineOf(mood)}</T>
      </Card></View>
</>,
    odabars: <>
      {rooms.length > 0 && (
        <Card index={7}>
          <SecHead title="Odalar" h="h3" right={`%${score}`} />
          <RoomBars key={`b${rk}`} rooms={rooms} emoji={ROOM_EMOJI} />
        </Card>
      )}
</>,
    linkler: <>
      <Appear index={8} style={st.links}>
        <LinkTile emoji="🗓️" label="Haftam" sub="Paylaşılabilir kart" tint={c.roseSoft} onPress={() => router.push('/hafta')} />
        <LinkTile emoji="🌤️" label="Günüm" sub="Moka ile paylaş" tint={c.roseSoft} onPress={() => router.push('/gunum')} />
        <LinkTile emoji="🏆" label="Sıralama" sub="Ev puanı" tint={c.peachSoft} onPress={() => router.push('/siralama' as Href)} />
        {extrasUnlocked(S.play.days.length, now) && <LinkTile emoji="🎬" label="Evimin hikâyesi" sub="Baştan bugüne" tint={c.lavenderSoft} onPress={() => router.push('/hikaye')} />}
      </Appear>
</>,
  };
  return (
    <Screen header={false} tab tone="sky" {...tour.screen}>
      <TitleBar title="Gelişim" sub="Küçük adımların, büyüyen evin" after={<EditTabBtn tab="gelisim" />} />

      {layout.ids.map(id => <Fragment key={id}>{blk[id]}</Fragment>)}
      {tour.node}
    </Screen>
  );
}

function LinkTile({ emoji, label, sub, tint, onPress }: { emoji: string; label: string; sub: string; tint: string; onPress: () => void }) {
  return (
    <Squish onPress={onPress} accessibilityRole="link" accessibilityLabel={label} style={[st.link, { backgroundColor: tint }]}>
      <T style={{ lineHeight: 36, fontSize: 28 }}>{emoji}</T>
      <T v="bold" numberOfLines={1}>{label}</T>
      <T v="tiny" numberOfLines={1}>{sub}</T>
    </Squish>
  );
}

const st = StyleSheet.create({
  stat: { gap: 6, borderRadius: radius.tile, padding: 12, ...elevation.md },
  statHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  hero: {
    flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: radius.card, padding: 14,
    shadowOffset: { width: 0, height: 8 }, shadowOpacity: 1, shadowRadius: 18, elevation: 3,
  },
  rings: { flexDirection: 'row', gap: 12 },
  ringCard: { flex: 1, alignItems: 'center', gap: 6, borderRadius: radius.card, paddingVertical: 16, ...elevation.md },
  pills: { flexDirection: 'row', gap: 10 },
  links: { flexDirection: 'row', gap: 12 },
  link: { flex: 1, borderRadius: radius.card, padding: 16, gap: 2, ...elevation.md },
});
