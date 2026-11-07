import { type Href } from 'expo-router';
import { useRouter } from '@/lib/nav';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';


import { House3D } from '@/components/House3D';
import { HouseFloors } from '@/components/HouseFloors';
import { LofiPlayerModal } from '@/components/LofiPlayerModal';
import { MokaMascot } from '@/components/MokaMascot';
import { LevelUpPeek } from '@/components/LevelUpPeek';
import { PremiumEndedCard, StreakMoment } from '@/components/PaywallMoments';
import { Fade } from '@/components/SceneImage';
import { RoomGrid } from '@/components/RoomGrid';
import { MokaSprite, type SpriteAnim } from '@/components/MokaSprite';
import { MokaReact } from '@/components/MokaReact';
import { TaskRow } from '@/components/TaskRow';
import { WelcomeBack } from '@/components/WelcomeBack';
import { FirstWelcome, NotifAsk } from '@/components/FirstRun';
import { StepModal } from '@/components/StepModal';
import { useTabTour } from '@/components/useTabTour';
import { useStep } from '@/lib/firstRun';
import { MoodCheckin } from '@/components/MoodCheckin';
import { checkinOf, dayPlan } from '@/domain/mood';
import { Appear, Squish } from '@/components/motion';
import { Bar, Btn, Card, EmptyMsg, IconBtn, SecHead, Screen, T } from '@/components/ui';
import { CATS, catOf, disciplineLevel, pickForLevel, type Cat } from '@/domain/discipline';
import { allTasks, doneToday as isDoneToday, greet, greeting, notifs } from '@/domain/logic';
import { extrasUnlocked } from '@/lib/events';
import { sfx } from '@/lib/sfx';
import { AdBanner } from '@/ads/AdBanner';
import { addDays, BUILT, dayKey, houseLine, nextStage, progressOf } from '@/domain/play';
import { themeFor } from '@/domain/premium';
import { FLOWER, growth, houseMood } from '@/domain/garden';
import { HeroMoka } from '@/components/HeroMoka';
import { sessionHeroScene } from '@/domain/heroScenes';
import { usePurchases } from '@/purchases/PurchasesProvider';
import { useMokaState } from '@/hooks/useMokaState';
import { useNow } from '@/hooks/useNow';
import { useTranslation } from '@/i18n/i18n';
import { ownTitle, useHomeWord, useName } from '@/profile/useName';
import { useStore } from '@/store/AppStore';
import { fonts, warmShadow, radius, space, useColors } from '@/theme';
import type { AppState, HouseTheme } from '@/domain/types';

const TOUR = [
  { key: 'hero', pose: 'happy', text: 'Selam, ben Moka! Burası evin: her gün buradan başlarız.' },
  { key: 'stats', pose: 'cheers', text: 'Serin, puanın ve ev seviyen. Her gün bir iş yaparsan evin büyür.' },
  { key: 'isler', pose: 'cozy_plant', text: 'Bugünün işleri burada. Dokun, yap, işaretle.' },
  { key: 'evim', pose: 'love', text: 'Evim: evini buradan düzenle, odalarına gir. Hadi başlayalım!' },
] as const;

