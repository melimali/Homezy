import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Image, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from '@/lib/nav';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Appear, Float, Squish } from '@/components/motion';
import { Btn, T } from '@/components/ui';
import { MOKA_ASSETS } from '@/constants/moka';
import { AXIS_NAMES, CUE_TIME, axesOf, DISC_QUESTIONS, sideOf, TYPES, typeOf, type Axes, type DiscAnswers } from '@/domain/kisilik';
import { DEFAULT_ANSWERS, PLAN, personaOf, QUESTIONS, type Answers } from '@/domain/persona';
import { savePersona, skipPersona, usePersona, type Disc } from '@/profile/usePersona';
import { saveNickname, useNickname } from '@/profile/useName';
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
  const [ans, setAns] = useState<Answers>({ ...DEFAULT_ANSWERS, ...saved });
  const [step, setStep] = useState(0);
  const [chosen, setChosen] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const nick = useNickname();
  const [nameDone, setNameDone] = useState(!!nick);
  // Sayfa geçişi: mevcut soru yukarı kayıp solar, yenisi aşağıdan ortaya gelir (geri dönüşte ters yön).
  const [slide] = useState(() => new Animated.Value(0));
  const [fade] = useState(() => new Animated.Value(1));
  const busy = useRef(false);
  const reduce = useRef(false);
  useEffect(() => { AccessibilityInfo.isReduceMotionEnabled().then(v => { reduce.current = v; }).catch(() => {}); }, []);
  /** `swap` geçiş ortasında çalışır; dir 1 = ileri, -1 = geri. */
  const transition = (dir: 1 | -1, swap: () => void) => {
    if (busy.current) return;
    if (reduce.current) { swap(); return; }
    busy.current = true;
    Animated.parallel([
      Animated.timing(slide, { toValue: -dir * 56, duration: 170, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      Animated.timing(fade, { toValue: 0, duration: 170, useNativeDriver: true }),
    ]).start(() => {
      swap();
      slide.setValue(dir * 56);
      Animated.parallel([
        Animated.timing(slide, { toValue: 0, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(fade, { toValue: 1, duration: 260, useNativeDriver: true }),
      ]).start(() => { busy.current = false; });
    });
  };
  const goStep = (n: number) => transition(n >= step ? 1 : -1, () => setStep(n));
  const [nm, setNm] = useState('');
  const [disc, setDisc] = useState<DiscAnswers>({});
  const [result, setResult] = useState<Disc | null>(null);

  // Kısa test: 1 ev sorusu ("kimlerle yaşıyorsun"), sonra 5 disiplin sorusu (her eksen için bir tane).
  // Atlanan sorular varsayılana düşer (DEFAULT_ANSWERS); eski kayıtlı cevaplar korunur.
  const home = QUESTIONS.filter(x => x.k === 'who');
  const steps: { k: string }[] = [...home, ...DISC_QUESTIONS];
  const inDisc = step >= home.length;
  const q = inDisc ? undefined : home[Math.min(step, home.length - 1)];
  const dq = inDisc ? DISC_QUESTIONS[Math.min(step - home.length, DISC_QUESTIONS.length - 1)] : undefined;

  const finish = (a: Answers, d: DiscAnswers = disc) => {
    const final: Answers = a;
    setAns(final);
    setSaving(true);
    // Moka notlarını alırken: kayıt + varsayılanlar (sabah özeti saati).
    setTimeout(() => {
      const p = personaOf(final);
      update(D => {
        if (!D.setup) D.settings.time = typeof d.cue === 'string' && CUE_TIME[d.cue] ? CUE_TIME[d.cue] : PLAN[p].morning;
        if (typeof d.why === 'string') D.settings.why = d.why;
        if (typeof d.cue === 'string') D.settings.cue = d.cue;
        if (typeof d.quit === 'string') D.settings.obstacle = d.quit;
      });
      const axes = axesOf(d, final.style);
      const type = typeOf(axes, d);
      const r: Disc = { type, side: sideOf(axes, d, type), axes, answers: d, at: Date.now() };
      setResult(r);
    }, 2600);
  };

  const next = (a: Answers, d: DiscAnswers = disc) => {
    const total = home.length + DISC_QUESTIONS.length;
    if (step + 1 >= total) finish(a, d);
    else goStep(step + 1);
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
    if (!q) return;
    const a = { ...ans, [q.k]: v } as Answers;
    setAns(a);
    setChosen(x => ({ ...x, [q.k]: v }));
    next(a);
  };

  if (result) return <TypeScreen r={result} onDone={() => {
    // Kayıt "Devam"da yapılır: yeni kullanıcıda kayıt, ekranı korumadan düşürür ve akış devam eder.
    savePersona(ans, true, result);
    if (setupDone && router.canGoBack()) router.back();
  }} />;
  if (saving) return <Notes />;

  const mokaFor = !nameDone
    ? 'happy'
    : dq
      ? (dq.k === 'quit' ? 'blanket' : dq.k === 'drive' ? 'party' : dq.k === 'plan' ? 'checklist' : 'analyzing')
      : 'happy';
  const total = steps.length + 1; // nick sorusu dahil
  const page = nameDone ? step + 1 : 0;
  const pct = ((page + 1) / total) * 100;
  const cur = (q ?? dq)!;
  const discSel = dq ? ((disc[dq.k] as string[] | string | undefined) ?? (dq.multi ? [] : undefined)) : undefined;
  const goNick = () => { saveNickname(nm); transition(1, () => { setNameDone(true); setStep(0); }); };
  const back = () => (step > 0 ? goStep(step - 1) : transition(-1, () => setNameDone(false)));
  const skip = () => { skipPersona(); if (setupDone && router.canGoBack()) router.back(); };

  const footer = !nameDone
    ? <Btn kind="primary" label={nm.trim() ? 'Devam' : 'Adsız devam'} onPress={goNick} block />
    : dq?.multi
      ? <Btn kind="primary" label={(discSel as string[]).length ? 'Devam' : 'Şimdilik geç'} onPress={() => next(ans)} block />
      : null;

  return (
    <View style={[st.wrap, { backgroundColor: c.bg, paddingTop: insets.top + 10, paddingBottom: insets.bottom + 16 }]}>
      <View style={st.topRow}>
        <View style={{ width: 96 }}>
          {page > 0 && <Btn kind="ghost" label="‹ Geri" onPress={back} />}
        </View>
        <View style={st.topMid}>
          <View style={[st.mokaMini, { backgroundColor: c.surface2 }]}>
            <Image source={MOKA_ASSETS[mokaFor]} style={st.mokaMiniImg} resizeMode="contain" accessibilityIgnoresInvertColors />
          </View>
          <T v="small">{`Adım ${page + 1} / ${total}`}</T>
        </View>
        <View style={{ width: 96, alignItems: 'flex-end' }}>
          {page <= 1 && <Btn kind="ghost" label="Şimdilik geç" onPress={skip} />}
        </View>
      </View>
      <View accessibilityRole="progressbar" accessibilityLabel={`Adım ${page + 1} / ${total}`} style={[st.track, { backgroundColor: c.line }]}>
        <View style={[st.fill, { backgroundColor: c.accent, width: `${pct}%` }]} />
      </View>

      <Animated.View style={{ flex: 1, opacity: fade, transform: [{ translateY: slide }] }}>
        <ScrollView
          contentContainerStyle={st.center2}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {!nameDone ? (
            <View style={st.block}>
              <Question eyebrow="Seni tanıyalım" title="Sana nasıl seslenelim?" hint="Moka seni adınla karşılasın." />
              <TextInput
                value={nm}
                onChangeText={setNm}
                placeholder="Adın"
                placeholderTextColor={c.muted}
                maxLength={20}
                returnKeyType="done"
                onSubmitEditing={goNick}
                accessibilityLabel="Adın"
                style={{ fontFamily: fonts.bodyBold, fontSize: 18, color: c.ink, backgroundColor: c.surface, borderColor: c.line, borderWidth: 1.5, borderRadius: radius.tile, paddingHorizontal: 18, paddingVertical: 16 }}
              />
            </View>
          ) : (
            <View style={st.block}>
              <Question eyebrow="Seni tanıyalım" title={cur.q} hint={cur.hint} />
              <View style={{ gap: 10 }}>
                {dq
                  ? dq.opts.map(o => (
                      <Option
                        key={o.v}
                        emoji={o.emoji}
                        label={o.label}
                        multi={!!dq.multi}
                        on={dq.multi ? (discSel as string[]).includes(o.v) : discSel === o.v}
                        onPress={() => pickDisc(o.v)}
                      />
                    ))
                  : (q!.opts as { v: unknown; emoji: string; label: string; sub?: string }[]).map(o => (
                      <Option key={String(o.v)} emoji={o.emoji} label={o.label} sub={o.sub} on={chosen[q!.k] === o.v} onPress={() => pick(o.v)} />
                    ))}
              </View>
            </View>
          )}
        </ScrollView>
      </Animated.View>

      {footer}
    </View>
  );
}

/** Soru başlığı: ortalı küçük üst etiket, soru ve ipucu. */
function Question({ eyebrow, title, hint }: { eyebrow: string; title: string; hint: string }) {
  return (
    <View style={{ alignItems: 'center', gap: 4, paddingHorizontal: 8 }}>
      <T v="eyebrow" style={{ textAlign: 'center' }}>{eyebrow}</T>
      <T v="h2" style={{ textAlign: 'center' }}>{title}</T>
      <T v="small" style={{ textAlign: 'center' }}>{hint}</T>
    </View>
  );
}

/** Seçenek kartı: emoji rozeti, başlık, isteğe bağlı alt yazı, seçili işareti. */
function Option({ emoji, label, sub, on, multi, onPress }: { emoji: string; label: string; sub?: string; on: boolean; multi?: boolean; onPress: () => void }) {
  const c = useColors();
  return (
    <Squish
      onPress={onPress}
      accessibilityRole={multi ? 'checkbox' : 'button'}
      accessibilityState={{ selected: on, checked: on }}
      accessibilityLabel={label}
      style={[st.opt, { backgroundColor: on ? c.accentSoft : c.surface, borderColor: on ? c.accent : c.line }]}
    >
      <View style={[st.emojiBadge, { backgroundColor: on ? c.surface : c.surface2 }]}>
        <Text style={{ fontSize: 24 }}>{emoji}</Text>
      </View>
      <View style={{ flex: 1, gap: 1 }}>
        <Text style={{ fontFamily: fonts.bodyBlack, fontSize: 16, color: c.ink }}>{label}</Text>
        {!!sub && <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13.5, color: c.muted }}>{sub}</Text>}
      </View>
      <View style={[st.mark, multi ? st.markSq : st.markRound, { borderColor: on ? c.accent : c.line, backgroundColor: on ? c.accent : 'transparent' }]}>
        {on && <Text style={{ color: c.onAccent, fontSize: 13, fontFamily: fonts.bodyBlack }}>✓</Text>}
      </View>
    </Squish>
  );
}

/** Tip ekranı: büyük tip kartı, Moka'nın yorumu, 5 eksen çubuğu, yan renk. */
function TypeScreen({ r, onDone }: { r: Disc; onDone: () => void }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const t = TYPES[r.type];
  const side = r.side ? TYPES[r.side] : null;
  return (
    <View style={[st.wrap, { backgroundColor: c.bg, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
      <Appear style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ gap: 16, paddingBottom: 12 }} showsVerticalScrollIndicator={false}>
          <View style={[st.typeCard, { backgroundColor: t.bg }]}>
            <Float amp={5} dur={1800}>
              <Image source={t.img} style={{ width: 190, height: 190 }} resizeMode="contain" accessibilityIgnoresInvertColors />
            </Float>
            <Text style={[st.typeName, { color: '#283044' }]}>{t.emoji} {t.name}</Text>
            <Text style={[st.typeSays, { color: '#283044' }]}>{t.says}</Text>
          </View>
          {side && <T v="small" style={{ textAlign: 'center' }}>{`Biraz da ${side.name} gibisin ${side.emoji}`}</T>}
          <View style={[st.axisCard, { backgroundColor: c.surface, borderColor: c.line }]}>
            {(Object.keys(AXIS_NAMES) as (keyof Axes)[]).map(k => (
              <View key={k} style={st.axisRow}>
                <T v="small" style={{ width: 104 }}>{AXIS_NAMES[k]}</T>
                <View style={[st.track, { backgroundColor: c.line, flex: 1 }]}>
                  <View style={[st.fill, { backgroundColor: c.accent, width: `${r.axes[k] * 10}%` }]} />
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
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
        <View style={[st.track, { backgroundColor: c.line, width: 220 }]}>
          <Animated.View style={[st.fill, { backgroundColor: c.accent, width: bar.interpolate({ inputRange: [0, 1], outputRange: ['6%', '100%'] }) }]} />
        </View>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: 20, gap: 14 },
  center: { alignItems: 'center', justifyContent: 'center' },
  topRow: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
  topMid: { flex: 1, alignItems: 'center', gap: 2 },
  mokaMini: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  mokaMiniImg: { width: 32, height: 32 },
  center2: { flexGrow: 1, justifyContent: 'center', paddingVertical: 12 },
  block: { gap: 22 },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  mokaBadge: { width: 84, height: 84, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  moka: { width: 68, height: 68 },
  opt: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: radius.tile, borderWidth: 1.5, minHeight: 64 },
  emojiBadge: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  mark: { width: 24, height: 24, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  markRound: { borderRadius: 12 },
  markSq: { borderRadius: 8 },
  typeCard: { borderRadius: 28, padding: 20, alignItems: 'center', gap: 6 },
  typeName: { fontFamily: fonts.bodyBlack, fontSize: 24, textAlign: 'center' },
  typeSays: { fontFamily: fonts.bodyBold, fontSize: 15, textAlign: 'center', lineHeight: 21 },
  axisCard: { borderRadius: radius.tile, borderWidth: 1, padding: 16, gap: 12 },
  axisRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
