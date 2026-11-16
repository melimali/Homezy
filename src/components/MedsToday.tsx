import { StyleSheet, Text, View } from 'react-native';

import { Btn, Card, SecHead, T } from '@/components/ui';
import { dosesOn, doseState, markDose, type Dose } from '@/domain/meds';
import { dayKey } from '@/domain/play';
import { useNow } from '@/hooks/useNow';
import { useRouter } from '@/lib/nav';
import { useStore } from '@/store/AppStore';
import { useColors } from '@/theme';

/**
 * Bugün sekmesinde bugünün ilaçları: saat, doz, "Aldım" / "Atla" / "Geri al". Ayrıntı ve ilaç ekleme `/ilac` ekranında.
 * İlaç verisi sadece telefonda kalır (buluta ve Moka'ya gitmez, bkz. sync/cloud.ts forCloud).
 */
export function MedsToday() {
  const c = useColors();
  const now = useNow();
  const router = useRouter();
  const { state: S, update } = useStore();
  const today = dayKey(now);
  const doses = dosesOn(S, today);
  const taken = doses.filter(d => d.mark?.s === 'taken').length;

  const mark = (d: Dose, s: 'taken' | 'skipped' | null) => update(D => void markDose(D, today, d.key, s));

  // İlaç hiç eklenmemişse küçük bir davet; eklenmiş ama bugün doz yoksa kart gizlenir.
  if (!S.meds.length) {
    return (
      <Card>
        <SecHead title="💊 İlaçlarım" />
        <T v="small">İlaçlarını ekle, vaktinde hatırlatayım. Bilgilerin sadece telefonunda kalır.</T>
        <Btn kind="soft" label="+ İlaç ekle" onPress={() => router.push('/ilac?add=1' as never)} />
      </Card>
    );
  }
  if (!doses.length) return null;

  return (
    <Card>
      <SecHead title="💊 İlaçlarım" right={`${taken}/${doses.length}`} />
      <View style={{ gap: 10 }}>
        {doses.map(d => {
          const state = doseState(d, now);
          const bg = state === 'taken' ? c.okSoft : state === 'missed' ? c.todaySoft : c.surface2;
          return (
            <View key={d.key} style={[st.dose, { backgroundColor: bg }]}>
              <Text style={{ lineHeight: 29, fontSize: 22 }}>{state === 'taken' ? '✅' : state === 'skipped' ? '⏭️' : '💊'}</Text>
              <View style={{ flex: 1 }}>
                <T v="bold" style={{ fontSize: 15 }}>{d.med.name}</T>
                <T v="small">
                  {d.time}{d.med.dose ? ` · ${d.med.dose}` : ''}
                  {state === 'skipped' ? ' · atladın' : state === 'missed' ? ' · vakti geçti' : state === 'due' ? ' · şimdi' : ''}
                </T>
              </View>
              {d.mark ? (
                <Btn small label="Geri al" onPress={() => mark(d, null)} />
              ) : (
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <Btn small kind="primary" label="Aldım" onPress={() => mark(d, 'taken')} />
                  <Btn small label="Atla" onPress={() => mark(d, 'skipped')} />
                </View>
              )}
            </View>
          );
        })}
      </View>
      <View style={st.foot}>
        <Btn small kind="soft" label="+ İlaç ekle" onPress={() => router.push('/ilac?add=1' as never)} />
        <Btn small kind="ghost" label="Tümü ›" onPress={() => router.push('/ilac' as never)} />
      </View>
    </Card>
  );
}

const st = StyleSheet.create({
  dose: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 18, padding: 12 },
  foot: { flexDirection: 'row', gap: 8, justifyContent: 'space-between', marginTop: 4 },
});
