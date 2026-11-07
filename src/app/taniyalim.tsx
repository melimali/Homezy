import { useEffect, useState } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';
import { router } from '@/lib/nav';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Appear, Float, Squish } from '@/components/motion';
import { Btn, Chip, T } from '@/components/ui';
import { MOKA_ASSETS } from '@/constants/moka';
import { AXIS_NAMES, axesOf, DISC_QUESTIONS, sideOf, TYPES, typeOf, type Axes, type DiscAnswers } from '@/domain/kisilik';
import { askable, DEFAULT_ANSWERS, PLAN, personaOf, QUESTIONS, type Answers } from '@/domain/persona';
import { savePersona, skipPersona, usePersona, type Disc } from '@/profile/usePersona';
import { useStore } from '@/store/AppStore';
import { fonts, radius, useColors } from '@/theme';

/**
 * Tanıtımdan sonra "seni tanıyalım" soruları. Cevaplar kişilik tipine çevrilir (gösterilmez),
 * Moka "notlarını alıyor" yükleme ekranıyla bitirir. Ev kurulumundan önce açılır.
 */
export default function Taniyalim() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { state, update } = useStore();
  const setupDone = state.setup;
  const { answers: saved } = usePersona();
  const [ans, setAns] = useState<Answers>({ ...DEFAULT_ANSWERS, ...saved, tastes: [] });
  const [step, setStep] = useState(0);
  const [chosen, setChosen] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [disc, setDisc] = useState<DiscAnswers>({});
  const [result, setResult] = useState<Disc | null>(null);

  const home = QUESTIONS.filter(x => askable(x.k, ans));
  // Tek liste: önce ev soruları (Q1-Q7), sonra disiplin soruları (Q8-Q17).
  const steps: { k: string }[] = [...home, ...DISC_QUESTIONS];
  const inDisc = step >= home.length;
  const q = inDisc ? undefined : home[Math.min(step, home.length - 1)];
  const dq = inDisc ? DISC_QUESTIONS[Math.min(step - home.length, DISC_QUESTIONS.length - 1)] : undefined;

  const finish = (a: Answers, d: DiscAnswers = disc) => {
    const final: Answers = a.cook === 'sevmem' ? { ...a, effort: 15 } : a;
    setAns(final);
    setSaving(true);
    // Moka notlarını alırken: kayıt + varsayılanlar (sabah özeti saati).
    setTimeout(() => {
      const p = personaOf(final);
      update(D => {
        if (!D.setup) D.settings.time = PLAN[p].morning;
      });
      const axes = axesOf(d, final.style);
      const type = typeOf(axes, d);
      const r: Disc = { type, side: sideOf(axes, d, type), axes, answers: d, at: Date.now() };
      setResult(r);
    }, 2600);
  };

  const next = (a: Answers, d: DiscAnswers = disc) => {
    const total = QUESTIONS.filter(x => askable(x.k, a)).length + DISC_QUESTIONS.length;
    if (step + 1 >= total) finish(a, d);
    else setStep(step + 1);
  };

  const pickDisc = (v: string) => {
    if (!dq) return;
    if (dq.multi) {
      const cur = (disc[dq.k] as string[] | undefined) ?? [];
      const nx = cur.includes(v) ? cur.filter(x => x !== v) : cur.length < (dq.max ?? 99) ? [...cur, v] : cur;
      setDisc(d => ({ ...d, [dq.k]: nx }));
      return;
    }
    const d = { ...disc, [dq.k]: v };
    setDisc(d);
    next(ans, d);
  };

  const pick = (v: unknown) => {
    if (!q || q.multi) return;
    const a = { ...ans, [q.k]: v } as Answers;
    setAns(a);
    setChosen(x => ({ ...x, [q.k]: v }));
    next(a);
  };

  const toggle = (v: Answers['tastes'][number]) =>
    setAns(a => {
      let t = a.tastes.includes(v) ? a.tastes.filter(x => x !== v) : [...a.tastes, v];
      if (v === 'etsiz' && t.includes('etsiz')) t = t.filter(x => x !== 'et');
      if (v === 'et' && t.includes('et')) t = t.filter(x => x !== 'etsiz');
      return { ...a, tastes: t };
    });

  if (result) return <TypeScreen r={result} onDone={() => {
    // Kayıt "Devam"da yapılır: yeni kullanıcıda kayıt, ekranı korumadan düşürür ve akış devam eder.
    savePersona(ans, true, result);
    if (setupDone && router.canGoBack()) router.back();
  }} />;
  if (saving) return <Notes />;

  return (
    <View style={[st.wrap, { backgroundColor: c.bg, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }]}>
      <View style={st.cupRow} accessibilityLabel={`Soru ${step + 1} / ${steps.length}`}>
        <View style={[st.cupTrack, { backgroundColor: c.line }]}>
          <View style={[st.cupFill, { backgroundColor: c.accent, width: `${((step + 1) / steps.length) * 100}%` }]} />
        </View>
        <Text style={{ fontSize: 20 }}>{step + 1 >= steps.length ? '☕✨' : '☕'}</Text>
      </View>
      <Appear key={q?.k ?? dq?.k} style={{ flex: 1, gap: 14 }}>
        <View style={st.head}>
          <Float amp={4} dur={2200}>
            <Image source={MOKA_ASSETS[dq ? (dq.k === 'quit' ? 'blanket' : dq.k === 'drive' ? 'party' : dq.k === 'areas' ? 'checklist' : 'analyzing') : q!.k === 'budget' ? 'checklist' : q!.k === 'cook' || q!.k === 'effort' || q!.k === 'tastes' ? 'chef' : 'happy']} style={st.moka} resizeMode="contain" accessibilityIgnoresInvertColors />
          </Float>
          <View style={{ flex: 1 }}>
            <T v="eyebrow">Seni tanıyalım</T>
            <T v="h2">{(q ?? dq)!.q}</T>
            <T v="small">{(q ?? dq)!.hint}</T>
          </View>
        </View>

        {dq ? (
          <View style={{ gap: 10 }}>
            {dq.opts.map(o => {
              const sel = dq.multi ? ((disc[dq.k] as string[] | undefined) ?? []).includes(o.v) : disc[dq.k] === o.v;
              return (
                <Squish
                  key={o.v}
                  onPress={() => pickDisc(o.v)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: sel }}
                  accessibilityLabel={o.label}
                  style={[st.opt, { backgroundColor: sel ? c.accentSoft : c.surface, borderColor: sel ? c.accent : c.line }]}
                >
                  <Text style={{ fontSize: 28 }}>{o.emoji}</Text>
                  <Text style={{ flex: 1, fontFamily: fonts.bodyBlack, fontSize: 16, color: c.ink }}>{o.label}</Text>
                  {sel && <Text style={{ fontSize: 18 }}>✓</Text>}
                </Squish>
              );
            })}
          </View>
        ) : q!.multi ? (
          <View style={st.chips}>
            {q!.opts.map(o => (
              <Chip key={o.v} label={`${o.emoji} ${o.label}`} on={ans.tastes.includes(o.v)} onPress={() => toggle(o.v)} />
            ))}
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {(q!.opts as { v: unknown; emoji: string; label: string; sub?: string }[]).map(o => {
              const on = chosen[q!.k] === o.v;
              return (
                <Squish
                  key={String(o.v)}
                  onPress={() => pick(o.v)}
                  accessibilityRole="button"
                  accessibilityLabel={o.label}
                  style={[st.opt, { backgroundColor: on ? c.accentSoft : c.surface, borderColor: c.line }]}
                >
                  <Text style={{ fontSize: 28 }}>{o.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: fonts.bodyBlack, fontSize: 16, color: c.ink }}>{o.label}</Text>
                    {!!o.sub && <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: c.muted }}>{o.sub}</Text>}
                  </View>
                </Squish>
              );
            })}
          </View>
        )}
      </Appear>

      <View style={{ gap: 6 }}>
        {q?.multi && <Btn kind="primary" label={ans.tastes.length ? 'Devam' : 'Hepsini severim, devam'} onPress={() => next(ans)} block />}
        {dq?.multi && <Btn kind="primary" label={((disc[dq.k] as string[] | undefined) ?? []).length ? 'Devam' : 'Şimdilik geç'} onPress={() => next(ans)} block />}
        {step > 0 && <Btn kind="ghost" label="‹ Geri" onPress={() => setStep(step - 1)} block />}
        {step === 0 && <Btn kind="ghost" label="Şimdilik geç" onPress={() => { skipPersona(); if (setupDone && router.canGoBack()) router.back(); }} block />}
      </View>
    </View>
  );
}

