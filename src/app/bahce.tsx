import { useBusy } from '@/components/BusyOverlay';
import { useRouter } from '@/lib/nav';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { Image, PanResponder, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { seatedFor } from '@/constants/mimik';
import { PlantArt } from '@/components/GardenArt';
import { GardenGate } from '@/components/GardenGate';
import { Glass } from '@/components/Glass';
import { LofiPlayerModal } from '@/components/LofiPlayerModal';
import { useToast } from '@/components/Toast';
import { GardenIsland } from '@/components/GardenIsland';
import { GardenScene, phaseOf } from '@/components/GardenScene';
import { Breathe, Flutter, Shower, Sway } from '@/components/gardenFx';
import { Appear, Burst, Float, Pulse, Squish } from '@/components/motion';
import { BackLink, Btn, Card, EmptyMsg, Screen, Sheet, T } from '@/components/ui';
import {
  FERT_CAP, FERTS, FLOWER, FLOWERS, GROW_PER_DAY, PLOTS, fedToday, gardenRank, growth,
  isPlotLovedToday, monthFlower, plantsWilted, stageOf, waterPlot, type Flower, type Plot,
} from '@/domain/garden';
import { DECOR, PERSONAS, type Extra } from '@/domain/items';
import { dayKey, houseProgress } from '@/domain/play';
import { tx } from '@/i18n/runtime';
import { useNow } from '@/hooks/useNow';
import { sfx } from '@/lib/sfx';
import { useSky } from '@/lib/weather';
import { usePlay } from '@/play/usePlay';
import { usePurchases } from '@/purchases/PurchasesProvider';
import { useStore } from '@/store/AppStore';
import { brand, fonts, radius, useColors } from '@/theme';

type Tab = 'cicek' | 'gubre' | 'sus' | 'album';

const GARDEN_TABS: { k: Tab; icon: string; label: string }[] = [
  { k: 'cicek', icon: '🌱', label: 'Tohumlar' },
  { k: 'gubre', icon: '🧺', label: 'Gübre' },
  { k: 'sus', icon: '🐞', label: 'Süsler' },
  { k: 'album', icon: '📖', label: 'Albüm' },
];
const gardenTree = require('../../assets/ev3d/bahce/agac_yuvarlak.webp');
const gardenBush = require('../../assets/ev3d/bahce/cali_2.webp');
const gardenShadow = require('../../assets/ev3d/bahce/ev_golge.webp');

/**
 * Moka'nın bahçesi: puanları harcamanın ikinci yeri. Tohum al, saksıya ek, her gün iş yaptıkça büyüsün,
 * açınca albüme al; albümdeki çiçekler 3B evin bahçesinde saksı olarak durur. Kurallar src/domain/garden.ts'te.
 */
export default function Bahce() {
  const c = useColors();
  const { height } = useWindowDimensions();
  const now = useNow();
  const toast = useToast();
  const { state: S, update } = useStore();
  const P = S.play;
  const G = P.garden;
  const { premium } = usePurchases();
  const [tab, setTab] = useState<Tab | null>(null);
  const [mokaTalks, setMokaTalks] = useState(true);
  const [watering, setWatering] = useState(false);
  const [waterFx, setWaterFx] = useState({ id: '', count: 0 });
  const lastTab = useRef<Tab>('cicek');
  const screen = useRef<ComponentRef<typeof ScrollView>>(null);
  const toolsY = useRef(0);
  const [trayDrag] = useState(() => PanResponder.create({
    onStartShouldSetPanResponderCapture: () => true,
    onPanResponderGrant: () => setWatering(true),
    onPanResponderRelease: (_, gesture) => {
      setWatering(false);
      if (gesture.dy < -16) {
        setTab(lastTab.current);
        screen.current?.scrollTo({ y: Math.max(0, toolsY.current - 20), animated: true });
      } else if (gesture.dy > 16) {
        setTab(null);
        screen.current?.scrollTo({ y: 0, animated: true });
      }
    },
    onPanResponderTerminate: () => setWatering(false),
    onPanResponderTerminationRequest: () => false,
  }));

  const showSeeds = () => {
    lastTab.current = 'cicek';
    setTab('cicek');
    setSel(null);
    screen.current?.scrollTo({ y: Math.max(0, toolsY.current - 20), animated: true });
  };
  const [sel, setSel] = useState<string | null>(null);
  const [detailFlower, setDetailFlower] = useState<Flower | null>(null);
  const [lofiOpen, setLofiOpen] = useState(false);

  const waterBed = (id: string) => {
    const result: { flower?: Flower } = {};
    update(draft => { result.flower = waterPlot(draft.play, id); });
    if (!result.flower) return;
    sfx('party');
    setWaterFx(effect => ({ id, count: effect.count + 1 }));
    toast(`❤️ Moka ${result.flower.name} saksısına sevgi verdi! (+1 Büyüme)`);
  };

  // Açan her çiçekte yıldız saçılsın: açılıştaki sayıdan fazlası (albüme almak sayıyı değiştirmez).
  const blooms = G.plots.filter(p => p.bloomed).length + Object.values(G.album).reduce((s, n) => s + n, 0);
  const [blooms0] = useState(blooms);
  const fire = Math.max(0, blooms - blooms0);
  const maxPlots = premium.active ? PLOTS.premium : PLOTS.free;
  const month = monthFlower(now);
  const sky = useSky();
  const hour = new Date(now).getHours();
  const phase = phaseOf(hour, sky);

  const progress = houseProgress(P.days, now, P.frozen);
  const wilt = plantsWilted(progress);
  const grown = G.plots.map(p => ({ p, f: FLOWER[p.flower], g: growth(P, p, now) }));

  // Hedefe ulaşan saksı açar: bir kere kutlama.
  const fresh = grown.filter(x => x.f && !x.p.bloomed && x.g >= x.f.grow).map(x => x.p.id).join(',');
  useEffect(() => {
    if (!fresh) return;
    const ids = fresh.split(',');
    update(D => {
      for (const p of D.play.garden.plots) if (ids.includes(p.id)) p.bloomed = true;
    });
    const names = ids.map(id => FLOWER[G.plots.find(p => p.id === id)?.flower ?? '']?.name).filter(Boolean);
    sfx('party');
    toast(`🌸 ${names.join(', ')} açtı! Albüme alabilirsin.`);
  }, [fresh, update, toast, G.plots]);

  const anyBloom = grown.some(x => x.p.bloomed);
  const growing = grown.filter(x => x.f && !x.p.bloomed);
  const hasHammock = P.owned.includes('hamak');
  const message = wilt && G.plots.length
    ? 'Çiçekler susadı. Bir iş yap, hemen canlanırlar 🥀'
    : anyBloom
    ? 'Çiçek açtı! Albüme al, evinin bahçesine koyayım 🌸'
    : growing.length
      ? `Her iş saksılara 1 büyüme verir (günde en fazla ${GROW_PER_DAY}). Gübre de hızlandırır.`
      : month.story ?? 'Bir tohum seç, birlikte büyütelim 🌱';

  const rank = gardenRank(G.album);
  const albumTypesCount = Object.keys(G.album).length;

  return (
    <View style={{ flex: 1 }}>
    <Screen header={false} tone="sage" scrollRef={screen} scrollEnabled={!watering}>
      <BackLink label="" right={
        <View style={styles.hud}>
          <View style={[styles.hudPill, { backgroundColor: c.surface }]}>
            <Pulse on={P.points}><T v="bold">⭐ {P.points}</T></Pulse>
          </View>
          <View style={[styles.hudPill, { backgroundColor: c.surface }]}>
            <T v="bold">☕ {progress.streak} gün</T>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Pikap (ASMR)"
            onPress={() => setLofiOpen(true)}
            style={({ pressed }) => [styles.hudPill, { backgroundColor: c.surface, opacity: pressed ? 0.7 : 1 }]}
          >
            <T v="bold">♫</T>
          </Pressable>
        </View>
      } />

      <Appear>
        <View style={[styles.bed, { minHeight: Math.min(650, height * 0.72) }]}>
          <GardenScene hour={hour} sky={sky} blooms={blooms} />
          <View style={styles.sceneHeading} pointerEvents="none">
            <T v="h1" style={styles.sceneTitle}>Moka&apos;nın bahçesi</T>
          </View>
          <View style={styles.messageRoom} pointerEvents="none">
            {mokaTalks && (
              <Glass scrim style={styles.bubble}>
                <T v="small" style={styles.bubbleT}>{message}</T>
              </Glass>
            )}
          </View>
          <Flutter emoji="🦋" top="31%" dur={8500} />
          <Flutter emoji="🦋" top="43%" dur={11000} delay={2500} size={16} />
          {anyBloom && <Flutter emoji="🐝" top="65%" dur={7000} delay={1200} size={15} />}
          <View style={styles.islandStage}>
            <View pointerEvents="none" style={StyleSheet.absoluteFill} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
              <Image source={gardenTree} style={[styles.tree, { opacity: phase === 'night' ? 0.65 : 1 }]} resizeMode="contain" />
              <Image source={gardenShadow} style={styles.islandShadow} resizeMode="stretch" />
              <Image source={gardenBush} style={styles.bush} resizeMode="contain" />
            </View>
            <GardenIsland
              plots={grown}
              garden={G}
              now={now}
              capacity={maxPlots}
              selected={sel}
              wilt={wilt}
              dim={phase === 'night' ? 0.72 : phase === 'dusk' ? 0.88 : 1}
              onSelect={id => setSel(current => current === id ? null : id)}
              onEmpty={showSeeds}
              onWater={waterBed}
              onDragChange={setWatering}
              waterFx={waterFx}
              onWaterHint={() => toast('Sulama kabını bir yatağa sürükle.')}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Moka"
              accessibilityState={{ expanded: mokaTalks }}
              onPress={() => setMokaTalks(current => !current)}
              style={({ pressed }) => [styles.moka, { opacity: pressed ? 0.8 : 1 }]}
            >
              <Image
                source={seatedFor(P.mokaFur ?? null)[wilt && G.plots.length ? 'sad' : anyBloom ? 'cheer' : 'happy']}
                style={styles.mokaArt}
                resizeMode="contain"
                accessibilityIgnoresInvertColors
              />
            </Pressable>
          </View>
          {P.owned.includes('sera') && <View pointerEvents="none" style={styles.glass} />}
          <View style={styles.decor} pointerEvents="none">
            {P.owned.includes('ugurbocegi') && <Float amp={3} dur={1700} delay={250}><Text style={styles.decorE}>🐞</Text></Float>}
            {hasHammock && <Text style={styles.decorE}>🌴🪢🌴</Text>}
          </View>
          <Burst fire={fire} />
        </View>
      </Appear>

      {sel && <PlotActions id={sel} onWater={() => waterBed(sel)} onDone={() => setSel(null)} onOpenDetail={f => setDetailFlower(f)} />}

      <View style={[styles.tray, { backgroundColor: c.surface }]} onLayout={event => { toolsY.current = event.nativeEvent.layout.y; }}>
        <View collapsable={false} style={styles.trayHandleRegion} {...trayDrag.panHandlers}>
          <Pressable
            testID="garden-tray-handle"
            accessibilityRole="button"
            accessibilityLabel={tab ? 'Paneli kapat' : 'Paneli aç'}
            accessibilityState={{ expanded: tab !== null }}
            onPress={() => setTab(current => current === null ? lastTab.current : null)}
            style={styles.trayHandle}
          >
            <View style={[styles.trayGrip, { backgroundColor: c.muted }]} />
          </Pressable>
        </View>
        <View style={styles.trayTabs} accessibilityRole="tablist">
          {GARDEN_TABS.map(({ k, icon, label }) => {
            const open = tab === k;
            return (
              <Pressable
                key={k}
                accessibilityRole="tab"
                accessibilityLabel={label}
                accessibilityState={{ selected: open, expanded: open }}
                onPress={() => { lastTab.current = k; setTab(current => current === k ? null : k); }}
                style={({ pressed }) => [styles.trayTab, {
                  backgroundColor: open ? c.accent : c.surface2,
                  opacity: pressed ? 0.75 : 1,
                }]}
              >
                <Text style={styles.trayIcon}>{icon}</Text>
                <T v="tiny" style={{ textAlign: 'center', color: open ? c.onAccent : c.ink }}>{label}</T>
              </Pressable>
            );
          })}
        </View>

      {tab === 'cicek' && (
        <View style={{ gap: 10 }}>
          <T v="small">Ucuzdan pahalıya. Pahalı çiçekler daha uzun sürede açar, daha gösterişli olur.</T>
          {[...FLOWERS].sort((a, b) => a.price - b.price).map(f => (
            <SeedRow key={f.id} f={f} month={f.id === month.id} full={G.plots.length >= maxPlots} onSelect={setDetailFlower} />
          ))}
        </View>
      )}
      {tab === 'gubre' && (
        <View style={{ gap: 10 }}>
          <T v="small">Gübre bir saksıyı hızlandırır, ama bir çiçeğin en fazla yarısını verebilir: gerisi iş yaparak büyür.</T>
          {growing.length ? (
            growing.map(x => <FertRow key={x.p.id} plot={x.p} />)
          ) : (
            <EmptyMsg pose="plants">Büyüyen bir saksı yok. Önce bir tohum ek 🌱</EmptyMsg>
          )}
        </View>
      )}
      {tab === 'sus' && (
        <View style={styles.grid}>
          {[...DECOR].sort((a, b) => a.price - b.price).map(d => <ExtraCard key={d.id} x={d} />)}
        </View>
      )}
      {tab === 'sus' && (
        <>
          <T v="h3">Ev kişiliği</T>
          <Personas />
        </>
      )}
      {tab === 'album' && (
        <>
          <View style={[styles.collection, { backgroundColor: c.surface2 }]}>
            <T v="bold" style={{ flex: 1 }}>{rank.title}</T>
            <T v="bold">{albumTypesCount} / {FLOWERS.length}</T>
            <View style={[styles.bar, { width: '100%', backgroundColor: c.surface }]}>
              <View style={[styles.barFill, { width: `${albumTypesCount / FLOWERS.length * 100}%`, backgroundColor: brand.blue }]} />
            </View>
          </View>
          <Album onSelect={setDetailFlower} />
        </>
      )}
      </View>

      <LofiPlayerModal open={lofiOpen} onClose={() => setLofiOpen(false)} />

      {detailFlower && (
        <Sheet open={!!detailFlower} onClose={() => setDetailFlower(null)} pose="plants">
          <View style={{ alignItems: 'center', gap: 12, paddingTop: 18, paddingBottom: 6 }}>
            <PlantArt flower={detailFlower} stage={5} size={110} />
            <T v="h2">{detailFlower.emoji} {detailFlower.name}</T>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <Text style={[styles.tag, { color: c.muted }]}>{detailFlower.grow} büyüme hedefi</Text>
              {detailFlower.premium && <Text style={[styles.tag, { color: c.warm }]}>👑 Premium</Text>}
            </View>
            <Card style={{ width: '100%', gap: 8, backgroundColor: c.surface2 }}>
              <T v="bold">Moka&apos;nın Hikayesi 📖</T>
              <T v="small">{detailFlower.story ?? `${detailFlower.name} bahçene neşe ve renk katan harika bir çiçek!`}</T>
            </Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 6 }}>
              <Text style={{ fontFamily: fonts.bodyBold, color: c.muted, fontSize: 13.5 }}>
                Albümdedeki Sayı: {G.album[detailFlower.id] ?? 0} adet
              </Text>
              <Text style={{ fontFamily: fonts.bodyBold, color: c.muted, fontSize: 13.5 }}>
                Tohum Fiyatı: ⭐ {detailFlower.price}
              </Text>
            </View>
            <Btn kind="primary" label="Kapat" onPress={() => setDetailFlower(null)} block style={{ marginTop: 10 }} />
          </View>
        </Sheet>
      )}
    </Screen>
    <GardenGate />
    </View>
  );
}

