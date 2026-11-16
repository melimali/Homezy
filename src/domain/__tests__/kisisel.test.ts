import { describe, expect, it } from '@jest/globals';

import { applyQuiz, limits, MAX, MAX_DAILY, picks, quizOf, RULES, sigOf } from '../kisisel';
import { DISC_QUESTIONS } from '../kisilik';
import { dailyCap } from '../ramp';
import { eachList } from '../home';
import { PLAN, QUESTIONS, type Persona } from '../persona';
import { ACTS } from '../secimData';
import { emptyState, seed } from '../logic';
import { EN } from '../../i18n/en';

const NOON = new Date(2026, 10, 11, 12).getTime();
const q = (o: Partial<Parameters<typeof quizOf>[0]> = {}, disc: Record<string, string> = {}, acts: string[] = []) =>
  quizOf(o, disc, acts as never);
const names = (S: ReturnType<typeof seed>) => {
  const out: string[] = [];
  eachList(S, a => a.forEach(t => t.tag?.startsWith('q:') && out.push(t.name)));
  return out;
};

describe('kisisel rutinler', () => {
  it('her etkinlik, disiplin ve persona cevabı tabloda var', () => {
    for (const a of ACTS) expect(RULES.some(r => r.q === 'acts' && r.a === a.id)).toBe(true);
    for (const k of ['start', 'plan', 'quit', 'drive'] as const) {
      const dq = DISC_QUESTIONS.find(x => x.k === k)!;
      for (const o of dq.opts) expect(RULES.some(r => r.q === k && r.a === o.v)).toBe(true);
    }
    for (const p of Object.keys(PLAN) as Persona[]) expect(PLAN[p].tasks.length).toBeGreaterThan(0);
    expect(QUESTIONS.find(x => x.k === 'who')!.opts.length).toBe(5);
  });

  it('günlük iş sayısı personaya ve cevaplara göre değişir', () => {
    expect(limits(q({ who: 'ogrenci' })).cap).toBe(4);
    expect(limits(q({ who: 'anne' })).cap).toBe(6);
    expect(limits(q({ who: 'aile' })).cap).toBe(3);
    expect(limits(q({ who: 'tek', rhythm: 'yogun' }, { quit: 'yorulur', start: 'birazdan' })).cap).toBe(2);
    expect(limits(q({ who: 'cift' }, { focus: '90', plan: 'detay' })).cap).toBe(9);
  });

  it('oyun cevabı klavye temizliği ekler, evcil hayvan kum/mama, bitki sulama', () => {
    const S = seed();
    applyQuiz(S, q({}, {}, ['pc', 'pet', 'plants']));
    const n = names(S);
    expect(n).toContain('Klavyeni ve fareni temizle');
    expect(n).toContain('Kum / tuvalet alanını temizle');
    expect(n).toContain('Bitkileri sula');
  });

  it('çocuk → oyuncak, öğrenci → masa/çanta', () => {
    expect(picks(q({ who: 'anne' })).map(p => p.spec.name)).toContain('Oyuncak toplama turu');
    expect(picks(q({ who: 'ogrenci' })).map(p => p.spec.name)).toContain('Çalışma masanı topla');
  });

  it('sade: en çok MAX iş, günlük sıklıkta en çok MAX_DAILY', () => {
    const all = ACTS.map(a => a.id);
    const p = picks(q({ who: 'anne', rhythm: 'yogun', cook: 'sever', style: 'duzenli' }, { plan: 'detay', start: 'birazdan', quit: 'sikilir', drive: 'hedef', focus: '90' }, all));
    expect(p.length).toBeLessThanOrEqual(MAX);
    expect(p.filter(x => x.spec.every <= 1).length).toBeLessThanOrEqual(MAX_DAILY);
    expect(new Set(p.map(x => x.spec.name)).size).toBe(p.length);
  });

  it('aile evindeki genç ve tek oda modunda ortak alan işi eklenmez', () => {
    const teen = picks(q({ who: 'aile' }, {}, ['cook', 'coffee', 'guest'])).map(p => p.spec);
    expect(teen.some(s => s.shared)).toBe(false);
    expect(picks(q({}, {}, ['cook', 'coffee']), true).some(p => p.spec.shared)).toBe(false);
    expect(picks(q({}, {}, ['cook', 'coffee']), false).some(p => p.spec.shared)).toBe(true);
  });

  it('tek oda modunda işler o odaya gider', () => {
    const S = seed();
    S.settings.solo = S.order[0];
    applyQuiz(S, q({ who: 'ogrenci' }, {}, ['pc']));
    const mine = S.tasks[S.order[0]].filter(t => t.tag?.startsWith('q:'));
    expect(mine.length).toBeGreaterThan(0);
    for (const rid of S.order.slice(1)) expect((S.tasks[rid] || []).some(t => t.tag?.startsWith('q:'))).toBe(false);
  });

  it('idempotent; cevap geri alınınca kalkar; silinen iş geri gelmez; günlük sınır ayarlanır', () => {
    const S = seed();
    const a = q({}, { focus: '10' }, ['pc']);
    const first = applyQuiz(S, a);
    expect(first).toBeGreaterThan(0);
    expect(S.settings.quizSig).toBe(sigOf(S, a));
    expect(applyQuiz(S, a)).toBe(0);
    expect(S.settings.quizCap).toBe(4);
    // kullanıcı bir işi siler: geri eklenmez
    const rid = S.order.find(r => S.tasks[r].some(t => t.name === 'Klavyeni ve fareni temizle'))!;
    S.tasks[rid] = S.tasks[rid].filter(t => t.name !== 'Klavyeni ve fareni temizle');
    applyQuiz(S, a);
    expect(names(S)).not.toContain('Klavyeni ve fareni temizle');
    // cevap kalkınca etiketli işler gider
    applyQuiz(S, q({}, { focus: '10' }, []));
    expect(names(S)).not.toContain('Ekranı ve masayı sil');
  });

  it('günlük iş üst sınırı Düzen aşamasında da uygulanır', () => {
    const S = emptyState();
    S.play.days = [...Array.from({ length: 28 }, (_, i) => `2026-10-${String(i + 1).padStart(2, '0')}`), ...Array.from({ length: 12 }, (_, i) => `2026-09-${String(i + 1).padStart(2, '0')}`), '2026-11-10'];
    expect(dailyCap(S, NOON)).toBe(Infinity);
    S.settings.quizCap = 3;
    expect(dailyCap(S, NOON)).toBe(3);
  });

  it('her yeni iş adı İngilizce çevrili', () => {
    const all = [...RULES.flatMap(r => r.tasks), ...Object.values(PLAN).flatMap(p => p.tasks)];
    for (const t of all) expect(EN[t.name]).toBeTruthy();
    for (const a of ACTS) expect(EN[a.label] ?? a.label).toBeTruthy();
  });
});