/** Tip ekranı: büyük tip kartı, Moka'nın yorumu, 5 eksen çubuğu, yan renk. */
function TypeScreen({ r, onDone }: { r: Disc; onDone: () => void }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const t = TYPES[r.type];
  const side = r.side ? TYPES[r.side] : null;
  return (
    <View style={[st.wrap, { backgroundColor: c.bg, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }]}>
      <Appear style={{ flex: 1, gap: 12 }}>
        <View style={[st.typeCard, { backgroundColor: t.bg }]}>
          <Float amp={5} dur={1800}>
            <Image source={t.img} style={{ width: 190, height: 190 }} resizeMode="contain" accessibilityIgnoresInvertColors />
          </Float>
          <Text style={[st.typeName, { color: '#283044' }]}>{t.emoji} {t.name}</Text>
          <Text style={[st.typeSays, { color: '#283044' }]}>{t.says}</Text>
        </View>
        {side && <T v="small" style={{ textAlign: 'center' }}>{`Biraz da ${side.name} gibisin ${side.emoji}`}</T>}
        <View style={{ gap: 8 }}>
          {(Object.keys(AXIS_NAMES) as (keyof Axes)[]).map(k => (
            <View key={k} style={st.axisRow}>
              <T v="small" style={{ width: 100 }}>{AXIS_NAMES[k]}</T>
              <View style={[st.cupTrack, { backgroundColor: c.line, flex: 1 }]}>
                <View style={[st.cupFill, { backgroundColor: c.accent, width: `${r.axes[k] * 10}%` }]} />
              </View>
            </View>
          ))}
        </View>
      </Appear>
      <Btn kind="primary" label="Devam" onPress={onDone} block />
    </View>
  );
}

