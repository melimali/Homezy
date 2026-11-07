import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { weekGoal } from '@/domain/ramp';
import { useNow } from '@/hooks/useNow';
import { useStore } from '@/store/AppStore';
import { radius, useColors } from '@/theme';

import { Squish } from './motion';
import { Card, T } from './ui';

/**
 * Haftalık değerlendirme (tek dokunuş): hedef tutulduysa Moka kutlar; tutulmadıysa "Ne zorladı?" diye sorar
 * ve yargılamadan tek bir küçük ayar önerir. Cevap `Settings.obstacle` olarak saklanır.
 */
const OPTS = [
  { v: 'unutur', emoji: '🤷', label: 'Unuttum', reply: 'Sabah özetin seni hatırlatır. Saati Bildirimler\'den değiştirebilirsin.' },
  { v: 'yorulur', emoji: '😴', label: 'Yorgundum', reply: 'Yorgun günlerde Bugün\'deki "Hafif gün" düğmesi 1-2 işe indirir. Gün yine sayılır.' },
  { v: 'cok', emoji: '🥵', label: 'Çok işti', reply: 'Anladım. İşleri yeniden adım adım açıyorum, günde daha az görürsün.' },
  { v: 'sikilir', emoji: '🥱', label: 'Sıkıldım', reply: 'Bonus bölümünden ve Moka\'dan yeni küçük şeyler deneyelim.' },
] as const;

export function WeekReflect() {
  const c = useColors();
  const now = useNow();
  const { state: S, update } = useStore();
  const [pick, setPick] = useState<string | null>(null);
  const wk = weekGoal(S, now);
  if (!S.setup || S.play.days.length < 2) return null;
  const met = wk.done >= wk.goal;
  const ans = OPTS.find(o => o.v === pick);
  return (
    <Card>
      <T v="h3">{met ? 'Hedefi tuttun! 🎉' : 'Bu hafta nasıl geçti?'}</T>
      <T v="small">
        {met ? `Bu hafta ${wk.done} gün geldin. Yeni haftaya taze bir başlangıç ☕` : `${wk.done}/${wk.goal} gün. Sorun değil, ne zorladı?`}
      </T>
      {!met && !ans && (
        <View style={styles.row}>
          {OPTS.map(o => (
            <Squish
              key={o.v}
              onPress={() => {
                setPick(o.v);
                update(D => {
                  D.settings.obstacle = o.v === 'cok' ? 'hepsi' : o.v;
                  if (o.v === 'cok') D.settings.rampOff = false;
                });
              }}
              accessibilityRole="button"
              accessibilityLabel={o.label}
              style={[styles.chip, { backgroundColor: c.surface2 }]}
            >
              <T v="bold">{`${o.emoji} ${o.label}`}</T>
            </Squish>
          ))}
        </View>
      )}
      {ans && <T v="body">{ans.reply}</T>}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.pill ?? 999 },
});
