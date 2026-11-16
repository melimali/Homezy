import { useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { MOKA_ASSETS } from '@/constants/moka';
import { taskMin } from '@/domain/home';
import { allTasks, doneToday, placeOf } from '@/domain/logic';
import { COMEBACK_AFTER, comeback, intentFor, isEvening, setIntent, tomorrow, TWO_MIN, WHEN } from '@/domain/niyet';
import { DAY } from '@/domain/constants';
import { dayKey, progressOf } from '@/domain/play';
import { weekGoal } from '@/domain/ramp';
import type { TaskRef } from '@/domain/types';
import { useNow } from '@/hooks/useNow';
import { tx } from '@/i18n/runtime';
import { useStore } from '@/store/AppStore';
import { radius, useColors } from '@/theme';

import { Float, Squish } from './motion';
import { useTask } from './TaskRow';
import { Btn, Card, T } from './ui';

/**
 * "Bugün bir şey": disiplin kartı (Bugün'de sıradaki işin altında). Tek kart, duruma göre değişir:
 * - Geri dönüş (2+ gün ara): suçlamadan karşılar, tek 2 dakikalık işle başlatır.
 * - Gün içinde: if-then niyet ("ne zaman / nerede / ne") ve "başlamak zor mu? sadece 2 dakika" sayacı.
 * - Akşam (19:00 sonrası): gün sonu özeti, hafta hedefi ve yarın için tek iş + niyet.
 */
export function OdakCard({ next, total, doneN }: { next?: TaskRef; total: number; doneN: number }) {
  const c = useColors();
  const now = useNow();
  const { state: S, update } = useStore();
  if (!S.setup || S.mode?.k === 'tatil') return null;

  const back = comeback(S, now);
  const today = dayKey(now);
  const intent = intentFor(S, today);

  if (back >= COMEBACK_AFTER && next) {
    return (
      <Card style={{ backgroundColor: c.accentSoft }}>
        <View style={st.row}>
          <Float amp={3} dur={2600}>
            <Image source={MOKA_ASSETS.happy} style={st.moka} resizeMode="contain" accessibilityIgnoresInvertColors />
          </Float>
          <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
            <T v="eyebrow" style={{ marginBottom: 0 }}>Tekrar hoş geldin</T>
            <T v="bold">{tx(`${back} gün ara verdin, sorun değil. Hiçbir şey kaybolmadı.`)}</T>
            <T v="small">Bugün sadece tek bir küçük iş. 2 dakika yeter, gün sayılır.</T>
          </View>
        </View>
        <TwoMin x={next} />
      </Card>
    );
  }

  if (isEvening(now)) {
    const p = progressOf(S.play, now);
    const wk = weekGoal(S, now);
    const tm = tomorrow(now);
    const tIntent = intentFor(S, tm);
    const pick = allTasks(S, now + DAY)
      .filter(x => x.s.k !== 'ok' && x.list !== 'care')
      .sort((a, b) => taskMin(a.t) - taskMin(b.t) || a.s.diff - b.s.diff)[0];
    return (
      <Card>
        <T v="eyebrow">Gün sonu</T>
        <T v="bold">
          {doneN > 0
            ? `${tx(`Bugün ${doneN} iş yaptın.`)}${p.streak > 0 ? ' ' + tx(`Seri: ${p.streak} gün.`) : ''}`
            : tx('Bugün dinlendin, sorun değil. Yarın 2 dakikalık bir işle başla.')}
        </T>
        <T v="small">{tx(`Bu hafta ${Math.min(wk.done, wk.goal)}/${wk.goal} gün`)}{total > doneN && doneN > 0 ? ` · ${tx('kalanlar yarın da olur')}` : ''}</T>
        {pick && (
          <View style={{ gap: 8, marginTop: 6 }}>
            <T v="small">{`${tx('Yarın için tek iş')}: ${tx(pick.t.name)} · ${tx(placeOf(S, pick.rid).name)}`}</T>
            <View style={st.chips}>
              {WHEN.map(w => {
                const on = tIntent?.when === w.k && tIntent.task === pick.t.name;
                return (
                  <Squish
                    key={w.k}
                    onPress={() => update(D => setIntent(D, { day: tm, when: w.k, task: pick.t.name, place: placeOf(S, pick.rid).name }))}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    style={[st.chip, { backgroundColor: on ? c.accent : c.surface2 }]}
                  >
                    <T v="tiny" style={{ color: on ? c.onAccent : c.ink }}>{`${w.emoji} ${tx(w.label)}`}</T>
                  </Squish>
                );
              })}
            </View>
            {tIntent && <T v="tiny">{`📌 ${tx('Yarın')}: ${tx(WHEN.find(w => w.k === tIntent.when)?.label ?? '')}, ${tx(tIntent.place)}: ${tx(tIntent.task)}`}</T>}
          </View>
        )}
      </Card>
    );
  }

  if (!next || doneN >= total) return null;
  const place = placeOf(S, next.rid).name;
  const mine = intent && intent.task === next.t.name ? intent : null;
  return (
    <Card>
      <T v="eyebrow">Bugün bir şey</T>
      {mine ? (
        <T v="bold">{`📌 ${tx(WHEN.find(w => w.k === mine.when)?.label ?? '')}, ${tx(mine.place)}: ${tx(mine.task)}`}</T>
      ) : (
        <>
          <T v="small">{`${tx('Ne zaman yapacaksın?')} ${tx(next.t.name)} · ${tx(place)}`}</T>
          <View style={st.chips}>
            {WHEN.map(w => (
              <Squish
                key={w.k}
                onPress={() => update(D => setIntent(D, { day: today, when: w.k, task: next.t.name, place }))}
                accessibilityRole="button"
                style={[st.chip, { backgroundColor: c.surface2 }]}
              >
                <T v="tiny">{`${w.emoji} ${tx(w.label)}`}</T>
              </Squish>
            ))}
          </View>
          <T v="tiny">Ne zaman ve nerede yapacağını söylemek, yapma ihtimalini artırır.</T>
        </>
      )}
      {!doneToday(next.t, now) && <TwoMin x={next} />}
    </Card>
  );
}

/** 2 dakika kuralı: sadece başla. Sayaç bitince istersen bitir, istersen bırak; başlamak yeterdi. */
function TwoMin({ x }: { x: TaskRef }) {
  const c = useColors();
  const k = useTask(x.t, x.rid, x.list);
  const [end, setEnd] = useState<number | null>(null);
  const [clock, setClock] = useState(0);
  useEffect(() => {
    if (end == null) return;
    const id = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(id);
  }, [end]);
  if (k.doneToday) return null;
  const left = end == null ? TWO_MIN : Math.max(0, Math.ceil((end - Math.max(clock, end - TWO_MIN * 1000)) / 1000));
  if (end == null) {
    return <Btn kind="soft" block label={`⏱️ ${tx('Başlamak zor mu? Sadece 2 dakika')}`} onPress={() => setEnd(Date.now() + TWO_MIN * 1000)} />;
  }
  if (left > 0) {
    return (
      <View style={[st.timer, { backgroundColor: c.surface2 }]}>
        <T v="h2">{`${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`}</T>
        <T v="small" style={{ flex: 1 }}>{`${tx(x.t.name)}: ${tx('sadece başla, bitirmek zorunda değilsin.')}`}</T>
        <Btn small kind="ghost" label="Durdur" onPress={() => setEnd(null)} />
      </View>
    );
  }
  return (
    <View style={{ gap: 8 }}>
      <T v="small">2 dakika oldu! Başlamak en zor kısımdı. İstersen bitir, istersen burada bırak.</T>
      <View style={st.chips}>
        <Btn small kind="primary" label={k.action} onPress={k.act} />
        <Btn small kind="ghost" label="Burada bırak" onPress={() => setEnd(null)} />
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  moka: { width: 68, height: 68 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill },
  timer: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: radius.tile, padding: 12 },
});
