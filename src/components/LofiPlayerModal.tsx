import { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';

import { sfx, haptic } from '@/lib/sfx';
import { fonts, radius, useColors } from '@/theme';
import { Btn, Sheet, T } from './ui';

type Track = {
  id: string;
  emoji: string;
  name: string;
  desc: string;
  soundType: string;
};

const TRACKS: Track[] = [
  { id: 'rain', emoji: '🌧️', name: 'Yağmur & Pencere', desc: 'Huzurlu yağmur damlaları ve sıcak çay', soundType: 'rain' },
  { id: 'fireplace', emoji: '🪵', name: 'Şömine Çıtırtısı', desc: 'Sıcak odun ateşi ve kış akşamı', soundType: 'fire' },
  { id: 'lofi', emoji: '☕', name: 'Lo-Fi Odaklanma', desc: 'Temizlik ve ders çalışmak için yumuşak ritimler', soundType: 'lofi' },
  { id: 'nature', emoji: '🌿', name: 'Orman Kuşları', desc: 'Doğanın kalbinde dinlendirici kuş sesleri', soundType: 'nature' },
  { id: 'sea', emoji: '🌊', name: 'Deniz Dalgaları', desc: 'Kıyıya vuran yavaş dalgalar ve martılar', soundType: 'sea' },
  { id: 'night', emoji: '🌙', name: 'Gece Cırcır Böcekleri', desc: 'Yaz gecesi, açık pencere, uzaktan rüzgâr', soundType: 'night' },
];

type Props = {
  open: boolean;
  onClose: () => void;
};

/** Moka'nın Plak Çaları: Dinlendirici ASMR ve Lo-Fi sesler modalı. */
export function LofiPlayerModal({ open, onClose }: Props) {
  const c = useColors();
  const [activeTrack, setActiveTrack] = useState<Track | null>(null);
  const [spinAnim] = useState(() => new Animated.Value(0));
  const [armAnim] = useState(() => new Animated.Value(0));
  const [pulseAnim] = useState(() => new Animated.Value(0));
  const [bars] = useState(() => [0, 1, 2, 3, 4].map(() => new Animated.Value(0.3)));

  useEffect(() => {
    Animated.timing(armAnim, {
      toValue: activeTrack ? 1 : 0,
      duration: 600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    if (!activeTrack) {
      pulseAnim.setValue(0);
      bars.forEach(b => b.setValue(0.3));
      return;
    }
    const pulse = Animated.loop(
      Animated.timing(pulseAnim, { toValue: 1, duration: 1800, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    );
    const waves = bars.map((b, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(b, { toValue: 1, duration: 380 + i * 90, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(b, { toValue: 0.25, duration: 380 + i * 90, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      ),
    );
    pulse.start();
    waves.forEach(w => w.start());
    return () => {
      pulse.stop();
      waves.forEach(w => w.stop());
    };
  }, [activeTrack, armAnim, pulseAnim, bars]);

  const armRot = armAnim.interpolate({ inputRange: [0, 1], outputRange: ['-28deg', '4deg'] });
  const glowScale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.55] });
  const glowOpacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] });

  useEffect(() => {
    if (!activeTrack) {
      spinAnim.stopAnimation();
      return;
    }
    const loop = Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 4000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [activeTrack, spinAnim]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const selectTrack = (t: Track) => {
    haptic('medium');
    sfx('coin');
    setActiveTrack(activeTrack?.id === t.id ? null : t);
  };

  const step = (dir: 1 | -1) => {
    haptic('light');
    sfx('tap');
    const i = activeTrack ? TRACKS.findIndex(t => t.id === activeTrack.id) : dir === 1 ? -1 : 0;
    setActiveTrack(TRACKS[(i + dir + TRACKS.length) % TRACKS.length]);
  };

  return (
    <Sheet open={open} onClose={onClose} pose="cozy_plant">
      <View style={{ alignItems: 'center', gap: 16, paddingVertical: 10 }}>
        <Text style={{ fontSize: 48 }}>🎵</Text>
        <T v="h2">Moka&apos;nın Plak Çaları</T>
        <T v="small" style={{ textAlign: 'center' }}>
          Temizlik yaparken veya dinlenirken ruhunu dinlendirecek huzurlu ASMR ve Lo-Fi sesler.
        </T>

        {/* Dönen Plak Animasyonu */}
        <View style={[styles.turntable, { backgroundColor: c.surface2 }]}>
          <Animated.View
            pointerEvents="none"
            style={[styles.glow, { borderColor: c.warm, opacity: glowOpacity, transform: [{ scale: glowScale }] }]}
          />
          <Animated.View style={[styles.vinyl, { transform: [{ rotate: spin }], backgroundColor: activeTrack ? c.ink : c.muted }]}>
            <View style={[styles.groove, { width: 94, height: 94, borderRadius: 47 }]} />
            <View style={[styles.groove, { width: 74, height: 74, borderRadius: 37 }]} />
            <View style={[styles.vinylLabel, { backgroundColor: c.warm }]} />
          </Animated.View>
          <Animated.View style={[styles.armWrap, { transform: [{ rotate: armRot }] }]}>
            <View style={[styles.arm, { backgroundColor: c.muted }]} />
            <View style={[styles.armHead, { backgroundColor: c.ink }]} />
          </Animated.View>
        </View>

        <View style={styles.waves}>
          {bars.map((b, i) => (
            <Animated.View key={i} style={[styles.bar, { backgroundColor: c.warm, transform: [{ scaleY: b }] }]} />
          ))}
        </View>

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Btn label="⏮" onPress={() => step(-1)} />
          <Btn label={activeTrack ? '⏸' : '▶'} onPress={() => (activeTrack ? setActiveTrack(null) : step(1))} />
          <Btn label="⏭" onPress={() => step(1)} />
        </View>

        <T v="bold" style={{ color: activeTrack ? c.ok : c.muted }}>
          {activeTrack ? `Çalıyor: ${activeTrack.emoji} ${activeTrack.name}` : 'Plak çalar duruyor'}
        </T>

        {/* Parça Listesi */}
        <View style={{ width: '100%', gap: 8, marginTop: 4 }}>
          {TRACKS.map(t => {
            const isPlaying = activeTrack?.id === t.id;
            return (
              <Pressable
                key={t.id}
                onPress={() => selectTrack(t)}
                accessibilityRole="button"
                accessibilityLabel={`${t.name} çal`}
                style={[
                  styles.trackRow,
                  { backgroundColor: isPlaying ? c.accentSoft : c.surface, borderColor: isPlaying ? c.hi : c.line },
                ]}
              >
                <Text style={{ fontSize: 24 }}>{t.emoji}</Text>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[styles.trackName, { color: c.ink }]}>{t.name}</Text>
                  <Text style={[styles.trackDesc, { color: c.muted }]}>{t.desc}</Text>
                </View>
                <Text style={{ fontFamily: fonts.bodyBlack, fontSize: 13, color: isPlaying ? c.ok : c.muted }}>
                  {isPlaying ? '⏸ Durdur' : '▶ Çal'}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Btn label="Kapat" onPress={onClose} block style={{ marginTop: 10 }} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  turntable: {
    width: 130,
    height: 130,
    borderRadius: 65,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: 'rgba(0,0,0,0.08)',
    marginVertical: 6,
  },
  vinyl: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vinylLabel: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  glow: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
  },
  groove: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  armWrap: {
    position: 'absolute',
    top: 2,
    right: 10,
    width: 8,
    height: 70,
    alignItems: 'center',
    transformOrigin: 'top center',
  },
  arm: { width: 4, height: 58, borderRadius: 2 },
  armHead: { width: 10, height: 12, borderRadius: 3 },
  waves: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 28 },
  bar: { width: 5, height: 28, borderRadius: 3 },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.tile,
    padding: 12,
    gap: 12,
    borderWidth: 1.5,
  },
  trackName: {
    fontFamily: fonts.bodyBlack,
    fontSize: 14.5,
  },
  trackDesc: {
    fontFamily: fonts.bodyBold,
    fontSize: 11.5,
  },
});
