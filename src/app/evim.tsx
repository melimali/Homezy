import { useLocalSearchParams } from 'expo-router';
import { useRouter } from '@/lib/nav';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useToast } from '@/components/Toast';
import { BackLink, Btn, Card, Screen, T } from '@/components/ui';
import { applyProfile, PROFILE } from '@/domain/home';
import type { HomeProfile } from '@/domain/types';
import { PLAN } from '@/domain/persona';
import { usePersona } from '@/profile/usePersona';
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
  const { persona } = usePersona();
  // İlk kurulumda cevaplar kişiye göre önceden seçili gelir (öğrenci: bulaşık makinesi yok…).
  const [ans, setAns] = useState<HomeProfile>(() => (!S.home.asked && persona ? { ...S.home, ...PLAN[persona].home } : S.home));

  const yes = PROFILE.filter(p => ans[p.k] === true).length;
  const extra = PROFILE.filter(p => ans[p.k] === true).reduce((n, p) => n + p.tasks.length, 0);

  const save = () => {
    update(D => applyProfile(D, ans));
    if (first) {
      router.replace('/');
      toast('Evin hazır. Rutinlerini cevaplarına göre ayarladım 🏡');
    } else {
      if (router.canGoBack()) router.back(); else router.replace("/");
      toast('Cevapların kaydedildi, rutinler güncellendi.');
    }
  };

  return (
    <Screen header={false}>
      {!first && <BackLink />}
      <View>
        <T v="eyebrow">{first ? 'Son bir adım' : 'Evim hakkında'}</T>
        <T v="h1">Evini sana göre ayarlayalım</T>
        <T v="lead">Evinde olan şeylere &ldquo;Evet&rdquo; de. Sadece onlar için iş eklerim, olmayanlar listende görünmez. Sonra istediğin zaman değiştirebilirsin.</T>
      </View>

      <Card>
        <T v="bold">🏡 Evinin adı</T>
        <TextInput
          value={S.homeName}
          onChangeText={v => update(D => void (D.homeName = v.slice(0, 24)))}
          placeholder="Örn. Bizim ev"
          placeholderTextColor={c.muted}
          maxLength={24}
          returnKeyType="done"
          accessibilityLabel="Evinin adı"
          style={[styles.input, { backgroundColor: c.surface2, color: c.ink, fontFamily: fonts.bodyBold }]}
        />
      </Card>

      <T v="small" style={{ textAlign: 'center' }}>{yes === 0 ? 'Henüz hiçbirine evet demedin.' : `${yes} şey için ${extra} ekstra iş eklenecek`}</T>

      {PROFILE.map(p => {
        const on = ans[p.k] === true;
        return (
          <Pressable
            key={p.k}
            accessibilityRole="switch"
            accessibilityLabel={p.q}
            accessibilityState={{ checked: on }}
            onPress={() => setAns(a => ({ ...a, [p.k]: !on }))}
            style={[styles.tile, { backgroundColor: on ? c.surface2 : c.surface, borderColor: on ? c.accent : c.line }]}
          >
            <Text style={{ lineHeight: 40, fontSize: 32 }}>{p.emoji}</Text>
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
              <T v="bold" style={{ fontSize: 15.5 }}>{p.q}</T>
              <T v="small" numberOfLines={2}>{on ? 'Eklenen işler: ' : 'Evet dersen eklenir: '}{p.tasks.map(t => t.name).join(', ')}</T>
            </View>
            <View style={[styles.check, { backgroundColor: on ? c.accent : 'transparent', borderColor: on ? c.accent : c.line }]}>
              {on && <Text style={{ color: c.onAccent, fontFamily: fonts.bodyBlack, fontSize: 15 }}>✓</Text>}
            </View>
          </Pressable>
        );
      })}

      <Btn kind="primary" label={first ? 'Evimi aç' : 'Kaydet'} onPress={save} block />
      {first && <Btn kind="ghost" label="Şimdilik geç" onPress={() => { update(D => void (D.home.asked = true)); router.replace('/'); }} block />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  tile: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.card, borderWidth: 2 },
  check: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  input: { borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 10, fontSize: 16, marginTop: 8 },
});
