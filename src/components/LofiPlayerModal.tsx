import { useEffect, useState, useSyncExternalStore } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';

import { useActive } from '@/hooks/useActive';
import { ambientAvailable, COMBOS, comboActive, getActive, getCustom, getLevel, getSleepAt, playCombo, saveCustom, suggestCombo, setLevel, setPlaying, setSleep, solo, stopAll, subscribe, toggle, type AmbientId } from '@/lib/ambient';
import { haptic } from '@/lib/sfx';
import { fonts, radius, useColors } from '@/theme';
import { useStore } from '@/store/AppStore';
import { answered, checkinOf } from '@/domain/mood';
import { Btn, Chip, Sheet, T } from './ui';

type Track = {
  id: AmbientId;
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
  { id: 'storm', emoji: '⛈️', name: 'Gök Gürültülü Fırtına', desc: 'Sert yağmur, pencerede fırtına', soundType: 'storm' },
  { id: 'slowlofi', emoji: '🌌', name: 'Yavaş Lo-Fi', desc: 'Gece geç saat için ağır, uykulu ritimler', soundType: 'slowlofi' },
  { id: 'deepsea', emoji: '🐋', name: 'Derin Okyanus', desc: 'Yavaş, derin ve sakin dalgalar', soundType: 'deepsea' },
  { id: 'windharsh', emoji: '🌬️', name: 'Sert Rüzgâr', desc: 'Pencereyi zorlayan güçlü rüzgâr', soundType: 'windharsh' },
  { id: 'winterwind', emoji: '❄️', name: 'Kış Rüzgârı', desc: 'Soğuk, uzaktan uğuldayan kış rüzgârı', soundType: 'winterwind' },
  { id: 'boil', emoji: '🫖', name: 'Kaynayan Su', desc: 'Ocakta kaynayan çaydanlık, sıcak mutfak', soundType: 'boil' },
  { id: 'fan', emoji: '🌀', name: 'Fan Sesi', desc: 'Uykuya dalmak için sabit beyaz gürültü', soundType: 'fan' },
  { id: 'rainbirds', emoji: '🐦', name: 'Yağmur ve Kuşlar', desc: 'Uzaktan hafif yağmur, uyku için kuş sesleri', soundType: 'rainbirds' },
  { id: 'drizzle', emoji: '💧', name: 'Derin Çiseleme', desc: 'Yeşil gürültü tonunda yumuşak çiseleme', soundType: 'drizzle' },
  { id: 'piano', emoji: '🎹', name: 'Sakin Piyano', desc: 'Dinlendiren yavaş piyano melodisi', soundType: 'piano' },
  { id: 'emotional', emoji: '🥹', name: 'Duygusal Müzik', desc: 'Yumuşak, duygusal bir melodi', soundType: 'emotional' },
  { id: 'roma', emoji: '🌹', name: 'Roma Duygusal', desc: 'Romantik ve duygusal enstrümantal', soundType: 'roma' },
];

type Props = {
  open: boolean;
  onClose: () => void;
};

