import { View } from 'react-native';
import Svg, { Circle, Ellipse, G, Polygon } from 'react-native-svg';

import { box, furniture, pts, P, renderFace, setProjection, shade } from '@/components/House3D';
import { floorOf, wallOf } from '@/domain/look';
import type { AppState, RoomType } from '@/domain/types';
import { useColors } from '@/theme';

/** Tek oda, büyük ve ayrıntılı: 5×5 blok, her türün kendi eşyası birden fazla yerde. */
const N = 5;
const WALL = 46;

/** Oda türüne göre eşya yerleşimi: [eşya türü, satır, sütun]. Ek parçalar diğer odalardan ödünç. */
const LAYOUT: Record<RoomType, [RoomType, number, number][]> = {
  yatak: [['yatak', 1, 2], ['calisma', 1, 4], ['salon', 3, 0], ['balkon', 4, 4]],
  cocuk: [['yatak', 1, 0], ['calisma', 1, 3], ['salon', 3, 2], ['balkon', 4, 0]],
  mutfak: [['mutfak', 0, 1], ['mutfak', 0, 3], ['camasir', 2, 4], ['balkon', 4, 0]],
  banyo: [['banyo', 0, 1], ['camasir', 0, 3], ['banyo', 3, 3], ['balkon', 4, 0]],
  salon: [['salon', 2, 1], ['salon', 2, 3], ['calisma', 0, 4], ['balkon', 0, 0], ['balkon', 4, 4]],
  calisma: [['calisma', 1, 1], ['calisma', 1, 3], ['salon', 3, 4], ['balkon', 4, 0]],
  antre: [['antre', 0, 1], ['antre', 0, 3], ['balkon', 4, 0], ['balkon', 4, 4]],
  balkon: [['balkon', 1, 1], ['balkon', 1, 3], ['balkon', 3, 2], ['salon', 3, 4]],
  camasir: [['camasir', 0, 1], ['camasir', 0, 3], ['banyo', 3, 4], ['balkon', 4, 0]],
};

export function Room3D({ state: S, roomId }: { state: AppState; roomId: string }) {
  const c = useColors();
  const room = S.rooms[roomId];
  if (!room) return null;
  setProjection(0, N / 2, N / 2);
  const fl = floorOf(S, roomId);
  const wl = wallOf(S, roomId);
  const floorA = fl?.color ?? '#D3B99A';
  const floorB = fl?.alt ?? shade(floorA, -0.06);
  const wallC = wl?.color ?? '#EDE3D6';
  const els = [];

  // Zemin
  for (let r = 0; r < N; r++)
    for (let q = 0; q < N; q++) {
      const col = (r + q) % 2 ? floorB : floorA;
      els.push(<Polygon key={`f${r}_${q}`} points={pts([P(r, q), P(r, q + 1), P(r + 1, q + 1), P(r + 1, q)])} fill={col} stroke={col} strokeWidth={0.3} />);
    }
  // Halı
  els.push(<Polygon key="rug" points={pts([P(1.4, 1.2, 0.5), P(1.4, 3.8, 0.5), P(3.6, 3.8, 0.5), P(3.6, 1.2, 0.5)])} fill={c.hi} fillOpacity={0.35} />);
  // Arka duvarlar (kuzey ve batı) + kalınlık
  els.push(
    <Polygon key="wn" points={pts([P(0, 0, 0), P(0, N, 0), P(0, N, WALL), P(0, 0, WALL)])} fill={wallC} />,
    <Polygon key="ww" points={pts([P(0, 0, 0), P(N, 0, 0), P(N, 0, WALL), P(0, 0, WALL)])} fill={shade(wallC, -0.12)} />,
    <Polygon key="wt" points={pts([P(0, 0, WALL), P(0, N, WALL), P(0, N, WALL + 3), P(0, 0, WALL + 3)])} fill={shade(wallC, -0.2)} />,
    <Polygon key="wb" points={pts([P(0, 0, 0), P(0, N, 0), P(0, N, 5), P(0, 0, 5)])} fill={shade(wallC, -0.2)} />,
    <Polygon key="wb2" points={pts([P(0, 0, 0), P(N, 0, 0), P(N, 0, 5), P(0, 0, 5)])} fill={shade(wallC, -0.3)} />,
  );
  // Pencere (kuzey duvar)
  els.push(
    <Polygon key="win" points={pts([P(0, 1.6, 18), P(0, 3.4, 18), P(0, 3.4, 38), P(0, 1.6, 38)])} fill={c.hi} stroke="#FAF8F4" strokeWidth={2} />,
    <Polygon key="win2" points={pts([P(0, 2.5, 18), P(0, 2.5, 38)])} fill="none" stroke="#FAF8F4" strokeWidth={1.5} />,
  );
  // Ön kenarlar: alçak parapet
  els.push(
    ...box('fs', N - 0.1, 0, 0.1, N, 0, 6, shade(wallC, -0.1)).map(renderFace),
    ...box('fx', 0, N - 0.1, N, 0.1, 0, 6, shade(wallC, -0.2)).map(renderFace),
  );
  // Eşyalar (arkadan öne sıralı)
  const items = [...LAYOUT[room.type]].sort((a, b) => a[1] + a[2] - (b[1] + b[2]));
  items.forEach(([t, r, q], i) => {
    const [sx, sy] = P(r + 0.5, q + 0.5);
    els.push(<Ellipse key={`sh${i}`} cx={sx} cy={sy + 1} rx={20} ry={8} fill="#000" fillOpacity={0.12} />);
    els.push(<G key={`it${i}`}>{furniture(t, r, q, `r${i}`, c)}</G>);
  });
  // Lamba
  const [lx, ly] = P(0.5, 0.5, 30);
  els.push(<Circle key="lamp" cx={lx} cy={ly} r={9} fill="#F2C46D" fillOpacity={0.35} />);

  const w = N * 2 * 34 + 40, h = N * 2 * 14 + WALL + 50;
  return (
    <View style={{ width: '100%', aspectRatio: w / h }}>
      <Svg width="100%" height="100%" viewBox={`${-w / 2} ${-WALL - 22} ${w} ${h}`}>{els}</Svg>
    </View>
  );
}