/** Seçili saksı: açtıysa albüme al, büyüyorsa durumunu söyle. */
function PlotActions({ id, onDone, onOpenDetail, onWater }: { id: string; onDone: () => void; onOpenDetail: (f: Flower) => void; onWater: () => void }) {
  const now = useNow();
  const toast = useToast();
  const { state: S, update } = useStore();
  const plot = S.play.garden.plots.find(p => p.id === id);
  const f = plot && FLOWER[plot.flower];
  if (!plot || !f) return null;
  const g = growth(S.play, plot, now);
  const left = f.grow - g;
  const fertLeft = Math.max(0, FERT_CAP(f) - plot.fert);
  const lovedToday = isPlotLovedToday(S.play.garden, plot.id, now);

  const harvest = () => {
    update(D => {
      const G = D.play.garden;
      G.plots = G.plots.filter(p => p.id !== id);
      G.album[f.id] = (G.album[f.id] ?? 0) + 1;
    });
    sfx('coin');
    toast(`${f.emoji} ${f.name} albümünde! Evinin bahçesinde de duruyor.`);
    onDone();
  };

  return (
    <Appear>
    <Glass style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <T v="h3">{f.emoji} {f.name}</T>
        <Btn small kind="soft" label="Detay ℹ️" onPress={() => onOpenDetail(f)} />
      </View>
      {plot.bloomed ? (
        <>
          <T v="small">Açtı! Albüme alınca saksı boşalır, çiçek evinin bahçesine geçer.</T>
          <Breathe amp={0.03} dur={1100}><Btn kind="primary" label="Albüme al 📖" onPress={harvest} block /></Breathe>
        </>
      ) : (
        <>
          <T v="small">
            {tx('Açmasına {} büyüme kaldı: iş yaparak en az {} gün.').replace('{}', String(left)).replace('{}', String(Math.ceil(Math.max(0, left - fertLeft) / GROW_PER_DAY)))}
            {fertLeft > 0 ? tx(' Gübreyle {} büyüme daha hızlanabilir.').replace('{}', String(fertLeft)) : tx(' Gübre sınırı doldu, gerisi işlerle.')}
          </T>
          {!lovedToday && fertLeft > 0 && (
            <Breathe amp={0.025} dur={1500}><Btn kind="soft" label="❤️ Bugün Sevgi Ver (+1 Büyüme)" onPress={onWater} block /></Breathe>
          )}
        </>
      )}
    </Glass>
    </Appear>
  );
}

