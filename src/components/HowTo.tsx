import { StyleSheet, View } from 'react-native';

import { tx } from '@/i18n/runtime';
import { useColors } from '@/theme';

import { T } from './ui';

/** "Nasıl yapılır": numaralı kısa adımlar. */
export function HowTo({ steps }: { steps: string[] }) {
  const c = useColors();
  if (!steps.length) return null;
  return (
    <View style={st.box}>
      <T v="eyebrow" style={{ marginBottom: 0 }}>Nasıl yapılır?</T>
      {steps.map((s, i) => (
        <View key={i} style={st.row}>
          <View style={[st.dot, { backgroundColor: c.accentSoft }]}>
            <T v="tiny" style={{ color: c.accent }}>{String(i + 1)}</T>
          </View>
          <T v="small" style={{ flex: 1 }}>{tx(s)}</T>
        </View>
      ))}
    </View>
  );
}

const st = StyleSheet.create({
  box: { gap: 6, paddingTop: 6 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  dot: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
});
