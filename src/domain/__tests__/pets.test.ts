import { describe, expect, it } from '@jest/globals';

import { itemState, markPetDone, newPet, newPetItem, petNotifs, petsDue, stateText, stillDue } from '../pets';
import { seed } from '../logic';
import { applyReminderAction, reminderDataOf } from '@/notifications/actions';
import { setLang, tx } from '@/i18n/runtime';

const H = 36e5;
const t0 = new Date(2026, 10, 9, 10, 0).getTime();

function withPet() {
  const S = seed();
  const pet = newPet('Pamuk', 'kedi');
  pet.items.push(newPetItem('Mama', '🍽️', 12, t0), newPetItem('Yıkama', '🛁', 30 * 24, t0));
  S.pets = [pet];
  return { S, pet };
}

describe('evcil hayvan bakımı', () => {
  it('durum: yolunda → bugün → gecikti', () => {
    const { pet } = withPet();
    const [mama, yikama] = pet.items;
    expect(itemState(mama, t0 + 1 * H).k).toBe('today');
    expect(itemState(mama, t0 + 13 * H)).toMatchObject({ k: 'late' });
    expect(stateText(itemState(mama, t0 + 15 * H))).toBe('3 saat gecikti');
    expect(itemState(yikama, t0 + 2 * H).k).toBe('ok');
  });

  it('Şimdi yaptım son zamanı günceller, vakti öteler', () => {
    const { S, pet } = withPet();
    const now = t0 + 14 * H;
    expect(petsDue(S, now)).toHaveLength(1);
    markPetDone(S, pet.id, pet.items[0].id, now);
    expect(pet.items[0].last).toBe(now);
    expect(itemState(pet.items[0], now + H).k).not.toBe('late');
    expect(petsDue(S, now + H).some(d => d.item.id === pet.items[0].id && d.s.k === 'late')).toBe(false);
  });

  it('bildirim: vaktinde, hatırlatması kapalı iş ve kapalı ayar atlanır', () => {
    const { S, pet } = withPet();
    const ns = petNotifs(S, t0 + H);
    expect(ns.length).toBeGreaterThanOrEqual(2);
    expect(ns[0].title).toMatch(/Pamuk: (Mama|Food)/);
    pet.items[0].remind = false;
    expect(petNotifs(S, t0 + H).some(n => n.key.endsWith(pet.items[0].id))).toBe(false);
    S.settings.pets = false;
    expect(petNotifs(S, t0 + H)).toHaveLength(0);
  });

  it('gecikmiş iş için tek bildirim', () => {
    const { S, pet } = withPet();
    const ns = petNotifs(S, t0 + 40 * H).filter(n => n.key.endsWith(pet.items[0].id));
    expect(ns).toHaveLength(1);
  });

  it('bildirim düğmesi: Yaptım kaydeder, iki kez basmak bir şeyi değiştirmez', () => {
    const { S, pet } = withPet();
    const now = t0 + 13 * H;
    const key = `${pet.id}@${pet.items[0].id}`;
    const d = reminderDataOf({ data: { kind: 'pet', key, url: '/evcil', premium: false } })!;
    expect(d.kind).toBe('pet');
    expect(stillDue(S, key, now)).toBe(true);
    const o = applyReminderAction(S, d, now);
    expect(o?.title).toContain('Pamuk');
    applyReminderAction(S, d, now + 1000);
    expect(pet.items[0].last).toBe(now);
    expect(stillDue(S, key, now)).toBe(false);
  });

  it('EN: süre ve durum metinleri', () => {
    setLang('en');
    expect(tx('3 saat gecikti')).toBe('3 hours overdue');
    expect(tx('Her 12 saatte')).toBe('Every 12 hours');
    expect(tx('Her 30 günde')).toBe('Every 30 days');
    expect(tx('1 gün kaldı')).toBe('1 day left');
    setLang('tr');
  });
});
