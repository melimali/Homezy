import type { ReactElement } from 'react';
import Svg, { Circle, Ellipse, G, Line, Path, Polygon, Rect } from 'react-native-svg';

import type { Flower } from '@/domain/garden';

/**
 * Moka'nın bahçesindeki saksı ve çiçek çizimleri. Aşamalar (garden.ts, `stageOf`): 0 tohum, 1 çimlendi,
 * 2 filiz, 3 fide, 4 tomurcuk, 5 çiçek. İlk beş aşama bütün çiçeklerde ortak, açan çiçek türüne göre.
 * Renk kodları çiçeğin kendi rengi; temaya göre değişmez.
 */

const POT = '#C8826B';
const SOIL = '#7A5A46';
const STEM = '#6FA27A';
const LEAF = '#86BC8F';

/** Çiçek başı, (x, y) merkezli, `s` ölçekli. */
export function bloom(f: Flower, x: number, y: number, s: number, key = 'b'): ReactElement[] {
  const out: ReactElement[] = [];
  const ring = (n: number, rx: number, ry: number, dist: number, fill: string, k: string, rot0 = 0) => {
    for (let i = 0; i < n; i++) {
      const a = rot0 + (360 / n) * i;
      const rad = (a * Math.PI) / 180;
      const cx = x + Math.cos(rad) * dist * s, cy = y + Math.sin(rad) * dist * s;
      const tf = `rotate(${a} ${cx.toFixed(1)} ${cy.toFixed(1)})`;
      // 3B görünüm: alt gölge katmanı, ana yaprak, üstte açık parlama.
      out.push(
        <Ellipse key={key + k + 's' + i} cx={cx} cy={cy + 0.9 * s} rx={rx * s} ry={ry * s} fill={shadeHex(fill, -0.2)} transform={tf} />,
        <Ellipse key={key + k + i} cx={cx} cy={cy} rx={rx * s} ry={ry * s} fill={fill} transform={tf} />,
        <Ellipse key={key + k + 'h' + i} cx={cx - 0.4 * s} cy={cy - 0.5 * s} rx={rx * s * 0.55} ry={ry * s * 0.4} fill={shadeHex(fill, 0.35)} fillOpacity={0.7} transform={tf} />,
      );
    }
  };
  switch (f.shape) {
    case 'daisy':
      ring(10, 5, 2.2, 5.5, f.petal, 'p');
      out.push(<Circle key={key + 'c'} cx={x} cy={y} r={3.4 * s} fill={f.center} />);
      break;
    case 'big':
      ring(14, 6, 2.4, 8, f.petal, 'p');
      out.push(<Circle key={key + 'c'} cx={x} cy={y} r={6 * s} fill={f.center} />, <Circle key={key + 'd'} cx={x} cy={y} r={3.5 * s} fill="#5B3D28" />);
      break;
    case 'star':
      ring(5, 5.5, 3.2, 5, f.petal, 'p', -90);
      out.push(<Circle key={key + 'c'} cx={x} cy={y} r={2.6 * s} fill={f.center} />);
      break;
    case 'cup':
      ring(6, 5.5, 3, 5, f.petal, 'p', -90);
      out.push(<Circle key={key + 'c'} cx={x} cy={y} r={3.8 * s} fill={f.center} />, <Circle key={key + 'd'} cx={x} cy={y} r={2 * s} fill="#FFF6D8" fillOpacity={0.6} />);
      break;
    case 'rose':
      out.push(
        <Circle key={key + 'a'} cx={x} cy={y} r={9 * s} fill={f.petal} />,
        <Circle key={key + 'b'} cx={x - 1 * s} cy={y - 1 * s} r={6 * s} fill={f.center} fillOpacity={0.55} />,
        <Circle key={key + 'c'} cx={x + 0.5 * s} cy={y - 0.5 * s} r={3.6 * s} fill={f.petal} />,
        <Circle key={key + 'd'} cx={x} cy={y - 1 * s} r={1.8 * s} fill={f.center} />,
      );
      break;
    case 'tulip':
      out.push(
        <Path key={key + 'a'} d={`M${x - 7 * s} ${y - 6 * s} Q${x - 8 * s} ${y + 7 * s} ${x} ${y + 7 * s} Q${x + 8 * s} ${y + 7 * s} ${x + 7 * s} ${y - 6 * s} L${x + 3.5 * s} ${y - 1 * s} L${x} ${y - 7 * s} L${x - 3.5 * s} ${y - 1 * s} Z`} fill={f.petal} />,
        <Path key={key + 'b'} d={`M${x - 2 * s} ${y + 6 * s} Q${x - 3 * s} ${y} ${x} ${y - 5 * s}`} stroke="#FFFFFF" strokeOpacity={0.35} strokeWidth={1.4 * s} fill="none" />,
      );
      break;
    case 'spike':
      for (let i = 0; i < 6; i++) {
        const yy = y + 8 * s - i * 3.2 * s, rr = (4.2 - i * 0.45) * s;
        out.push(<Circle key={key + 'l' + i} cx={x - rr * 0.55} cy={yy} r={rr} fill={f.petal} />, <Circle key={key + 'r' + i} cx={x + rr * 0.55} cy={yy - 1.2 * s} r={rr} fill={i % 2 ? f.petal : shadeHex(f.petal, 0.18)} />);
      }
      break;
    case 'bell':
      for (const [dx, dy, k] of [[-5, 2, 'a'], [4, 5, 'b']] as const) {
        out.push(
          <Path key={key + k + 's'} d={`M${x} ${y - 6 * s} Q${x + dx * s} ${y - 6 * s} ${x + dx * s} ${y + (dy - 3) * s}`} stroke={STEM} strokeWidth={1.4 * s} fill="none" />,
          <Ellipse key={key + k} cx={x + dx * s} cy={y + dy * s} rx={3.4 * s} ry={4.6 * s} fill={f.petal} stroke="#DDE5EC" strokeWidth={0.6} />,
          <Circle key={key + k + 'c'} cx={x + dx * s} cy={y + (dy + 4) * s} r={1.2 * s} fill={f.center} />,
        );
      }
      break;
  }
  // Merkeze küçük parlama: çiçek başı yuvarlak ve kabarık görünsün.
  if (f.shape !== 'spike' && f.shape !== 'bell' && f.shape !== 'tulip')
    out.push(<Circle key={key + 'hl'} cx={x - 1 * s} cy={y - 1.1 * s} r={1.1 * s} fill="#FFFFFF" fillOpacity={0.55} />);
  return out;
}

