import { useEffect, useState } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Ellipse, Path } from 'react-native-svg';

import { useReduceMotion } from '@/components/motion';
import { canGiveCoffee, toNextGift } from '@/domain/bond';
import { nextCoffee, potSteam, type PotState } from '@/domain/coffee';
import { lastWeek, type DayMark } from '@/domain/play';
import type { Play } from '@/domain/types';
import { getUiLang, tx } from '@/i18n/runtime';
import { fonts, useColors } from '@/theme';

/** Kahve sürahisi çizimi (cam gövde, ahşap bilezik, dolu kahve). Hep dolu; `cold` biraz soğuk tonda. */
export function PotIcon({ size = 24, color, cold = false, line = false }: { size?: number; color: string; cold?: boolean; line?: boolean }) {
  if (line) {
    const p = { stroke: color, strokeWidth: 2.1, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d="M7 3.5h10l-3.6 7.2 4.8 7.6c.6 1-.1 2.2-1.3 2.2H7.1c-1.2 0-1.9-1.2-1.3-2.2l4.8-7.6z" {...p} />
        <Path d="M10.6 10.7h2.8" {...p} />
        <Path d="M8.2 16h7.6" {...p} />
      </Svg>
    );
  }
  // Cam kahve sürahisi: kulplu, ağzı solda; içi hep dolu.
  const coffee = cold ? '#7A5E4C' : '#5A3420';
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Path d="M30 14.5h2.2a4.3 4.3 0 0 1 0 8.6H30.6" fill="none" stroke={color} strokeWidth={2.6} strokeLinecap="round" />
      <Path d="M11 8.5h18l1.4 4.5c1.6 5.2 2.1 10.8 1.4 16.2-.4 3.2-3.1 5.3-6.3 5.3H14.5c-3.2 0-5.9-2.1-6.3-5.3-.7-5.4-.2-11 1.4-16.2L8 9.8" fill="#FFF6E8" stroke={color} strokeWidth={2.6} strokeLinejoin="round" strokeLinecap="round" />
      <Path d="M9.4 21h21.2c.3 2.6.3 5.3-.1 7.9-.3 2.3-2.2 3.9-4.6 3.9H14.1c-2.4 0-4.3-1.6-4.6-3.9-.4-2.6-.4-5.3-.1-7.9z" fill={coffee} />
      <Path d="M12 8.5h16" stroke={color} strokeWidth={2.6} strokeLinecap="round" />
      <Ellipse cx={14} cy={15} rx={1.4} ry={2.6} fill="#FFFFFF" opacity={0.6} />
    </Svg>
  );
}

/** Buhar çizgileri: sürahinin üstünden yükselen yumuşak kıvrımlar. */
function Steam({ n, color }: { n: number; color: string }) {
  const reduce = useReduceMotion();
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (reduce || !n) return;
    const a = Animated.loop(Animated.timing(v, { toValue: 1, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }));
    a.start();
    return () => a.stop();
  }, [reduce, n, v]);
  return (
    <View style={{ height: 34, flexDirection: 'row', gap: 6, justifyContent: 'center' }}>
      {Array.from({ length: n }, (_, i) => (
        <Animated.View key={i} style={{ opacity: v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.25, 0.85, 0.25] }), transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [4 + i * 2, -4 - i] }) }] }}>
          <Svg width={12} height={30} viewBox="0 0 12 30">
            <Path d="M6 28c-4-4 4-8 0-13s4-8 0-13" stroke={color} strokeWidth={2.4} fill="none" strokeLinecap="round" />
          </Svg>
        </Animated.View>
      ))}
    </View>
  );
}

/** Haftanın bir günü: dolu fincan (iş yapıldı), ❄ (ılık tutuldu), boş altlık (kaçtı), nokta (bugün, henüz yok). */
function DayCup({ d, ink, soft }: { d: DayMark; ink: string; soft: string }) {
  const p = { stroke: ink, strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <Svg width={28} height={24} viewBox="0 0 28 24">
      {d.mark === 'today' ? (
        <Circle cx={14} cy={14} r={3} fill={soft} />
      ) : (
        <>
          <Ellipse cx={14} cy={20} rx={11} ry={2.6} fill="none" {...p} stroke={d.mark === 'miss' ? soft : ink} />
          {d.mark !== 'miss' && <Path d="M7 7h13v6.5a6 6 0 0 1-6 6h-1a6 6 0 0 1-6-6z" fill={d.mark === 'ice' ? '#DCEBF5' : '#C8834A'} {...p} />}
          {d.mark !== 'miss' && <Path d="M20 9h1.6a2.6 2.6 0 0 1 0 5.2H20" fill="none" {...p} />}
          {d.mark === 'ice' && <Path d="M13.5 9.5v6M11 11l5 3M16 11l-5 3" stroke={ink} strokeWidth={1.2} strokeLinecap="round" />}
        </>
      )}
    </Svg>
  );
}

/**
 * Kahve sayfası (docs/moka-oda-usta-plan.md §3.4): tüten sürahi, gün sayısı, bu haftanın fincanları,
 * sıradaki kahve rozeti ve "kahveyi ılık tut" hakkı. Tek ekran, kaydırma yok.
 */
