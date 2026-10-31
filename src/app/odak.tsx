import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { MokaMascot } from '@/components/MokaMascot';
import { BackLink, Btn, Card, Chip, Screen, SecHead, T } from '@/components/ui';
import { useToast } from '@/components/Toast';
import { addFocus, focusToday, focusXp, mokaLevel } from '@/domain/mokaLevel';
import { scheduleFocusEnd, cancelFocusEnd } from '@/notifications/focus';
import { sfx } from '@/lib/sfx';
import { useStore } from '@/store/AppStore';
import { radius, useColors } from '@/theme';

const MINUTES = [15, 25, 45, 60];
const TOPICS = ['📚 Ders', '📖 Okuma', '💻 İş', '✏️ Proje', '🧘 Diğer'];
const pad = (n: number) => String(n).padStart(2, '0');

type Run = { endsAt: number; min: number; topic: string };

/** Odak (Pomodoro): süre seç, Moka seninle çalışsın. Biten oturum Zeka exp'si kazandırır. */
export default function Odak() {
  const c = useColors();
  const toast = useToast();
  const { state: S, update } = useStore();
  // Moka sohbetinden gelince süre ve konu hazır gelir.
  const params = useLocalSearchParams<{ min?: string; topic?: string; auto?: string }>();
  const [min, setMin] = useState(() => MINUTES.reduce((a, m) => (Math.abs(m - Number(params.min)) < Math.abs(a - Number(params.min)) ? m : a), 25));
  const [topic, setTopic] = useState(() => (TOPICS.includes(String(params.topic)) ? String(params.topic) : TOPICS[0]));
  const [run, setRun] = useState<Run | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const finish = useCallback(
    (r: Run, minutes: number) => {
      setRun(null);
      cancelFocusEnd();
      let gained = 0;
      let up = 0;
      update(D => {
        gained = addFocus(D.play, minutes, r.topic);
        const lv = mokaLevel(D.play.moka).level;
        if (lv > D.play.moka.seen) {
          up = lv;
          D.play.moka.seen = lv;
        }
      });
      if (gained) sfx(up ? 'party' : 'done');
      toast(up ? `🎉 Moka ${up}. seviye oldu! +${gained} Zeka` : gained ? `🧠 +${gained} Zeka · ${minutes} dk odak` : 'Kısa oturum, exp için en az 10 dk lazım 🤍');
    },
    [update, toast],
  );

  // Süre dolunca oturum, saniye sayacıyla aynı zamanlayıcıda biter (effect içinde state yazmadan).
  useEffect(() => {
    if (!run) return;
    const t = setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (n >= run.endsAt) finish(run, run.min);
    }, 500);
    return () => clearInterval(t);
  }, [run, finish]);

  const start = (minutes = min) => {
    const r = { endsAt: Date.now() + minutes * 60000, min: minutes, topic };
    setRun(r);
    setNow(Date.now());
    scheduleFocusEnd(r.endsAt, topic);
    sfx('pop');
  };
  // Moka sohbeti `auto=1` ile açtıysa oturum kendiliğinden, istenen süreyle başlar.
  const auto = useRef(params.auto === '1');
  useEffect(() => {
    if (!auto.current) return;
    auto.current = false;
    const m = Math.floor(Number(params.min));
    start(m >= 10 && m <= 90 ? m : min);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const stop = () => {
    if (!run) return;
    const done = Math.floor((min_(run) - Math.max(0, run.endsAt - Date.now())) / 60000);
    finish(run, done);
  };

  const left = run ? Math.max(0, run.endsAt - now) : min * 60000;
  const total = run ? run.min * 60000 : min * 60000;
  const pct = run ? Math.round((100 * (total - left)) / total) : 0;
  const lv = mokaLevel(S.play.moka);
  const today = focusToday(S.play, now);

  return (
    <Screen header={false} tone="sky">
      <BackLink />
      <T v="h1">Odak 🍅</T>
      <Card>
        <View style={st.center}>
          <MokaMascot pose={run ? (run.topic.includes('Okuma') ? 'reading' : 'laptop') : 'sipping'} size="lg" showBubble={false} />
          <T style={[st.clock, { color: c.ink }]}>{pad(Math.floor(left / 60000))}:{pad(Math.floor((left % 60000) / 1000))}</T>
          <View style={[st.track, { backgroundColor: c.surface2 }]}>
            <View style={[st.fill, { width: `${pct}%`, backgroundColor: c.accent }]} />
          </View>
          <T v="small">{run ? `Moka seninle çalışıyor · ${run.topic}` : 'Süreyi seç, Moka yanında çalışsın'}</T>
        </View>
      </Card>
      {!run ? (
        <Card>
          <SecHead title="Süre" h="h3" right={`+${focusXp(min)} Zeka`} />
          <View style={st.row}>{MINUTES.map(m => <Chip key={m} label={`${m} dk`} on={min === m} onPress={() => setMin(m)} />)}</View>
          <SecHead title="Ne çalışıyorsun?" h="h3" />
          <View style={st.row}>{TOPICS.map(t => <Chip key={t} label={t} on={topic === t} onPress={() => setTopic(t)} />)}</View>
          <Btn kind="primary" label="Başla" block onPress={() => start()} />
        </Card>
      ) : (
        <Btn label="Bitir" block onPress={stop} />
      )}
      <Card>
        <T v="bold">🧠 Moka seviye {lv.level}</T>
        <T v="small">Bugün {today} dk odak · sonraki seviyeye {lv.need - lv.into} exp</T>
      </Card>
    </Screen>
  );
}

const min_ = (r: Run) => r.min * 60000;

const st = StyleSheet.create({
  center: { alignItems: 'center', gap: 10 },
  clock: { fontSize: 56, lineHeight: 64, fontVariant: ['tabular-nums'] },
  track: { alignSelf: 'stretch', height: 10, borderRadius: radius.pill ?? 99, overflow: 'hidden' },
  fill: { height: 10, borderRadius: 99 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
