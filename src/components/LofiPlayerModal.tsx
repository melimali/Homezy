import { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { sfx } from '@/lib/sfx';
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
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
    sfx('coin');
    setActiveTrack(activeTrack?.id === t.id ? null : t);
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
          <Animated.View style={[styles.vinyl, { transform: [{ rotate: spin }], backgroundColor: activeTrack ? c.ink : c.muted }]}>
            <View style={[styles.vinylLabel, { backgroundColor: c.warm }]} />
          </Animated.View>
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
