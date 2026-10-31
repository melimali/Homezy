import { useRouter, type Href } from 'expo-router';
import { Animated, Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';

import { displayName, useAuth } from '@/auth/AuthProvider';

import { House3D } from '@/components/House3D';
import { LofiPlayerModal } from '@/components/LofiPlayerModal';
import { MokaMascot } from '@/components/MokaMascot';
import { LevelUpPeek } from '@/components/LevelUpPeek';
import { PremiumEndedCard, StreakMoment } from '@/components/PaywallMoments';
import { Fade, SceneImage } from '@/components/SceneImage';
import { RoomGrid } from '@/components/RoomGrid';
import { TaskRow } from '@/components/TaskRow';
import { WelcomeBack } from '@/components/WelcomeBack';
import { MoodCheckin } from '@/components/MoodCheckin';
import { HomeMokaAnimation } from '@/components/HomeMokaAnimation';
import { checkinOf, dayPlan } from '@/domain/mood';
import { Appear, Float, Squish } from '@/components/motion';
import { Bar, Btn, Card, EmptyMsg, IconBtn, SecHead, Screen, T } from '@/components/ui';
import { ROOM_POSE, type MokaPose } from '@/constants/moka';
import { allTasks, doneToday as isDoneToday, greet, greeting, notifs } from '@/domain/logic';
import { sfx } from '@/lib/sfx';
import { AdBanner } from '@/ads/AdBanner';
import { addDays, BUILT, dayKey, freezesUsed, houseLine, nextStage, progressOf } from '@/domain/play';
import { limits, themeFor } from '@/domain/premium';
import { CALM_POSES, mokaTip } from '@/domain/moka';
import { FLOWER, MOOD_NAME, growth, houseMood, moodLine, personaOf } from '@/domain/garden';
import { HOME_MOKA_BAKING_SCENE, HOME_MOKA_KITCHEN_SCENE, HOME_MOKA_SEATED, HOME_MOKA_STUDY_SCENE, HOME_SOFA_BACKGROUND } from '@/constants/curated-scenes';
import type { HomeMokaPose } from '@/constants/home-moka';
import { usePurchases } from '@/purchases/PurchasesProvider';
import { useMokaState } from '@/hooks/useMokaState';
import { useNow } from '@/hooks/useNow';
import { useStore } from '@/store/AppStore';
import { fonts, radius, space, useColors } from '@/theme';
import type { AppState, HouseTheme, TaskRef } from '@/domain/types';

export default function Home() {
  const c = useColors();
  const router = useRouter();
  const { state: S } = useStore();
  const [houseOpen, setHouseOpen] = useState(false);
  const [lofiOpen, setLofiOpen] = useState(false);
  const now = useNow();
  const insets = useSafeAreaInsets();
  const { status, user } = useAuth();
  const name = status === 'account' ? displayName(user) : null;
  const all = allTasks(S, now);
  // Ana ekranda sadece en acil üç iş; gerisi Bugün sekmesinde.
  const due = all.filter(x => x.s.k !== 'ok').sort((a, b) => a.s.diff - b.s.diff);
  const lastDone = all.filter(x => isDoneToday(x.t, now)).sort((a, b) => (b.t.last ?? 0) - (a.t.last ?? 0))[0];
  const toToday = () => router.navigate('/bugun');
  const hp = progressOf(S.play, now);
  // Günün mod cevabı varsa selamın altındaki cümle ona göre.
  const line = dayPlan(checkinOf(S.play, now))?.hello ?? greeting(new Date(now)).line;
  const mood = houseMood(hp, S.play, S.mode, now);
  const moka = useMokaState();
  // Moka günün cümlesini de söyler; ev sakinse cümleye uyan pozu alır.
  const tip = mokaTip(now);
  const pose = CALM_POSES.includes(moka.pose) ? tip.pose : moka.pose;
  const taskPose = (ref?: TaskRef): MokaPose | undefined => {
    if (!ref) return undefined;
    const room = S.rooms[ref.rid];
    if (!room) return 'maintenance';
    if (room.type === 'mutfak') {
      return /yemek|pişir|hazırla|fırın|ocak|kahvaltı|hamur|tarif/.test(ref.t.name.toLocaleLowerCase('tr-TR')) ? 'baking' : 'dishes';
    }
    if (room.type === 'calisma') return 'laptop';
    return ROOM_POSE[room.type];
  };
  const homePose = (candidate?: MokaPose): HomeMokaPose => {
    switch (candidate) {
      case 'panicked': case 'laptop': case 'baking': case 'dishes': case 'thumbs_up': case 'happy': return candidate;
      default: return 'happy';
    }
  };
  const heroPose: HomeMokaPose = S.mode
    ? homePose(moka.pose)
    : due.length >= 5
      ? 'panicked'
      : lastDone
        ? homePose(taskPose(lastDone) ?? 'thumbs_up')
        : due.length >= 3
          ? 'panicked'
          : homePose(taskPose(due[0]) ?? pose);
  const heroScene = heroPose === 'laptop'
    ? HOME_MOKA_STUDY_SCENE
    : heroPose === 'baking'
      ? HOME_MOKA_BAKING_SCENE
      : heroPose === 'dishes'
        ? HOME_MOKA_KITCHEN_SCENE
        : HOME_SOFA_BACKGROUND;
  const showSofaMoka = heroPose !== 'laptop' && heroPose !== 'baking' && heroPose !== 'dishes';
  const { premium } = usePurchases();
  const lim = limits(premium.active);
  const freezeLeft = Math.max(0, lim.freezes - freezesUsed(S.play, now));
  // Pazar ve pazartesi "haftalık özetin hazır" şeridi; kart açılınca o hafta için kalkar.
  const wd = new Date(now).getDay();
  const weekReady = (wd === 0 || wd === 1) && !(S.play.weekSeen && S.play.weekSeen >= addDays(dayKey(now), wd === 0 ? 0 : -1));

  const doneN = all.filter(x => isDoneToday(x.t, now)).length;
  const bell = notifs(S, now).length;
  const next = nextStage(hp.level);
  const warn = hp.idle > 0 || (!hp.today && hp.level > 0);

  return (
    <Screen header={false} tab tone="peach">
      {/* Tasarımdaki gibi: ekranın üstünü kaplayan sahne, üstünde selam ve zil, altında Moka kartı. */}
      <View style={styles.heroWrap}>
        <SceneImage source={heroScene} ratio={0.95} style={{ marginTop: -insets.top - 12 }}>
          <Fade edge="top" color={c.bg} size="45%" to={0.95} />
          <Fade edge="bottom" color={c.bg} size="38%" />
          {showSofaMoka && <HomeMokaAnimation />}
          <Appear style={[styles.heroTop, { paddingTop: insets.top + 18 }]}>
            {/* Moka'nın konuşma baloncuğu */}
            <View style={styles.speechBubble}>
              <View style={[StyleSheet.absoluteFill, { backgroundColor: c.surface, borderRadius: radius.card }]} />
              <View style={[styles.bubbleTail, { backgroundColor: c.surface }]} />
              <T v="h1" style={{ fontSize: 23, lineHeight: 28 }}>{greet(new Date(now), name)}</T>
              <T v="bold" style={[styles.heroLead, { color: c.ink, fontSize: 13.5, lineHeight: 18 }]}>
                {due.length ? `Bugün ${due.length} iş var. ${line}` : `Bugün her şey yolunda. ${line}`}
              </T>
            </View>
            <IconBtn icon="🔔" label="Bildirimler" badge={bell} onPress={() => router.push('/bildirimler')} />
          </Appear>
        </SceneImage>

        <Appear index={1} style={[styles.mokaCard, { backgroundColor: c.surface }]}>
          <View style={styles.mokaRow}>
            <Squish quiet onPress={() => { sfx('tap'); moka.next(); }} accessibilityRole="button" accessibilityLabel={`Moka: ${moka.title}. ${moka.message}`} style={styles.mokaTap}>
              <View style={[styles.mokaIcon, { backgroundColor: c.surface2 }]}>
                <Image source={HOME_MOKA_SEATED} style={styles.mokaImg} resizeMode="contain" accessibilityIgnoresInvertColors />
              </View>
              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <T v="bold" numberOfLines={1}>{moka.title}</T>
                <T v="small" numberOfLines={3} style={{ color: c.ink, opacity: 0.8 }}>{moka.message}</T>
              </View>
            </Squish>
            <IconBtn icon={<Text style={[styles.chev, { color: c.ink }]}>›</Text>} label="Bugünün işleri" size={34} onPress={toToday} style={{ backgroundColor: c.surface2 }} />
          </View>
          <View style={styles.mokaFoot}>
            <Bar value={doneN / Math.max(1, doneN + due.length)} color={c.accent} height={7} style={{ flex: 1 }} />
            <T v="tiny">{doneN}/{doneN + due.length}</T>
          </View>
          <T v="tiny" style={{ color: c.hi }} numberOfLines={3}>💬 {tip.text}</T>
        </Appear>
      </View>

      <Card bare index={2}>
        <SecHead title="Sıradaki işler" h="h3" right={due.length > 3 ? (
          <Squish onPress={toToday} accessibilityRole="link" hitSlop={8}><T v="small">+{due.length - 3} ›</T></Squish>
        ) : undefined} />
        <View>
          {due.slice(0, 3).map((x, i) => <TaskRow key={x.t.id} t={x.t} rid={x.rid} list={x.list} showRoom first={i === 0} />)}
        </View>
        {!due.length && <EmptyMsg pose="sparkling_complete">Bugünlük her şey tamam. Biraz dinlen.</EmptyMsg>}
      </Card>

      {weekReady && (
        <Squish onPress={() => router.push('/hafta')} style={[styles.week, { backgroundColor: c.accentSoft }]}>
          <Text style={{ fontSize: 26 }}>📅</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.weekT, { color: c.ink }]}>Haftalık özetin hazır</Text>
            <Text style={[styles.statL, { color: c.muted }]}>Bu hafta neler yaptın? Bak ve paylaş</Text>
          </View>
          <Text style={[styles.weekT, { color: c.muted }]}>›</Text>
        </Squish>
      )}

      {/* Odalar sekmesi yok; odalar evin içinde (docs/skeleton-v3.md). */}
      <View style={{ gap: 10 }}>
        <SecHead title="Odalarım" h="h3" right={
          <Squish onPress={() => router.push('/plan')} accessibilityRole="link" accessibilityLabel="Ev planını düzenle" hitSlop={8}>
            <T v="small">✏️ Planı düzenle</T>
          </Squish>
        } />
        <RoomGrid state={S} now={now} start={3} />
      </View>

      <View style={{ gap: 12 }}>
        <SecHead title="Evim" h="h3" right={S.others.length > 0 ? (
          <Squish onPress={() => router.push('/evler')} accessibilityRole="button" hitSlop={8}>
            <T v="small">🏡 {S.homeName} ⌄</T>
          </Squish>
        ) : undefined} />
        <House3D state={S} onPressHouse={() => setHouseOpen(true)} zoom={1.08} labels={false} now={now} build={hp} theme={themeFor(S.settings.theme, premium.active)} mood={mood} />
        {hp.level >= 5 && (
          <Text style={[styles.mood, { color: c.muted }]}>
            <Text style={{ color: c.ink }}>🏠 {MOOD_NAME[mood]} · </Text>“{moodLine(mood, personaOf(S.play))}”
          </Text>
        )}
        <Squish onPress={() => router.push('/hikaye')} accessibilityLabel={houseLine(hp)} style={[styles.nextCard, { backgroundColor: warn ? c.lateSoft : c.surface }]}>
          <View style={[styles.nextIcon, { backgroundColor: c.surface2 }]}>
            <Text style={{ fontSize: 24 }}>{warn ? '🏚️' : next?.emoji ?? '🏡'}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            {warn || !next ? (
              <T v="small" style={{ color: warn ? c.late : c.ink }}>{houseLine(hp)}</T>
            ) : (
              <>
                <T v="tiny">Sıradaki · 🔥 {hp.streak} gün seri</T>
                <T v="bold" numberOfLines={1}>{next.name}</T>
              </>
            )}
          </View>
          <Text style={[styles.chev, { color: c.muted }]}>›</Text>
        </Squish>
        {warn && hp.level > 0 && (
          <T v="tiny" style={{ textAlign: 'center' }}>❄️ Bu ay {freezeLeft}/{lim.freezes} seri dondurma hakkın var. Bir gün kaçırırsan evin yıkılmaz.</T>
        )}
      </View>

      {houseOpen && (
        <HouseViewer
          state={S}
          build={hp}
          theme={themeFor(S.settings.theme, premium.active)}
          now={now}
          onClose={() => setHouseOpen(false)}
        />
      )}

      <View style={{ gap: 12 }}>
        <SecHead title="Moka ile keyif" h="h3" />
        <Appear index={4} style={styles.quick}>
          <Quick i={0} emoji="🌷" label="Bahçe" sub={gardenSub(S, now)} tint={c.sageSoft} onPress={() => router.push('/bahce' as Href)} />
          <Quick i={1} emoji="🎵" label="Plak" sub="Lo-fi" tint={c.lavenderSoft} onPress={() => setLofiOpen(true)} />
          <Quick i={2} emoji="📔" label="Günlük" sub="Bugün" tint={c.roseSoft} onPress={() => router.push('/gunluk')} />
          <Quick i={3} emoji="🏃" label="Spor" sub="Hareket" tint={c.peachSoft} onPress={() => router.push('/spor')} />
        </Appear>
      </View>
      <LofiPlayerModal open={lofiOpen} onClose={() => setLofiOpen(false)} />

      <PremiumEndedCard />
      <AdBanner />

      <Celebrate level={hp.level} />
      <StreakMoment />
      <LevelUpPeek />
      <WelcomeBack />
      <MoodCheckin />
    </Screen>
  );
}