function SeedRow({ f, month, full, onSelect }: { f: Flower; month: boolean; full: boolean; onSelect: (f: Flower) => void }) {
  const c = useColors();
  const router = useRouter();
  const toast = useToast();
  const { state: S } = useStore();
  const { spend } = usePlay();
  const { premium } = usePurchases();
  const [busy, setBusy] = useState(false);
  useBusy(!!busy);
  const [popped, setPopped] = useState(0);
  const locked = f.premium && !premium.active;
  const short = f.price - S.play.points;

  const plant = async () => {
    if (full) return toast('Bütün saksılar dolu. Açan çiçeği albüme al, yer açılsın 🌸');
    setBusy(true);
    const today = dayKey();
    const r = await spend(f.id, D => {
      D.play.garden.plots.push({ id: `${f.id}-${Date.now().toString(36)}`, flower: f.id, day: today, base: D.play.log[today]?.length ?? 0, fert: 0 });
    });
    setBusy(false);
    if (!r.ok) return toast(r.error);
    sfx('coin');
    setPopped(n => n + 1);
    toast(`${f.emoji} ${f.name} ekildi! Her iş onu biraz büyütecek 🌱`);
  };

  return (
    <View style={[styles.row, { backgroundColor: month ? c.glow : c.surface }]}>
      <Burst fire={popped} />
      <Squish onPress={() => onSelect(f)} accessibilityRole="button" accessibilityLabel={`${f.name} detaylarını gör`}>
        <Sway deg={4} dur={2000 + (f.price % 5) * 300}><PlantArt flower={f} stage={5} size={44} /></Sway>
      </Squish>
      <Squish onPress={() => onSelect(f)} accessibilityRole="button" accessibilityLabel={`${f.name} seç`} style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.rowT, { color: month ? c.glowInk : c.ink }]}>{f.name}{f.premium ? ' 👑' : ''}</Text>
        <Text style={[styles.rowS, { color: month ? c.glowInk : c.muted }]}>
          {month ? '🌟 ' + tx('Ayın çiçeği · {} büyümede açar').replace('{}', String(f.grow)) : tx('{} büyümede açar').replace('{}', String(f.grow))}
        </Text>
      </Squish>
      {locked ? (
        <Btn small label="👑 Premium" onPress={() => router.push('/premium')} />
      ) : (
        <Btn small kind={short > 0 ? 'soft' : 'primary'} label={busy ? '…' : `⭐ ${f.price}`} disabled={busy || short > 0} onPress={plant} />
      )}
    </View>
  );
}

