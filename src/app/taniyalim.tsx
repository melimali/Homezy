import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo, Animated, Easing, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput,
  useWindowDimensions, View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { router } from '@/lib/nav';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Appear, Float, Squish } from '@/components/motion';
import { MOKA_ASSETS, type MokaPose } from '@/constants/moka';
import { AXIS_NAMES, CUE_TIME, axesOf, DISC_QUESTIONS, sideOf, TYPES, typeOf, type Axes, type DiscAnswers } from '@/domain/kisilik';
import { DEFAULT_ANSWERS, PLAN, personaOf, QUESTIONS, type Answers } from '@/domain/persona';
import { savePersona, skipPersona, usePersona, type Disc } from '@/profile/usePersona';
import { saveActs } from '@/profile/useActs';
import { saveNickname, useNickname } from '@/profile/useName';
import { useStore } from '@/store/AppStore';
import { ForceScheme, fonts, useColors, type Colors } from '@/theme';

/** Moka'nın her seçeneğe tek cümlelik tepkisi (soru anahtarı:seçenek). EN karşılıkları src/i18n/en/m.ts. */
const REACT: Record<string, string> = {
  'who:ogrenci': 'Yurt odası da bir ev! Küçük ve hızlı işler seçerim.',
  'who:tek': 'Tek kişilik ev, tek kişilik plan. Sana yük olmayacak.',
  'who:cift': 'İki kişiyle işler bölünür, sırayı ben tutarım.',
  'who:anne': 'Minikler varken kısa ve esnek işler en iyisi.',
  'who:aile': 'Kendi odan senin alanın, oradan başlayalım.',
  'plan:detay': 'Saat saat plan, tam bana göre! Defterimi açıyorum.',
  'plan:kisa': 'Kısa liste, net hedef. Sade ve güzel.',
  'plan:esnek': 'Akışına bırakalım, ben sadece hafifçe hatırlatırım.',
  'start:hemen': 'Harika! O enerjiyi korumana yardım edeceğim.',
  'start:isinma': 'Önce bir kahve, sonra iş. Seni çok iyi anlıyorum.',
  'start:birazdan': 'Dürüstlüğüne bayıldım! İşleri 2 dakikalık adımlara bölerim.',
  'start:birakamam': 'Başladın mı durmazsın, molaları ben hatırlatırım.',
  'focus:10': 'Kısa turlar da sayılır. 10 dakikalık bloklar kuralım.',
  'focus:25': 'Klasik Pomodoro! 25 dakika odak, 5 dakika mola.',
  'focus:45': 'Güzel bir dayanıklılık. 45 dakikalık bloklar senin.',
  'focus:90': 'Vay! Derin odak ustasısın, uzun bloklar kuruyorum.',
  'quit:unutur': 'Unutmak çok normal, hatırlatmalar benden.',
  'quit:yorulur': 'Yorgun günler için hafif bir plan hazırlarım.',
  'quit:sikilir': 'Sıkılmaman için işleri küçük oyunlara çeviririm.',
  'quit:hepsi': 'Bir gün aksamak her şeyi bozmaz, seri dondurma var.',
  'quit:dikkat': 'Kısa ve tek odaklı işlerle seni toplarım.',
  'drive:puan': 'Puan ve seri mi? Yıldızları hazırladım!',
  'drive:soz': 'Sözüne sadık birisin. Ben de sana söz veriyorum.',
  'drive:odul': 'Her bitirdiğin işte küçük bir ödül seni bekler.',
  'drive:baski': 'Son tarihleri ben koyarım, sen sadece yetiş.',
  'drive:hedef': 'Kendi hedefin en güçlü yakıt. Ona odaklanalım.',
};

/** Soruya göre Moka pozu: önce düşünür, seçince sevinir. */
const POSE: Record<string, [MokaPose, MokaPose]> = {
  who: ['happy', 'love'],
  plan: ['checklist', 'thumbs_up'],
  start: ['sipping', 'party'],
  focus: ['analyzing', 'amazed'],
  quit: ['blanket', 'love'],
  drive: ['wink', 'party'],
};

