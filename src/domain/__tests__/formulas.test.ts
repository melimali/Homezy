import { describe, expect, it } from '@jest/globals';
import { fairScore, isQuiet, learnedTime, notifEveryDays, peakMinute, slotOf, sortByTime, taskFit, thinNotifications } from '../formulas';
import { shouldUpsell, upsellCooldown, upsellScore, type UpsellSignals } from '../paywall';
import { bestStreak } from '../ramp';
import { emptyPlay, houseProgress, lastWeek } from '../play';

const days = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => `2026-10-${String(from + i).padStart(2, '0')}`);
const AT = (d: number) => new Date(2026, 9, d, 12).getTime();

describe('seri affı', () => {
  it('7 günlük serinin ortasındaki tek boşluk affedilir', () => {
    const d = [...days(1, 7), ...days(9, 12)]; // 8. gün boş
    expect(houseProgress(d, AT(12)).streak).toBe(11);
    expect(houseProgress(d, AT(12)).level).toBe(11);
  });
  it('kısa seride (6 günden az) ya da çift boşlukta af yok', () => {
    expect(houseProgress([...days(1, 3), ...days(5, 8)], AT(8)).streak).toBe(4);
    expect(houseProgress([...days(1, 7), ...days(10, 12)], AT(12)).streak).toBe(3);
  });
  it('iki af arası 14 gün', () => {
    const d = [...days(1, 7), ...days(9, 14), ...days(16, 20)]; // 8. ve 15. boş
    expect(houseProgress(d, AT(20)).streak).toBe(5);
  });
  it('en uzun seri ve son hafta affı sayar', () => {
    const P = emptyPlay();
    P.days = [...days(1, 7), ...days(9, 12)];
    expect(bestStreak(P)).toBe(11);
    expect(lastWeek(P, AT(12)).filter(m => m.mark === 'ice').length).toBe(1);
    expect(lastWeek(P, AT(10)).some(m => m.mark === 'ice')).toBe(true);
  });
});

describe('görev zamanı', () => {
  const evening = [1170, 1180, 1200, 1190, 1210, 1185]; // ~19:30
  it('dilimler', () => {
    expect(slotOf(8 * 60)).toBe('sabah');
    expect(slotOf(13 * 60)).toBe('ogle');
    expect(slotOf(19 * 60)).toBe('aksam');
    expect(slotOf(2 * 60)).toBe('gece');
  });
  it('yoğun saat bulunur, veri azsa null', () => {
    expect(Math.abs((peakMinute(evening) ?? 0) - 1190)).toBeLessThanOrEqual(30);
    expect(peakMinute([600, 610])).toBeNull();
  });
  it('gece yarısı etrafında dairesel çalışır', () => {
    const p = peakMinute([1430, 1435, 5, 10, 1425, 0])!;
    expect(Math.min(p, 1440 - p)).toBeLessThanOrEqual(40);
  });
  it('uygunluk ve sıralama', () => {
    expect(taskFit(evening, 1190)).toBeGreaterThan(taskFit(evening, 480));
    expect(taskFit([], 480)).toBe(0.5);
    const out = sortByTime([{ n: 'a', slot: 'sabah' as const }, { n: 'b', slot: 'aksam' as const }], evening, 1190);
    expect(out[0].n).toBe('b');
  });
});

describe('bildirim zamanı', () => {
  it('öğrenilen saat sınırlar içinde', () => {
    const t = learnedTime([1170, 1180, 1200, 1190, 1210], 60, 17 * 60, 21 * 60 + 30)!;
    expect(t).toBeGreaterThanOrEqual(17 * 60);
    expect(t).toBeLessThanOrEqual(21 * 60 + 30);
    expect(learnedTime([1], 60, 0, 1)).toBeNull();
  });
  it('sessiz saat, aralık ve günlük üst sınır', () => {
    expect(isQuiet(23 * 60)).toBe(true);
    expect(isQuiet(8 * 60)).toBe(false);
    const out = thinNotifications([
      { minute: 8 * 60, rank: 1 }, { minute: 8 * 60 + 30, rank: 2 }, { minute: 23 * 60, rank: 0 },
      { minute: 12 * 60, rank: 3 }, { minute: 15 * 60, rank: 4 }, { minute: 18 * 60, rank: 5 }, { minute: 20 * 60, rank: 6 },
    ]);
    expect(out.map(x => x.minute)).toEqual([480, 720, 900, 1080]);
  });
  it('yok sayılınca seyrelir', () => {
    expect([0, 1, 2, 3, 4, 9].map(notifEveryDays)).toEqual([1, 1, 2, 2, 3, 3]);
  });
});

describe('sıralama adaleti', () => {
  it('büyük ev küçültülür, hesap yaşına göre tavan var', () => {
    const base = { items: 100, garden: 50, clean: 80, ageDays: 100 };
    expect(fairScore({ ...base, cells: 48 })).toBeLessThan(fairScore({ ...base, cells: 24 }));
    expect(fairScore({ ...base, cells: 12 })).toBeGreaterThan(fairScore({ ...base, cells: 24 }));
    // 1 günlük hesap, devasa puan: tavan 12+30=42
    expect(fairScore({ items: 5000, garden: 300, clean: 100, cells: 24, ageDays: 1 })).toBe(142);
    expect(fairScore({ items: -5, garden: 0, clean: 500, cells: 0, ageDays: -3 })).toBeGreaterThanOrEqual(100);
  });
});

describe('premium önerisi', () => {
  const s = (o: Partial<UpsellSignals> = {}): UpsellSignals => ({ activeDays: 10, streak: 5, lockedTaps: 0, scanLimitHit: false, shown: 0, dismissed: 0, daysSinceShown: null, ...o });
  it('ilk 3 gün sıfır, premium asla', () => {
    expect(upsellScore(s({ activeDays: 2, lockedTaps: 5 }))).toBe(0);
    expect(shouldUpsell(s({ scanLimitHit: true }), true)).toBe(false);
  });
  it('niyet + değer eşiği aşar, sakin kullanıcıya çıkmaz', () => {
    expect(shouldUpsell(s({ scanLimitHit: true }), false)).toBe(true);
    expect(shouldUpsell(s({ activeDays: 5, streak: 2 }), false)).toBe(false);
  });
  it('her kapatmada bekleme ikiye katlanır', () => {
    expect([1, 2, 3, 9].map(upsellCooldown)).toEqual([2, 4, 8, 30]);
    expect(shouldUpsell(s({ scanLimitHit: true, dismissed: 2, daysSinceShown: 3 }), false)).toBe(false);
    expect(shouldUpsell(s({ scanLimitHit: true, dismissed: 2, daysSinceShown: 4 }), false)).toBe(true);
  });
});
