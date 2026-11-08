import { describe, expect, it } from '@jest/globals';

import { seed } from '../logic';
import { addShop, clearChecked, shopText, suggestions, toggleShop } from '../shopping';
import { newPet, newPetItem } from '../pets';

describe('alışveriş listesi', () => {
  it('ekler, aynısını iki kez eklemez', () => {
    const S = seed();
    expect(addShop(S, ' Süt ', 'market')).toBe(true);
    expect(addShop(S, 'süt', 'market')).toBe(false);
    expect(S.shop).toHaveLength(1);
  });
  it('temizleyince alınanlar sık alınanlara girer, öneri olarak döner', () => {
    const S = seed();
    addShop(S, 'Deterjan', 'temizlik');
    toggleShop(S, S.shop[0].id);
    expect(clearChecked(S)).toBe(1);
    expect(S.shop).toHaveLength(0);
    expect(suggestions(S).some(s => s.name === 'Deterjan')).toBe(true);
    addShop(S, 'Deterjan', 'temizlik');
    expect(suggestions(S).some(s => s.name === 'Deterjan')).toBe(false);
  });
  it('mama işi yaklaşınca öneri çıkar; metin kategoriye göre', () => {
    const S = seed();
    const pet = newPet('Pamuk', 'kedi');
    pet.items.push(newPetItem('Mama', '🍽️', 12, Date.now() - 36e5 * 20));
    S.pets = [pet];
    expect(suggestions(S).some(s => s.name === 'Mama (Pamuk)' && s.cat === 'evcil')).toBe(true);
    addShop(S, 'Ekmek', 'market');
    expect(shopText(S)).toBe('🛒 Market\n☐ Ekmek');
  });
});
