import { describe, expect, it } from '@jest/globals';

import { TOOLS, toolSchemas, validate, type Ctx } from '../../../supabase/functions/_shared/chatTools';
import { applyChatAction, needsConfirm, TOOL_NAMES } from '../chatTools';
import { chatCtx } from '../chat';
import { newMed } from '../meds';
import { newPet, newPetItem } from '../pets';
import { seed, shopItems } from '../logic';
import { dayKey } from '../play';

const NOW = new Date(2026, 10, 9, 10, 0).getTime();

function world() {
  const S = seed(NOW);
  S.meds = [newMed('Vitamin D', '', ['09:00'], [], NOW - 864e5, 'takviye')];
  const pet = newPet('Pamuk', 'kedi');
  pet.items.push(newPetItem('Mama', '🍽️', 12, NOW - 20 * 36e5));
  S.pets = [pet];
  return S;
}
const ctxOf = (S = world()): Ctx => chatCtx(S, NOW) as Ctx;

describe('araç kaydı', () => {
  it('sunucu ve uygulama aynı araçları taşır', () => {
    expect(TOOLS.map(t => t.name).sort()).toEqual([...TOOL_NAMES].sort());
  });
  it('her araç için geçerli şema üretilir', () => {
    for (const t of toolSchemas()) expect(t.input_schema.type).toBe('object');
  });
});

describe('sunucu doğrulaması', () => {
  const ctx = ctxOf();
  it('alışveriş listesi: tekrarları atar, boşu reddeder', () => {
    expect(validate('shop_add', { items: ['süt', ' süt ', 'ekmek'] }, ctx)).toMatchObject({ type: 'shop_add', items: ['süt', 'ekmek'] });
    expect(validate('shop_add', { items: [] }, ctx)).toBeNull();
    expect(validate('shop_add', { items: 'süt' }, ctx)).toBeNull();
  });
  it('bilinmeyen araç, olmayan id ve aralık dışı sayı reddedilir', () => {
    expect(validate('drop_table', {}, ctx)).toBeNull();
    expect(validate('complete_task', { task_id: 'uydurma' }, ctx)).toBeNull();
    expect(validate('water_log', { glasses: 99 }, ctx)).toBeNull();
    expect(validate('sport_log', { sport: 'Dövüş', minutes: 30 }, ctx)).toBeNull();
    expect(validate('med_add', { name: 'X', times: ['25:00'] }, ctx)).toBeNull();
    expect(validate('open_screen', { screen: 'admin' }, ctx)).toBeNull();
  });
  it('silme araçları onay işareti taşır', () => {
    expect(validate('shop_remove', { items: ['süt'] }, ctx)?.confirm).toBe(true);
    expect(validate('shop_add', { items: ['süt'] }, ctx)?.confirm).toBeUndefined();
  });
  it('hayvan bakımı sadece o hayvanın kalemini kabul eder', () => {
    const p = ctx.pets[0];
    expect(validate('pet_care', { pet_id: p.id, item_id: p.items[0].id }, ctx)).not.toBeNull();
    expect(validate('pet_care', { pet_id: p.id, item_id: 'x' }, ctx)).toBeNull();
  });
});

describe('uygulayıcı', () => {
  it('alışveriş: ekle, alındı, geri al', () => {
    const S = world();
    const before = shopItems(S).length;
    const r = applyChatAction(S, { type: 'shop_add', items: ['kuru fasulye', 'ekmek'] }, NOW);
    expect(r.ok).toBe(true);
    expect(shopItems(S).map(x => x.x.name)).toEqual(expect.arrayContaining(['kuru fasulye', 'Ekmek']));
    r.undo!(S);
    expect(shopItems(S).length).toBe(before);
    applyChatAction(S, { type: 'shop_add', items: ['kuru fasulye'] }, NOW);
    expect(applyChatAction(S, { type: 'shop_check', items: ['Kuru Fasulye'] }, NOW).ok).toBe(true);
    expect(shopItems(S).some(x => x.x.name === 'kuru fasulye')).toBe(false);
  });
  it('su ve geri alma', () => {
    const S = world();
    const r = applyChatAction(S, { type: 'water_log', glasses: 3 }, NOW);
    expect(S.play.habits.water[dayKey(NOW)]).toBe(3);
    r.undo!(S);
    expect(S.play.habits.water[dayKey(NOW)] ?? 0).toBe(0);
  });
  it('ilaç alındı ve hayvan bakımı', () => {
    const S = world();
    expect(applyChatAction(S, { type: 'med_log', med_id: S.meds[0].id, status: 'taken' }, NOW).ok).toBe(true);
    expect(Object.values(S.medLog[dayKey(NOW)])[0].s).toBe('taken');
    const pet = S.pets[0];
    const r = applyChatAction(S, { type: 'pet_care', pet_id: pet.id, item_id: pet.items[0].id }, NOW);
    expect(pet.items[0].last).toBe(NOW);
    r.undo!(S);
    expect(pet.items[0].last).not.toBe(NOW);
  });
  it('spor kaydı eylem türünü ezmez', () => {
    const S = world();
    const a = validate('sport_log', { sport: 'Koşu', minutes: 20 }, ctxOf(S));
    expect(a).toMatchObject({ type: 'sport_log', sport: 'Koşu' });
    expect(applyChatAction(S, a!, NOW).ok).toBe(true);
    expect(S.play.sport[0]).toMatchObject({ type: 'Koşu', min: 20 });
  });
  it('günlük, spor, ruh hali', () => {
    const S = world();
    expect(applyChatAction(S, { type: 'journal_add', text: 'güzel gün', mood: '😊' }, NOW).ok).toBe(true);
    expect(S.play.journal[dayKey(NOW)].text).toBe('güzel gün');
    expect(applyChatAction(S, { type: 'sport_log', sport: 'Dövüş', minutes: 30 }, NOW).ok).toBe(false);
    expect(S.play.sport.length).toBe(0);
    expect(applyChatAction(S, { type: 'mood_checkin', feel: 'iyi' }, NOW).ok).toBe(true);
  });
  it('geçersiz eylem hiçbir şeyi değiştirmez', () => {
    const S = world();
    const snap = JSON.stringify(S);
    for (const a of [{ type: 'shop_add', items: [] }, { type: 'nope' }, { type: 'constructor' }, { type: 'water_log', glasses: -5 }, { type: 'complete_task', task_id: 'yok' }]) {
      expect(applyChatAction(S, a, NOW).ok).toBe(false);
    }
    expect(JSON.stringify(S)).toBe(snap);
  });
  it('silme araçları onay ister, görev silinir', () => {
    const S = world();
    expect(needsConfirm({ type: 'remove_task' })).toBe(true);
    const rid = S.order[0];
    const t = S.tasks[rid][0];
    expect(applyChatAction(S, { type: 'remove_task', task_id: t.id }, NOW).ok).toBe(true);
    expect(S.tasks[rid].some(x => x.id === t.id)).toBe(false);
  });
  it('ekran açma yolu döner', () => {
    expect(applyChatAction(world(), { type: 'open_screen', screen: 'ilac' }, NOW).go).toBe('/ilac');
  });
});
