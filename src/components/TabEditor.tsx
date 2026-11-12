import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Squish } from '@/components/motion';
import { Btn, T } from '@/components/ui';
import { saveLayout, useTabLayout, type TabId } from '@/lib/tabLayout';
import { tx } from '@/i18n/runtime';
import { fonts, radius, useColors } from '@/theme';

/** Başlığın yanındaki küçük "Sekmeyi düzenle" düğmesi; dokununca düzenleme penceresi açılır. */
export function EditTabBtn({ tab, wide }: { tab: TabId; wide?: boolean }) {
  const c = useColors();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Squish onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel={tx('Sekmeyi düzenle')} style={[st.btn, { backgroundColor: c.surface2 }, wide && { maxWidth: undefined, paddingHorizontal: 18, paddingVertical: 9 }]}>
        <Text style={[st.btnT, { color: c.ink }]}>✏️ Sekmeyi düzenle</Text>
      </Squish>
      {open && <TabEditor tab={tab} onClose={() => setOpen(false)} />}
    </>
  );
}

function TabEditor({ tab, onClose }: { tab: TabId; onClose: () => void }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const cur = useTabLayout(tab);
  const items = cur.items;
  const write = (next: typeof items) => saveLayout(tab, next);
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const n = [...items];
    [n[i], n[j]] = [n[j], n[i]];
    write(n);
  };
  const toggle = (i: number) => write(items.map((x, k) => (k === i ? { ...x, visible: !x.visible } : x)));
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={st.scrim} onPress={onClose} accessibilityLabel={tx('Kapat')} />
      <View style={[st.sheet, { backgroundColor: c.bg, paddingBottom: insets.bottom + 16 }]}>
        <T v="h2">Sekmeyi düzenle</T>
        <T v="small">Blokları aç-kapa, ▲▼ ile yerlerini değiştir. 🔒 olanlar hep durur.</T>
        <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8, paddingVertical: 8 }}>
          {items.map((x, i) => (
            <View key={x.id} style={[st.row, { backgroundColor: c.surface, opacity: x.visible ? 1 : 0.6 }]}>
              <Text style={{ lineHeight: 29, fontSize: 22 }}>{x.emoji}</Text>
              <T v="bold" style={{ flex: 1 }} numberOfLines={2}>{x.title}</T>
              {x.fixed ? <Text style={{ lineHeight: 23, fontSize: 18 }}>🔒</Text> : <Switch value={x.visible} onValueChange={() => toggle(i)} accessibilityLabel={tx(x.title)} trackColor={{ true: c.accent }} />}
              <Arrow label="Yukarı" ch="▲" off={i === 0} onPress={() => move(i, -1)} />
              <Arrow label="Aşağı" ch="▼" off={i === items.length - 1} onPress={() => move(i, 1)} />
            </View>
          ))}
        </ScrollView>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Btn kind="soft" label="Varsayılan" onPress={() => saveLayout(tab, null)} style={{ flex: 1 }} />
          <Btn kind="primary" label="Tamam" onPress={onClose} style={{ flex: 1 }} />
        </View>
      </View>
    </Modal>
  );
}

function Arrow({ ch, label, off, onPress }: { ch: string; label: string; off: boolean; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable onPress={onPress} disabled={off} hitSlop={6} accessibilityRole="button" accessibilityLabel={tx(label)} style={[st.arrow, { backgroundColor: c.surface2, opacity: off ? 0.3 : 1 }]}>
      <Text style={{ color: c.ink, fontSize: 13 }}>{ch}</Text>
    </Pressable>
  );
}

const st = StyleSheet.create({
  btn: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, alignSelf: 'center', maxWidth: 82 },
  btnT: { fontFamily: fonts.bodyBlack, fontSize: 11, lineHeight: 13, textAlign: 'center' },
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: { maxHeight: '82%', borderTopLeftRadius: radius.card, borderTopRightRadius: radius.card, padding: 20, gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: radius.tile, padding: 10 },
  arrow: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
});