function FertRow({ plot }: { plot: Plot }) {
  const c = useColors();
  const now = useNow();
  const toast = useToast();
  const { state: S } = useStore();
  const { spend } = usePlay();
  const [busy, setBusy] = useState<string | null>(null);
  useBusy(!!busy);
  const [rain, setRain] = useState<{ n: number; e: string }>({ n: 0, e: '💧' });
  const f = FLOWER[plot.flower]!;
  const room = Math.max(0, FERT_CAP(f) - plot.fert);
  const g = growth(S.play, plot, now);

  const feed = async (id: string) => {
    const fert = FERTS.find(x => x.id === id)!;
    setBusy(id);
    const today = dayKey();
    const r = await spend(id, D => {
      const G = D.play.garden;
      if (G.fed.day !== today) G.fed = { day: today, n: {} };
      G.fed.n[id] = (G.fed.n[id] ?? 0) + 1;
      const p = G.plots.find(x => x.id === plot.id);
      if (p) p.fert += fert.grow;
    });
    setBusy(null);
    if (!r.ok) return toast(r.error);
    sfx('done');
    setRain(r => ({ n: r.n + 1, e: fert.emoji }));
    toast(`${fert.emoji} ${f.name} +${Math.min(fert.grow, room)} büyüdü!`);
  };

  return (
    <View style={[styles.row, { backgroundColor: c.surface, alignItems: 'flex-start', overflow: 'hidden' }]}>
      <Shower fire={rain.n} emoji={rain.e} />
      <Sway deg={3} dur={2400}><PlantArt flower={f} stage={stageOf(g, f.grow)} size={44} /></Sway>
      <View style={{ flex: 1, gap: 8 }}>
        <Text style={[styles.rowT, { color: c.ink }]}>{f.name} · {g}/{f.grow}</Text>
        {room === 0 ? (
          <Text style={[styles.rowS, { color: c.muted }]}>Gübre sınırı doldu, gerisi işlerle 💪</Text>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {FERTS.map(x => {
              const used = fedToday(S.play.garden, x.id, now);
              const out = used >= x.perDay;
              return (
                <Btn
                  key={x.id}
                  small
                  kind={out || S.play.points < x.price ? 'soft' : 'primary'}
                  disabled={!!busy || out || S.play.points < x.price}
                  label={out ? `${x.emoji} yarın` : `${x.emoji} +${x.grow} · ⭐${x.price}`}
                  accessibilityLabel={`${x.name}, ${x.price} puan, artı ${x.grow} büyüme, bugün ${x.perDay - used} hak`}
                  onPress={() => feed(x.id)}
                />
              );
            })}
          </View>
        )}
      </View>
    </View>
  );
}

