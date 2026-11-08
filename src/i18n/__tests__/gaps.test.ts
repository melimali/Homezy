// @ts-nocheck
// Geliştirici aracı: `GAPS_OUT=gaps.txt npx jest src/i18n` ile çevrilmemiş Türkçe metinleri listeler.
import { expect, it } from '@jest/globals';
import fs from 'fs';
import path from 'path';

import { setLang, tx } from '../runtime';

function walk(d: string, out: string[] = []) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (f === 'i18n' || f === '__tests__') continue;
    if (fs.statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(f)) out.push(p);
  }
  return out;
}

(process.env.GAPS_OUT ? it : it.skip)('rapor: çevrilmemiş Türkçe metinler', () => {
  setLang('en');
  const miss = new Map<string, string>();
  const re = /(['"`])((?:(?!\1)[^\\\n]|\\.){6,160})\1/g;
  for (const f of walk(path.join(__dirname, '../..'))) {
    const src = fs.readFileSync(f, 'utf8');
    for (const m of src.matchAll(re)) {
      const s = m[2].replace(/\$\{[^}]*\}/g, '{}');
      if (!/[çğıöşüİÇĞÖŞÜ]/.test(s) || !/ /.test(s)) continue;
      if (/^[./@]|import |require/.test(s)) continue;
      if (tx(s) === s) miss.set(s, path.relative(process.cwd(), f));
    }
  }
  const lines = [...miss].map(([s, f]) => `${f}\t${s}`);
  fs.writeFileSync(process.env.GAPS_OUT || '/tmp/gaps.txt', lines.join('\n'));
  expect(true).toBe(true);
});
