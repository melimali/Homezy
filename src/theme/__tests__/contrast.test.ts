import { describe, expect, it } from '@jest/globals';

import { palettes } from '..';

const lum = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(n >> 16) + 0.7152 * f((n >> 8) & 255) + 0.0722 * f(n & 255);
};
const ratio = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

// Erişilebilirlik (WCAG AA): metin 4.5:1.
const PAIRS: [keyof typeof palettes.light, keyof typeof palettes.light][] = [
  ['ink', 'bg'], ['ink', 'surface'], ['ink', 'surface2'], ['muted', 'bg'], ['muted', 'surface'], ['muted', 'surface2'],
  ['onAccent', 'accent'], ['late', 'bg'], ['late', 'surface'], ['warm', 'bg'], ['warm', 'surface'], ['ok', 'surface'], ['onBadge', 'late'],
];

describe('renk karşıtlığı (AA)', () => {
  for (const mode of ['light', 'dark'] as const)
    for (const [fg, bg] of PAIRS)
      it(`${mode}: ${fg} / ${bg}`, () => {
        const p = palettes[mode] as unknown as Record<string, string>;
        expect(ratio(p[fg], p[bg])).toBeGreaterThanOrEqual(4.5);
      });
});