/** Bir kere alınan süs ya da kişilik kartı. */
function ExtraCard({ x, onOwned }: { x: Extra; onOwned?: { on: boolean; pick: () => void } }) {
  const c = useColors();
  const router = useRouter();
  const toast = useToast();
  const { state: S } = useStore();
  const { buy } = usePlay();
  const { premium } = usePurchases();
  const [busy, setBusy] = useState(false);
  useBusy(!!busy);
  const owned = x.price === 0 || S.play.owned.includes(x.id);
  const locked = x.premium && !premium.active;
  const short = x.price - S.play.points;

  const doBuy = async () => {
    setBusy(true);
    const r = await buy(x.id, null);
    setBusy(false);
    if (!r.ok) return toast(r.error);
    sfx('coin');
    toast(`${x.emoji} ${x.name} senin!`);
    onOwned?.pick();
  };

  return (
    <Card style={[styles.item, onOwned?.on && { backgroundColor: c.glow }]}>
      {x.id === 'sulama'
        ? <Image source={require('../../assets/bahce/dekor/sulama_kabi.webp')} resizeMode="contain" style={{ width: 56, height: 47 }} />
        : <Text style={{ lineHeight: 47, fontSize: 36 }}>{x.emoji}</Text>}
      <T v="bold" style={{ textAlign: 'center', fontSize: 14 }}>{x.name}</T>
      <T v="tiny" style={{ textAlign: 'center' }}>{x.about}</T>
      {owned ? (
        onOwned ? (
          <Btn small kind={onOwned.on ? 'primary' : 'soft'} label={onOwned.on ? '✓ Seçili' : 'Seç'} onPress={onOwned.pick} />
        ) : (
          <Text style={[styles.tag, { color: c.ok }]}>✓ Bahçende</Text>
        )
      ) : locked ? (
        <Btn small label="👑 Premium" onPress={() => router.push('/premium')} />
      ) : (
        <Btn small kind={short > 0 ? 'soft' : 'primary'} label={busy ? '…' : `⭐ ${x.price}`} disabled={busy || short > 0} onPress={doBuy} />
      )}
    </Card>
  );
}