export function CoffeeSheet({ open, onClose, P, now, streak, best, pot, freezeLeft, onGive }: { open: boolean; onClose: () => void; P: Play; now: number; streak: number; best: number; pot: PotState; freezeLeft: number; /** Kahveyi Moka'ya verir (sevinç + nadiren hediye). */ onGive?: () => void }) {
  const c = useColors();
  const D = c.den;
  const insets = useSafeAreaInsets();
  const week = lastWeek(P, now);
  const next = nextCoffee(best);
  const canGive = canGiveCoffee(P, now);
  const left = toNextGift(P);
  const cold = pot === 'cold' || pot === 'first';
  const fmt = new Intl.DateTimeFormat(getUiLang(), { weekday: 'narrow' });
  const label = pot === 'fresh' || pot === 'wait' || pot === 'warm' ? tx('gündür taze') : tx(pot === 'cold' ? 'Kahve soğumuş, yeniden demleyelim ☕' : 'İlk kahveyi birlikte demleyelim ☕');
  return (
    <Modal visible={open} transparent statusBarTranslucent animationType="slide" onRequestClose={onClose}>
      <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(42,28,18,0.38)' }]} onPress={onClose} accessibilityRole="button" accessibilityLabel={tx('Kapat')} />
      <View style={[st.sheet, { backgroundColor: D.paper, paddingBottom: insets.bottom + 22, shadowColor: D.shade }]}>
        <View style={[st.grab, { backgroundColor: D.line }]} />
        <Text maxFontSizeMultiplier={1.3} style={[st.title, { color: D.soft }]}>{tx('Moka\'nın kahvesi')}</Text>
        <View style={st.hero}>
          <View style={{ alignItems: 'center' }}>
            <Steam n={potSteam(pot)} color={D.soft} />
            <PotIcon size={76} color={D.ink} cold={pot === 'cold'} />
          </View>
          <View style={{ flexShrink: 1 }}>
            {streak > 0 && <Text maxFontSizeMultiplier={1.3} style={[st.big, { color: D.ink }]}>{streak}</Text>}
            <Text maxFontSizeMultiplier={1.3} style={[st.label, { color: D.ink }]}>{label}</Text>
          </View>
        </View>
        {!!onGive && (
          <View style={{ alignItems: 'center', gap: 6, paddingBottom: 6 }}>
            <Pressable
              onPress={canGive ? onGive : undefined}
              accessibilityRole="button"
              accessibilityState={{ disabled: !canGive }}
              style={[st.give, { backgroundColor: canGive ? c.accent : D.line }]}
            >
              <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: canGive ? c.onAccent : D.soft }}>
                {tx(cold ? 'Kahve soğumuşken veremem 🥲' : canGive ? "Kahveyi Moka'ya ver ☕" : 'Bugünkü kahveyi verdin 💛')}
              </Text>
            </Pressable>
            {!cold && <Text maxFontSizeMultiplier={1.3} style={[st.small, { color: D.soft }]}>{tx('Hediyeye {} kahve kaldı').replace('{}', String(left))}</Text>}
          </View>
        )}
        <View style={st.week}>
          {week.map(d => (
            <View key={d.key} style={{ alignItems: 'center', gap: 4, flex: 1 }}>
              <Text maxFontSizeMultiplier={1.3} style={[st.wd, { color: d.mark === 'today' ? D.ink : D.soft }]}>{fmt.format(new Date(`${d.key}T12:00:00`))}</Text>
              <DayCup d={d} ink={D.ink} soft={D.line} />
            </View>
          ))}
        </View>
        <View style={[st.row, { borderTopColor: D.line }]}>
          {next ? (
            <>
              <Text maxFontSizeMultiplier={1.3} style={[st.rowText, { color: D.ink }]} numberOfLines={2}>{tx('Sıradaki: {}').replace('{}', tx(next.name))}</Text>
              <View style={[st.bar, { backgroundColor: D.line }]}>
                <View style={{ width: `${Math.round((Math.min(next.have, next.n) / next.n) * 100)}%`, height: '100%', borderRadius: 4, backgroundColor: c.accent }} />
              </View>
              <Text maxFontSizeMultiplier={1.3} style={[st.small, { color: D.soft }]}>{`${Math.min(next.have, next.n)}/${next.n}`}</Text>
            </>
          ) : (
            <Text maxFontSizeMultiplier={1.3} style={[st.rowText, { color: D.ink }]}>{tx('Bütün kahve rozetleri senin ☕')}</Text>
          )}
        </View>
        <View style={[st.row, { borderTopColor: D.line, flexDirection: 'column', alignItems: 'flex-start', gap: 2 }]}>
          <Text maxFontSizeMultiplier={1.3} style={[st.rowText, { color: D.ink }]}>{tx('Kahveyi ılık tut: {} hak kaldı').replace('{}', String(freezeLeft))}</Text>
          <Text maxFontSizeMultiplier={1.3} style={[st.small, { color: D.soft }]}>{tx('Bir gün kaçırırsan bu hak kahveyi ılık tutar, seri bozulmaz.')}</Text>
        </View>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 10, shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: -4 }, elevation: 12 },
  give: { paddingHorizontal: 22, paddingVertical: 12, borderRadius: 22 },
  grab: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, marginBottom: 12 },
  title: { fontFamily: fonts.bodyBold, fontSize: 13, textAlign: 'center' },
  hero: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 18, paddingVertical: 8 },
  big: { fontFamily: fonts.displayBold, fontSize: 52, lineHeight: 58 },
  label: { fontFamily: fonts.bodyBold, fontSize: 16, lineHeight: 22, maxWidth: 200, marginBottom: 10 },
  week: { flexDirection: 'row', paddingVertical: 14 },
  wd: { fontFamily: fonts.bodyBold, fontSize: 12.5 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14, borderTopWidth: StyleSheet.hairlineWidth },
  rowText: { flexShrink: 1, fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 21 },
  bar: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden', minWidth: 60 },
  small: { fontFamily: fonts.bodyBold, fontSize: 12.5, lineHeight: 18 },
});
