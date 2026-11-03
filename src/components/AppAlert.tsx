import { useEffect, useState } from 'react';
import { Alert, Image, Modal, StyleSheet, View, type AlertButton } from 'react-native';

import { MOKA_ASSETS } from '@/constants/moka';
import { radius, useColors } from '@/theme';

import { Btn, T } from './ui';

type Item = { title: string; message?: string; buttons: AlertButton[]; cancelable?: boolean; onDismiss?: () => void };

let push: ((i: Item) => void) | null = null;

/**
 * `Alert.alert` ile aynı imza, ama uygulamanın temasıyla çizilir (krem kart, Moka, hap düğmeler).
 * `AppAlertHost` takılı değilse (ör. çok erken) sistem penceresine düşer.
 */
export function appAlert(title: string, message?: string, buttons?: AlertButton[], options?: { cancelable?: boolean; onDismiss?: () => void }) {
  const list = buttons?.length ? buttons : [{ text: 'Tamam' }];
  if (push) push({ title, message, buttons: list, cancelable: options?.cancelable, onDismiss: options?.onDismiss });
  else Alert.alert(title, message, list, options);
}

export function AppAlertHost() {
  const c = useColors();
  const [queue, setQueue] = useState<Item[]>([]);
  useEffect(() => {
    push = i => setQueue(q => [...q, i]);
    return () => {
      push = null;
    };
  }, []);
  const cur = queue[0];
  const done = (b?: AlertButton) => {
    setQueue(q => q.slice(1));
    b?.onPress?.();
  };
  if (!cur) return null;
  const cancel = cur.buttons.find(b => b.style === 'cancel');
  return (
    <Modal transparent animationType="fade" onRequestClose={() => {
        if (cur.cancelable === false) return;
        if (cancel) done(cancel);
        else {
          done();
          cur.onDismiss?.();
        }
      }}>
      <View style={[st.bg, { backgroundColor: c.shadow }]}>
        <View style={[st.box, { backgroundColor: c.surface }]} accessibilityViewIsModal>
          <Image source={MOKA_ASSETS.happy} style={st.moka} resizeMode="contain" accessibilityIgnoresInvertColors />
          <T v="h3" style={{ textAlign: 'center' }}>{cur.title}</T>
          {!!cur.message && <T style={{ textAlign: 'center' }}>{cur.message}</T>}
          <View style={{ alignSelf: 'stretch', gap: 8, marginTop: 6 }}>
            {cur.buttons.map((b, i) => (
              <Btn
                key={i}
                block
                label={b.text ?? 'Tamam'}
                kind={b.style === 'destructive' ? 'danger' : b.style === 'cancel' ? 'ghost' : 'primary'}
                onPress={() => done(b)}
              />
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  bg: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  box: { alignSelf: 'stretch', maxWidth: 420, borderRadius: radius.card, padding: 22, alignItems: 'center', gap: 10 },
  moka: { width: 84, height: 84 },
});
