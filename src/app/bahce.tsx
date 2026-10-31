import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { DustPopMiniGame } from '@/components/DustPopMiniGame';
import { PlantArt } from '@/components/GardenArt';
import { Glass } from '@/components/Glass';
import { LofiPlayerModal } from '@/components/LofiPlayerModal';
import { MokaMascot } from '@/components/MokaMascot';
import { useToast } from '@/components/Toast';
import { Breathe, Flutter, Shower, Sway, Twinkle } from '@/components/gardenFx';
import { Appear, Burst, Float, Pulse, Squish } from '@/components/motion';
import { BackLink, Btn, Card, EmptyMsg, Screen, Sheet, Tabs, T } from '@/components/ui';
import {
  FERT_CAP, FERTS, FLOWER, FLOWERS, GROW_PER_DAY, PLOTS, STAGE_NAMES, fedToday, gardenRank, growth,
  isPlotLovedToday, monthFlower, stageOf, type Flower, type Plot,
} from '@/domain/garden';
import { DECOR, PERSONAS, type Extra } from '@/domain/items';
import { dayKey } from '@/domain/play';
import type { MokaPose } from '@/constants/moka';
import { useNow } from '@/hooks/useNow';
import { sfx } from '@/lib/sfx';
import { usePlay } from '@/play/usePlay';
import { usePurchases } from '@/purchases/PurchasesProvider';
import { useStore } from '@/store/AppStore';
import { brand, fonts, radius, useColors } from '@/theme';

type Tab = 'cicek' | 'gubre' | 'sus' | 'kisilik' | 'album';

/**
 * Moka'nın bahçesi: puanları harcamanın ikinci yeri. Tohum al, saksıya ek, her gün iş yaptıkça büyüsün,
 * açınca albüme al; albümdeki çiçekler 3B evin bahçesinde saksı olarak durur. Kurallar src/domain/garden.ts'te.
 */
