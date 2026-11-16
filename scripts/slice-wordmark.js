// "homezy yazı logo.png" (şeffaf zeminli yazı logosu) harf harf parçalara ayrılır; intro bunlarla canlandırılır.
//   node scripts/slice-wordmark.js "<kaynak.png>" [--dry]
// Çıktı: assets/intro/wm-<parça>.png (kırpılmış, 0.5x) ve src/constants/wordmark.ts (parça konumları, 1086x362 tuvalde).
// Parçalar bağlı bileşenlerden (alfa) bulunur; küçük lekeler (<MIN px) atılır; bileşenler x merkezine göre harflere atanır.
const fs = require('fs');
const J = require('jimp-compact');

const src = process.argv[2];
const dry = process.argv.includes('--dry');
const MIN = 1500; // atılacak leke boyutu (kaynak px)
const TH = 40; // alfa eşiği

(async () => {
  const img = await J.read(src);
  const W = img.bitmap.width, H = img.bitmap.height, d = img.bitmap.data;
  const lab = new Int32Array(W * H).fill(-1);
  const comps = [];
  const st = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const p = y * W + x;
      if (lab[p] !== -1 || d[p * 4 + 3] < TH) continue;
      const id = comps.length;
      const c = { id, n: 0, x0: x, x1: x, y0: y, y1: y, sx: 0, sy: 0 };
      st.push(p);
      lab[p] = id;
      while (st.length) {
        const q = st.pop();
        const qx = q % W, qy = (q / W) | 0;
        c.n++; c.sx += qx; c.sy += qy;
        if (qx < c.x0) c.x0 = qx; if (qx > c.x1) c.x1 = qx;
        if (qy < c.y0) c.y0 = qy; if (qy > c.y1) c.y1 = qy;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const nx = qx + dx, ny = qy + dy;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          const np = ny * W + nx;
          if (lab[np] === -1 && d[np * 4 + 3] >= TH) { lab[np] = id; st.push(np); }
        }
      }
      comps.push(c);
    }
  }
  const big = comps.filter(c => c.n >= MIN).sort((a, b) => a.x0 - b.x0);
  console.log('bileşen:', comps.length, 'büyük:', big.length);
  big.forEach(c => console.log(c.id, 'n=' + c.n, 'x', c.x0 + '-' + c.x1, 'y', c.y0 + '-' + c.y1, 'cx', Math.round(c.sx / c.n), 'cy', Math.round(c.sy / c.n)));
  if (dry) return;

  // Harf grupları: x merkezine göre (kaynak px, 2172 genişlik). H: sol yaprakla, o: ev topu + filiz, m, e, z, y, çizgi, parıltı.
  const kindOf = c => {
    const cx = c.sx / c.n, cy = c.sy / c.n;
    if (c.y0 > H * 0.62) return 'swoosh'; // alttaki dalga çizgisi
    if (cx > W * 0.83 && cy < H * 0.5 && c.n < 40000) return 'spark'; // sağ üst parıltılar
    if (cx < W * 0.29) return 'h';
    if (cx < W * 0.405) return 'o';
    if (cx < W * 0.58) return 'm';
    if (cx < W * 0.69) return 'e';
    if (cx < W * 0.79) return 'z';
    return 'y';
  };
  const groups = {};
  for (const c of big) (groups[kindOf(c)] ||= []).push(c);

  fs.mkdirSync('assets/intro', { recursive: true });
  const SC = 0.5;
  const meta = {};
  for (const [k, cs] of Object.entries(groups)) {
    const x0 = Math.min(...cs.map(c => c.x0)), x1 = Math.max(...cs.map(c => c.x1));
    const y0 = Math.min(...cs.map(c => c.y0)), y1 = Math.max(...cs.map(c => c.y1));
    const ids = new Set(cs.map(c => c.id));
    const w = x1 - x0 + 1, h = y1 - y0 + 1;
    const out = new J(w, h, 0x00000000);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const p = y * W + x;
      // Bileşen (ve 2 px çevresi, yumuşak kenar için) alfa'yı korur.
      let keep = ids.has(lab[p]);
      if (!keep) {
        for (let dy = -2; dy <= 2 && !keep; dy++) for (let dx = -2; dx <= 2 && !keep; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx >= 0 && ny >= 0 && nx < W && ny < H && ids.has(lab[ny * W + nx])) keep = true;
        }
      }
      if (!keep) continue;
      const o = ((y - y0) * w + (x - x0)) * 4;
      out.bitmap.data[o] = d[p * 4]; out.bitmap.data[o + 1] = d[p * 4 + 1]; out.bitmap.data[o + 2] = d[p * 4 + 2]; out.bitmap.data[o + 3] = d[p * 4 + 3];
    }
    out.scale(SC);
    await out.writeAsync(`assets/intro/wm-${k}.png`);
    meta[k] = { x: Math.round(x0 * SC), y: Math.round(y0 * SC), w: out.bitmap.width, h: out.bitmap.height };
    console.log(k, JSON.stringify(meta[k]), cs.length + ' parça');
  }
  const order = ['h', 'o', 'm', 'e', 'z', 'y', 'swoosh', 'spark'].filter(k => meta[k]);
  const ts = `// scripts/slice-wordmark.js tarafından üretildi. Yazı logosunun parçaları (assets/intro/wm-*.png), ${Math.round(W * SC)}x${Math.round(H * SC)} tuvalde.\n` +
    `export const WORDMARK = { w: ${Math.round(W * SC)}, h: ${Math.round(H * SC)} };\n` +
    `export const WM_PARTS = {\n${order.map(k => `  ${k}: { ...${JSON.stringify(meta[k])}, src: require('../../assets/intro/wm-${k}.png') },`).join('\n')}\n} as const;\n` +
    `export type WmKey = keyof typeof WM_PARTS;\n`;
  fs.writeFileSync('src/constants/wordmark.ts', ts);
  console.log('src/constants/wordmark.ts yazıldı');
})();