/** Moka'nın Pikapı: Dinlendirici ASMR ve Lo-Fi sesler modalı. */
export function LofiPlayerModal({ open, onClose }: Props) {
  const c = useColors();
  // Parçalar modal kapansa da çalmaya devam eder; birden fazlası karışabilir.
  const active = useSyncExternalStore(subscribe, getActive);
  const activeTrack = TRACKS.find(t => active.includes(t.id)) ?? null;
  const playing = active.length > 0;
  const { state: S } = useStore();
  const sleepAt = getSleepAt();
  const custom = getCustom();
  const live = useActive(); // Ekran odakta değilken animasyon dönmesin
  const spinning = playing && live;
  const [spinAnim] = useState(() => new Animated.Value(0));
  const [armAnim] = useState(() => new Animated.Value(0));
  const [pulseAnim] = useState(() => new Animated.Value(0));
  const [bars] = useState(() => [0, 1, 2, 3, 4].map(() => new Animated.Value(0.3)));

  useEffect(() => {
    Animated.timing(armAnim, {
      toValue: playing ? 1 : 0,
      duration: 600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    if (!spinning) {
      pulseAnim.setValue(0);
      bars.forEach(b => b.setValue(0.3));
      return;
    }
    pulseAnim.setValue(0);
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
  }, [playing, spinning, armAnim, pulseAnim, bars]);

  const armRot = armAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '24deg'] });
  const glowScale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.55] });
  const glowOpacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] });

  useEffect(() => {
    if (!spinning) return;
    // Yerel sürücüyle durdurulmuş değerin üstüne yeni döngü kurulursa dönmez: her başlatmada sıfırla.
    spinAnim.setValue(0);
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
  }, [spinning, spinAnim]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const selectTrack = (t: Track) => {
    haptic('medium');
    toggle(t.id);
  };

  const step = (dir: 1 | -1) => {
    haptic('light');
    const i = activeTrack ? TRACKS.findIndex(t => t.id === activeTrack.id) : dir === 1 ? -1 : 0;
    solo(TRACKS[(i + dir + TRACKS.length) % TRACKS.length].id);
  };

  return (
    <Sheet open={open} onClose={onClose} pose="cozy_plant" scroll>
      <View style={{ alignItems: 'center', gap: 16, paddingVertical: 10 }}>
        <Text style={{ lineHeight: 62, fontSize: 48 }}>🎵</Text>
        <T v="h2">Moka&apos;nın Pikapı</T>
        <T v="small" style={{ textAlign: 'center' }}>
          Plağı seç, iğneyi bırak: temizlik ve dinlenme için huzurlu sesler.
        </T>

        {/* Pikap: gövde, dönen plak, ses kolu */}
        <View style={[styles.turntable, { backgroundColor: c.surface2 }]}>
          <Animated.View
            pointerEvents="none"
            style={[styles.glow, { borderColor: c.warm, opacity: glowOpacity, transform: [{ scale: glowScale }] }]}
          />
          <Animated.View style={[styles.vinyl, { transform: [{ rotate: spin }], backgroundColor: playing ? c.ink : c.muted }]}>
            <View style={[styles.groove, { width: 130, height: 130, borderRadius: 65 }]} />
            <View style={[styles.groove, { width: 104, height: 104, borderRadius: 52 }]} />
            <View style={[styles.groove, { width: 80, height: 80, borderRadius: 40 }]} />
            <View style={[styles.vinylLabel, { backgroundColor: c.warm }]}>
              <Text style={{ fontSize: 16 }}>{activeTrack?.emoji ?? '☕'}</Text>
            </View>
          </Animated.View>
          <View style={[styles.pivot, { backgroundColor: c.line }]} />
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
          <Btn label={playing ? '⏸' : '▶'} onPress={() => (playing ? stopAll() : setPlaying('lofi', true))} />
          <Btn label="⏭" onPress={() => step(1)} />
        </View>

        <T v="bold" style={{ color: playing ? c.ok : c.muted, textAlign: 'center' }}>
          {playing ? '🎶 ' + TRACKS.filter(t => active.includes(t.id)).map(t => t.emoji + ' ' + t.name).join(' + ') : ambientAvailable() ? 'Pikap duruyor' : 'Bu derlemede ses çalma yok'}
        </T>

        {/* Katman ses ayarı */}
        {playing && (
          <View style={{ width: '100%', gap: 6 }}>
            <T v="bold">Katman Sesleri</T>
            {TRACKS.filter(t => active.includes(t.id)).map(t => (
              <View key={t.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={{ lineHeight: 26, fontSize: 20 }}>{t.emoji}</Text>
                <Pressable onPress={() => setLevel(t.id, getLevel(t.id) - 0.1)} accessibilityRole="button" accessibilityLabel="Kıs" style={styles.lvlBtn}>
                  <Text style={{ fontFamily: fonts.bodyBlack, fontSize: 18, color: c.ink }}>−</Text>
                </Pressable>
                <View style={[styles.lvlTrack, { backgroundColor: c.line }]}>
                  <View style={{ width: `${Math.round(getLevel(t.id) * 100)}%`, height: 8, borderRadius: 4, backgroundColor: c.warm }} />
                </View>
                <Pressable onPress={() => setLevel(t.id, getLevel(t.id) + 0.1)} accessibilityRole="button" accessibilityLabel="Aç" style={styles.lvlBtn}>
                  <Text style={{ fontFamily: fonts.bodyBlack, fontSize: 18, color: c.ink }}>+</Text>
                </Pressable>
              </View>
            ))}
            <Btn small kind="soft" label="⭐ Kombom olarak kaydet" onPress={() => saveCustom()} />
          </View>
        )}

        {/* Uyku zamanlayıcısı */}
        <View style={{ width: '100%', gap: 6 }}>
          <T v="bold">😴 Uyku Zamanlayıcısı</T>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <Chip label="Kapalı" on={!sleepAt} onPress={() => setSleep(null)} />
            {[15, 30, 60].map(m => (
              <Chip key={m} label={`${m} dk`} on={!!sleepAt && Math.abs((sleepAt - Date.now()) / 60000 - m) < 1.5} onPress={() => setSleep(m)} />
            ))}
          </View>
        </View>

        <Btn
          kind="soft"
          label="✨ Moka'nın seçimi"
          onPress={() => {
            const ci = checkinOf(S.play);
            const pick = suggestCombo(answered(ci) ? ci.feel : null);
            haptic('medium');
            if (!comboActive(pick)) playCombo(pick);
          }}
        />

        {/* Hazır kombolar */}
        <View style={{ width: '100%', gap: 8 }}>
          <T v="bold">Hazır Kombolar</T>
          {(custom ? [custom, ...COMBOS] : COMBOS).map(k => {
            const on = comboActive(k);
            return (
              <Pressable
                key={k.id}
                onPress={() => {
                  haptic('medium');
                  playCombo(k);
                }}
                accessibilityRole="button"
                accessibilityLabel={k.name}
                style={[styles.trackRow, { backgroundColor: on ? c.accentSoft : c.surface, borderColor: on ? c.hi : c.line }]}
              >
                <Text style={{ lineHeight: 31, fontSize: 24 }}>{k.emoji}</Text>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[styles.trackName, { color: c.ink }]}>{k.name}</Text>
                  <Text style={[styles.trackDesc, { color: c.muted }]}>{k.desc}</Text>
                </View>
                <Text style={{ fontFamily: fonts.bodyBlack, fontSize: 13.5, color: on ? c.ok : c.muted }}>{on ? '⏸ Durdur' : '▶ Çal'}</Text>
              </Pressable>
            );
          })}
        </View>

        <T v="bold" style={{ width: '100%' }}>Tek Plaklar</T>
        {/* Parça Listesi */}
        <View style={{ width: '100%', gap: 8 }}>
          {TRACKS.map(t => {
            const isPlaying = active.includes(t.id);
            return (
              <Pressable
                key={t.id}
                onPress={() => selectTrack(t)}
                accessibilityRole="button"
                accessibilityLabel={t.name}
                style={[
                  styles.trackRow,
                  { backgroundColor: isPlaying ? c.accentSoft : c.surface, borderColor: isPlaying ? c.hi : c.line },
                ]}
              >
                <Text style={{ lineHeight: 31, fontSize: 24 }}>{t.emoji}</Text>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[styles.trackName, { color: c.ink }]}>{t.name}</Text>
                  <Text style={[styles.trackDesc, { color: c.muted }]}>{t.desc}</Text>
                </View>
                <Text style={{ fontFamily: fonts.bodyBlack, fontSize: 13.5, color: isPlaying ? c.ok : c.muted }}>
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
    width: 250,
    height: 190,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: 'rgba(0,0,0,0.10)',
    marginVertical: 6,
  },
  vinyl: {
    width: 150,
    height: 150,
    borderRadius: 75,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 30,
    overflow: 'hidden',
  },
  vinylLabel: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
    borderColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    left: 25,
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 3,
  },
  pivot: { position: 'absolute', top: 12, right: 18, width: 22, height: 22, borderRadius: 11 },
  groove: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  armWrap: {
    position: 'absolute',
    top: 18,
    right: 27,
    width: 8,
    height: 100,
    alignItems: 'center',
    transformOrigin: 'top center',
  },
  arm: { width: 4, height: 84, borderRadius: 2 },
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
  lvlBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.06)' },
  lvlTrack: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  trackName: {
    fontFamily: fonts.bodyBlack,
    fontSize: 15,
  },
  trackDesc: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
  },
});
