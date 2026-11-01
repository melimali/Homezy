// Mağaza ekran görüntüleri için örnek AppState üretir (JSON, stdout).
import { seed } from '@/domain/logic';
import { normalize } from '@/domain/play';

const DAY = 86400000;
const key = (n: number) => {
  const d = new Date(Date.now() - n * DAY);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const lang = (process.argv[2] === 'en' ? 'en' : 'tr') as 'tr' | 'en';
const S = seed();
S.setup = true;
S.settings.language = lang;
S.homeName = lang === 'en' ? 'Our home' : 'Evimiz';
S.play.days = Array.from({ length: 12 }, (_, i) => key(11 - i));
S.play.points = 340;
S.play.celebrated = 99;
S.play.welcomed = key(0);
S.play.weekSeen = key(0);
S.play.checkins[key(0)] = { feel: 'iyi', busy: 'evde', at: Date.now() };
S.play.owned = ['saksi', 'puf', 'hali', 'abajur', 'kahve_makinesi', 'kitaplik'];
S.play.garden.plots = [
  { id: 'p1', flower: 'papatya', day: key(8), base: 0, fert: 0 },
  { id: 'p2', flower: 'lale', day: key(3), base: 0, fert: 0 },
];
process.stdout.write(JSON.stringify(normalize(S)));
