import { describe, expect, it } from '@jest/globals';
import { awardLocal, awardedToday, emptyPlay, houseProgress, normalize, PENDING_MAX, prunePending, safeToday } from '../play';
import type { AppState } from '../types';

/** Uçuş senaryosu: gün anahtarı yerel saatten üretilir; saat dilimi geri gidince gün tekrarlanmamalı. */
// Node çalışırken TZ değişmez; bu yüzden uçuş, yerel saat bileşenleriyle kurulur (saat geri gitmiş gibi).
// Süit TZ=Asia/Tokyo, TZ=America/Los_Angeles, TZ=Pacific/Kiritimati gibi değerlerle de çalıştırılabilir.
const local = (d: number, h: number) => new Date(2027, 2, d, h).getTime();
const stateOf = () => ({ play: emptyPlay() }) as unknown as AppState;

describe('saat dilimi değişimi', () => {
  it('batıya uçunca (yerel tarih geri gider) aynı gün tekrar ödüllenmez, seri bozulmaz', () => {
    const S = stateOf();
    // Tokyo'da 16 Mart 08:00: görev yapıldı.
    const tokyo = local(16, 8);
    expect(awardLocal(S, 'gorev', 'a', 'A', tokyo).awarded).toBe(true);
    expect(S.play.days).toEqual(['2027-03-16']);
    // Los Angeles'a varıldı: yerel tarih 15 Mart'a geri düştü.
    const early = local(15, 18); // yerel 15 Mart 18:00
    expect(new Date(early).getDate()).toBe(15);
    expect(safeToday(S.play.days, early)).toBe('2027-03-16');
    expect(awardedToday(S.play, 'gorev', 'a', early)).toBe(true);
    const again = awardLocal(S, 'gorev', 'a', 'A', early);
    expect(again.awarded).toBe(false);
    const p0 = S.play.points;
    expect(S.play.pending).toHaveLength(1);
    expect(houseProgress(S.play.days, early).today).toBe(true);
    expect(houseProgress(S.play.days, early).streak).toBe(1);
    expect(S.play.points).toBe(p0);
  });
  it('geri gidilen günde yeni iş aynı gün sayılır (ikinci seri bonusu yok, gün listesi tekrarlanmaz)', () => {
    const S = stateOf();
    const tokyo = local(16, 8);
    awardLocal(S, 'gorev', 'a', 'A', tokyo);
    const early = local(15, 18);
    const r = awardLocal(S, 'gorev', 'b', 'B', early);
    expect(r.awarded).toBe(true);
    expect(S.play.days).toEqual(['2027-03-16']);
    expect(S.play.pending.every(e => e.day === '2027-03-16')).toBe(true);
  });
  it('doğuya uçunca atlanan gün seriyi bozmaz hesabını ev yine yapar; 1 günden fazla ileri kayıt yok sayılır', () => {
    const now = local(16, 12);
    expect(safeToday(['2027-03-16'], now)).toBe('2027-03-16');
    expect(safeToday(['2027-03-17'], now)).toBe('2027-03-17');
    expect(safeToday(['2027-03-25'], now)).toBe('2027-03-16');
  });
  it('geçmiş kayıtlar etkilenmez', () => {
    const now = local(16, 12);
    expect(safeToday([], now)).toBe('2027-03-16');
    expect(safeToday(['2027-03-15'], now)).toBe('2027-03-16');
  });
});

describe('bekleyen puan kuyruğu', () => {
  it('7 günden eski elenir, en çok 200 tutulur', () => {
    const P = emptyPlay();
    const t = local(20, 12);
    P.pending = [
      { kind: 'gorev', ref: 'x', day: '2027-03-01' },
      { kind: 'gorev', ref: 'y', day: '2027-03-19' },
    ];
    prunePending(P, t);
    expect(P.pending.map(e => e.ref)).toEqual(['y']);
    P.pending = Array.from({ length: 300 }, (_, i) => ({ kind: 'gorev' as const, ref: String(i), day: '2027-03-20' }));
    prunePending(P, t);
    expect(P.pending).toHaveLength(PENDING_MAX);
    expect(P.pending[0].ref).toBe('100');
  });
  it('normalize açılışta da eler', () => {
    const S = stateOf();
    S.play.pending = [{ kind: 'gorev', ref: 'eski', day: '2000-01-01' }];
    normalize(S);
    expect(S.play.pending).toHaveLength(0);
  });
});
