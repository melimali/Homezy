import { gardenPlantSource } from '../GardenIsland';

describe('garden island plant art', () => {
  it('has separate artwork for each of the four shared growth stages', () => {
    const stages = [0, 1, 2, 3].map(stage => gardenPlantSource('papatya', stage));
    expect(stages.every(Boolean)).toBe(true);
    expect(new Set(stages).size).toBe(4);
  });

  it('uses unique bloom art for the first release and falls back for buds and other species', () => {
    const flowers = ['papatya', 'lale', 'aycicegi', 'lavanta', 'gul', 'menekse'];
    const blooms = flowers.map(flower => gardenPlantSource(flower, 5));
    expect(blooms.every(Boolean)).toBe(true);
    expect(new Set(blooms).size).toBe(flowers.length);
    expect(gardenPlantSource('papatya', 4)).toBeUndefined();
    expect(gardenPlantSource('orkide', 5)).toBeUndefined();
  });
});
