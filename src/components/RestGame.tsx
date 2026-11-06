import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Btn, T } from '@/components/ui';
import { fonts, radius, useColors } from '@/theme';

const CELLS = 9;
const SECONDS = 20;
const FACES = ['🦜', '⭐', '🌿', '☕'];

/** Tüm işler bitince açılan mini oyun: 20 saniyede çıkan Moka'ya dokun. Veri tutmaz. */
export function RestGame() {
  const c = useColors();
  const [run, setRun] = useState(false);
  const [left, setLeft] = useState(SECONDS);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [at, setAt] = useState(0);
  const [face, setFace] = useState(FACES[0]);
  const scoreRef = useRef(0);

  useEffect(() => {
    if (!run) return;
    const hop = setInterval(() => {
      setAt(Math.floor(Math.random() * CELLS));
      setFace(FACES[Math.floor(Math.random() * FACES.length)]);
    }, 750);
    const tick = setInterval(() => setLeft(l => l - 1), 1000);
    return () => { clearInterval(hop); clearInterval(tick); };
  }, [run]);

  useEffect(() => {
    if (run && left <= 0) {
      setRun(false);
      setBest(b => Math.max(b, scoreRef.current));
    }
  }, [left, run]);

  const start = () => { scoreRef.current = 0; setScore(0); setLeft(SECONDS); setAt(4); setRun(true); };
  const hit = (i: number) => {
    if (!run || i !== at) return;
    scoreRef.current += face === '🦜' ? 2 : 1;
    setScore(scoreRef.current);
    setAt(-1);
  };

  return (
    <View style={{ gap: 10 }}>
      <T v="bold" style={{ textAlign: 'center' }}>
        {run ? `⏱ ${left} sn · ${score} puan` : left <= 0 ? `Süre bitti: ${score} puan (en iyi ${best}) 🎉` : 'Bugün iş kalmadı, biraz eğlenebiliriz 🎮'}
      </T>
      {run && (
        <View style={styles.grid}>
          {Array.from({ length: CELLS }, (_, i) => (
            <Pressable key={i} onPress={() => hit(i)} accessibilityRole="button" accessibilityLabel={i === at ? face : 'boş kutu'}
              style={[styles.cell, { backgroundColor: c.surface2 }]}>
              <Text style={styles.face}>{i === at ? face : ''}</Text>
            </Pressable>
          ))}
        </View>
      )}
      {!run && <Btn kind="primary" label={left <= 0 ? 'Tekrar oyna' : 'Moka yakala'} onPress={start} />}
      {!run && <T v="tiny" style={{ textAlign: 'center' }}>Çıkan 🦜'ya dokun: 2 puan, diğerleri 1 puan.</T>}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  cell: { width: '30%', aspectRatio: 1.3, borderRadius: radius.tile, alignItems: 'center', justifyContent: 'center' },
  face: { fontSize: 34, fontFamily: fonts.body },
});