export default function Bahce() {
  const c = useColors();
  const now = useNow();
  const toast = useToast();
  const { state: S, update } = useStore();
  const P = S.play;
  const G = P.garden;
  const { premium } = usePurchases();
  const [tab, setTab] = useState<Tab>('cicek');
  const [sel, setSel] = useState<string | null>(null);
  const [detailFlower, setDetailFlower] = useState<Flower | null>(null);
  const [lofiOpen, setLofiOpen] = useState(false);
  const [dustOpen, setDustOpen] = useState(false);

  // Açan her çiçekte yıldız saçılsın: açılıştaki sayıdan fazlası (albüme almak sayıyı değiştirmez).
  const blooms = G.plots.filter(p => p.bloomed).length + Object.values(G.album).reduce((s, n) => s + n, 0);
  const [blooms0] = useState(blooms);
  const fire = Math.max(0, blooms - blooms0);
  const maxPlots = premium.active ? PLOTS.premium : PLOTS.free;
  const month = monthFlower(now);

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
  const pose: MokaPose = anyBloom ? 'party' : growing.length ? 'plants' : hasHammock ? 'rest' : 'cozy_plant';
  const message = anyBloom
    ? 'Çiçek açtı! Albüme al, evinin bahçesine koyayım 🌸'
    : growing.length
      ? `Her iş saksılara 1 büyüme verir (günde en fazla ${GROW_PER_DAY}). Gübre de hızlandırır.`
      : month.story ?? 'Bir tohum seç, birlikte büyütelim 🌱';

  const rank = gardenRank(G.album);
  const albumTypesCount = Object.keys(G.album).length;

  return (
    <Screen header={false} image={require('../../assets/bahce/bahce-arka.jpg')}>
      <BackLink />
      <Appear>
        <T v="eyebrow">Puanla bahçe</T>
        <T v="h1">Moka&apos;nın bahçesi 🌷</T>
        <T v="lead">Tohum al, saksıya ek. Her gün iş yaptıkça büyür, açınca albümüne girer ve evinin bahçesini süsler.</T>
      </Appear>

      <Appear index={1}>
        <Glass style={styles.wallet}>
          <Float amp={3} dur={1800}><Text style={{ fontSize: 26 }}>⭐</Text></Float>
          <Pulse on={P.points}><Text style={[styles.walletN, { color: c.ink }]}>{P.points}</Text></Pulse>
          <Text style={[styles.walletL, { color: c.warm }]}>puanın var</Text>
        </Glass>
      </Appear>

      {/* Plak Çalar & Hızlı Toz Avı Mini Oyun Butonları */}
      <Appear index={2} style={{ flexDirection: 'row', gap: 10 }}>
        <Btn small kind="soft" label="🎵 Plak Çalar (ASMR)" onPress={() => setLofiOpen(true)} style={{ flex: 1 }} />
        <Btn small kind="soft" label="🧹 Hızlı Toz Avı" onPress={() => setDustOpen(true)} style={{ flex: 1 }} />
      </Appear>

      <Appear index={3}>
      <Glass style={styles.statsCard}>
        <View style={styles.statsRow}>
          <View style={{ flex: 1 }}>
            <T v="tiny" style={{ color: c.muted }}>BAHÇE SEVİYESİ</T>
            <T v="bold" style={{ color: c.ink, fontSize: 16 }}>{rank.title}</T>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <T v="tiny" style={{ color: c.muted }}>KOLEKSİYON</T>
            <T v="bold" style={{ color: c.today, fontSize: 15 }}>{albumTypesCount} / {FLOWERS.length} Çiçek</T>
          </View>
        </View>
        <View style={[styles.bar, { width: '100%', height: 8, backgroundColor: c.surface2, marginTop: 4 }]}>
          <View style={[styles.barFill, { width: `${(albumTypesCount / FLOWERS.length) * 100}%`, backgroundColor: brand.blue }]} />
        </View>
      </Glass>
      </Appear>

      <Appear index={4}>
      <View style={[styles.bed, { backgroundColor: c.room.balkon }]}>
        <Float amp={6} dur={5200} style={[styles.blob, { top: -30, right: -20 }]}>
          <View pointerEvents="none" style={[styles.blobIn, { backgroundColor: brand.blue }]} />
        </Float>
        <Float amp={5} dur={4400} delay={600} style={[styles.blob, { bottom: 40, left: -40 }]}>
          <View pointerEvents="none" style={[styles.blobIn, { backgroundColor: brand.clay }]} />
        </Float>
        {P.owned.includes('sera') && <View pointerEvents="none" style={[styles.glass, { borderColor: c.surface }]} />}
        <Flutter emoji="🦋" top="14%" dur={8500} />
        <Flutter emoji="🦋" top="46%" dur={11000} delay={2500} size={16} />
        {anyBloom && <Flutter emoji="🐝" top="72%" dur={7000} delay={1200} size={15} />}
        <View style={styles.bedTop}>
          <Float amp={5} dur={2600}>
            <MokaMascot pose={pose} size="md" showBubble={false} />
          </Float>
          <Glass style={styles.bubble} intensity={30}>
            <Text style={[styles.bubbleT, { color: c.ink }]}>{message}</Text>
          </Glass>
        </View>
        <View style={styles.plots}>
          {Array.from({ length: Math.max(maxPlots, grown.length) }, (_, i) => grown[i]).map((x, i) =>
            x ? (
              <Appear key={x.p.id} index={i} style={styles.plotCell}>
                <PlotCard plot={x.p} flower={x.f} g={x.g} on={sel === x.p.id} onPress={() => setSel(sel === x.p.id ? null : x.p.id)} />
              </Appear>
            ) : (
              <Appear key={'e' + i} index={i} style={styles.plotCell}>
                <Squish onPress={() => setTab('cicek')} accessibilityRole="button" accessibilityLabel="Boş saksı, tohum ek" style={[styles.plot, { width: '100%' }]}>
                  <Breathe amp={0.06} dur={2000}>
                    <View style={{ opacity: 0.55 }}><PlantArt stage={-1} size={54} /></View>
                  </Breathe>
                  <Text style={[styles.plotName, { color: c.muted }]}>Boş saksı</Text>
                </Squish>
              </Appear>
            ),
          )}
        </View>
        <View style={styles.decor} pointerEvents="none">
          {P.owned.includes('sulama') && <Float amp={2} dur={2600}><Text style={styles.decorE}>🚿</Text></Float>}
          {P.owned.includes('ugurbocegi') && <Float amp={3} dur={1700} delay={300}><Text style={styles.decorE}>🐞</Text></Float>}
          {hasHammock && <Text style={styles.decorE}>🌴🪢🌴</Text>}
          {albumTypesCount > 0 && <Float amp={3} dur={2100} delay={150}><Text style={styles.decorE}>🦋</Text></Float>}
          <Float amp={2.5} dur={1900} delay={500}><Text style={styles.decorE}>✨</Text></Float>
        </View>
        <Burst fire={fire} />
      </View>
      </Appear>
      {sel && <PlotActions id={sel} onDone={() => setSel(null)} onOpenDetail={f => setDetailFlower(f)} />}

      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { k: 'cicek', emoji: '🌱', label: 'Tohumlar' },
          { k: 'gubre', emoji: '🧺', label: 'Gübre' },
          { k: 'sus', emoji: '🐞', label: 'Süsler' },
          { k: 'kisilik', emoji: '🏠', label: 'Ev kişiliği' },
          { k: 'album', emoji: '📖', label: 'Albüm', badge: Object.values(G.album).reduce((s, n) => s + n, 0) || undefined },
        ]}
      />

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
      {tab === 'kisilik' && <Personas />}
      {tab === 'album' && <Album onSelect={setDetailFlower} />}

      <LofiPlayerModal open={lofiOpen} onClose={() => setLofiOpen(false)} />
      <DustPopMiniGame
        open={dustOpen}
        onClose={() => setDustOpen(false)}
        onReward={pts => {
          update(D => void (D.play.points += pts));
          toast(`🎉 +${pts} ⭐ bonus puan kazandın!`);
        }}
      />

      {detailFlower && (
        <Sheet open={!!detailFlower} onClose={() => setDetailFlower(null)} pose="plants">
          <View style={{ alignItems: 'center', gap: 12, paddingVertical: 10 }}>
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
              <Text style={{ fontFamily: fonts.bodyBold, color: c.muted, fontSize: 13 }}>
                Albümdedeki Sayı: {G.album[detailFlower.id] ?? 0} adet
              </Text>
              <Text style={{ fontFamily: fonts.bodyBold, color: c.muted, fontSize: 13 }}>
                Tohum Fiyatı: ⭐ {detailFlower.price}
              </Text>
            </View>
            <Btn label="Kapat" onPress={() => setDetailFlower(null)} block style={{ marginTop: 10 }} />
          </View>
        </Sheet>
      )}
    </Screen>
  );
}

