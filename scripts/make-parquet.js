// Bitki köşesi sahnesinin altına perspektifli tahta parke zemin çizer.
//   node scripts/make-parquet.js [kaynak.jpg] [Y0] [çıktı.jpg]
// Varsayılan: assets/arkaplan/bitki_kosesi_zemin.jpg, zemin 676. satırdan başlar, yerinde yazılır.
// Üst kenar sahnenin kendi zemin rengine yumuşakça karışır (dikişsiz), tahtalar uzaktan yakına genişler.
const J = require('jimp-compact');

const src = process.argv[2] || 'assets/arkaplan/bitki_kosesi_zemin.jpg';
const Y0 = Number(process.argv[3] || 676);
const out = process.argv[4] || src;

const h32 = (x, y) => {
  let n = (x * 374761393 + y * 668265263) | 0;
  n = ((n ^ (n >>> 13)) * 1274126177) | 0;
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
};
const vnoise = (x, y) => {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const s = t => t * t * (3 - 2 * t);
  const a = h32(xi, yi), b = h32(xi + 1, yi), c = h32(xi, yi + 1), d = h32(xi + 1, yi + 1);
  const u = s(xf), v = s(yf);
  return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
};
const mix = (a, b, t) => a + (b - a) * t;

(async () => {
  const img = await J.read(src);
  const W = img.bitmap.width, H = img.bitmap.height, d = img.bitmap.data;
  const px = (x, y) => { const i = (y * W + x) * 4; return [d[i], d[i + 1], d[i + 2]]; };

  // Ufuk çizgisindeki sahne zemini renginin yatay ortalaması (karışım için), satır başına.
  const edge = [];
  for (let x = 0; x < W; x++) {
    let r = 0, g = 0, b = 0, n = 0;
    for (let y = Y0 - 8; y < Y0 - 2; y++) { const p = px(x, y); r += p[0]; g += p[1]; b += p[2]; n++; }
    edge.push([r / n, g / n, b / n]);
  }
  // Kenar renklerini yatayda pürüzsüzleştir (saksı kenarları parkeye taşmasın).
  const sm = edge.map((_, x) => {
    let r = 0, g = 0, b = 0, n = 0;
    for (let k = -24; k <= 24; k++) { const e = edge[Math.min(W - 1, Math.max(0, x + k))]; r += e[0]; g += e[1]; b += e[2]; n++; }
    return [r / n, g / n, b / n];
  });

  const cx = W * 0.5, FLOOR = H - Y0;
  const PLANK = 118; // alt kenarda tahta genişliği (px)
  const woods = [[222, 150, 90], [208, 134, 78], [230, 160, 100], [198, 124, 72], [216, 144, 86]];

  for (let y = Y0; y < H; y++) {
    const t = (y - Y0) / FLOOR; // 0 ufuk, 1 alt
    const s = 0.55 + 0.45 * t; // uzaklıkta tahtalar dar
    const z = 1 / s; // derinlik (tahta boyu için)
    for (let x = 0; x < W; x++) {
      const u = (x - cx) / (PLANK * s);
      const pid = Math.floor(u), f = u - pid;
      // Tahta rengi + tahtadan tahtaya küçük farklar
      const base = woods[((pid % 5) + 5) % 5];
      const tone = 0.93 + 0.14 * h32(pid, 7);
      // Tahta boyu: her tahtada farklı kayık eklem
      const L = 2.1, off = h32(pid, 3) * L;
      const zz = (z * 6 + off) / L, zi = Math.floor(zz), zf = zz - zi;
      const board = pid * 31 + zi * 17;
      const tone2 = tone * (0.96 + 0.08 * h32(board, 11));
      // Damar: tahta boyunca uzayan gürültü
      const grain = vnoise(u * 9 + h32(board, 5) * 40, z * 5.5 + h32(board, 2) * 30);
      const grain2 = vnoise(u * 38, z * 14);
      let k = tone2 * (0.9 + 0.2 * grain) * (0.97 + 0.06 * grain2);
      let r = base[0] * k, g = base[1] * k, b = base[2] * k;
      // Tahta ek yerleri ve araları (ince koyu çizgi + üstünde ince açık kenar)
      const seamW = 0.018 + 0.012 * t;
      let seam = 0;
      if (f < seamW || f > 1 - seamW) seam = 1;
      const jw = 0.035;
      if (zf < jw) seam = Math.max(seam, 0.8);
      if (seam) { r *= 0.5; g *= 0.4; b *= 0.32; }
      else if (f < seamW * 2.4 || zf < jw * 1.9) { r *= 1.07; g *= 1.06; b *= 1.04; } // kenar parlaması
      // Işık: sahnedeki sıcak ışık sağ üstten; sol tarafa ve alta doğru hafif kararır, ufukta parlak yansıma
      const lx = x / W;
      let light = 1.1 - 0.16 * t - 0.12 * Math.abs(lx - 0.62);
      light += 0.12 * Math.exp(-t * 7); // ufuk çizgisine yakın aydınlık
      r *= light; g *= light; b *= light;
      // Sahnedeki gölge: yatay orta kısımda ufuktan hafif koyu bant (saksıların altı)
      const sh = Math.exp(-Math.pow((t - 0.04) / 0.07, 2)) * 0.18;
      r *= 1 - sh; g *= 1 - sh; b *= 1 - sh;
      // Üst kenarda sahnenin zemin rengine yumuşak geçiş (dikişsiz)
      const e = sm[x];
      const a = Math.min(1, Math.max(0, (t - 0.0) / 0.075));
      const w = a * a * (3 - 2 * a);
      r = mix(e[0], r, w); g = mix(e[1], g, w); b = mix(e[2], b, w);
      // Kenar vinyet
      const vg = 1 - 0.10 * Math.pow(Math.abs(lx - 0.5) * 2, 3);
      r *= vg; g *= vg; b *= vg;
      const i = (y * W + x) * 4;
      d[i] = Math.max(0, Math.min(255, Math.round(r)));
      d[i + 1] = Math.max(0, Math.min(255, Math.round(g)));
      d[i + 2] = Math.max(0, Math.min(255, Math.round(b)));
      d[i + 3] = 255;
    }
  }
  img.quality(92);
  await img.writeAsync(out);
  console.log('yazıldı', out, W + 'x' + H);
})();
