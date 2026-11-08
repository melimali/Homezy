/** Moka Uçuş: tek dokunuşlu Flappy tarzı oyun. Saf mantık; ekran ve zamanlayıcı yok. */
export const W = 300;
export const H = 380;
export const GROUND = 36; // alttaki zemin şeridi; çarpışma buradan başlar
export const MX = 70;
export const MR = 10; // Moka çarpışma yarıçapı
export const PIPE_W = 52;
export const GAP = 130;
export const SPACING = 190;
export const SPEED = 105;
export const GRAVITY = 950;
export const FLAP = -310;
export const MAX_FALL = 520;
export const MAX_DT = 0.05; // uzun kare (yavaş telefon) en fazla bu kadar ilerletir
export const SUBSTEP = 1 / 120; // sabit adım: kare hızından bağımsız fizik
export const DAILY_PLAYS = 3;

export type Pipe = { x: number; gap: number; passed: boolean };
export type Flap = { y: number; vy: number; pipes: Pipe[]; score: number; over: boolean; started: boolean; dist: number };

export const newFlap = (): Flap => ({ y: H / 2, vy: 0, pipes: [], score: 0, over: false, started: false, dist: 0 });

const PLAY_H = H - GROUND;
/** rnd: 0..1 (test için verilebilir). */
export const makePipe = (x: number, rnd = Math.random()): Pipe => ({ x, gap: 50 + rnd * (PLAY_H - 100 - GAP), passed: false });

export function flap(g: Flap, rnd = Math.random()): Flap {
  if (g.over) return g;
  const pipes = g.started ? g.pipes : [makePipe(W + 40, rnd), makePipe(W + 40 + SPACING, rnd)];
  return { ...g, started: true, vy: FLAP, pipes };
}

/** Daire (Moka) ile dikdörtgen çarpışması. */
export function circleHitsRect(cx: number, cy: number, r: number, x: number, y: number, w: number, h: number): boolean {
  const nx = Math.max(x, Math.min(cx, x + w));
  const ny = Math.max(y, Math.min(cy, y + h));
  const dx = cx - nx, dy = cy - ny;
  return dx * dx + dy * dy < r * r;
}

export function hits(y: number, pipes: Pipe[]): boolean {
  if (y - MR < 0 || y + MR > PLAY_H) return true;
  return pipes.some(p => circleHitsRect(MX, y, MR, p.x, 0, PIPE_W, p.gap) || circleHitsRect(MX, y, MR, p.x, p.gap + GAP, PIPE_W, H));
}

function tick(g: Flap, dt: number, rnd: number): Flap {
  const vy = Math.min(g.vy + GRAVITY * dt, MAX_FALL);
  const y = g.y + vy * dt;
  let score = g.score;
  let pipes = g.pipes.map(p => {
    const x = p.x - SPEED * dt;
    if (!p.passed && x + PIPE_W < MX - MR) { score++; return { ...p, x, passed: true }; }
    return { ...p, x };
  }).filter(p => p.x > -PIPE_W);
  const last = pipes[pipes.length - 1];
  if (!last || last.x < W + 40 - SPACING) pipes = [...pipes, makePipe((last ? last.x : W) + SPACING, rnd)];
  return { y, vy, pipes, score, over: hits(y, pipes), started: true, dist: g.dist + SPEED * dt };
}

/** dt saniye; uzun kareler sabit küçük adımlara bölünür (tünelleme ve kare hızı farkı olmaz). */
export function step(g: Flap, dt: number, rnd = Math.random()): Flap {
  if (g.over || !g.started) return g;
  let left = Math.min(dt, MAX_DT);
  let cur = g;
  while (left > 1e-6 && !cur.over) {
    const d = Math.min(left, SUBSTEP);
    cur = tick(cur, d, rnd);
    left -= d;
  }
  return cur;
}

/** Gün-gece: 0 = gün, 1 = gece. Her 12 engelde yavaşça değişir. */
export const night = (score: number, dist = 0): number => {
  const t = (score + (dist % SPACING) / SPACING) / 12;
  return 0.5 - 0.5 * Math.cos(Math.PI * (t % 2));
};

const hex = (h: string) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
/** İki #rrggbb rengi karıştırır. */
export function mix(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hex(a), [br, bg, bb] = hex(b);
  const k = Math.max(0, Math.min(1, t));
  const f = (x: number, y: number) => Math.round(x + (y - x) * k).toString(16).padStart(2, '0');
  return `#${f(ar, br)}${f(ag, bg)}${f(ab, bb)}`;
}

/** Günlük oyun hakkı: yeni gün sayaç sıfırlanır. */
export const playsToday = (f: { day: string; plays: number } | undefined, day: string) => (f && f.day === day ? f.plays : 0);
