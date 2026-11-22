import { useEffect, useState } from 'react';
import { Animated, Easing, Image, View, type ImageSourcePropType } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { HELD_POSES, HELD_SPRITES } from '@/constants/mokaHeldSprites';
import { COLORED_DRAWN_HOLDS } from '@/constants/mokaColoredDrawnHolds';

type Point = readonly [number, number];
type Hold = {
  grip: Point; wrist: Point; scale: number; angle: number; support?: Point; left?: boolean; fish?: boolean; sparkle?: Point;
};

export const HOLDS: Record<string, Hold | undefined> = HELD_POSES;

const DRAWN_HOLDS: Record<string, ImageSourcePropType> = {
  el_fincan: require('../../assets/moka/drawn-holds/fincan.webp'),
  el_kitap: require('../../assets/moka/drawn-holds/kitap.webp'),
  el_cicek: require('../../assets/moka/drawn-holds/cicek.webp'),
  el_supurge: require('../../assets/moka/drawn-holds/supurge.webp'),
  el_balon: require('../../assets/moka/drawn-holds/balon.webp'),
  el_telefon: require('../../assets/moka/drawn-holds/telefon.webp'),
  el_kilic: require('../../assets/moka/drawn-holds/kilic.webp'),
  el_degnek: require('../../assets/moka/drawn-holds/asa.webp'),
  el_gitar: require('../../assets/moka/drawn-holds/ukulele.webp'),
  el_olta: require('../../assets/moka/drawn-holds/olta.webp'),
  el_firca: require('../../assets/moka/drawn-holds/firca.webp'),
  el_semsiye: require('../../assets/moka/drawn-holds/semsiye.webp'),
  el_hediye: require('../../assets/moka/drawn-holds/hediye.webp'),
  el_pasta: require('../../assets/moka/drawn-holds/pasta.webp'),
  el_fener: require('../../assets/moka/drawn-holds/fener.webp'),
  el_harita: require('../../assets/moka/drawn-holds/harita-v2.webp'),
  el_megafon: require('../../assets/moka/drawn-holds/megafon.webp'),
  el_mum: require('../../assets/moka/drawn-holds/mum.webp'),
  el_sulama: require('../../assets/moka/drawn-holds/sulama.webp'),
  el_kamera: require('../../assets/moka/drawn-holds/kamera.webp'),
};

/** Kanat ile eli ayıran dikey çizgi (görselin genişliğine oranı). Eşya bu çizgiyi aşıyorsa kesilip aralanır; şemsiyenin tepesi ortadan geçtiği için çizgi kanat ile şemsiye arasına alındı. */
const SEAM: Record<string, number | undefined> = { el_semsiye: 0.36 };
/** Eşyayı tutan kanatlar çok yukarıdaysa tüm görseli aşağı indirir (görselin boyuna oranı). */
const DROP: Record<string, number | undefined> = { el_fincan: 0.055, el_kitap: 0.05, el_hediye: -0.035, el_pasta: -0.03 };
/** Çiftli kanat görselini kendi merkezi etrafında büyütür (ukulele gibi küçük kalan eşyalar). */
const GROW: Record<string, number | undefined> = { el_gitar: 1.22, el_telefon: 1.45, el_hediye: 1.3, el_pasta: 1.3 };
/** Eşyayı tutan tek kanadı büyütür (olta tutan sağ kanat). */
const WING_GROW: Record<string, number | undefined> = { el_olta: 1.12, el_kilic: 1.15, el_degnek: 1.15, el_balon: 1.3, el_semsiye: 1.25 };
/** Eşyayı tutan tek kanadı yatayda kaydırır (görsel genişliğine oranı; + sağa). */
const SHIFT_X: Record<string, number | undefined> = { el_semsiye: 0.03 };

const DRAWN_EFFECTS: Record<string, Point | undefined> = {
  el_fincan: [275, 220], el_fener: [361, 302], el_mum: [282, 201],
  el_kamera: [303, 274],
};