const NOTES = ['Moka notlarını alıyor…', 'Evin düzenini tartıyor…', 'Tariflerini ayarlıyor…', 'Neredeyse hazır ☕'];

/** Sorulardan sonra küçük yükleme: Moka not defterine yazar. */
function Notes() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const [i, setI] = useState(0);
  const [bar] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(bar, { toValue: 1, duration: 2500, easing: Easing.out(Easing.quad), useNativeDriver: false }).start();
    const t = setInterval(() => setI(x => Math.min(x + 1, NOTES.length - 1)), 650);
    return () => clearInterval(t);
  }, [bar]);
  return (
    <View style={[st.wrap, st.center, { backgroundColor: c.bg, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View accessibilityRole="progressbar" accessibilityLiveRegion="polite" style={{ alignItems: 'center', gap: 14 }}>
        <Float amp={6} dur={1100}>
          <Image source={MOKA_ASSETS.checklist} style={{ width: 170, height: 170 }} resizeMode="contain" accessibilityIgnoresInvertColors />
        </Float>
        <T v="h3" style={{ textAlign: 'center' }}>{NOTES[i]}</T>
        <View style={[st.track, { backgroundColor: c.line }]}>
          <Animated.View style={[st.fill, { backgroundColor: c.accent, width: bar.interpolate({ inputRange: [0, 1], outputRange: ['6%', '100%'] }) }]} />
        </View>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: 20, gap: 14 },
  center: { alignItems: 'center', justifyContent: 'center' },
  cupRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cupTrack: { height: 12, flex: 1, borderRadius: 6, overflow: 'hidden' },
  cupFill: { height: 12, borderRadius: 6 },
  typeCard: { borderRadius: 26, padding: 18, alignItems: 'center', gap: 6 },
  typeName: { fontFamily: fonts.bodyBlack, fontSize: 24 },
  typeSays: { fontFamily: fonts.bodyBold, fontSize: 15, textAlign: 'center' },
  axisRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  moka: { width: 84, height: 84 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  opt: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.tile, borderWidth: 1.5 },
  track: { width: 220, height: 10, borderRadius: 5, overflow: 'hidden' },
  fill: { height: 10, borderRadius: 5 },
});
