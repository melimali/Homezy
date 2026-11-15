import { StyleSheet, Text, View } from 'react-native';

import { PlantArt } from '@/components/GardenArt';
import { Breathe, Flutter, Sway } from '@/components/gardenFx';
import { Float, Squish } from '@/components/motion';
import { T } from '@/components/ui';
import { gardenPlants, plantsWilted } from '@/domain/garden';
import type { HouseProgress } from '@/domain/play';
import type { Play } from '@/domain/types';
import { radius, useColors } from '@/theme';

/**
 * Evin yanındaki bahçe: Moka bahçesindeki aynı çiçekler (saksılar + albüm). Her iş çiçeklere su olur;
 * seri kopunca solarlar, iş yapılınca canlanırlar. Dokununca Moka bahçesi açılır.
 */
export function HouseGarden({ play, now, hp, onOpen }: { play: Play; now: number; hp: HouseProgress; onOpen: () => void }) {
  const c = useColors();
  const list = gardenPlants(play, now);
  const wilt = plantsWilted(hp);
  const watered = !wilt && hp.today;
  return (
    <Squish onPress={onOpen} accessibilityRole="button" accessibilityLabel="Bahçeye git" style={[styles.box, { backgroundColor: c.surface2 }]}>
      <View style={styles.row}>
        {list.length === 0 && <T v="small" style={{ flex: 1, textAlign: 'center' }}>Bahçen henüz boş. İlk tohumu ek, işlerle büyüsün 🌱</T>}
        {list.map((x, i) => (
          <Sway key={x.key} deg={wilt ? 1 : 4} dur={2200 + (i % 5) * 340} delay={i * 180}>
            <Breathe amp={wilt ? 0 : 0.04} dur={1800 + (i % 3) * 300}>
              <PlantArt flower={x.flower} stage={x.stage} size={44} pot={false} wilt={wilt} />
            </Breathe>
          </Sway>
        ))}
      </View>
      <View style={[styles.grass, { backgroundColor: wilt ? '#9AA98F' : '#86BC8F' }]} />
      {!wilt && <Flutter emoji="🦋" top="10%" dur={9000} size={16} />}
      {watered && (
        <Float amp={3} dur={1600}>
          <Text style={styles.drop}>💧</Text>
        </Float>
      )}
      <T v="tiny" style={{ textAlign: 'center', paddingVertical: 4 }}>
        {wilt ? 'Çiçekler susadı. Bir iş yap, hemen canlanırlar 🥀' : 'Her iş çiçeklerine su olur 💧'}
      </T>
    </Squish>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: radius.tile, overflow: 'hidden', marginTop: 8, paddingTop: 10 },
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'flex-end', gap: 2, paddingHorizontal: 8, minHeight: 56 },
  grass: { height: 8, marginTop: -4, borderTopLeftRadius: 8, borderTopRightRadius: 8 },
  drop: { position: 'absolute', right: 14, top: -48, fontSize: 18 },
});
