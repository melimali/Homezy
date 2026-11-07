import { tlText } from '@/i18n/runtime';
import { type Href } from 'expo-router';
import { useRouter } from '@/lib/nav';
import { Text, View } from 'react-native';

import { planMeals, type Slot } from '@/domain/meals';
import { usePersona } from '@/profile/usePersona';
import { useStore } from '@/store/AppStore';
import { useColors } from '@/theme';

import { Squish } from './motion';
import { Card, T, Chevron } from './ui';

/** Bugün sekmesi: akşam (ya da sabah) için tek yemek önerisi; dokununca /yemek açılır. */
export function MealCard() {
  const c = useColors();
  const router = useRouter();
  const { state: S } = useStore();
  const { answers, done } = usePersona();
  const h = new Date().getHours();
  const slot: Slot = h >= 15 || h < 4 ? 'aksam' : 'sabah';
  const kitchen = S.order.find(id => S.rooms[id]?.type === 'mutfak');
  const top = planMeals(answers, kitchen ? S.mod[kitchen]?.stock ?? [] : [], slot, 1)[0];
  if (!done || !top) return null;
  return (
    <Squish onPress={() => router.push('/yemek' as Href)} accessibilityRole="button" accessibilityLabel="Yemek önerisi">
      <Card style={{ backgroundColor: c.peachSoft }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Text style={{ fontSize: 34 }}>{top.meal.emoji}</Text>
          <View style={{ flex: 1 }}>
            <T v="eyebrow" style={{ marginBottom: 0 }}>{slot === 'aksam' ? 'Bu gece' : 'Yarın sabah'}</T>
            <T v="bold">{top.meal.name}</T>
            <T v="small">⏱ {top.meal.min} dk · ~{tlText(top.price)} · {top.missing.length ? `🛒 ${top.missing.length} eksik` : '✓ hepsi dolapta'}</T>
          </View>
          <Chevron color={c.muted} dir="right" />
        </View>
      </Card>
    </Squish>
  );
}
