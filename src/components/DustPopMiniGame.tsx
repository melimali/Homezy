import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { sfx } from '@/lib/sfx';
import { fonts, radius, useColors } from '@/theme';
import { Btn, Sheet, T } from './ui';

type DustBubble = {
  id: number;
  x: number;
  y: number;
  size: number;
  emoji: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onReward: (points: number) => void;
};

const DUST_EMOJIS = ['✨', '💨', '💫', '🌟', '🍃'];

/** Rahatlatıcı Toz Patlatma ASMR Mini Oyunu: 30 saniyede tozları pıt pıt patlatarak stresi at ve puan kazan! */
export function DustPopMiniGame({ open, onClose, onReward }: Props) {
  const c = useColors();
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [isPlaying, setIsPlaying] = useState(false);
  const [bubbles, setBubbles] = useState<DustBubble[]>([]);

  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          setIsPlaying(false);
          onReward(20);
          sfx('party');
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isPlaying, onReward]);

  // Rastgele toz bulutları üret
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setBubbles(b => {
        if (b.length < 8) {
          const newBubble: DustBubble = {
            id: Date.now() + Math.random(),
            x: Math.random() * 75 + 10,
            y: Math.random() * 70 + 15,
            size: Math.random() * 16 + 36,
            emoji: DUST_EMOJIS[Math.floor(Math.random() * DUST_EMOJIS.length)]!,
          };
          return [...b, newBubble];
        }
        return b;
      });
    }, 900);
    return () => clearInterval(interval);
  }, [isPlaying]);

  const popBubble = (id: number) => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    sfx('tap');
    setScore(s => s + 1);
    setBubbles(b => b.filter(item => item.id !== id));
  };

  const startGame = () => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
    sfx('coin');
    setScore(0);
    setTimeLeft(30);
    setBubbles([
      { id: 1, x: 20, y: 30, size: 44, emoji: '✨' },
      { id: 2, x: 70, y: 40, size: 40, emoji: '💨' },
      { id: 3, x: 45, y: 65, size: 48, emoji: '💫' },
    ]);
    setIsPlaying(true);
  };

  const handleClose = () => {
    setIsPlaying(false);
    setScore(0);
    setTimeLeft(30);
    setBubbles([]);
    onClose();
  };

  return (
    <Sheet open={open} onClose={handleClose} pose="sparkling_complete">
      <View style={{ alignItems: 'center', gap: 14, paddingVertical: 10 }}>
        <Text style={{ fontSize: 44 }}>🧹</Text>
        <T v="h2">Hızlı Toz Avı ASMR</T>
        <T v="small" style={{ textAlign: 'center' }}>
          30 saniyede ekranda beliren tozlara pıt pıt dokunarak patlat. Hem odanı temizle hem +20 ⭐ bonus kazan!
        </T>

        <View style={styles.statusBar}>
          <Text style={[styles.statusText, { color: c.ink }]}>Süre: ⏱️ {timeLeft}s</Text>
          <Text style={[styles.statusText, { color: c.ok }]}>Patlatılan: ✨ {score}</Text>
        </View>

        {/* Oyun Alanı */}
        <View style={[styles.gameArea, { backgroundColor: c.surface2, borderColor: c.line }]}>
          {!isPlaying && timeLeft === 30 && (
            <View style={styles.centerPrompt}>
              <T v="bold" style={{ textAlign: 'center', marginBottom: 8 }}>Hazır mısın?</T>
              <Btn label="Oyunu Başlat 🚀" kind="primary" onPress={startGame} />
            </View>
          )}

          {!isPlaying && timeLeft <= 0 && (
            <View style={styles.centerPrompt}>
              <Text style={{ fontSize: 36 }}>🎉</Text>
              <T v="h3" style={{ textAlign: 'center' }}>Harika Temizlik!</T>
              <T v="bold" style={{ color: c.ok, textAlign: 'center' }}>+20 ⭐ Puan Kazandın!</T>
              <Btn label="Tekrar Oyna 🔄" kind="primary" onPress={startGame} style={{ marginTop: 6 }} />
            </View>
          )}

          {isPlaying &&
            bubbles.map(b => (
              <Pressable
                key={b.id}
                onPress={() => popBubble(b.id)}
                accessibilityRole="button"
                accessibilityLabel="Toz topağı, patlat"
                style={[
                  styles.bubble,
                  {
                    left: `${b.x}%`,
                    top: `${b.y}%`,
                    width: b.size,
                    height: b.size,
                    borderRadius: b.size / 2,
                    backgroundColor: c.surface,
                    borderColor: c.hi,
                  },
                ]}
              >
                <Text style={{ fontSize: b.size * 0.5 }}>{b.emoji}</Text>
              </Pressable>
            ))}
        </View>

        <Btn label="Kapat" onPress={handleClose} block />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 12,
  },
  statusText: {
    fontFamily: fonts.bodyBlack,
    fontSize: 14,
  },
  gameArea: {
    width: '100%',
    height: 240,
    borderRadius: radius.card,
    borderWidth: 1.5,
    overflow: 'hidden',
    position: 'relative',
  },
  centerPrompt: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.06)',
    gap: 6,
  },
  bubble: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
});
