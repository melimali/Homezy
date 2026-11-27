import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';

import { PlantArt } from '@/components/GardenArt';
import { PLOTS, STAGE_NAMES, isPlotLovedToday, stageOf, type Flower, type Garden, type Plot } from '@/domain/garden';

// The coordinates match the nine soil marks in ada_ilkbahar.webp.
const TOP_MARGIN = 0.12;
const SLOTS = [
  [0.50, 0.31],
  [0.36, 0.39], [0.64, 0.39],
  [0.22, 0.47], [0.50, 0.47], [0.78, 0.47],
  [0.36, 0.55], [0.64, 0.55],
  [0.50, 0.63],
] as const;

const island = require('../../assets/bahce/ada/ada_ilkbahar.webp');
const dryBed = require('../../assets/bahce/ada/yatak.webp');
const wetBed = require('../../assets/bahce/ada/yatak_islak.webp');
const stages: readonly ImageSourcePropType[] = [
  require('../../assets/bahce/bitki/govde_0.webp'),
  require('../../assets/bahce/bitki/govde_1.webp'),
  require('../../assets/bahce/bitki/govde_2.webp'),
  require('../../assets/bahce/bitki/govde_3.webp'),
];
const blooms: Readonly<Partial<Record<string, ImageSourcePropType>>> = {
  papatya: require('../../assets/bahce/bitki/cicek_papatya.webp'),
  lale: require('../../assets/bahce/bitki/cicek_lale.webp'),
  aycicegi: require('../../assets/bahce/bitki/cicek_aycicegi.webp'),
  lavanta: require('../../assets/bahce/bitki/cicek_lavanta.webp'),
  gul: require('../../assets/bahce/bitki/cicek_gul.webp'),
  menekse: require('../../assets/bahce/bitki/cicek_menekse.webp'),
};

export function gardenPlantSource(flowerId: string, stage: number) {
  return stage === 5 ? blooms[flowerId] : stages[stage];
}

function GardenPlant({ flower, stage, size, x, y, wilt }: {
  flower: Flower; stage: number; size: number; x: number; y: number; wilt: boolean;
}) {
  const source = gardenPlantSource(flower.id, stage);
  const [failedSource, setFailedSource] = useState<ImageSourcePropType>();
  if (!source || source === failedSource) {
    const svgSize = size * 0.66;
    return (
      <View style={[styles.absolute, { left: x - svgSize / 2, top: y - svgSize * 58 / 60 }]}>
        <PlantArt flower={flower} stage={stage} size={svgSize} pot={false} wilt={wilt} />
      </View>
    );
  }
  return (
    <Image
      source={source}
      onError={() => setFailedSource(source)}
      style={[styles.absolute, {
        width: size, height: size * 1.5, left: x - size / 2, top: y - size * 1.5 * 700 / 768,
        opacity: wilt ? 0.6 : 1,
        transformOrigin: '50% 91%',
        transform: wilt ? [{ rotate: '14deg' }] : undefined,
      }]}
      resizeMode="contain"
    />
  );
}

type GrownPlot = { p: Plot; f?: Flower; g: number };
type Props = {
  plots: GrownPlot[];
  garden: Garden;
  now: number;
  capacity: number;
  selected: string | null;
  wilt: boolean;
  dim: number;
  onSelect: (id: string) => void;
  onEmpty: () => void;
};

export function GardenIsland({ plots, garden, now, capacity, selected, wilt, dim, onSelect, onEmpty }: Props) {
  const [width, setWidth] = useState(0);
  const bedSize = width * 0.19;
  const targetSize = Math.max(44, bedSize * 0.80);
  const labelOf = ({ f, g }: GrownPlot) =>
    f ? `${f.name}, ${STAGE_NAMES[stageOf(g, f.grow)]}, ${g}/${f.grow} büyüme` : 'Bahçe yatağı';

  return (
    <>
      <View style={styles.island} onLayout={({ nativeEvent }) => setWidth(nativeEvent.layout.width)}>
        <View pointerEvents="none" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={[StyleSheet.absoluteFill, { opacity: dim }]}>
          <Image source={island} style={[styles.terrain, { top: -width * TOP_MARGIN, height: width }]} resizeMode="contain" />
          {width > 0 && SLOTS.map(([u, v], index) => {
            const plot = plots[index];
            const x = u * width;
            const y = (v - TOP_MARGIN) * width;
            const locked = !plot && index >= capacity;
            const wet = plot && isPlotLovedToday(garden, plot.p.id, now);
            return (
              <View key={index} style={StyleSheet.absoluteFill}>
                <Image source={wet ? wetBed : dryBed} style={[styles.absolute, {
                  width: bedSize, height: bedSize, left: x - bedSize / 2, top: y - bedSize * 0.45,
                  opacity: locked ? 0.55 : 1,
                }]} resizeMode="contain" />
                {plot?.f && <GardenPlant key={plot.p.id} flower={plot.f} stage={stageOf(plot.g, plot.f.grow)} size={bedSize} x={x} y={y} wilt={wilt} />}
                {locked && <Text style={[styles.lock, { left: x - 10, top: y - 8 }]}>🔒</Text>}
              </View>
            );
          })}
        </View>
        {width > 0 && SLOTS.map(([u, v], index) => {
          const plot = plots[index];
          if (!plot && index >= capacity) return null;
          const active = !!plot && selected === plot.p.id;
          return (
            <Pressable
              key={index}
              testID={`garden-bed-${index + 1}`}
              accessibilityRole="button"
              accessibilityLabel={plot ? labelOf(plot) : `Boş yatak ${index + 1}, tohum ek`}
              accessibilityState={{ selected: active }}
              onPress={plot ? () => onSelect(plot.p.id) : onEmpty}
              style={({ pressed }) => [styles.target, {
                left: u * width - targetSize / 2, top: (v - TOP_MARGIN) * width - targetSize / 2,
                width: targetSize, height: targetSize,
              }, (active || pressed) && styles.active]}
            />
          );
        })}
      </View>
      {plots.slice(PLOTS.premium).map(plot => (
        <Pressable key={plot.p.id} accessibilityRole="button" onPress={() => onSelect(plot.p.id)} style={styles.extra}>
          <Text style={styles.extraLabel}>{labelOf(plot)}</Text>
        </Pressable>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  island: { width: '100%', aspectRatio: 1 / 0.74 },
  terrain: { position: 'absolute', width: '100%' },
  absolute: { position: 'absolute' },
  lock: { position: 'absolute', width: 20, fontSize: 13, textAlign: 'center' },
  target: { position: 'absolute', borderRadius: 14 },
  active: { backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 2, borderColor: '#FFF6D9' },
  extra: { alignSelf: 'center', minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 14, backgroundColor: '#FFF6D9' },
  extraLabel: { color: '#283044' },
});
