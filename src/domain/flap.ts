/** Moka Uçuş: tek dokunuşlu Flappy tarzı oyun. Saf mantık; ekran ve zamanlayıcı yok. */
export const W = 300;
export const H = 380;
export const MX = 70;
export const MR = 14; // Moka çarpışma yarıçapı
export const PIPE_W = 52;
export const GAP = 128;
export const SPACING = 190;
export const SPEED = 105;
export const GRAVITY = 950;
export const FLAP = -310;
export const DAILY_PLAYS = 3;

export type Pipe = { x: number; gap: number; passed: boolean };
export type Flap = { y: number; vy: number; pipes: Pipe[]; score: number; over: boolean; started: boolean };

export const newFlap = (): Flap => ({ y: H / 2, vy: 0, pipes: [], score: 0, over: false, started: false });

/** rnd: 0..1 (test için verilebilir). */
export const makePipe = (x: number, rnd = Math.random()): Pipe => ({ x, gap: 50 + rnd * (H - 100 - GAP), passed: false });

export function flap(g: Flap, rnd = Math.random()): Flap {
  if (g.over) return g;
  const pipes = g.started ? g.pipes : [makePipe(W + 40, rnd), makePipe(W + 40 + SPACING, rnd)];
  return { ...g, started: true, vy: FLAP, pipes };
}

export function step(g: Flap, dt: number, rnd = Math.random()): Flap {
  if (g.over || !g.started) return g;
  const vy = g.vy + GRAVITY * dt;
  const y = g.y + vy * dt;
  let score = g.score;
  let pipes = g.pipes.map(p => {
    const x = p.x - SPEED * dt;
    if (!p.passed && x + PIPE_W < MX - MR) { score++; return { ...p, x, passed: true }; }
    return { ...p, x };
  }).filter(p => p.x > -PIPE_W);
  const last = pipes[pipes.length - 1];
  if (!last || last.x < W + 40 - SPACING) pipes = [...pipes, makePipe((last ? last.x : W) + SPACING, rnd)];
  const hit = y - MR < 0 || y + MR > H || pipes.some(p => MX + MR > p.x && MX - MR < p.x + PIPE_W && (y - MR < p.gap || y + MR > p.gap + GAP));
  return { y, vy, pipes, score, over: hit, started: true };
}

/** Günlük oyun hakkı: yeni gün sayaç sıfırlanır. */
export const playsToday = (f: { day: string; plays: number } | undefined, day: string) => (f && f.day === day ? f.plays : 0);
