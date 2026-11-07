import { Image, StyleSheet, View } from 'react-native';

import { MOKA_ASSETS } from '@/constants/moka';
import { WHY_LINE } from '@/domain/kisilik';
import { dayKey } from '@/domain/play';
import { isLightDay, nextStageOf, pendingStage, stageFor, weekGoal } from '@/domain/ramp';
import { useNow } from '@/hooks/useNow';
import { track } from '@/lib/events';
import { tx } from '@/i18n/runtime';
import { useStore } from '@/store/AppStore';
import { radius, useColors } from '@/theme';

import { Float, Squish } from './motion';
import { Btn, Card, T } from './ui';

/**
 * Kademeli başlangıç kartı (Bugün'ün üstünde). Yeni bir aşamaya geçilince Moka kutlar; yoksa bugünün yükünü
 * ve bu haftanın hedefini gösterir. Ceza yok: "Hepsini aç" ile kademeli mod atlanabilir, geri alınabilir.
 */
export function RampCard() {
  const c = useColors();
  const now = useNow();
  const { state: S, update } = useStore();
  if (!S.setup) return null;

  const days = S.play.days.length;
  const off = !!S.settings.rampOff;
  const pending = off ? null : pendingStage(S);
  const st = stageFor(days);
  const next = nextStageOf(st);
  const wk = weekGoal(S, now);
  const light = isLightDay(S, now);
  const toggleLight = () => update(D => void (D.settings.lightDay = D.settings.lightDay === dayKey(now) ? null : dayKey(now)));

  if (pending) {
    return (
      <Card style={{ backgroundColor: c.accentSoft }}>
        <View style={styles.row}>
          <Float amp={4} dur={2200}>
            <Image source={MOKA_ASSETS.party} style={styles.moka} resizeMode="contain" accessibilityIgnoresInvertColors />
          </Float>
          <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
            <T v="eyebrow" style={{ marginBottom: 0 }}>{`${tx('Yeni aşama')} · ${pending.emoji} ${tx(pending.name)}`}</T>
            <T v="bold">{tx(pending.moka)}</T>
          </View>
        </View>
        <Btn kind="primary" label="Harika!" block onPress={() => { track('stage_up', String(pending.n)); update(D => void (D.settings.rampSeen = pending.n)); }} />
      </Card>
    );
  }

  if (off) {
    return (
      <Squish onPress={() => update(D => void (D.settings.rampOff = false))} accessibilityRole="button" style={[styles.slim, { backgroundColor: c.surface2 }]}>
        <T v="small" style={{ flex: 1 }}>Bütün işler açık.</T>
        <T v="small" style={{ color: c.accent }}>Kademeli moda dön ›</T>
      </Squish>
    );
  }

  const left = next ? Math.max(0, next.from - days) : 0;
  return (
    <Card>
      <View style={styles.row}>
        <T style={{ fontSize: 34 }}>{light ? '🫖' : st.emoji}</T>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <T v="bold">{light ? 'Hafif gün: bugün sadece 1-2 iş' : `${tx(st.name)} · ${tx(st.line)}`}</T>
          {!!S.settings.why && WHY_LINE[S.settings.why] && days < 7 && <T v="tiny">{`${tx('Hatırla')}: ${tx(WHY_LINE[S.settings.why])}`}</T>}
          <T v="tiny">
            {next
              ? `${left} ${tx('gün daha çalışınca')} ${next.emoji} ${tx(next.name)}: ${next.cap >= 99 ? tx('tüm işler açılır') : `${next.cap} ${tx('iş günde')}`}`
              : 'Bütün işlerin açık. Düzen sende 🏡'}
          </T>
        </View>
      </View>
      <View style={styles.dots} accessibilityLabel={`Bu hafta ${wk.done} / ${wk.goal} gün`}>
        {Array.from({ length: wk.goal }, (_, i) => (
          <View key={i} style={[styles.dot, { backgroundColor: i < wk.done ? c.accent : c.surface2 }]} />
        ))}
        <T v="tiny" style={{ marginLeft: 6 }}>{`Bu hafta ${Math.min(wk.done, wk.goal)}/${wk.goal} gün`}</T>
      </View>
      <View style={styles.dots}>
        {S.settings.lightDay !== dayKey(now) && light ? null : <Btn small kind="soft" label={S.settings.lightDay === dayKey(now) ? '🫖 Hafif günü kapat' : '🫖 Hafif gün'} onPress={() => { if (S.settings.lightDay !== dayKey(now)) track('light_day'); toggleLight(); }} />}
        {next && <Btn small kind="ghost" label="Hepsini aç" onPress={() => { track('ramp_skip'); update(D => void (D.settings.rampOff = true)); }} />}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  moka: { width: 72, height: 72 },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 22, height: 10, borderRadius: 6 },
  slim: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: radius.card },
});
