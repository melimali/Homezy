import { describe, expect, it } from '@jest/globals';

import { crisisReply, isCrisis } from '../../../supabase/functions/_shared/safety';

describe('kriz algılama', () => {
  it.each([
    'intihar etmeyi düşünüyorum',
    'Kendimi öldürmek istiyorum',
    'ölmek istiyorum',
    'artık yaşamak istemiyorum',
    'kendime zarar vereceğim',
    'I want to die',
    "I don't want to live anymore",
    'thinking about suicide',
    'i might hurt myself',
  ])('yakalar: %s', t => expect(isCrisis(t)).toBe(true));

  it.each(['mutfağı temizledim', 'yaşamak güzel, bugün 3 iş yaptım', 'bulaşık ölüm gibi yorucu', 'ne zaman ölçüm yapayım', 'add a task to kill the mold'])(
    'yakalamaz: %s',
    t => expect(isCrisis(t)).toBe(false),
  );

  it('cevap 112 içerir', () => {
    expect(crisisReply('tr')).toContain('112');
    expect(crisisReply('en')).toContain('112');
  });
});
