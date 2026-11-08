import { describe, expect, it } from '@jest/globals';
import { emptyState } from '../logic';
import { bestStreak, dailyCap, loadAdjust, isLightDay, pendingStage, stageFor, weekGoal } from '../ramp';

const NOON = new Date(2026, 10, 11, 12).getTime(); // çarşamba

describe('ramp', () => {
  it('aşamalar toplam güne göre büyür', () => {
    expect(stageFor(0).cap).toBe(1);
    expect(stageFor(3).cap).toBe(2);
    expect(stageFor(7).cap).toBe(3);
    expect(stageFor(14).cap).toBe(5);
    expect(stageFor(28).n).toBe(5);
  });
  it('ilk gün tek iş, atlayınca hepsi, hafif günde en çok 2', () => {
    const S = emptyState();
    expect(dailyCap(S, NOON)).toBe(1);
    S.settings.rampOff = true;
    expect(dailyCap(S, NOON)).toBe(Infinity);
    S.settings.rampOff = false;
    S.play.days = [...Array.from({ length: 19 }, (_, i) => `2026-10-${String(i + 1).padStart(2, '0')}`), '2026-11-10'];
    // Son 7 günde sadece 1 gün çalışılmış: yük 5'ten 4'e hafifler.
    expect(dailyCap(S, NOON)).toBe(4);
    S.settings.lightDay = '2026-11-11';
    expect(dailyCap(S, NOON)).toBe(2);
  });
  it('geri dönüş: 2+ gün ara verince bugün tek iş, ilk iş sayılınca normale döner', () => {
    const S = emptyState();
    S.play.days = Array.from({ length: 20 }, (_, i) => `2026-10-${String(i + 1).padStart(2, '0')}`);
    expect(dailyCap(S, NOON)).toBe(1);
    S.play.days.push('2026-11-11');
    expect(dailyCap(S, NOON)).toBe(4);
  });
  it('en iyi seri ve hafta hedefi', () => {
    const S = emptyState();
    S.play.days = ['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-05', '2026-11-09', '2026-11-10'];
    expect(bestStreak(S.play)).toBe(3);
    S.play.frozen = ['2026-11-04'];
    expect(bestStreak(S.play)).toBe(4);
    expect(weekGoal(S, NOON)).toEqual({ done: 2, goal: 3 });
  });
  it('yeni aşama bir kere kutlanır', () => {
    const S = emptyState();
    expect(pendingStage(S)).toBeNull();
    S.play.days = ['a', 'b', 'c'];
    expect(pendingStage(S)?.n).toBe(2);
    S.settings.rampSeen = 2;
    expect(pendingStage(S)).toBeNull();
  });
  it('yorgun sabah cevabı hafif gün sayılır', () => {
    const S = emptyState();
    S.play.days = [...Array.from({ length: 19 }, (_, i) => `2026-10-${String(i + 1).padStart(2, '0')}`), '2026-11-10'];
    S.play.checkins = { '2026-11-11': { feel: 'yorgun', busy: 'evde', at: NOON } };
    expect(isLightDay(S, NOON)).toBe(true);
    expect(dailyCap(S, NOON)).toBe(2);
  });
  it('zorluk uyarlaması: düzenliyse +1, seyrekse -1', () => {
    const S = emptyState();
    S.play.days = ['2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08', '2026-11-09', '2026-11-10'];
    expect(loadAdjust(S, NOON)).toBe(1);
    expect(dailyCap(S, NOON)).toBe(4);
    S.play.days = ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05', '2026-10-06', '2026-11-09'];
    expect(loadAdjust(S, NOON)).toBe(-1);
    expect(dailyCap(S, NOON)).toBe(2);
  });
});
