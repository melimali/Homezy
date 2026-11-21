import type { SkyKind } from '@/lib/weather';

export function clearNightCondition(night: 0 | 1, sky: SkyKind): boolean {
  return night === 1 && (sky === 'clear' || sky === 'cloudy');
}
