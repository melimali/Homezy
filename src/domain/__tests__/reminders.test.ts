import { describe, expect, it } from '@jest/globals';

import { newMed, medNotifs } from '../meds';
import { dayKey } from '../play';
import { applyReminderAction, reminderDataOf } from '@/notifications/actions';
import { seed } from '../logic';

describe('bildirim düğmeleri', () => {
  it('ilaç: Aldım dozu işaretler, tekrar basmak bir şeyi değiştirmez', () => {
    const S = seed();
    const now = new Date(2026, 10, 9, 9, 0).getTime();
    S.meds = [newMed('Vitamin', '1 tablet', ['09:00'], [], now - 864e5)];
    const n = medNotifs(S, now - 3600e3).find(x => x.id.startsWith('ilac-'))!;
    expect(n.key).toBe(`${S.meds[0].id}@09:00`);
    const d = reminderDataOf({ data: { kind: 'med', key: n.key, url: '/ilac', premium: false } })!;
    const o = applyReminderAction(S, d, now);
    expect(o?.title).toContain('Vitamin');
    expect(S.medLog[dayKey(now)][n.key].s).toBe('taken');
    applyReminderAction(S, d, now);
    expect(Object.keys(S.medLog[dayKey(now)])).toHaveLength(1);
  });
  it('su ve spor', () => {
    const S = seed();
    const now = new Date(2026, 10, 9, 12, 0).getTime();
    applyReminderAction(S, { kind: 'water', url: '/', premium: false }, now);
    expect(Object.values(S.play.habits.water)[0]).toBe(1);
    applyReminderAction(S, { kind: 'sport', url: '/', premium: false }, now);
    applyReminderAction(S, { kind: 'sport', url: '/', premium: false }, now);
    expect(S.play.sport).toHaveLength(1);
  });
  it('görev bildirimi hatırlatma sayılmaz', () => {
    expect(reminderDataOf({ data: { tid: 'a', list: 'tasks' } })).toBeNull();
  });
});