function HouseViewer({
  state,
  build,
  theme,
  now,
  onClose,
}: {
  state: Parameters<typeof House3D>[0]['state'];
  build: { level: number; idle: number };
  theme: HouseTheme;
  now: number;
  onClose: () => void;
}) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const [zoom] = useState(() => new Animated.Value(0.72));
  const [opacity] = useState(() => new Animated.Value(0));
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(zoom, { toValue: 1, friction: 8, tension: 55, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
  }, [opacity, zoom]);

  const close = () => {
    if (closing) return;
    setClosing(true);
    Animated.parallel([
      Animated.timing(zoom, { toValue: 0.72, duration: 190, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 160, useNativeDriver: true }),
    ]).start(onClose);
  };

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={close}>
      <View style={[styles.viewer, { backgroundColor: c.bg }]}>
        <Animated.View style={[styles.viewerScene, { opacity, transform: [{ scale: zoom }] }]}>
          <View style={styles.viewerModel}>
            <House3D state={state} now={now} build={build} theme={theme} zoom={1.2} bleed labels={false} />
          </View>
        </Animated.View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Evi kapat"
          onPress={close}
          hitSlop={12}
          style={[styles.viewerClose, { top: insets.top + 12, backgroundColor: c.surface }]}
        >
          <Text style={[styles.viewerCloseText, { color: c.ink }]}>×</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

