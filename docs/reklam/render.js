// usage: node render.js <scene.json> <outdir> [onlyFramesCsv]
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
(async () => {
  const c = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  const out = process.argv[3]; fs.mkdirSync(out, { recursive: true });
  const only = process.argv[4] ? process.argv[4].split(',').map(Number) : null;
  const opts = process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME, args: ['--no-sandbox'] } : {};
  const b = await chromium.launch(opts);
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await p.goto('file://' + path.resolve(__dirname, 'phone.html'));
  await p.evaluate(c => window.setup(c), c);
  const N = Math.round(c.dur * 30);
  for (let i = 0; i < N; i++) {
    if (only && !only.includes(i)) continue;
    await p.evaluate(t => window.setT(t), i / 30);
    await p.screenshot({ path: path.join(out, String(i + 1).padStart(4, '0') + '.png'), omitBackground: true });
  }
  await b.close();
})();
