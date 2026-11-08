import { useNavigation } from 'expo-router';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/** Uygulama önde ve bu ekran odakta mı? Değilse döngü animasyonlar durmalı (pil + akıcılık). */
export function useActive() {
  const nav = useNavigation();
  const [focused, setFocused] = useState(() => {
    try { return nav?.isFocused?.() ?? true; } catch { return true; }
  });
  const [fg, setFg] = useState(AppState.currentState !== 'background' && AppState.currentState !== 'inactive');
  useEffect(() => {
    const sub = AppState.addEventListener('change', s => setFg(s === 'active'));
    return () => sub.remove();
  }, []);
  useEffect(() => {
    if (!nav?.addListener) return;
    const a = nav.addListener('focus', () => setFocused(true));
    const b = nav.addListener('blur', () => setFocused(false));
    return () => { a(); b(); };
  }, [nav]);
  return focused && fg;
}
