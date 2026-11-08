import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Pressable, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fonts, radius, useColors } from '@/theme';

export type ToastAction = { label: string; onPress: () => void };
type ShowToast = (msg: string, action?: ToastAction) => void;

const ToastContext = createContext<ShowToast>(() => {});

export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const [msg, setMsg] = useState<string | null>(null);
  const [act, setAct] = useState<ToastAction | null>(null);
  const [opacity] = useState(() => new Animated.Value(0));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(
    (m: string, a?: ToastAction) => {
      setMsg(m);
      setAct(a ?? null);
      Animated.timing(opacity, { toValue: 1, duration: 160, useNativeDriver: true }).start();
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setMsg(null));
      }, a ? 5500 : 2800);
    },
    [opacity],
  );

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {msg != null && (
        <Animated.View
          pointerEvents={act ? 'box-none' : 'none'}
          accessibilityLiveRegion="polite"
          style={[styles.toast, { bottom: insets.bottom + 92, backgroundColor: c.ink, opacity }]}
        >
          <Text style={[styles.text, { color: c.bg, flex: act ? 1 : undefined }]}>{msg}</Text>
          {act && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={act.label}
              hitSlop={12}
              onPress={() => {
                const f = act.onPress;
                if (timer.current) clearTimeout(timer.current);
                setMsg(null);
                setAct(null);
                f();
              }}
              style={styles.act}
            >
              <Text style={[styles.text, { color: c.bg, textDecorationLine: 'underline' }]}>{act.label}</Text>
            </Pressable>
          )}
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: 24,
    right: 24,
    alignSelf: 'center',
    maxWidth: 420,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: radius.card - 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  act: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
  text: { fontFamily: fonts.bodyBold, fontSize: 14, textAlign: 'center' },
});