type Opt = { v: string; emoji: string; label: string; sub?: string };

/**
 * Tanıtımdan sonra "seni tanıyalım": ad + 1 ev sorusu + 5 disiplin sorusu, her biri tek ekran.
 * Cevaplar kişilik tipine çevrilir, Moka "notlarını alıyor" ekranıyla bitirir ve tip kartı gösterilir.
 */
function TaniyalimInner() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const narrow = width < 360;
  const { state, update } = useStore();
  const setupDone = state.setup;
  const { answers: saved } = usePersona();
  const [ans, setAns] = useState<Answers>({ ...DEFAULT_ANSWERS, ...saved });
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const nick = useNickname();
  const [nameDone, setNameDone] = useState(!!nick);
  const [nm, setNm] = useState('');
  const [disc, setDisc] = useState<DiscAnswers>({});
  const [homeSel, setHomeSel] = useState<Record<string, string>>({});
  const [result, setResult] = useState<Disc | null>(null);

  // Geçiş: mevcut soru yukarı kayıp solar, yenisi aşağıdan gelir (geri dönüşte ters). Hareketi azalt açıksa anında.
  const [slide] = useState(() => new Animated.Value(0));
  const [fade] = useState(() => new Animated.Value(1));
  const busy = useRef(false);
  const [locked, setLocked] = useState(false);
  const reduce = useRef(false);
  useEffect(() => { AccessibilityInfo.isReduceMotionEnabled().then(v => { reduce.current = v; }).catch(() => {}); }, []);
  const transition = (dir: 1 | -1, swap: () => void, hold = 0) => {
    if (busy.current) return;
    if (reduce.current) { swap(); return; }
    busy.current = true;
    setLocked(true);
    // Önce seçili hâl kısa süre görünür (hold), sonra eski soru süzülüp çıkar, yenisi gelir. Dokunmalar bu sürede kilitli.
    Animated.sequence([
      Animated.delay(hold),
      Animated.parallel([
        Animated.timing(slide, { toValue: -dir * 28, duration: 200, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
        Animated.timing(fade, { toValue: 0, duration: 200, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ]),
    ]).start(() => {
      // Yeni içerik çizilene kadar görünmez kal (eski içeriğin geri parlamasını önler), sonra tek kez içeri gir.
      swap();
      slide.setValue(dir * 28);
      requestAnimationFrame(() => requestAnimationFrame(() => {
        Animated.parallel([
          Animated.timing(slide, { toValue: 0, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.timing(fade, { toValue: 1, duration: 320, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        ]).start(() => { busy.current = false; setLocked(false); });
      }));
    });
  };

  // Kısa test: 1 ev sorusu ("kimlerle yaşıyorsun"), "evde neler yaparsın" (çoklu), sonra 5 disiplin sorusu. Atlananlar varsayılana düşer.
  const home = QUESTIONS.filter(x => x.k === 'who');
  const stepsN = home.length + DISC_QUESTIONS.length;
  const inDisc = step >= home.length;
  const q = inDisc ? undefined : home[Math.min(step, home.length - 1)];
  const dq = inDisc ? DISC_QUESTIONS[Math.min(step - home.length, DISC_QUESTIONS.length - 1)] : undefined;

  const finish = (a: Answers, d: DiscAnswers) => {
    setSaving(true);
    setTimeout(() => {
      const p = personaOf(a);
      if (Array.isArray(d.acts)) saveActs(d.acts);
      update(D => {
        if (!D.setup) D.settings.time = typeof d.cue === 'string' && CUE_TIME[d.cue] ? CUE_TIME[d.cue] : PLAN[p].morning;
        if (typeof d.why === 'string') D.settings.why = d.why;
        if (typeof d.cue === 'string') D.settings.cue = d.cue;
        if (typeof d.quit === 'string') D.settings.obstacle = d.quit;
      });
      const axes = axesOf(d, a.style);
      const type = typeOf(axes, d);
      setResult({ type, side: sideOf(axes, d, type), axes, answers: d, at: Date.now() });
    }, 2600);
  };

  if (result) return <TypeScreen r={result} onDone={() => {
    // Kayıt "Başla"da: yeni kullanıcıda kayıt ekranı düşürür ve akış devam eder.
    savePersona(ans, true, result);
    if (setupDone && router.canGoBack()) router.back();
  }} />;
  if (saving) return <Notes />;

  const key = q?.k ?? dq?.k ?? 'who';
  const opts: Opt[] = (q ? (q.opts as { v: unknown; emoji: string; label: string; sub?: string }[]).map(o => ({ ...o, v: String(o.v) })) : dq?.opts) ?? [];
  const multi = !!dq?.multi;
  const sel: string | string[] | undefined = q ? homeSel[q.k] : dq ? disc[dq.k] : undefined;
  const isOn = (v: string) => (Array.isArray(sel) ? sel.includes(v) : sel === v);
  const last = Array.isArray(sel) ? sel[sel.length - 1] : sel;

  const pick = (v: string) => {
    if (busy.current) return;
    if (q) {
      setHomeSel(s => ({ ...s, [q.k]: v }));
      setAns(a => ({ ...a, [q.k]: q.opts.find(o => String(o.v) === v)?.v } as Answers));
    } else if (dq) {
      if (dq.multi) {
        const cur = (disc[dq.k] as string[] | undefined) ?? [];
        const nx = cur.includes(v) ? cur.filter(x => x !== v) : cur.length < (dq.max ?? 99) ? [...cur, v] : cur;
        setDisc(d => ({ ...d, [dq.k]: nx }));
      } else setDisc(d => ({ ...d, [dq.k]: v }));
    }
  };

  const next = () => {
    if (busy.current) return;
    if (!nameDone) { saveNickname(nm); transition(1, () => { setNameDone(true); setStep(0); }, 300); return; }
    if (step + 1 >= stepsN) finish(ans, disc);
    else transition(1, () => setStep(step + 1), has ? 350 : 150);
  };
  const back = () => (step > 0 ? transition(-1, () => setStep(step - 1)) : transition(-1, () => setNameDone(false)));
  const skip = () => { skipPersona(); if (setupDone && router.canGoBack()) router.back(); };

  const total = stepsN + 1; // ad sorusu dahil
  const page = nameDone ? step + 1 : 0;
  const has = Array.isArray(sel) ? sel.length > 0 : sel !== undefined;
  const ctaLabel = !nameDone ? (nm.trim() ? 'Devam' : 'Adsız devam') : multi && !has ? 'Şimdilik geç' : page + 1 >= total ? 'Bitir' : 'Devam';
  const ctaOn = !nameDone || multi || has;

  const bubble = !nameDone
    ? (nm.trim() ? `Memnun oldum, ${nm.trim()}!` : 'Merhaba, ben Moka! Seni adınla karşılamak isterim.')
    : (last && REACT[`${key}:${last}`]) || (q ?? dq)!.hint;
  const pose: MokaPose = !nameDone ? (nm.trim() ? 'wink' : 'happy') : (POSE[key] ?? ['happy', 'happy'])[has ? 1 : 0];
  const title = !nameDone ? 'Sana nasıl seslenelim?' : (q ?? dq)!.q;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={[st.wrap, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 14 }]}>
        <TopBar page={page} total={total} onBack={page > 0 ? back : undefined} onSkip={page <= 1 ? skip : undefined} />

        <Animated.View style={{ flex: 1, opacity: fade, transform: [{ translateY: slide }] }}>
          <ScrollView
            contentContainerStyle={st.center}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <MokaSays pose={pose} text={bubble} narrow={narrow} />
            <Text style={[st.title, { color: c.ink, fontSize: narrow ? 23 : 27, lineHeight: narrow ? 29 : 33 }]} accessibilityRole="header">
              {title}
            </Text>
            {!nameDone ? (
              <TextInput
                value={nm}
                onChangeText={setNm}
                placeholder="Adın"
                placeholderTextColor={c.muted}
                maxLength={20}
                autoCapitalize="words"
                returnKeyType="done"
                onSubmitEditing={next}
                accessibilityLabel="Adın"
                style={[st.input, { color: c.ink, backgroundColor: c.surface, borderColor: nm.trim() ? c.accent : c.line, shadowColor: c.shadow }]}
              />
            ) : (
              <View style={{ gap: 10 }} key={`${key}`}>
                {opts.map((o, i) => (
                  <View key={o.v}>
                    <OptionCard
                      opt={o}
                      qk={key}
                      tone={TONES[i % TONES.length]}
                      on={isOn(o.v)}
                      multi={multi}
                      narrow={narrow}
                      onPress={() => pick(o.v)}
                    />
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        </Animated.View>

        <Cta label={ctaLabel} enabled={ctaOn && !locked} onPress={next} />
      </View>
    </KeyboardAvoidingView>
  );
}

/** Quiz her zaman açık krem temada; durum çubuğu koyu simgeli. */
export default function Taniyalim() {
  return (
    <ForceScheme scheme="light">
      <StatusBar style="dark" />
      <TaniyalimInner />
    </ForceScheme>
  );
}

const TONES: [keyof Colors, keyof Colors][] = [
  ['peachSoft', 'peach'], ['sageSoft', 'sage'], ['lavenderSoft', 'lavender'], ['roseSoft', 'rose'], ['todaySoft', 'glow'],
];

/** Üst şerit: yuvarlak geri düğmesi, yumuşak ilerleme çubuğu, adım sayısı ve "Geç". */
function TopBar({ page, total, onBack, onSkip }: { page: number; total: number; onBack?: () => void; onSkip?: () => void }) {
  const c = useColors();
  const [w] = useState(() => new Animated.Value((page + 1) / total));
  useEffect(() => {
    Animated.timing(w, { toValue: (page + 1) / total, duration: 650, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }).start();
  }, [page, total, w]);
  return (
    <View style={st.top}>
      <View style={st.topSide}>
        {onBack && (
          <Pressable
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Geri"
            hitSlop={8}
            style={({ pressed }) => [st.iconBtn, { backgroundColor: pressed ? c.surface2 : c.surface, shadowColor: c.shadow }]}
          >
            <Svg width={20} height={20} viewBox="0 0 24 24">
              <Path d="M15 5l-7 7 7 7" stroke={c.ink} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </Svg>
          </Pressable>
        )}
      </View>
      <View style={{ flex: 1, gap: 5 }}>
        <View
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: total, now: page + 1 }}
          style={[st.track, { backgroundColor: c.surface2 }]}
        >
          <Animated.View style={[st.fill, { backgroundColor: c.accent, width: w.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
        </View>
        <Text style={[st.count, { color: c.muted }]}>{`${page + 1}/${total}`}</Text>
      </View>
      <View style={[st.topSide, { alignItems: 'flex-end' }]}>
        {onSkip && (
          <Pressable onPress={onSkip} accessibilityRole="button" hitSlop={10} style={st.skip}>
            <Text style={[st.skipTx, { color: c.muted }]}>Geç</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

/** Moka ve konuşma balonu: soruya ipucu, seçimden sonra tek cümlelik yorum. */
function MokaSays({ pose, text, narrow }: { pose: MokaPose; text: string; narrow: boolean }) {
  const c = useColors();
  const [pop] = useState(() => new Animated.Value(1));
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    pop.setValue(0.92);
    Animated.spring(pop, { toValue: 1, friction: 5, tension: 180, useNativeDriver: true }).start();
  }, [text, pop]);
  const size = narrow ? 64 : 78;
  return (
    <View style={st.mokaRow}>
      <Float amp={3} dur={2200}>
        <View style={[st.mokaDisc, { width: size + 8, height: size + 8, borderRadius: (size + 8) / 2, backgroundColor: c.glow }]}>
          <Image source={MOKA_ASSETS[pose]} style={{ width: size, height: size }} resizeMode="contain" accessibilityIgnoresInvertColors />
        </View>
      </Float>
      <Animated.View
        accessibilityLiveRegion="polite"
        style={[st.bubble, { backgroundColor: c.surface, shadowColor: c.shadow, transform: [{ scale: pop }] }]}
      >
        <View style={[st.tail, { backgroundColor: c.surface }]} />
        <Text style={[st.bubbleTx, { color: c.ink, fontSize: narrow ? 13.5 : 14.5 }]}>{text}</Text>
      </Animated.View>
    </View>
  );
}

/** Seçenek kartı: pastel zeminli büyük ikon, başlık, seçilince renk dolgusu, hafif büyüme ve tik. */
function OptionCard({ opt, qk, tone, on, multi, narrow, onPress }: {
  opt: Opt; qk: string; tone: [keyof Colors, keyof Colors]; on: boolean; multi: boolean; narrow: boolean; onPress: () => void;
}) {
  const c = useColors();
  const soft = c[tone[0]] as string;
  const strong = c[tone[1]] as string;
  const [s] = useState(() => new Animated.Value(on ? 1 : 0));
  useEffect(() => {
    Animated.spring(s, { toValue: on ? 1 : 0, friction: 6, tension: 160, useNativeDriver: true }).start();
  }, [on, s]);
  const scale = s.interpolate({ inputRange: [0, 1], outputRange: [1, 1.015] });
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Squish
        onPress={onPress}
        scaleTo={0.97}
        accessibilityRole={multi ? 'checkbox' : 'radio'}
        accessibilityState={{ selected: on, checked: on }}
        accessibilityLabel={opt.sub ? `${opt.label}, ${opt.sub}` : opt.label}
        style={[
          st.opt,
          { minHeight: narrow ? 64 : 72, backgroundColor: on ? soft : c.surface, borderColor: on ? strong : 'transparent', shadowColor: c.shadow },
        ]}
      >
        <View style={[st.icon, { width: narrow ? 46 : 52, height: narrow ? 46 : 52, backgroundColor: on ? c.surface : soft }]}>
          {qk === 'focus' ? <FocusDial min={Number(opt.v)} color={c.accent} track={strong} /> : (
            <Text style={{ fontSize: narrow ? 24 : 27 }}>{opt.emoji}</Text>
          )}
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[st.optLabel, { color: c.ink, fontSize: narrow ? 15.5 : 16.5 }]}>{opt.label}</Text>
          {!!opt.sub && <Text style={[st.optSub, { color: c.muted }]}>{opt.sub}</Text>}
        </View>
        <Animated.View
          style={[
            st.tick, multi ? { borderRadius: 9 } : null,
            { backgroundColor: c.accent, opacity: s, transform: [{ scale: s }] },
          ]}
        >
          <Svg width={14} height={14} viewBox="0 0 24 24">
            <Path d="M5 12.5l4.5 4.5L19 7.5" stroke={c.onAccent} strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </Svg>
        </Animated.View>
      </Squish>
    </Animated.View>
  );
}

/** Odak süresi ikonu: saat kadranında dolan yay (60 dk = tam tur; 90 dk iç halkayla). */
function FocusDial({ min, color, track }: { min: number; color: string; track: string }) {
  const R = 13, cx = 18, cy = 18;
  const arc = (r: number, frac: number) => {
    if (frac >= 1) return null;
    const a = frac * Math.PI * 2 - Math.PI / 2;
    const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
    return `M${cx} ${cy - r} A${r} ${r} 0 ${frac > 0.5 ? 1 : 0} 1 ${x.toFixed(2)} ${y.toFixed(2)}`;
  };
  const f = Math.min(min / 60, 1);
  const extra = min > 60 ? (min - 60) / 60 : 0;
  return (
    <Svg width={34} height={34} viewBox="0 0 36 36">
      <Circle cx={cx} cy={cy} r={R} stroke={track} strokeWidth={4} fill="none" />
      {f >= 1 ? <Circle cx={cx} cy={cy} r={R} stroke={color} strokeWidth={4} fill="none" /> : (
        <Path d={arc(R, f)!} stroke={color} strokeWidth={4} strokeLinecap="round" fill="none" />
      )}
      {extra > 0 && <Path d={arc(7, extra)!} stroke={color} strokeWidth={3.4} strokeLinecap="round" fill="none" />}
      {extra === 0 && <Circle cx={cx} cy={cy} r={2.4} fill={color} />}
    </Svg>
  );
}

/** Altta sabit, gradyanlı ana düğme. Pasifken soluk. */
function Cta({ label, enabled, onPress }: { label: string; enabled: boolean; onPress: () => void }) {
  const c = useColors();
  return (
    <Squish
      onPress={enabled ? onPress : undefined}
      disabled={!enabled}
      sound="pop"
      scaleTo={0.95}
      accessibilityRole="button"
      accessibilityState={{ disabled: !enabled }}
      accessibilityLabel={label}
      style={[st.cta, enabled ? { shadowColor: c.accent, shadowOpacity: 0.35, elevation: 6 } : { shadowOpacity: 0, elevation: 0, backgroundColor: c.surface2 }]}
    >
      {enabled && (
        <Svg style={StyleSheet.absoluteFill} preserveAspectRatio="none" viewBox="0 0 100 100">
          <Defs>
            <LinearGradient id="cta" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={c.ok} />
              <Stop offset="1" stopColor={c.accent} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100" height="100" fill="url(#cta)" />
        </Svg>
      )}
      <Text style={[st.ctaTx, { color: enabled ? c.onAccent : c.muted }]}>{label}</Text>
    </Squish>
  );
}

/** Sonuç: tip kartı (renkli zemin, Moka, ad, açıklama), yan tip, 5 eksen ve "Başla". */
function TypeScreen({ r, onDone }: { r: Disc; onDone: () => void }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const narrow = width < 360;
  const t = TYPES[r.type];
  const side = r.side ? TYPES[r.side] : null;
  const img = narrow ? 140 : 176;
  return (
    <View style={[st.wrap, { backgroundColor: c.bg, paddingTop: insets.top + 14, paddingBottom: insets.bottom + 14 }]}>
      <ScrollView contentContainerStyle={{ gap: 14, paddingBottom: 8, flexGrow: 1, justifyContent: 'center' }} showsVerticalScrollIndicator={false}>
        <Appear>
          <View style={[st.typeCard, { backgroundColor: t.bg, shadowColor: c.shadow }]}>
            <View style={[st.typeHalo, { width: img + 24, height: img + 24, borderRadius: (img + 24) / 2 }]}>
              <Float amp={5} dur={2000}>
                <Image source={t.img} style={{ width: img, height: img }} resizeMode="contain" accessibilityIgnoresInvertColors />
              </Float>
            </View>
            <Text style={[st.typeEyebrow, { color: c.ink }]}>Senin tipin</Text>
            <Text style={[st.typeName, { color: c.ink, fontSize: narrow ? 26 : 30 }]}>{t.name}</Text>
            <Text style={[st.typeSays, { color: c.ink }]}>{t.says}</Text>
            {side && (
              <View style={[st.sidePill, { backgroundColor: c.surface }]}>
                <Text style={[st.sideTx, { color: c.ink }]}>{`Biraz da ${side.name} gibisin ${side.emoji}`}</Text>
              </View>
            )}
          </View>
        </Appear>
        <Appear index={2}>
          <View style={[st.axisCard, { backgroundColor: c.surface, shadowColor: c.shadow }]}>
            {(Object.keys(AXIS_NAMES) as (keyof Axes)[]).map((k, i) => (
              <View key={k} style={st.axisRow}>
                <Text style={[st.axisName, { color: c.ink, width: narrow ? 88 : 104 }]} numberOfLines={1}>{AXIS_NAMES[k]}</Text>
                <View style={[st.track, { backgroundColor: c.surface2, flex: 1 }]}>
                  <View style={[st.fill, { backgroundColor: c[TONES[i % TONES.length][1]] as string, width: `${Math.max(6, r.axes[k] * 10)}%` }]} />
                </View>
              </View>
            ))}
          </View>
        </Appear>
      </ScrollView>
      <Cta label="Başla" enabled onPress={onDone} />
    </View>
  );
}

const NOTES = ['Moka notlarını alıyor…', 'Evin düzenini tartıyor…', 'Tariflerini ayarlıyor…', 'Neredeyse hazır ☕'];

/** Sorulardan sonra kısa yükleme: Moka not defterine yazar. */
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
    <View style={[st.wrap, { backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center', paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View accessibilityRole="progressbar" accessibilityLiveRegion="polite" style={{ alignItems: 'center', gap: 18 }}>
        <View style={[st.mokaDisc, { width: 190, height: 190, borderRadius: 95, backgroundColor: c.glow }]}>
          <Float amp={6} dur={1100}>
            <Image source={MOKA_ASSETS.checklist} style={{ width: 160, height: 160 }} resizeMode="contain" accessibilityIgnoresInvertColors />
          </Float>
        </View>
        <Text style={[st.title, { color: c.ink, fontSize: 21, lineHeight: 27 }]}>{NOTES[i]}</Text>
        <View style={[st.track, { backgroundColor: c.surface2, width: 220 }]}>
          <Animated.View style={[st.fill, { backgroundColor: c.accent, width: bar.interpolate({ inputRange: [0, 1], outputRange: ['6%', '100%'] }) }]} />
        </View>
      </View>
    </View>
  );
}

const shadow = { shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 10, elevation: 3 };

const st = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: 18, gap: 12 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 46 },
  topSide: { width: 44 },
  iconBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', ...shadow },
  skip: { paddingVertical: 8, paddingHorizontal: 4 },
  skipTx: { fontFamily: fonts.bodyBlack, fontSize: 15 },
  track: { height: 10, borderRadius: 5, overflow: 'hidden' },
  fill: { height: 10, borderRadius: 5 },
  count: { fontFamily: fonts.bodyBold, fontSize: 12, textAlign: 'center' },
  center: { flexGrow: 1, justifyContent: 'center', paddingVertical: 14, paddingHorizontal: 4, gap: 18 },
  mokaRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mokaDisc: { alignItems: 'center', justifyContent: 'center' },
  bubble: { flex: 1, borderRadius: 20, paddingVertical: 12, paddingHorizontal: 14, ...shadow },
  tail: { position: 'absolute', left: -6, top: '50%', marginTop: -7, width: 14, height: 14, borderRadius: 3, transform: [{ rotate: '45deg' }] },
  bubbleTx: { fontFamily: fonts.bodyBold, lineHeight: 20 },
  title: { fontFamily: fonts.displayBold, textAlign: 'center', paddingHorizontal: 4 },
  input: {
    fontFamily: fonts.bodyBold, fontSize: 19, borderWidth: 2, borderRadius: 22, paddingHorizontal: 20, paddingVertical: 16,
    textAlign: 'center', ...shadow,
  },
  opt: {
    flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10, paddingHorizontal: 12, paddingRight: 16,
    borderRadius: 22, borderWidth: 2, ...shadow,
  },
  icon: { borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  optLabel: { fontFamily: fonts.bodyBlack },
  optSub: { fontFamily: fonts.bodyBold, fontSize: 13 },
  tick: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  cta: {
    height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    shadowOffset: { width: 0, height: 8 }, shadowRadius: 14,
  },
  ctaTx: { fontFamily: fonts.bodyBlack, fontSize: 17, letterSpacing: 0.3 },
  typeCard: { borderRadius: 30, paddingVertical: 22, paddingHorizontal: 20, alignItems: 'center', gap: 4, ...shadow },
  typeHalo: { backgroundColor: 'rgba(255,255,255,0.45)', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  typeEyebrow: { fontFamily: fonts.bodyBlack, fontSize: 13, letterSpacing: 0.6, opacity: 0.7 },
  typeName: { fontFamily: fonts.displayBold, textAlign: 'center' },
  typeSays: { fontFamily: fonts.bodyBold, fontSize: 15.5, textAlign: 'center', lineHeight: 22 },
  sidePill: { marginTop: 10, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 14 },
  sideTx: { fontFamily: fonts.bodyBlack, fontSize: 13 },
  axisCard: { borderRadius: 22, padding: 16, gap: 12, ...shadow },
  axisRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  axisName: { fontFamily: fonts.bodyBlack, fontSize: 13.5 },
});