function PlotCard({ plot, flower, g, on, onPress }: { plot: Plot; flower?: Flower; g: number; on: boolean; onPress: () => void }) {
  const c = useColors();
  if (!flower) return null;
  const stage = stageOf(g, flower.grow);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${flower.name}, ${STAGE_NAMES[stage]}, ${g}/${flower.grow} büyüme`}
      style={[styles.plot, on && { backgroundColor: 'rgba(255,255,255,0.45)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)' }]}
    >
      <Twinkle on={g} />
      <Sway deg={stage >= 3 ? 4 : 2} dur={2200 + (flower.price % 7) * 260} delay={(flower.grow % 5) * 200}>
        {plot.bloomed ? (
          <Breathe amp={0.08} dur={1200}>
            <Float amp={3} dur={1900}>
              <PlantArt flower={flower} stage={stage} size={54} />
            </Float>
          </Breathe>
        ) : (
          <PlantArt flower={flower} stage={stage} size={54} />
        )}
      </Sway>
      <Text style={[styles.plotName, { color: c.ink }]} numberOfLines={1}>{flower.name}</Text>
      <View style={[styles.bar, { backgroundColor: c.surface2 }]}>
        <View style={[styles.barFill, { width: `${(g / flower.grow) * 100}%`, backgroundColor: stage >= 5 ? c.warm : c.ok }]} />
      </View>
      <Text style={[styles.plotStage, { color: c.muted }]}>{STAGE_NAMES[stage]}</Text>
    </Pressable>
  );
}

/** Seçili saksı: açtıysa albüme al, büyüyorsa durumunu söyle. */
function PlotActions({ id, onDone, onOpenDetail }: { id: string; onDone: () => void; onOpenDetail: (f: Flower) => void }) {
  const now = useNow();
  const [hearts, setHearts] = useState(0);
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

  const giveLove = () => {
    if (lovedToday || fertLeft <= 0) return;
    const today = dayKey(now);
    update(D => {
      const G = D.play.garden;
      if (!G.loved || G.loved.day !== today) {
        G.loved = { day: today, plotIds: [] };
      }
      if (!G.loved.plotIds.includes(plot.id)) {
        G.loved.plotIds.push(plot.id);
      }
      const p = G.plots.find(x => x.id === plot.id);
      if (p) {
        p.fert += 1;
      }
    });
    sfx('party');
    setHearts(h => h + 1);
    toast(`❤️ Moka ${f.name} saksısına sevgi verdi! (+1 Büyüme)`);
  };

  return (
    <Appear>
    <Glass style={{ gap: 10 }}>
      <Shower fire={hearts} emoji="❤️" up />
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
            {`Açmasına ${left} büyüme kaldı: iş yaparak en az ${Math.ceil(Math.max(0, left - fertLeft) / GROW_PER_DAY)} gün.`}
            {fertLeft > 0 ? ` Gübreyle ${fertLeft} büyüme daha hızlanabilir.` : ' Gübre sınırı doldu, gerisi işlerle.'}
          </T>
          {!lovedToday && fertLeft > 0 && (
            <Breathe amp={0.025} dur={1500}><Btn kind="soft" label="❤️ Bugün Sevgi Ver (+1 Büyüme)" onPress={giveLove} block /></Breathe>
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
      <Squish onPress={() => onSelect(f)} style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.rowT, { color: month ? c.glowInk : c.ink }]}>{f.name}{f.premium ? ' 👑' : ''}</Text>
        <Text style={[styles.rowS, { color: month ? c.glowInk : c.muted }]}>
          {month ? '🌟 Ayın çiçeği · ' : ''}{f.grow} büyümede açar
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
      <Text style={{ fontSize: 36 }}>{x.emoji}</Text>
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
  wallet: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 14, justifyContent: 'center' },
  walletN: { fontFamily: fonts.displayBold, fontSize: 28, lineHeight: 32 },
  walletL: { fontFamily: fonts.bodyBlack, fontSize: 15 },
  statsCard: { padding: 20, gap: 8 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bed: { borderRadius: radius.card, padding: 18, gap: 14, overflow: 'hidden' },
  blob: { position: 'absolute', width: 150, height: 150, opacity: 0.35 },
  blobIn: { flex: 1, borderRadius: 75 },
  glass: { position: 'absolute', top: 6, left: 6, right: 6, bottom: 6, borderRadius: radius.card - 6, borderWidth: 3, opacity: 0.7 },
  bedTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bubble: { flex: 1, padding: 14, borderRadius: radius.tile },
  bubbleT: { fontFamily: fonts.bodyBold, fontSize: 13.5, lineHeight: 19 },
  plots: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 8 },
  plotCell: { width: '31.5%' },
  plot: { width: '100%', alignItems: 'center', paddingVertical: 8, borderRadius: radius.tile, gap: 3 },
  plotName: { fontFamily: fonts.bodyBlack, fontSize: 12.5, textAlign: 'center' },
  plotStage: { fontFamily: fonts.bodyBold, fontSize: 11 },
  bar: { height: 6, width: '70%', borderRadius: radius.pill, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: radius.pill },
  decor: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', minHeight: 4 },
  decorE: { fontSize: 24 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: radius.tile, paddingVertical: 8, paddingHorizontal: 14 },
  rowT: { fontFamily: fonts.bodyBlack, fontSize: 15 },
  rowS: { fontFamily: fonts.bodyBold, fontSize: 12.5 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },
  item: { width: '47.5%', alignItems: 'center', padding: 14, gap: 8 },
  tag: { fontFamily: fonts.bodyBlack, fontSize: 13, textAlign: 'center' },
  albumGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  albumCell: { width: '23%', alignItems: 'center', borderRadius: radius.tile, paddingVertical: 8, gap: 2 },
});
