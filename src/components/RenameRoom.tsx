import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';

import { Btn, Field, T } from '@/components/ui';
import { tx } from '@/i18n/runtime';
import { useStore } from '@/store/AppStore';
import { radius, useColors } from '@/theme';

/** Oda adını değiştirme penceresi. `id` doluysa açılır. */
export function RenameRoom({ id, onClose }: { id: string | null; onClose: () => void }) {
  const c = useColors();
  const { state: S, update } = useStore();
  const [v, setV] = useState('');
  useEffect(() => { if (id) setV(S.rooms[id]?.name ?? ''); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  const save = () => {
    const name = v.trim().slice(0, 24);
    if (id && name) update(D => { if (D.rooms[id]) D.rooms[id].name = name; });
    onClose();
  };
  return (
    <Modal visible={!!id} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.wrap}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel={tx('Vazgeç')} />
        <View style={[styles.box, { backgroundColor: c.surface }]}>
          <T v="h3">{tx('Oda adını değiştir')}</T>
          <Field value={v} onChangeText={setV} maxLength={24} autoFocus selectTextOnFocus onSubmitEditing={save} returnKeyType="done"
            placeholder={tx('Oda adı')} />
          <View style={styles.btns}>
            <Btn label={tx('Vazgeç')} onPress={onClose} style={{ flex: 1 }} />
            <Btn label={tx('Kaydet')} kind="primary" onPress={save} disabled={!v.trim()} style={{ flex: 1 }} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: 'rgba(0,0,0,0.4)' },
  box: { borderRadius: radius.card, padding: 20, gap: 14 },
  btns: { flexDirection: 'row', gap: 10 },
});