function objectPoint(pose: Hold, p: Point): Point {
  const angle = pose.angle * Math.PI / 180;
  const dx = (p[0] - pose.grip[0]) * pose.scale;
  const dy = (p[1] - pose.grip[1]) * pose.scale;
  return [pose.wrist[0] + dx * Math.cos(angle) - dy * Math.sin(angle), pose.wrist[1] + dx * Math.sin(angle) + dy * Math.cos(angle)];
}

function useFrame(motion: Animated.Value, frames: number, enabled: boolean) {
  const middle = Math.floor(frames / 2);
  const [frame, setFrame] = useState(middle);
  useEffect(() => {
    if (!enabled || frames < 2) return;
    const subscription = motion.addListener(({ value }) => {
      const next = Math.round((Math.max(-1, Math.min(1, value)) + 1) * (frames - 1) / 2);
      setFrame(next);
    });
    return () => motion.removeListener(subscription);
  }, [enabled, frames, motion]);
  return enabled ? frame : middle;
}

const EFFECT: Record<string, Point | undefined> = {
  el_fener: [376, 357], el_mum: [375, 314], el_kamera: [411, 318],
  el_fincan: [372, 324], el_telefon: [374, 334],
};

export function HeldItemModel({ id, size, pose, fur, motion, animated }: {
  id: string; size: number; pose: Hold; fur?: string | null; motion: Animated.Value; animated: boolean;
}) {
  const sprite = HELD_SPRITES[id];
  const drawn = !fur || fur === 'orman' ? DRAWN_HOLDS[id] : COLORED_DRAWN_HOLDS[id]?.[fur];
  const frame = useFrame(motion, sprite?.frames ?? 1, animated && !drawn);
  if (!sprite) return null;
  if (drawn) {
    const effect = DRAWN_EFFECTS[id];
    const oneWingItem = ['el_cicek', 'el_balon', 'el_kilic', 'el_degnek', 'el_olta', 'el_firca', 'el_semsiye', 'el_fener', 'el_megafon', 'el_sulama'].includes(id);
    const drop = DROP[id] ?? (oneWingItem ? 0 : 0.06);
    const grow = GROW[id] ?? 1;
    const effectPoint: Point | undefined = effect && id === 'el_fener' ? [effect[0] + 512 * 0.06, effect[1]] : effect && drop ? [effect[0], effect[1] + 512 * drop] : effect;
    const mirrored = id === 'el_kilic' || id === 'el_degnek';
    const seam = size * (0.07 + (SEAM[id] ?? 0.5) * 0.86);
    const oneWing = ['el_cicek', 'el_balon', 'el_kilic', 'el_degnek', 'el_olta', 'el_firca', 'el_semsiye', 'el_fener', 'el_megafon', 'el_sulama'].includes(id);
    const heldSide = mirrored || id === 'el_firca' ? 0 : 1;
    return (
      <Animated.View pointerEvents="none" style={{
        position: 'absolute', width: size, height: size,
        transform: [
          { translateX: animated ? motion.interpolate({ inputRange: [-1, 1], outputRange: [-size * 0.003, size * 0.003] }) : 0 },
          { translateY: animated && !oneWing ? motion.interpolate({ inputRange: [-1, 1], outputRange: [size * 0.002, -size * 0.002] }) : 0 },
        ],
      }}>
        {oneWing ? [0, 1].map(side => <Animated.View key={side} pointerEvents="none" style={{
          position: 'absolute', left: side * seam, width: side === 0 ? seam : size - seam, height: size, overflow: 'hidden',
          transform: [
            { translateX: size * (side === 0 ? -0.04 : 0.06 + (SHIFT_X[id] ?? 0)) },
            { translateX: size * (side === 0 ? 0.12 : -0.12) }, { translateY: size * 0.02 },
            { rotate: animated && side === heldSide
              ? motion.interpolate({ inputRange: [-1, 1], outputRange: ['-2deg', '2deg'] }) : '0deg' },
            { translateY: -size * 0.02 }, { translateX: size * (side === 0 ? -0.12 : 0.12) }, { scale: side === heldSide ? (WING_GROW[id] ?? 1) : 1 },
          ],
        }}>{id === 'el_balon' && side === 1 && animated ? <>
          <Animated.View style={{ position: 'absolute', width: size / 2, height: size * 0.438, overflow: 'hidden', transform: [
            { translateX: -size * 0.065 }, { translateY: size * 0.219 },
            { rotate: motion.interpolate({ inputRange: [-1, 1], outputRange: ['-1.5deg', '1.5deg'] }) },
            { translateY: -size * 0.219 }, { translateX: size * 0.065 },
          ] }}><Image source={drawn} resizeMode="stretch" fadeDuration={0} accessible={false}
            style={{ position: 'absolute', left: size * -0.43, top: size * 0.025, width: size * 0.86, height: size * 0.86 }} /></Animated.View>
          <View style={{ position: 'absolute', top: size * 0.438, width: size / 2, height: size * 0.562, overflow: 'hidden' }}>
            <Image source={drawn} resizeMode="stretch" fadeDuration={0} accessible={false}
              style={{ position: 'absolute', left: size * -0.43, top: size * (0.025 - 0.438), width: size * 0.86, height: size * 0.86 }} />
          </View>
        </> : id === 'el_olta' && side === 1 && animated ? <>
          <View style={{ position: 'absolute', width: size * 0.267, height: size, overflow: 'hidden' }}>
            <Image source={drawn} resizeMode="stretch" fadeDuration={0} accessible={false} style={{ position: 'absolute', left: -size * 0.43, top: size * 0.025, width: size * 0.86, height: size * 0.86 }} />
          </View>
          <View style={{ position: 'absolute', left: size * 0.267, width: size * 0.233, height: size * 0.369, overflow: 'hidden' }}>
            <Image source={drawn} resizeMode="stretch" fadeDuration={0} accessible={false} style={{ position: 'absolute', left: -size * 0.697, top: size * 0.025, width: size * 0.86, height: size * 0.86 }} />
          </View>
          <Animated.View style={{ position: 'absolute', left: size * 0.267, top: size * 0.369, width: size * 0.233, height: size * 0.631, overflow: 'hidden', transform: [
            { translateX: size * 0.008 }, { translateY: -size * 0.3155 },
            { rotate: motion.interpolate({ inputRange: [-1, 1], outputRange: ['-3deg', '3deg'] }) },
            { translateY: size * 0.3155 }, { translateX: -size * 0.008 },
          ] }}>
            <Image source={drawn} resizeMode="stretch" fadeDuration={0} accessible={false} style={{ position: 'absolute', left: -size * 0.697, top: -size * 0.344, width: size * 0.86, height: size * 0.86 }} />
          </Animated.View>
        </> : <Image source={drawn} resizeMode="stretch" fadeDuration={0} accessible={false}
          style={{ position: 'absolute', left: size * 0.07 - side * seam, top: size * 0.025, width: size * 0.86, height: size * 0.86, transform: [{ scaleX: mirrored ? -1 : 1 }] }} />}</Animated.View>) :
          <Image source={drawn} resizeMode="stretch" fadeDuration={0} accessible={false}
            style={{ position: 'absolute', left: size * (0.5 - 0.43 * grow), top: size * (0.025 + drop + 0.43 * (1 - grow)), width: size * 0.86 * grow, height: size * 0.86 * grow, transform: [{ scaleX: id === 'el_kitap' ? 1.15 : 1 }] }} />}
        {animated && effectPoint && <HeldEffect key={'drawn-effect-' + id} id={id} size={size} point={effectPoint} />}
        {animated && id === 'el_sulama' && <View pointerEvents="none" style={{ position: 'absolute', left: size * 0.904, top: size * 0.59 }}>
          {[0, 1, 2].map(index => <Animated.View key={index} style={{
            position: 'absolute', left: index * size * 0.008, width: size * 0.009, height: size * 0.014,
            borderRadius: size * 0.006, backgroundColor: '#A8E0ED',
            opacity: motion.interpolate({ inputRange: [-1, -0.3, 0.5, 1], outputRange: [0, 0.75, 0.6, 0] }),
            transform: [{ translateY: motion.interpolate({ inputRange: [-1, 1], outputRange: [index * size * 0.009, size * (0.06 + index * 0.009)] }) }],
          }} />)}
        </View>}
        {animated && id === 'el_degnek' && <View pointerEvents="none" style={{ position: 'absolute', left: size * 0.20, top: size * 0.35 }}>
          {[-1, 0, 1].map((direction, index) => <Animated.View key={direction} style={{
            position: 'absolute', width: size * 0.014, height: size * 0.014, borderRadius: size * 0.007,
            backgroundColor: index === 1 ? '#FFEAB0' : '#FFCA64',
            opacity: motion.interpolate({ inputRange: [-1, -0.3, 0.3, 1], outputRange: [0, 0.9, 0.8, 0] }),
            transform: [
              { translateX: motion.interpolate({ inputRange: [-1, 1], outputRange: [0, direction * size * 0.06] }) },
              { translateY: motion.interpolate({ inputRange: [-1, 1], outputRange: [0, -size * (0.05 + index * 0.02)] }) },
            ],
          }} />)}
        </View>}
      </Animated.View>
    );
  }
  const source = sprite.files[fur ?? 'orman'] ?? sprite.files.orman;
  const unit = size / 512;
  const width = sprite.width * unit;
  const height = sprite.height * unit;
  const position = { position: 'absolute' as const, left: sprite.x * unit, top: sprite.y * unit, width, height };
  const tip = pose.sparkle && objectPoint(pose, pose.sparkle);
  const effect = EFFECT[id];
  const effectPoint = effect && objectPoint(pose, effect);
  return (
    <>
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute', width: size, height: size,
          transform: [{ translateX: animated ? motion.interpolate({ inputRange: [-1, 1], outputRange: [-size * 0.003, size * 0.003] }) : 0 }],
        }}
      >
        {sprite.frames === 1 ? (
          <Image source={source} style={position} resizeMode="stretch" fadeDuration={0} accessible={false} />
        ) : (
          <View pointerEvents="none" style={[position, { overflow: 'hidden' }]}>
            <Image source={source} style={{ position: 'absolute', left: -width * frame, top: 0, width: width * sprite.frames, height }} resizeMode="stretch" fadeDuration={0} accessible={false} />
          </View>
        )}
      </Animated.View>
      {animated && effectPoint && <HeldEffect key={'effect-' + id} id={id} size={size} point={effectPoint} />}
      {animated && tip && (
        <View pointerEvents="none" style={{ position: 'absolute', zIndex: 3, left: (pose.left ? 517 - tip[0] : tip[0]) * size / 512, top: tip[1] * size / 512 }}>
          {[-1, 1, 0].map((direction, index) => {
            const radius = size * (index === 0 ? 0.009 : 0.005);
            const input = [-1, -0.58 + index * 0.25, -0.36 + index * 0.25, 0.32 + index * 0.25, 1];
            return <Animated.View key={direction} style={{
              position: 'absolute', width: radius * 2, height: radius * 2, borderRadius: radius,
              backgroundColor: index === 1 ? '#FFEAB0' : '#FFCA64',
              opacity: motion.interpolate({ inputRange: input, outputRange: [0, 0, 0.95, 0, 0] }),
              transform: [
                { translateX: motion.interpolate({ inputRange: [-1, 1], outputRange: [0, direction * size * 0.11] }) },
                { translateY: motion.interpolate({ inputRange: [-1, 1], outputRange: [0, -size * (0.07 + index * 0.035)] }) },
              ],
            }} />;
          })}
        </View>
      )}
    </>
  );
}


