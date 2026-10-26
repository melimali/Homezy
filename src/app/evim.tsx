import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useToast } from '@/components/Toast';
import { BackLink, Btn, Card, Screen, T } from '@/components/ui';
import { applyProfile, PROFILE } from '@/domain/home';
import type { HomeProfile } from '@/domain/types';
import { useStore } from '@/store/AppStore';
import { fonts, radius, useColors } from '@/theme';

/**
 * Kurulum soruları: evcil hayvan, bulaşık makinesi, halı, kombi, klima, su arıtma, bitki.
 * Cevaplara göre rutinler eklenir ya da kaldırılır. İlk kurulumda plandan sonra açılır,
 * sonra Plan ekranından değiştirilebilir.
 */
export default function Evim() {
  const c = useColors();
  const router = useRouter();
  const toast = useToast();
  const { ilk } = useLocalSearchParams<{ ilk?: string }>();
  const first = ilk === '1';
  const { state: S, update } = useStore();
  const [ans, setAns] = useState<HomeProfile>(S.home);

  const save = () => {
    update(D => applyProfile(D, ans));
    if (first) {
      router.replace('/');
      toast('Evin hazır. Rutinlerini cevaplarına göre ayarladım 🏡');
    } else {
      router.back();
      toast('Cevapların kaydedildi, rutinler güncellendi.');
    }
  };

  return (
    <Screen header={false}>
      {!first && <BackLink />}
      <View>
        <T v="eyebrow">{first ? 'Son bir adım' : 'Evim hakkında'}</T>
        <T v="h1">Evini biraz tanıyalım</T>
        <T v="lead">Cevaplarına göre rutinler eklerim. Sonra Plan ekranından istediğin zaman değiştirebilirsin.</T>
      </View>

      <Card>
        {PROFILE.map((p, i) => (
          <View key={p.k} style={[styles.row, i > 0 && { borderTopWidth: 1.5, borderTopColor: c.line }]}>
            <Text style={{ fontSize: 26 }}>{p.emoji}</Text>
            <View style={{ flex: 1, minWidth: 0 }}>
              <T v="bold" style={{ fontSize: 15 }}>{p.q}</T>
              <T v="small" numberOfLines={2}>{p.tasks.map(t => t.name).join(', ')}</T>
            </View>
            <View style={[styles.seg, { backgroundColor: c.surface2 }]} accessibilityRole="radiogroup" accessibilityLabel={p.q}>
              {([[true, 'Evet'], [false, 'Hayır']] as const).map(([v, l]) => {
                const on = ans[p.k] === v;
                return (
                  <Pressable
                    key={l}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                    onPress={() => setAns(a => ({ ...a, [p.k]: v }))}
                    style={[styles.segBtn, on && { backgroundColor: v ? c.accent : c.muted }]}
                  >
                    <Text style={{ fontFamily: fonts.bodyBlack, fontSize: 13, color: on ? c.onAccent : c.muted }}>{l}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
      </Card>

      <Btn kind="primary" label={first ? 'Evimi aç' : 'Kaydet'} onPress={save} block />
      {first && <Btn kind="ghost" label="Şimdilik geç" onPress={() => { update(D => void (D.home.asked = true)); router.replace('/'); }} block />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  seg: { flexDirection: 'row', borderRadius: radius.pill, padding: 3 },
  segBtn: { borderRadius: radius.pill, paddingVertical: 6, paddingHorizontal: 11 },
});