export default function Home() {
  const c = useColors();
  const router = useRouter();
  const { state: S } = useStore();
  const [houseOpen, setHouseOpen] = useState(false);
  const [lofiOpen, setLofiOpen] = useState(false);
  const now = useNow();
  const insets = useSafeAreaInsets();
  const name = useName();
  const homeWord = useHomeWord();
  const { lang } = useTranslation();
  const all = allTasks(S, now);
  // Ana ekranda sadece en acil üç iş; gerisi Bugün sekmesinde.
  const due = all.filter(x => x.s.k !== 'ok').sort((a, b) => a.s.diff - b.s.diff);
  const toToday = () => router.navigate('/bugun');
  const hp = progressOf(S.play, now);
  // Günün mod cevabı varsa selamın altındaki cümle ona göre.
  const line = dayPlan(checkinOf(S.play, now))?.hello ?? greeting(new Date(now)).line;
  const mood = houseMood(hp, S.play, S.mode, now);
  const moka = useMokaState();
  // Ana ekran sahnesi: 10 sabit sahneden biri, uygulama açılışında rastgele; oturum boyunca değişmez.
  const [heroScene] = useState(sessionHeroScene);
  const { premium } = usePurchases();
  // Pazar ve pazartesi "haftalık özetin hazır" şeridi; kart açılınca o hafta için kalkar.
  const wd = new Date(now).getDay();
  const weekReady = (wd === 0 || wd === 1) && !(S.play.weekSeen && S.play.weekSeen >= addDays(dayKey(now), wd === 0 ? 0 : -1));

  const doneN = all.filter(x => isDoneToday(x.t, now)).length;
  const bell = notifs(S, now).length;
  const next = nextStage(hp.level);
  const lv = disciplineLevel(hp.streak);
  const shown = pickForLevel(due, lv);
  // Moka'nın hali: iş bitince kutlama, gece ya da hiç iş yokken uykulu, aksi hâlde mutlu.
  const hr = new Date(now).getHours();
  const spriteAnim: SpriteAnim = !due.length && doneN > 0 ? 'party' : hr >= 23 || hr < 6 || (!due.length && !doneN) ? 'sleepy' : 'happy';
  // Kırmızı/uyarı yok: ev geri gitmez, sadece dinlenir.
  const warn = !hp.today && hp.level > 0;

  const tour = useTabTour('ev', [...TOUR]);
  const mark = tour.mark;
  return (
    <Screen header={false} tab tone="peach" {...tour.screen}>
      {/* Tasarımdaki gibi: ekranın üstünü kaplayan sahne, üstünde selam ve zil, altında Moka kartı. */}
      <View style={styles.heroWrap} {...mark('hero')}>
        <HeroMoka scene={heroScene} ratio={0.8} reserveTop={insets.top + 140} marginTop={-insets.top - 12} below={<><Fade edge="top" color={c.bg} size="30%" to={0.9} /><Fade edge="bottom" color={c.bg} size="24%" /></>}>
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
        </HeroMoka>

        <Appear index={1} style={[styles.mokaCard, { backgroundColor: c.surface }]}>
          <View style={styles.mokaRow}>
            <Squish quiet onPress={() => { sfx('tap'); moka.next(); }} accessibilityRole="button" accessibilityLabel={`Moka: ${moka.title}. ${moka.message}`} style={styles.mokaTap}>
              <View style={[styles.mokaIcon, { backgroundColor: c.surface2 }]}>
                <MokaReact anim={spriteAnim} size={54} />
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
        </Appear>
      </View>

      {/* Üç küçük rakam: seri, puan, ev seviyesi. Dokununca ilgili ekran. */}
      <View {...mark('stats')}><Appear index={2} style={styles.stats}>
        <Stat emoji="🔥" value={String(hp.streak)} label="gün seri" tint={c.peachSoft} onPress={() => router.push('/hikaye')} />
        <Stat emoji="⭐" value={String(S.play.points)} label="puan" tint={c.sageSoft} onPress={() => router.push('/magaza' as Href)} />
        <Stat emoji="🏡" value={String(hp.level)} label="ev seviyesi" tint={c.lavenderSoft} onPress={() => router.push('/hikaye')} />
      </Appear></View>

      {!!S.settings.solo && S.rooms[S.settings.solo] && (
        <Squish onPress={() => router.push('/odalar')} accessibilityRole="button" style={[styles.week, { backgroundColor: c.accentSoft }]}>
          <Text style={{ fontSize: 22 }}>🚪</Text>
          <Text style={[styles.weekT, { color: c.ink, flex: 1 }]}>Tek oda modu: {S.rooms[S.settings.solo].name}</Text>
          <Text style={[styles.weekT, { color: c.muted }]}>Değiştir ›</Text>
        </Squish>
      )}
      {weekReady && (
        <Squish onPress={() => router.push('/hafta')} style={[styles.week, { backgroundColor: c.accentSoft }]}>
          <Text style={{ fontSize: 26 }}>🗓️</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.weekT, { color: c.ink }]}>Haftalık özetin hazır</Text>
            <Text style={[styles.statL, { color: c.muted }]}>Bu hafta neler yaptın? Bak ve paylaş</Text>
          </View>
          <Text style={[styles.weekT, { color: c.muted }]}>›</Text>
        </Squish>
      )}

      <View {...mark('isler')}><Card bare index={2}>
        <SecHead title="📋 Bugünün işleri" h="h3" right={due.length > shown.length ? (
          <Squish onPress={toToday} accessibilityRole="link" hitSlop={8}><T v="small">+{due.length - shown.length} ›</T></Squish>
        ) : undefined} />
        <View>
          {(['sabah', 'oda', 'ev'] as Cat[]).map(cat => {
            const rows = shown.filter(x => catOf(x) === cat);
            if (!rows.length) return null;
            return (
              <View key={cat}>
                <T v="bold" style={{ marginTop: 6 }}>{CATS[cat].title} <T v="tiny">· {CATS[cat].hint}</T></T>
                {rows.map((x, i) => <TaskRow key={x.t.id} t={x.t} rid={x.rid} list={x.list} showRoom first={i === 0} />)}
              </View>
            );
          })}
        </View>
        {!due.length && (doneN > 0 ? (
          <View style={{ alignItems: 'center', gap: 6 }}>
            <MokaSprite anim="party" size={120} />
            <T v="bold" style={{ textAlign: 'center' }}>{`Bugün iş kalmadı. ${doneN} işi bitirdin, harikasın! Biraz dinlen 🌿`}</T>
          </View>
        ) : <EmptyMsg pose="sparkling_complete">Bugünlük her şey tamam. Biraz dinlen.</EmptyMsg>)}
      </Card></View>

      <View {...mark('evim')}><Card index={3} style={styles.sec}>
        <SecHead title={`🏡 ${ownTitle(name, homeWord, 'Evim', lang)}`} h="h3" right={
          <View style={{ flexDirection: 'row', gap: 14 }}>
            <Squish onPress={() => router.push('/dekor' as Href)} accessibilityRole="button" accessibilityLabel="Evini kendine benzet" hitSlop={8}>
              <T v="small">🎨 Düzenle</T>
            </Squish>
            {S.others.length > 0 && (
              <Squish onPress={() => router.push('/evler')} accessibilityRole="button" hitSlop={8}>
                <T v="small">🏡 {S.homeName} ⌄</T>
              </Squish>
            )}
          </View>
        } />
        {/* Önizleme: sabit ölçek, kutudan taşmaz (büyütme sadece Evim ekranında). */}
        <View style={{ overflow: 'hidden', borderRadius: radius.tile }}>
          {hp.level < 1 && (
            <Squish
              onPress={() => router.push('/bugun' as Href)}
              accessibilityRole="button"
              accessibilityLabel="İlk işini yap"
              style={[styles.plot, { backgroundColor: c.surface }]}
            >
              <Text style={{ fontSize: 22 }}>🪵</Text>
              <View style={{ flex: 1, minWidth: 0 }}>
                <T v="bold">Arsa hazır</T>
                <T v="small">İlk işini yap, evin temeli atılsın.</T>
              </View>
              <Text style={[styles.chev, { color: c.muted }]}>›</Text>
            </Squish>
          )}
          <HouseFloors state={S} onPressHouse={() => setHouseOpen(true)} zoom={1.08} labels={false} now={now} build={hp} theme={themeFor(S.settings.theme, premium.active)} mood={mood} />
        </View>
        <Squish onPress={() => router.push('/hikaye')} accessibilityLabel={houseLine(hp)} style={[styles.nextCard, { backgroundColor: c.surface }]}>
          <View style={[styles.nextIcon, { backgroundColor: c.surface2 }]}>
            <Text style={{ fontSize: 24 }}>{warn ? '😴' : next?.emoji ?? '🏡'}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            {warn || !next ? (
              <T v="small">{houseLine(hp)}</T>
            ) : (
              <>
                <T v="tiny">Sıradaki · 🔥 {hp.streak} gün seri</T>
                <T v="bold" numberOfLines={1}>{next.name}</T>
              </>
            )}
          </View>
          <Text style={[styles.chev, { color: c.muted }]}>›</Text>
        </Squish>
      </Card></View>

      {/* Odalar sekmesi yok; odalar evin içinde (docs/skeleton-v3.md). */}
      <Card index={4} style={styles.sec}>
        <SecHead title="🚪 Odalarım" h="h3" right={
          <Squish onPress={() => router.push('/plan')} accessibilityRole="link" accessibilityLabel="Ev planını düzenle" hitSlop={8}>
            <T v="small">✏️ Planı düzenle</T>
          </Squish>
        } />
        <RoomGrid state={S} now={now} start={3} row />
      </Card>

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
        <SecHead title="Keyif köşesi" h="h3" />
        <Appear index={5} style={styles.quick}>
          <Quick i={0} emoji="🌷" label="Bahçe" sub={gardenSub(S, now)} tint={c.sageSoft} onPress={() => router.push('/bahce' as Href)} />
          <Quick i={1} emoji="🎵" label="Plak" sub="Lo-fi" tint={c.lavenderSoft} onPress={() => setLofiOpen(true)} />
          <Quick i={2} emoji="📔" label="Günlük" sub="Bugün" tint={c.roseSoft} onPress={() => router.push('/gunluk')} />
          {extrasUnlocked(S.play.days.length, now) && (
            <Quick i={3} emoji="🏃" label="Spor" sub="Hareket" tint={c.peachSoft} onPress={() => router.push('/spor')} />
          )}
        </Appear>
      </View>
      <LofiPlayerModal open={lofiOpen} onClose={() => setLofiOpen(false)} />

      <PremiumEndedCard />
      <AdBanner />

      <Celebrate level={hp.level} />
      <StreakMoment />
      {/* Ekranı kaplayan pencereler src/lib/firstRun.ts sırasıyla, biri kapanınca öbürü açılır. */}
      <FirstWelcome />
      <WelcomeBack />
      <MoodCheckin />
      <NotifAsk />
      <LevelUpPeek />
      {tour.node}
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
            <HouseFloors state={state} now={now} build={build} theme={theme} zoom={1.2} bleed pinchZoom labels={false} />
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
  const show = useStep('celebrate', level >= BUILT && S.play.celebrated < BUILT);
  useEffect(() => {
    if (show) sfx('party');
  }, [show]);
  if (!show) return null;
  return (
    <StepModal onClose={close}>
      {dismiss => (
        <View style={[styles.modal, { backgroundColor: c.surface }]}>
          <MokaMascot pose="party" size="lg" showBubble={false} style={styles.modalMoka} />
          <T v="h1" style={{ textAlign: 'center' }}>Tebrikler, evin inşa edildi!</T>
          <T v="lead" style={{ textAlign: 'center', marginTop: 0 }}>
            7 gün boyunca her gün evine vakit ayırdın. Seriyi sürdür, önümüzdeki ay evin daha da güzelleşsin 🌷
          </T>
          <Btn kind="primary" label="Yaşasın!" onPress={dismiss} block />
        </View>
      )}
    </StepModal>
  );
}

