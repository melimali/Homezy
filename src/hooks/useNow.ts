import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/** Şu anki zaman; dakikada bir ve uygulama öne geldiğinde yenilenir (gün değişince ekranlar güncellensin). */
export function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const id = setInterval(tick, 60_000);
    const sub = AppState.addEventListener('change', s => s === 'active' && tick());
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, []);
  return now;
}