/** Bahçe kısayolunun alt satırı: açan çiçek ya da en çok büyüyen tohum. */
function gardenSub(S: AppState, now: number) {
  const plots = S.play.garden.plots;
  if (plots.some(p => p.bloomed)) return 'Çiçek açtı 🌸';
  const best = plots
    .filter(p => !p.bloomed && FLOWER[p.flower])
    .map(p => ({ f: FLOWER[p.flower]!, g: growth(S.play, p, now) }))
    .sort((a, b) => b.g / b.f.grow - a.g / a.f.grow)[0];
  return best ? `%${Math.round((best.g / best.f.grow) * 100)} büyüdü` : 'Tohum ek';
}

/** Ev ilk kez bitince (7. gün) bir kere kutlama. */
function Celebrate({ level }: { level: number }) {
  const c = useColors();
  const { state: S, update } = useStore();
  const close = () => void update(D => void (D.play.celebrated = Math.max(D.play.celebrated, BUILT)));
  const show = level >= BUILT && S.play.celebrated < BUILT;
  useEffect(() => {
    if (show) sfx('party');
  }, [show]);
  if (!show) return null;
  return (
    <Modal transparent animationType="fade" onRequestClose={close}>
      <View style={[styles.modalBg, { backgroundColor: c.shadow }]}>
        <View style={[styles.modal, { backgroundColor: c.surface }]}>
          <MokaMascot pose="party" size="lg" showBubble={false} style={styles.modalMoka} />
          <T v="h1" style={{ textAlign: 'center' }}>Tebrikler, evin inşa edildi!</T>
          <T v="lead" style={{ textAlign: 'center', marginTop: 0 }}>
            7 gün boyunca her gün evine vakit ayırdın. Seriyi sürdür, önümüzdeki ay evin daha da güzelleşsin 🌷
          </T>
          <Btn kind="primary" label="Yaşasın!" onPress={close} block />
        </View>
      </View>
    </Modal>
  );
}