const EFFECT_PERIOD: Record<string, number> = {
  el_fincan: 2250, el_fener: 2300, el_mum: 760, el_kamera: 7900, el_telefon: 2550,
};

function HeldEffect({ id, size, point }: { id: string; size: number; point: Point }) {
  const [progress] = useState(() => new Animated.Value(0));
  useEffect(() => {
    progress.setValue(0);
    const loop = Animated.loop(Animated.timing(progress, {
      toValue: 1, duration: EFFECT_PERIOD[id], easing: Easing.linear, useNativeDriver: true, isInteraction: false,
    }));
    loop.start();
    return () => loop.stop();
  }, [id, progress]);
  const anchor = { position: 'absolute' as const, zIndex: 3, left: point[0] * size / 512, top: point[1] * size / 512 };
  if (id === 'el_fincan') {
    // Three puffs cross the loop boundary only when fully transparent.
    return <View pointerEvents="none" style={anchor}>
      {[0, 1, 2].map(i => {
        const t = i / 3;
        const phase = progress.interpolate(i === 0 ? { inputRange: [0, 1], outputRange: [0, 1] } : {
          inputRange: [0, t - 0.001, t, 1], outputRange: [1 - t, 1, 0, 1 - t],
        });
        return <Animated.View key={i} style={{
          position: 'absolute', left: -size * 0.013,
          width: size * 0.026, height: size * 0.048, borderRadius: size * 0.013,
          backgroundColor: '#FFF5DF', opacity: phase.interpolate({ inputRange: [0, 0.28, 1], outputRange: [0, 0.66, 0] }),
          transform: [
            { translateY: phase.interpolate({ inputRange: [0, 1], outputRange: [0, -size * 0.1] }) },
            { translateX: phase.interpolate({ inputRange: [0, 0.5, 1], outputRange: [(i - 1) * size * 0.025, size * 0.014, (1 - i) * size * 0.033] }) },
            { scale: phase.interpolate({ inputRange: [0, 1], outputRange: [0.44, 1.23] }) },
          ],
        }} />;
      })}
    </View>;
  }
  const flash = id === 'el_kamera';
  const phone = id === 'el_telefon';
  const candle = id === 'el_mum';
  const diameter = size * (flash ? 0.16 : phone ? 0.055 : candle ? 0.063 : 0.105);
  const opacity = flash
    ? progress.interpolate({ inputRange: [0, 0.84, 0.854, 0.90, 1], outputRange: [0, 0, 0.97, 0, 0] })
    : progress.interpolate({ inputRange: [0, 0.26, 0.48, 0.76, 1], outputRange: [0.15, 0.68, 0.22, 0.54, 0.15] });
  return <Animated.View pointerEvents="none" style={{
    ...anchor, marginLeft: -diameter / 2, marginTop: -diameter / 2,
    width: diameter, height: diameter, borderRadius: diameter / 2, opacity,
    backgroundColor: flash ? '#FFFCEB' : phone || candle ? 'transparent' : '#F8E47B',
    transform: [
      { translateX: progress.interpolate({ inputRange: [0, 0.28, 0.59, 1], outputRange: candle ? [0, -size * 0.009, size * 0.009, 0] : [0, 0, 0, 0] }) },
      { scale: progress.interpolate({ inputRange: [0, 0.26, 0.62, 1], outputRange: [0.72, 1.12, flash ? 1.53 : 0.88, 0.72] }) },
    ],
  }}>
    {(phone || candle) && <Svg width={diameter} height={diameter} viewBox="0 0 32 32">
      {candle ? <Path d="M15 30C4 29 6 18 13 11C15 7 15 5 14 2C23 8 27 14 25 22C24 28 20 30 15 30Z" fill="#FFB741" />
        : <Path d="M16 2Q17 14 29 16Q17 17 16 29Q14 17 2 16Q14 14 16 2Z" fill="#C8FFEB" />}
    </Svg>}
  </Animated.View>;
}