function Stat({ emoji, value, label, tint, onPress }: { emoji: string; value: string; label: string; tint: string; onPress: () => void }) {
  const c = useColors();
  return (
    <Squish onPress={onPress} accessibilityRole="button" accessibilityLabel={`${value} ${label}`} style={[styles.stat, { backgroundColor: tint }]}>
      <Text style={{ fontSize: 22 }}>{emoji}</Text>
      <Text style={{ fontFamily: fonts.displayBold, fontSize: 22, lineHeight: 26, color: c.ink }}>{value}</Text>
      <Text numberOfLines={1} style={{ fontFamily: fonts.bodyBold, fontSize: 12, color: c.muted }}>{label}</Text>
    </Squish>
  );
}

function Quick({ emoji, label, sub, tint, onPress }: { emoji: string; label: string; sub: string; tint: string; onPress: () => void; i?: number }) {
  const c = useColors();
  return (
    <Squish onPress={onPress} accessibilityLabel={label} style={[styles.q, { backgroundColor: tint }]}>
      <Text style={{ fontSize: 30 }}>{emoji}</Text>
      <Text style={{ fontFamily: fonts.bodyBlack, fontSize: 14, color: c.ink }}>{label}</Text>
      <Text numberOfLines={1} style={{ fontFamily: fonts.bodyBold, fontSize: 12, color: c.muted }}>{sub}</Text>
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
    shadowColor: warmShadow, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.14, shadowRadius: 20, elevation: 4,
  },
  mokaRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mokaTap: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 12 },
  mokaIcon: { width: 54, height: 54, borderRadius: radius.card, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  mokaImg: { width: 58, height: 58, marginTop: 8 },
  mokaFoot: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  chev: { fontFamily: fonts.bodyBlack, fontSize: 22, lineHeight: 24 },
  statL: { fontFamily: fonts.bodyBold, fontSize: 12 },
  nextCard: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: radius.tile, paddingVertical: 14, paddingHorizontal: 16, shadowColor: warmShadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.10, shadowRadius: 10, elevation: 2 },
  nextIcon: { width: 46, height: 46, borderRadius: radius.tile, alignItems: 'center', justifyContent: 'center' },
  stats: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, alignItems: 'center', gap: 0, borderRadius: radius.tile, paddingVertical: 14, paddingHorizontal: 4, shadowColor: warmShadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.10, shadowRadius: 10, elevation: 2 },
  sec: { gap: 12, padding: 16 },
  quick: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  week: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: radius.card, paddingVertical: 18, paddingHorizontal: 20 },
  weekT: { fontFamily: fonts.bodyBlack, fontSize: 16 },
  plot: { position: 'absolute', zIndex: 2, left: 12, right: 12, bottom: 12, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 20, paddingVertical: 10, paddingHorizontal: 14 },
  q: { flex: 1, alignItems: 'center', gap: 3, borderRadius: radius.tile, paddingVertical: 16, paddingHorizontal: 4, shadowColor: warmShadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.10, shadowRadius: 10, elevation: 2 },
  modalBg: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalMoka: { marginTop: -100 },
  modal: { borderRadius: 40, padding: 28, paddingTop: 0, marginTop: 90, gap: 16, alignItems: 'center', maxWidth: 400, width: '100%' },
  viewer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  viewerScene: { width: '100%', paddingHorizontal: 8 },
  viewerModel: { width: '100%' },
  viewerClose: { position: 'absolute', right: 18, width: 46, height: 46, borderRadius: radius.tile, alignItems: 'center', justifyContent: 'center' },
  viewerCloseText: { fontSize: 32, lineHeight: 36, fontFamily: fonts.bodyBold },
});