function Quick({ emoji, label, sub, tint, onPress, i }: { emoji: string; label: string; sub: string; tint: string; onPress: () => void; i: number }) {
  const c = useColors();
  return (
    <Squish onPress={onPress} accessibilityLabel={label} style={[styles.q, { backgroundColor: tint }]}>
      <Float amp={3} dur={1800 + i * 200} delay={i * 150}>
        <Text style={{ fontSize: 30 }}>{emoji}</Text>
      </Float>
      <Text style={{ fontFamily: fonts.bodyBlack, fontSize: 14, color: c.ink }}>{label}</Text>
      <Text numberOfLines={1} style={{ fontFamily: fonts.bodyBold, fontSize: 11, color: c.muted }}>{sub}</Text>
    </Squish>
  );
}

const styles = StyleSheet.create({
  heroWrap: { marginHorizontal: -space.screen },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, paddingHorizontal: space.screen - 8 },
  speechBubble: { flexShrink: 1, alignSelf: 'flex-start', borderRadius: radius.card, paddingVertical: 10, paddingHorizontal: 14, overflow: 'visible' },
  bubbleTail: { position: 'absolute', bottom: -6, left: 32, width: 14, height: 14, borderRadius: 3, transform: [{ rotate: '45deg' }] },
  heroLead: { fontSize: 15, lineHeight: 21, marginTop: 2, maxWidth: 250 },
  mokaCard: {
    marginTop: -58, marginHorizontal: 18, borderRadius: radius.tile, padding: 16, gap: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.7)',
    shadowColor: '#B9805F', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.14, shadowRadius: 20, elevation: 4,
  },
  mokaRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mokaTap: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 12 },
  mokaIcon: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  mokaImg: { width: 58, height: 58, marginTop: 8 },
  mokaFoot: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  chev: { fontFamily: fonts.bodyBlack, fontSize: 22, lineHeight: 24 },
  statL: { fontFamily: fonts.bodyBold, fontSize: 12.5 },
  nextCard: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: radius.tile, paddingVertical: 14, paddingHorizontal: 16 },
  nextIcon: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  quick: { flexDirection: 'row', justifyContent: 'space-between' },
  week: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: radius.card, paddingVertical: 18, paddingHorizontal: 20 },
  weekT: { fontFamily: fonts.bodyBlack, fontSize: 16 },
  mood: { fontFamily: fonts.bodyBold, fontSize: 13.5, lineHeight: 19, textAlign: 'center', paddingHorizontal: 8 },
  q: { flex: 1, alignItems: 'center', gap: 2, borderRadius: radius.tile, paddingVertical: 14, paddingHorizontal: 4 },
  modalBg: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalMoka: { marginTop: -100 },
  modal: { borderRadius: 40, padding: 28, paddingTop: 0, marginTop: 90, gap: 16, alignItems: 'center', maxWidth: 400, width: '100%' },
  viewer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  viewerScene: { width: '100%', paddingHorizontal: 8 },
  viewerModel: { width: '100%' },
  viewerClose: { position: 'absolute', right: 18, width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  viewerCloseText: { fontSize: 32, lineHeight: 36, fontFamily: fonts.bodyBold },
});