/** Rengi beyaza (amt > 0) ya da siyaha (amt < 0) doğru karıştırır. */
function shadeHex(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16);
  const to = amt < 0 ? 0 : 255, k = Math.abs(amt);
  const ch = (v: number) => Math.round(v + (to - v) * k);
  return `#${((1 << 24) | (ch((n >> 16) & 255) << 16) | (ch((n >> 8) & 255) << 8) | ch(n & 255)).toString(16).slice(1)}`;
}

/** Solgun renk: griye ve kahveye doğru. */
const mute = (hex: string, k = 0.55) => {
  const n = parseInt(hex.slice(1), 16);
  const m = (v: number, t: number) => Math.round(v + (t - v) * k);
  return `#${((1 << 24) | (m((n >> 16) & 255, 150) << 16) | (m((n >> 8) & 255, 138) << 8) | m(n & 255, 112)).toString(16).slice(1)}`;
};

const leaf = (key: string, x: number, y: number, rx: number, ry: number, rot: number, fill = LEAF) => (
  <G key={key}>
    <Ellipse cx={x} cy={y + 0.8} rx={rx} ry={ry} fill={shadeHex(fill, -0.18)} transform={`rotate(${rot} ${x} ${y})`} />
    <Ellipse cx={x} cy={y} rx={rx} ry={ry} fill={fill} transform={`rotate(${rot} ${x} ${y})`} />
  </G>
);

/** Saksıda bir bitki. `stage` -1: boş saksı. Çizim 60×80 birimlik kutuda. */
export function PlantArt({ flower: flower0, stage, size = 72, pot = true, wilt = false }: { flower?: Flower; stage: number; size?: number; pot?: boolean; wilt?: boolean }) {
  const flower = flower0 && wilt ? { ...flower0, petal: mute(flower0.petal), center: mute(flower0.center) } : flower0;
  const stemC = wilt ? mute(STEM) : STEM;
  const leafC = wilt ? mute(LEAF) : LEAF;
  const parts: ReactElement[] = [];
  const soilY = 58;
  const pad = flower && stage >= 5 ? 16 : 0; // açan çiçek üstten kırpılmasın
  if (flower && stage >= 0) {
    if (stage === 0) parts.push(<Ellipse key="seed" cx={30} cy={soilY - 1} rx={3} ry={2} fill="#C9A98F" />);
    if (stage >= 1) {
      const h = [0, 8, 18, 30, 34, 36][stage];
      const top = soilY - h;
      parts.push(<Line key="st" x1={30} y1={soilY} x2={30} y2={top} stroke={stemC} strokeWidth={2.4} strokeLinecap="round" />);
      if (stage === 1) parts.push(leaf('l1', 27, top + 1, 3.4, 1.6, -30, leafC), leaf('l2', 33, top + 1, 3.4, 1.6, 30, leafC));
      if (stage >= 2) parts.push(leaf('l1', 24, soilY - 8, 6, 2.6, -25, leafC), leaf('l2', 36, soilY - 11, 6, 2.6, 25, leafC));
      if (stage >= 3) parts.push(leaf('l3', 25, soilY - 20, 5, 2.2, -35, leafC), leaf('l4', 35, soilY - 23, 5, 2.2, 35, leafC));
      if (stage === 4) parts.push(<Ellipse key="bud" cx={30} cy={top - 5} rx={5.5} ry={8} fill={flower.petal} stroke={STEM} strokeWidth={1.2} />);
      if (stage >= 5) parts.push(<Circle key="glow" cx={30} cy={top - 9} r={17} fill={flower.petal} fillOpacity={0.18} />, <Circle key="sp1" cx={10} cy={top - 22} r={1.3} fill="#FFF3B0" />, <Circle key="sp2" cx={51} cy={top - 4} r={1.1} fill="#FFF3B0" />);
      if (stage >= 5) parts.push(...bloom(flower, 30, top - 9, 1.6, 'fl'));
    }
  }
  return (
    <Svg
      width={size}
      height={(size * (80 + pad)) / 60}
      viewBox={`0 ${-pad} 60 ${80 + pad}`}
      style={pad ? { marginTop: -(size * pad) / 60 } : undefined}
    >
      <Ellipse cx={30} cy={78} rx={20} ry={2.4} fill="#000" fillOpacity={0.12} />
      <G transform={wilt ? `rotate(14 30 ${soilY})` : undefined}>{parts}</G>
      {pot && (
        <G>
          <Ellipse cx={30} cy={soilY} rx={15} ry={3.4} fill={SOIL} />
          <Polygon points={`13,${soilY} 47,${soilY} 43,77 17,77`} fill={POT} />
          <Path d="M20 62 L22 74" stroke="#FFFFFF" strokeOpacity={0.3} strokeWidth={2.4} strokeLinecap="round" />
          <Rect x={11} y={soilY - 1} width={38} height={6} rx={3} fill={shadeHex(POT, -0.08)} />
        </G>
      )}
    </Svg>
  );
}
