import { useRouter } from 'expo-router';
import { Animated, Image, StyleSheet, Text, View } from 'react-native';

import { MOKA_ASSETS } from '@/constants/moka';
import type { Task, TaskList } from '@/domain/types';
import { fonts, radius, useColors } from '@/theme';

import { Appear, Burst, Float, Squish } from './motion';
import { Gain, useTask } from './TaskRow';
import { T } from './ui';

/**
 * Bugün sayfasının ilk bakışta tek ana eylemi: sıradaki iş, Moka'nın cümlesi ve büyük "Tamamladım".
 * Diğer kartlar bunun altında, ikincil kalır. İş bitince sıradaki iş aynı kartta belirir.
 */
export function NextUp({ t, rid, list, left }: { t: Task; rid: string; list: TaskList; left: number }) {
  const c = useColors();
  const router = useRouter();
  const k = useTask(t, rid, list);
  const late = k.s.k === 'late';
  const bg = late ? c.lateSoft : c.todaySoft;
  const tone = late ? c.late : c.today;
  const intro = late ? 'Önce bunu halledelim, sonra rahatlarsın.' : left > 1 ? 'Küçük bir adımla başlayalım.' : 'Son iş! Bitirince gün tamam.';
  return (
    <Appear index={1} style={[styles.card, { backgroundColor: bg, shadowColor: c.shadow }]}>
      <View style={styles.top}>
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <T v="eyebrow" style={{ color: tone, marginBottom: 0 }}>Sıradaki iş</T>
          <T v="body" style={{ fontFamily: fonts.bodyBold }}>{intro}</T>
        </View>
        <Float amp={4} dur={2200}>
          <Image source={MOKA_ASSETS[k.pose ?? 'happy']} style={styles.moka} resizeMode="contain" accessibilityIgnoresInvertColors />
        </Float>
      </View>
      <Squish
        onPress={() => router.push({ pathname: '/is' as never, params: { rid, list, id: t.id } })}
        accessibilityLabel={`${t.name}, ayrıntı`}
        style={[styles.name, { backgroundColor: c.surface }]}
      >
        <Text style={{ fontSize: 28 }}>{k.emoji}</Text>
        <View style={{ flex: 1, minWidth: 0 }}>
          <T v="h3" numberOfLines={2}>{t.name}</T>
          <T v="small" numberOfLines={1} style={{ color: tone }}>{k.place.name} · {k.s.label} · {k.min} dk</T>
        </View>
      </Squish>
      <Animated.View style={{ transform: [{ scale: k.bounce }] }}>
        <Gain k={k} />
        <Burst fire={k.burst} />
        <Squish
          onPress={k.act}
          quiet
          scaleTo={0.95}
          accessibilityLabel={`${t.name}: ${k.action}`}
          style={[styles.cta, { backgroundColor: c.accent }]}
        >
          <Text style={[styles.ctaT, { color: c.onAccent }]}>{k.action}</Text>
        </Squish>
      </Animated.View>
    </Appear>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.card, padding: 18, gap: 14, shadowOpacity: 1, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  moka: { width: 76, height: 76 },
  name: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: radius.tile, paddingVertical: 14, paddingHorizontal: 16 },
  cta: { alignItems: 'center', borderRadius: radius.pill, paddingVertical: 17 },
  ctaT: { fontFamily: fonts.bodyBlack, fontSize: 18, letterSpacing: 0.1 },
});
