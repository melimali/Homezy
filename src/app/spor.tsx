import { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { PremiumLock } from '@/components/PremiumLock';
import { BackLink, Btn, Card, Chip, EmptyMsg, Screen, SecHead, T, XBtn } from '@/components/ui';
import { uid } from '@/domain/logic';
import { addDays, awardedToday, dayKey, dayTs, POINTS } from '@/domain/play';
import type { AppState, Settings, SportEntry, WorkoutGoal, WorkoutLevel } from '@/domain/types';
import { GOALS, LEVELS, monthByType, weeklyMinutes, weekPlan } from '@/domain/workout';
import { useNow } from '@/hooks/useNow';
import { usePlay } from '@/play/usePlay';
import { usePurchases } from '@/purchases/PurchasesProvider';
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
  const { premium } = usePurchases();
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

      {premium.active ? (
        <>
          <WorkoutPlan
            now={now}
            onPick={(t, m) => {
              setType(t);
              setMin(MINUTES.reduce((a, b) => (Math.abs(b - m) < Math.abs(a - m) ? b : a)));
            }}
          />
          <Charts sport={P.sport} now={now} />
        </>
      ) : (
        <PremiumLock
          emoji="📊"
          title="Spor grafikleri ve antrenman planı"
          text="Haftalık ve aylık grafiklerinle ilerlemeni gör. Hedefine göre sana özel haftalık antrenman planı hazırlayayım."
        />
      )}

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

/** Premium: hedef ve seviyeye göre bu haftanın planı. Bir güne dokununca o antrenman seçilir. */
function WorkoutPlan({ now, onPick }: { now: number; onPick: (type: string, min: number) => void }) {
  const c = useColors();
  const { state: S, update } = useStore();
  const w = S.settings.workout;
  const today = dayKey(now);
  const setW = (goal: WorkoutGoal, level: WorkoutLevel) => update(D => void (D.settings.workout = { goal, level }));

  if (!w)
    return (
      <Card>
        <SecHead title="Antrenman planım 📋" />
        <T v="small">Hedefini seç, spor günlerine göre haftalık plan hazırlayayım.</T>
        <View style={styles.wrap}>
          {GOALS.map(g => (
            <Chip key={g.id} label={`${g.emoji} ${g.name}`} on={false} onPress={() => setW(g.id, 'yeni')} />
          ))}
        </View>
      </Card>
    );

  const plan = weekPlan(w, S.settings.sportDays, now);
  const done = new Set(S.play.sport.map(x => x.day));
  return (
    <Card>
      <SecHead title="Antrenman planım 📋" right={GOALS.find(g => g.id === w.goal)?.emoji} />
      <View style={styles.wrap}>
        {GOALS.map(g => (
          <Chip key={g.id} label={g.name} on={w.goal === g.id} onPress={() => setW(g.id, w.level)} />
        ))}
      </View>
      <View style={styles.wrap}>
        {LEVELS.map(l => (
          <Chip key={l.id} label={l.name} on={w.level === l.id} onPress={() => setW(w.goal, l.id)} />
        ))}
      </View>
      {plan.map((p, i) => (
        <Pressable
          key={p.day}
          onPress={() => onPick(p.type, p.min)}
          accessibilityRole="button"
          accessibilityLabel={`${p.what}, ${p.min} dakika. Seç`}
          style={[styles.row, i > 0 && { borderTopWidth: 1.5, borderTopColor: c.line }]}
        >
          <Text style={{ fontSize: 20 }}>{done.has(p.day) ? '✅' : EMOJI[p.type] ?? '💪'}</Text>
          <View style={{ flex: 1 }}>
            <T v="bold" style={{ fontSize: 14, color: p.day === today ? c.ok : c.ink }}>
              {new Date(dayTs(p.day)).toLocaleDateString('tr-TR', { weekday: 'long' })}{p.day === today ? ' · bugün' : ''}
            </T>
            <T v="small">{p.what} · {p.min} dk</T>
          </View>
          <Text style={{ color: c.muted, fontSize: 18 }}>›</Text>
        </Pressable>
      ))}
      <T v="tiny">Spor günlerini aşağıdaki hatırlatma bölümünden değiştirebilirsin. Ağrın varsa zorlama, doktoruna danış.</T>
    </Card>
  );
}

/** Premium: son 8 haftanın dakikaları ve bu ayın türlere göre dağılımı. */
function Charts({ sport, now }: { sport: SportEntry[]; now: number }) {
  const c = useColors();
  const weeks = weeklyMinutes(sport, 8, now);
  const max = Math.max(60, ...weeks.map(w => w.min));
  const month = monthByType(sport, now);
  const monthTotal = month.reduce((a, [, m]) => a + m, 0);
  return (
    <Card>
      <SecHead title="Grafiklerim 📊" right="son 8 hafta" />
      <View style={styles.chart}>
        {weeks.map((w, i) => (
          <View key={w.start} style={styles.chartCol}>
            <Text style={[styles.chartN, { color: c.muted }]}>{w.min || ''}</Text>
            <View style={[styles.chartBar, { height: 4 + (w.min / max) * 86, backgroundColor: i === weeks.length - 1 ? c.hi : c.accentSoft }]} />
            <Text style={[styles.chartL, { color: c.muted }]}>
              {new Date(dayTs(w.start)).toLocaleDateString('tr-TR', { day: 'numeric', month: 'numeric' })}
            </Text>
          </View>
        ))}
      </View>
      <T v="h3">Bu ay · {monthTotal} dk</T>
      {month.map(([t, m]) => (
        <View key={t} style={styles.setRow}>
          <Text style={{ fontSize: 16, width: 24 }}>{EMOJI[t] ?? '💪'}</Text>
          <T v="small" style={{ width: 74 }}>{t}</T>
          <View style={[styles.hbar, { backgroundColor: c.surface2 }]}>
            <View style={{ width: `${(m / monthTotal) * 100}%`, height: '100%', borderRadius: radius.pill, backgroundColor: c.hi }} />
          </View>
          <T v="small" style={{ width: 52, textAlign: 'right' }}>{m} dk</T>
        </View>
      ))}
      {!month.length && <EmptyMsg>Bu ay henüz spor yok.</EmptyMsg>}
    </Card>
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
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 126 },
  chartCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 3 },
  chartBar: { width: '100%', borderRadius: 6 },
  chartN: { fontFamily: fonts.bodyBold, fontSize: 10 },
  chartL: { fontFamily: fonts.bodyBold, fontSize: 9.5 },
  hbar: { flex: 1, height: 10, borderRadius: radius.pill, overflow: 'hidden' },
  step: { width: 34, height: 34, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
});