function Personas() {
  const { state: S, update } = useStore();
  const pick = (id: string) => () => update(D => void (D.play.persona = PERSONAS.find(p => p.id === id)!.persona));
  return (
    <View style={{ gap: 10 }}>
      <T v="small">Kişilik evinin pencere ışığını, süslerini ve sözlerini değiştirir. Bir kere alınır, sonra istediğin zaman geçiş yaparsın.</T>
      <View style={styles.grid}>
        {PERSONAS.map(p => <ExtraCard key={p.id} x={p} onOwned={{ on: S.play.persona === p.persona, pick: pick(p.id) }} />)}
      </View>
    </View>
  );
}

function Album({ onSelect }: { onSelect: (f: Flower) => void }) {
  const c = useColors();
  const { state: S } = useStore();
  const album = S.play.garden.album;
  const list = FLOWERS.filter(f => album[f.id]);
  if (!list.length) return <EmptyMsg pose="cozy_plant">Albüm boş. İlk çiçeğin açınca buraya gelecek 🌸</EmptyMsg>;
  return (
    <View style={{ gap: 10 }}>
      <T v="small">{list.length}/{FLOWERS.length} çiçek türü topladın. Detaylar ve hikaye için çiçeğe dokun.</T>
      <View style={styles.albumGrid}>
        {FLOWERS.map(f => (
          <Pressable
            key={f.id}
            onPress={() => onSelect(f)}
            accessibilityRole="button"
            accessibilityLabel={`${f.name} detaylarını gör`}
            style={[styles.albumCell, { backgroundColor: c.surface, opacity: album[f.id] ? 1 : 0.45 }]}
          >
            <PlantArt flower={f} stage={album[f.id] ? 5 : 0} size={40} />
            <Text style={[styles.plotName, { color: c.ink }]} numberOfLines={1}>{album[f.id] ? f.name : '?'}</Text>
            {(album[f.id] ?? 0) > 1 && <Text style={[styles.plotStage, { color: c.muted }]}>×{album[f.id]}</Text>}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hud: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 6 },
  hudPill: { minHeight: 44, minWidth: 44, paddingHorizontal: 12, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  bed: { backgroundColor: '#ADC47A', borderRadius: 32, padding: 10, paddingBottom: 34, overflow: 'hidden' },
  sceneHeading: { alignItems: 'flex-start', paddingTop: 18, paddingHorizontal: 12 },
  sceneTitle: { color: '#FFF9EA', textShadowColor: '#283044', textShadowRadius: 7, textShadowOffset: { width: 0, height: 1 } },
  messageRoom: { minHeight: 84, flexGrow: 1, justifyContent: 'flex-start', paddingHorizontal: 12, paddingVertical: 8, zIndex: 2 },
  bubble: { alignSelf: 'flex-start', maxWidth: '90%', padding: 10, borderRadius: 16 },
  bubbleT: { color: '#FFF9EA', fontFamily: fonts.bodyBold, lineHeight: 18 },
  glass: { position: 'absolute', top: 8, right: 8, bottom: 8, left: 8, borderRadius: 25, borderWidth: 2, borderColor: 'rgba(231,250,248,0.55)' },
  islandStage: { position: 'relative', paddingBottom: 36 },
  tree: { position: 'absolute', right: 1, top: '24%', width: 66, height: 82 },
  bush: { position: 'absolute', left: 6, bottom: 28, width: 46, height: 33 },
  islandShadow: { position: 'absolute', bottom: 34, left: '9%', width: '82%', height: 42, opacity: 0.35 },
  moka: { position: 'absolute', left: 6, bottom: 1, width: 100, height: 100 },
  mokaArt: { width: '100%', height: '100%' },
  tray: { borderRadius: 24, gap: 12, padding: 10 },
  trayHandleRegion: { marginTop: -10, marginBottom: -8, height: 44 },
  trayHandle: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  trayGrip: { width: 38, height: 4, borderRadius: 4, opacity: 0.65 },
  trayTabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  trayTab: { minWidth: 62, minHeight: 56, flex: 1, borderRadius: 16, padding: 5, justifyContent: 'center', alignItems: 'center' },
  trayIcon: { fontSize: 17, lineHeight: 24 },
  collection: { borderRadius: 16, padding: 12, columnGap: 8, rowGap: 6, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  plotName: { fontFamily: fonts.bodyBlack, fontSize: 12, textAlign: 'center' },
  plotStage: { fontFamily: fonts.bodyBold, fontSize: 12 },
  bar: { height: 6, width: '70%', borderRadius: radius.pill, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: radius.pill },
  decor: { position: 'absolute', right: 18, bottom: 23, flexDirection: 'row', alignItems: 'center', gap: 8 },
  decorE: { lineHeight: 31, fontSize: 24 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: radius.tile, paddingVertical: 8, paddingHorizontal: 14 },
  rowT: { fontFamily: fonts.bodyBlack, fontSize: 15 },
  rowS: { fontFamily: fonts.bodyBold, fontSize: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },
  item: { width: '47.5%', alignItems: 'center', padding: 14, gap: 8 },
  tag: { fontFamily: fonts.bodyBlack, fontSize: 13.5, textAlign: 'center' },
  albumGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  albumCell: { width: '23%', alignItems: 'center', borderRadius: radius.tile, paddingVertical: 8, gap: 2 },
});
