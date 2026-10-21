import { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { BackLink, Btn, Card, Chip, EmptyMsg, Screen, SecHead, T, XBtn } from '@/components/ui';
import { uid } from '@/domain/logic';
import { addDays, awardedToday, dayKey, dayTs, POINTS } from '@/domain/play';
import type { AppState, Settings } from '@/domain/types';
import { useNow } from '@/hooks/useNow';
import { usePlay } from '@/play/usePlay';
import { useStore } from '@/store/AppStore';
import { fonts, radius, useColors } from '@/theme';

const SPORTS: [string, string][] = [
  ['🚶', 'Yürüyüş'], ['🏃', 'Koşu'], ['🚴', 'Bisiklet'], ['🏊', 'Yüzme'],
  ['🧘', 'Yoga'], ['🏋️', 'Fitness'], ['🤸', 'Pilates'], ['⚽', 'Diğer'],
];
const EMOJI = Object.fromEntries(SPORTS.map(([e, n]) => [n, e]));
const MINUTES = [10, 20, 30, 45, 60, 90];
/** Pazartesiden başlayan hafta günleri; değerler Date.getDay() (0 pazar). */
const WEEK: [number, string][] = [[1, 'Pt'], [2, 'Sa'], [3, 'Ça'], [4, 'Pe'], [5, 'Cu'], [6, 'Ct'], [0, 'Pz']];
const pad = (n: number) => String(n).padStart(2, '0');

/** Spor: bugün ne yaptın, bu hafta kaç gün, hatırlatma günleri ve saati. */
export default function Spor() {
  const c = useColors();
  const now = useNow();
  const { state: S, update } = useStore();
  const { award } = usePlay();
  const [type, setType] = useState('Yürüyüş');
  const [min, setMin] = useState(30);
  const today = dayKey(now);
  const P = S.play;
  const doneToday = awardedToday(P, 'spor', 'spor', now);
  const set = S.settings;

  const save = () => {
    const label = `${EMOJI[type]} ${type} · ${min} dk`;
    const add = (D: AppState) => {
      D.play.sport.unshift({ id: uid(), day: today, type, min, at: Date.now() });
      D.play.sport.splice(400);
    };
    if (doneToday) {
      update(D => {
        add(D);
        (D.play.log[today] ||= []).push(label);
      });
      return;
    }
    award('spor', 'spor', label, `${type} ${min} dk`, add);
  };
  const remove = (id: string) => void update(D => void (D.play.sport = D.play.sport.filter(x => x.id !== id)));

  // Bu hafta (pazartesiden bugüne).
  const dow = (new Date(now).getDay() + 6) % 7;
  const monday = addDays(today, -dow);
  const week = WEEK.map(([, label], i) => {
    const d = addDays(monday, i);
    const mins = P.sport.filter(x => x.day === d).reduce((a, x) => a + x.min, 0);
    return { d, label, mins, future: d > today };
  });
  const weekMin = week.reduce((a, x) => a + x.mins, 0);
  const weekDays = week.filter(x => x.mins > 0).length;
  const goal = Math.max(1, set.sportDays.length);

  const setS = <K extends keyof Settings>(k: K, v: Settings[K]) => void update(D => void (D.settings[k] = v));
  const toggleDay = (d: number) =>
    setS('sportDays', set.sportDays.includes(d) ? set.sportDays.filter(x => x !== d) : [...set.sportDays, d].sort());
  const [hh, mm] = set.sportTime.split(':').map(n => parseInt(n, 10));
  const shift = (dm: number) => {
    const total = ((Math.round((hh * 60 + mm + dm) / 15) * 15) % 1440 + 1440) % 1440;
    setS('sportTime', `${pad(Math.floor(total / 60))}:${pad(total % 60)}`);
  };

  const history = P.sport.slice(0, 12);

  return (
    <Screen header={false}>
      <BackLink />
      <View>
        <T v="eyebrow">Spor</T>
        <T v="h1">Bugün hareket ettin mi? 🏃</T>
        <T v="lead">Spor da serini sürdürür. Günün ilk sporu +{POINTS.spor} puan ⭐</T>
      </View>

      <Card>
        <SecHead title={doneToday ? 'Bir spor daha ekle' : 'Ne yaptın?'} right={doneToday ? '✅ bugün tamam' : undefined} />
        <View style={styles.wrap}>
          {SPORTS.map(([e, n]) => (
            <Chip key={n} label={`${e} ${n}`} on={type === n} onPress={() => setType(n)} />
          ))}
        </View>
        <T v="h3">Kaç dakika?</T>
        <View style={styles.wrap}>
          {MINUTES.map(m => (
            <Chip key={m} label={`${m} dk`} on={min === m} onPress={() => setMin(m)} />
          ))}
        </View>
        <Btn kind="primary" label={doneToday ? 'Kaydet' : `Tamamladım · +${POINTS.spor} ⭐`} onPress={save} />
      </Card>

      <Card>
        <SecHead title="Bu hafta" right={`${weekDays}/${goal} gün · ${weekMin} dk`} />
        <View style={styles.week}>
          {week.map(x => (
            <View key={x.d} style={{ alignItems: 'center', gap: 4, flex: 1 }}>
              <View
                style={[
                  styles.dayDot,
                  { backgroundColor: x.mins ? c.hi : x.future ? 'transparent' : c.surface2, borderColor: x.d === today ? c.ink : c.line },
                ]}
              >
                <Text style={{ fontSize: 14 }}>{x.mins ? '💪' : ''}</Text>
              </View>
              <Text style={[styles.dayLabel, { color: x.d === today ? c.ink : c.muted }]}>{x.label}</Text>
            </View>
          ))}
        </View>
        {weekDays >= goal && <T v="small" style={{ color: c.ok, fontFamily: fonts.bodyBlack }}>Haftalık hedefe ulaştın! 🎉</T>}
      </Card>

      <Card>
        <SecHead title="Son sporlar" />
        {history.map((x, i) => (
          <View key={x.id} style={[styles.row, i > 0 && { borderTopWidth: 1.5, borderTopColor: c.line }]}>
            <Text style={{ fontSize: 20 }}>{EMOJI[x.type] ?? '💪'}</Text>
            <View style={{ flex: 1 }}>
              <T v="bold" style={{ fontSize: 14 }}>{x.type} · {x.min} dk</T>
              <T v="small">{new Date(dayTs(x.day)).toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })}</T>
            </View>
            <XBtn onPress={() => remove(x.id)} label={`${x.type} kaydını sil`} />
          </View>
        ))}
        {!history.length && <EmptyMsg>Henüz spor kaydı yok. İlk adımı bugün at! 👟</EmptyMsg>}
      </Card>

      <Card>
        <SecHead title="Spor hatırlatması" />
        <View style={styles.setRow}>
          <View style={{ flex: 1 }}>
            <T v="bold" style={{ fontSize: 14 }}>Hatırlat</T>
            <T v="small">Seçtiğin günlerde, o gün spor yapmadıysan</T>
          </View>
          <Switch
            value={set.sport}
            onValueChange={v => setS('sport', v)}
            accessibilityLabel="Spor hatırlatması"
            trackColor={{ true: c.hi, false: c.line }}
            thumbColor={c.surface}
            ios_backgroundColor={c.line}
          />
        </View>
        {set.sport && (
          <>
            <View style={styles.wrap}>
              {WEEK.map(([d, label]) => (
                <Chip key={d} label={label} on={set.sportDays.includes(d)} onPress={() => toggleDay(d)} />
              ))}
            </View>
            <View style={styles.setRow}>
              <T v="bold" style={{ fontSize: 14, flex: 1 }}>Saat</T>
              <Step label="−" a11y="Saati 15 dakika geri al" onPress={() => shift(-15)} />
              <Text style={[styles.time, { color: c.ink }]}>{set.sportTime}</Text>
              <Step label="+" a11y="Saati 15 dakika ileri al" onPress={() => shift(15)} />
            </View>
          </>
        )}
      </Card>
    </Screen>
  );
}

function Step({ label, a11y, onPress }: { label: string; a11y: string; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={a11y} hitSlop={4}
      style={({ pressed }) => [styles.step, { backgroundColor: c.surface2 }, pressed && { opacity: 0.7 }]}>
      <Text style={{ fontFamily: fonts.bodyBlack, fontSize: 17, color: c.ink }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  week: { flexDirection: 'row', justifyContent: 'space-between' },
  dayDot: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  dayLabel: { fontFamily: fonts.bodyBlack, fontSize: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  time: { fontFamily: fonts.bodyBlack, fontSize: 16, fontVariant: ['tabular-nums'], minWidth: 48, textAlign: 'center' },
  step: { width: 34, height: 34, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
});
