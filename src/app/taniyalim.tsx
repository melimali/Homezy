import { useEffect, useState } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Appear, Float, Squish } from '@/components/motion';
import { Btn, Chip, T } from '@/components/ui';
import { MOKA_ASSETS } from '@/constants/moka';
import { askable, DEFAULT_ANSWERS, PLAN, personaOf, QUESTIONS, type Answers } from '@/domain/persona';
import { savePersona, skipPersona, usePersona } from '@/profile/usePersona';
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

  const steps = QUESTIONS.filter(q => askable(q.k, ans));
  const q = steps[Math.min(step, steps.length - 1)];

  const finish = (a: Answers) => {
    const final: Answers = a.cook === 'sevmem' ? { ...a, effort: 15 } : a;
    setAns(final);
    setSaving(true);
    // Moka notlarını alırken: kayıt + varsayılanlar (sabah özeti saati).
    setTimeout(() => {
      const p = personaOf(final);
      update(D => {
        if (!D.setup) D.settings.time = PLAN[p].morning;
      });
      savePersona(final, true);
      if (setupDone && router.canGoBack()) router.back();
    }, 2600);
  };

  const next = (a: Answers) => {
    const rest = QUESTIONS.filter(x => askable(x.k, a));
    if (step + 1 >= rest.length) finish(a);
    else setStep(step + 1);
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

  if (saving) return <Notes />;

  return (
    <View style={[st.wrap, { backgroundColor: c.bg, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }]}>
      <View style={st.dots} accessibilityLabel={`Soru ${step + 1} / ${steps.length}`}>
        {steps.map((s, i) => (
          <View key={s.k} style={[st.dot, { backgroundColor: i <= step ? c.accent : c.line }]} />
        ))}
      </View>
      <Appear key={q.k} style={{ flex: 1, gap: 14 }}>
        <View style={st.head}>
          <Float amp={4} dur={2200}>
            <Image source={MOKA_ASSETS[q.k === 'budget' ? 'checklist' : q.k === 'cook' || q.k === 'effort' || q.k === 'tastes' ? 'chef' : 'happy']} style={st.moka} resizeMode="contain" accessibilityIgnoresInvertColors />
          </Float>
          <View style={{ flex: 1 }}>
            <T v="eyebrow">Seni tanıyalım</T>
            <T v="h2">{q.q}</T>
            <T v="small">{q.hint}</T>
          </View>
        </View>

        {q.multi ? (
          <View style={st.chips}>
            {q.opts.map(o => (
              <Chip key={o.v} label={`${o.emoji} ${o.label}`} on={ans.tastes.includes(o.v)} onPress={() => toggle(o.v)} />
            ))}
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {(q.opts as { v: unknown; emoji: string; label: string; sub?: string }[]).map(o => {
              const on = chosen[q.k] === o.v;
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
        {q.multi && <Btn kind="primary" label={ans.tastes.length ? 'Devam' : 'Hepsini severim, devam'} onPress={() => next(ans)} block />}
        {step > 0 && <Btn kind="ghost" label="‹ Geri" onPress={() => setStep(step - 1)} block />}
        {step === 0 && <Btn kind="ghost" label="Şimdilik geç" onPress={() => { skipPersona(); if (setupDone && router.canGoBack()) router.back(); }} block />}
      </View>
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
  dots: { flexDirection: 'row', gap: 6, justifyContent: 'center' },
  dot: { height: 6, flex: 1, maxWidth: 40, borderRadius: 3 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  moka: { width: 84, height: 84 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  opt: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.tile, borderWidth: 1.5 },
  track: { width: 220, height: 10, borderRadius: 5, overflow: 'hidden' },
  fill: { height: 10, borderRadius: 5 },
});
