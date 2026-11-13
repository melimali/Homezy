// @ts-nocheck
// Regresyon bekçisi: (1) İngilizce sözlükte Türkçe harf/kelime kalmamalı,
// (2) koddaki Türkçe görünen metinlerin hepsinin İngilizce çevirisi olmalı.
// Kasıtlı Türkçe metinler (dil öğrenme kartları, geliştirici günlükleri, yorumlar) aşağıdaki listelerde.
import { expect, it } from '@jest/globals';
import fs from 'fs';
import path from 'path';

import { EN } from '../en';
import { setLang, tx } from '../runtime';

const TR_CHARS = /[çğıöşüÇĞİÖŞÜ]/;
// Sözlük değerinde kasıtlı Türkçe kalabilir (yemek adları, dizi/kitap adları, özel adlar).
const EN_VALUE_OK = /Ethos|Türkiye|Karnıyarık|İmam bayıldı|Türkçe|Turkish|Çağan|Oğuz|Ahmet/;
// Türkçe sözcük eşleşmesi: İngilizce'de de geçen ortak yazımlar ("var", "ev"...) bilerek yok.
const TR_WORD = /(?<![’'])\b(ve|için|değil|çok|daha|bugün|yarın|dün|kadar|gibi|şimdi|tamam|evet|hayır|temiz|kirli|sağlıklı|tümü|bekliyor|seni|senin|benim|hiç|nasıl|neden|hangi|ürün|alışveriş|yaptım|bitti|gecikti)\b/i;

function walk(d: string, out: string[] = []) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (f === 'i18n' || f === '__tests__') continue;
    if (fs.statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(f)) out.push(p);
  }
  return out;
}

// Bu dosyalarda Türkçe metin bilerek kalır (İngilizce modda Türkçe öğretmek, geliştirici günlüğü).
const SKIP_FILES = [/domain[\\/]growth\.ts$/, /domain[\\/]havuz\.ts$/, /theme[\\/]index\.ts$/, /useName\.ts$/,
  // Dile göre ayrı yazılmış (tr/en) metinler:
  /domain[\\/]chatCanned\.ts$/, /domain[\\/]paywallCopy\.ts$/, /app[\\/]tanitim\.tsx$/];
// Geliştirici hata iletileri ve tarayıcının kaçırdığı kaçışlı tırnak parçaları.
const LOG = /^Homezy: |içinde kullanılmalı|^(den|dan|deki|a|e|ya) |^"\}de |, cta: /;

it('İngilizce sözlük değerlerinde Türkçe kalmamış', () => {
  const bad = Object.entries(EN)
    .filter(([, v]) => (TR_CHARS.test(v) || TR_WORD.test(v)) && !EN_VALUE_OK.test(v))
    .map(([k, v]) => `${k} => ${v}`);
  expect(bad).toEqual([]);
});

it('koddaki Türkçe metinlerin İngilizce karşılığı var', () => {
  setLang('en');
  const miss = new Map<string, string>();
  const lit = /(['"`])((?:(?!\1)[^\\\n]|\\.){3,200})\1/g;
  const jsx = />([^<>{}\n]{3,200})</g;
  for (const f of walk(path.join(__dirname, '../..'))) {
    if (SKIP_FILES.some(r => r.test(f))) continue;
    const src = fs.readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/.*$/gm, '$1');
    for (const rx of [lit, jsx]) {
      for (const m of src.matchAll(rx)) {
        let s = (rx === lit ? m[2] : m[1]).replace(/\$\{[^}]*\}/g, '{}').replace(/&apos;/g, "'").replace(/&quot;/g, '"').replace(/\\(['"])/g, '$1').replace(/\\n/g, '\n').trim();
        if (/^[./@#]|import |require|=>|[{}]{2}|\.tsx?|https?:/.test(s) || LOG.test(s)) continue;
        if (/\{\}\s*$/.test(s) && !/ /.test(s.replace(/\{\}/g, ''))) continue;
        const turkish = TR_CHARS.test(s) ? / /.test(s) || /^[A-ZÇĞİÖŞÜ]/.test(s) : /^[A-Z]/.test(s) && TR_WORD.test(s);
        if (!turkish) continue;
        // Kod parçaları (regex, JSX kalıntısı) ve satırı bölünmüş şablonlar atlanır.
        if (/[<>=;]|\]\s*,|accessibilityRole|\$\{|^[,)\]}]/.test(s)) continue;
        const out = tx(s);
        // Çevrilmemiş ya da yarım çevrilmiş (çıktıda Türkçe harf/kelime kalmış) metin.
        if (out === s || ((TR_CHARS.test(out) || TR_WORD.test(out)) && !EN_VALUE_OK.test(out))) miss.set(s, path.relative(process.cwd(), f) + '  =>  ' + out);
      }
    }
  }
  const lines = [...miss].map(([s, f]) => `${f}\t${s}`);
  expect(lines).toEqual([]);
});

// Veri havuzları (src/domain, src/constants): eşya, görev, ürün, adım, öneri metinleri koddan değil
// dışa aktarılan nesnelerden okunur; böylece yeni eklenen her havuz maddesi de İngilizce istenir.
const POOL_SKIP_FILES = /^(growth|havuz|plan-templates|paywallCopy)\.ts$/; // dil öğrenme kartları, iç kimlikler, ızgara kodları
const POOL_OK = new Set(['Cottagecore', 'Minimal', 'Modern', 'Pastel', 'Poster', 'Aloe vera', 'Polyester', 'Mint', 'Normal', 'Hamster', 'Ethos', 'Soul', 'Amélie', 'Ratatouille', 'diş', '🤨 Hmm…']);
it('veri havuzlarındaki her metnin İngilizce karşılığı var', () => {
  setLang('en');
  const out = new Map<string, string>();
  const seen = new WeakSet<object>();
  const collect = (v: unknown, f: string, depth: number) => {
    if (typeof v === 'string') { out.set(v, f); return; }
    if (!v || typeof v !== 'object' || depth > 7 || seen.has(v as object)) return;
    seen.add(v as object);
    for (const x of Array.isArray(v) ? v : Object.values(v as object)) collect(x, f, depth + 1);
  };
  for (const d of ['domain', 'constants']) {
    const dir = path.join(__dirname, '../..', d);
    for (const file of fs.readdirSync(dir)) {
      if (!/\.ts$/.test(file) || POOL_SKIP_FILES.test(file)) continue;
      let mod: Record<string, unknown>;
      try { mod = require(path.join(dir, file)); } catch { continue; }
      for (const v of Object.values(mod)) if (typeof v !== 'function') collect(v, d + '/' + file, 0);
    }
  }
  const miss: string[] = [];
  for (const [s, f] of out) {
    if (s.length < 3 || s.length > 400 || POOL_OK.has(s)) continue;
    if (/^#[0-9a-fA-F]{3,8}$/.test(s)) continue; // renk kodu
    if (/^[a-z0-9_\-:./#@{}]+$/.test(s) || /^https?:|^\//.test(s)) continue; // kimlik, yol
    if (/^[\p{Extended_Pictographic}\u200d\ufe0f\s]+$/u.test(s) || /^[0-9\-+°%\s]+$/.test(s) || /^[A-Z.+0-9]+$/.test(s)) continue; // emoji, sayı, kod
    const o = tx(s);
    if (o === s || ((TR_CHARS.test(o) || TR_WORD.test(o)) && !EN_VALUE_OK.test(o))) miss.push(f + '\t' + s + '  =>  ' + o);
  }
  expect(miss).toEqual([]);
});
