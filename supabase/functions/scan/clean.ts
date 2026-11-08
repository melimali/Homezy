// Tarama cevabının şeması ve temizliği. Saf TypeScript (Deno/npm bağımlılığı yok): jest ile test edilir.

/** Uygulamadaki gardırop kategorileri (src/domain/constants.ts, CATS) ve yıkama türleri (WASH). */
export const CATS = ['Üst', 'Alt', 'Elbise / Takım', 'Dış giyim', 'Ev / Pijama', 'İç giyim', 'Ayakkabı', 'Aksesuar'];
export const WASH = ['beyaz', 'renkli', 'koyu', 'hassas'];
/** Kombin kurallarının bildiği türler (kategorisiyle), renkler ve kumaşlar: src/domain/style.ts (KINDS, COLORS, FABRICS) ile aynı olmalı. */
export const KINDS: Record<string, string> = {
  'Tişört': 'Üst', 'Polo': 'Üst', 'Gömlek': 'Üst', 'Bluz': 'Üst', 'Kazak': 'Üst', 'Sweatshirt': 'Üst',
  'Kot pantolon': 'Alt', 'Kumaş pantolon': 'Alt', 'Chino': 'Alt', 'Eşofman altı': 'Alt', 'Şort': 'Alt', 'Etek': 'Alt',
  'Elbise': 'Elbise / Takım', 'Takım elbise': 'Elbise / Takım',
  'Ceket': 'Dış giyim', 'Deri ceket': 'Dış giyim', 'Kot ceket': 'Dış giyim', 'Mont': 'Dış giyim', 'Kaban': 'Dış giyim', 'Trençkot': 'Dış giyim',
  'Spor ayakkabı': 'Ayakkabı', 'Loafer': 'Ayakkabı', 'Klasik ayakkabı': 'Ayakkabı', 'Bot': 'Ayakkabı', 'Sandalet': 'Ayakkabı', 'Topuklu ayakkabı': 'Ayakkabı',
  'Pijama': 'Ev / Pijama', 'İç giyim': 'İç giyim', 'Aksesuar': 'Aksesuar',
};
export const COLORS = ['siyah', 'antrasit', 'gri', 'beyaz', 'krem', 'bej', 'camel', 'taba', 'kahverengi', 'lacivert', 'kot mavisi', 'mavi', 'açık mavi',
  'turkuaz', 'yeşil', 'mint', 'haki', 'zeytin yeşili', 'sarı', 'hardal', 'turuncu', 'kırmızı', 'bordo', 'pembe', 'pudra', 'lila', 'mor'];
export const FABRICS = ['Pamuk', 'Keten', 'Viskon', 'İpek / Saten', 'Kot', 'Yün', 'Triko', 'Kaşmir', 'Kadife', 'Polar', 'Polyester', 'Teknik / Spor', 'Deri', 'Süet', 'Kanvas'];

/**
 * Cevabın JSON şeması (structured outputs). Model sadece bu biçimde yazabilir: tür, renk, kumaş ve seviye
 * listelerin dışına çıkamaz, cevap yarım ya da açıklamalı gelmez.
 */
const nullable = (schema: Record<string, unknown>) => ({ anyOf: [schema, { type: 'null' }] });
export const SCHEMA = {
  fridge: {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            qty: { type: 'string' },
            lvl: { type: 'string', enum: ['var', 'az', 'yok'] },
            match: nullable({ type: 'string' }),
            conf: { type: 'string', enum: ['kesin', 'tahmin', 'belirsiz'] },
            exp: nullable({ type: 'string' }),
          },
          required: ['name', 'qty', 'lvl', 'match', 'conf', 'exp'],
          additionalProperties: false,
        },
      },
      missing: { type: 'array', items: { type: 'string' } },
      note: { type: 'string' },
    },
    required: ['items', 'missing', 'note'],
    additionalProperties: false,
  },
  look: {
    type: 'object',
    properties: {
      pieces: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            kind: { type: 'string', enum: Object.keys(KINDS) },
            color: { type: 'string', enum: COLORS },
            hex: { type: 'string' },
            fabric: { type: 'string', enum: FABRICS },
            pattern: { type: 'string', enum: ['düz', 'desenli'] },
            wash: { type: 'string', enum: WASH },
            match: nullable({ type: 'string' }),
            conf: { type: 'string', enum: ['kesin', 'tahmin', 'belirsiz'] },
          },
          required: ['name', 'kind', 'color', 'hex', 'fabric', 'pattern', 'wash', 'match', 'conf'],
          additionalProperties: false,
        },
      },
      worn: { type: 'boolean' },
      note: { type: 'string' },
    },
    required: ['pieces', 'worn', 'note'],
    additionalProperties: false,
  },
} as const;

export type Kind = 'fridge' | 'look';

/** Cevaptaki ilk JSON nesnesini okur (kod bloğu ya da açıklama eklenmişse de). */
export function parseJson(text: string): Record<string, unknown> | null {
  const a = text.indexOf('{'), b = text.lastIndexOf('}');
  if (a < 0 || b <= a) return null;
  try {
    return JSON.parse(text.slice(a, b + 1));
  } catch {
    return null;
  }
}

export const str = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);
const nameOrNull = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, 60) : null);

/** Modelin cevabını uygulamanın beklediği biçime indirir; tanınmayan alanları atar. */
/** kesin: net görüldü; tahmin: içi/adı tahmin (kullanıcıya sorulur); belirsiz: model emin değil. Eski değerler (yuksek/dusuk) da okunur. */
export function cleanConf(v: unknown): 'kesin' | 'tahmin' | 'belirsiz' {
  return v === 'tahmin' ? 'tahmin' : v === 'belirsiz' || v === 'dusuk' ? 'belirsiz' : 'kesin';
}

/** Ambalajda açıkça yazan son kullanma tarihi (YYYY-AA-GG); makul aralık dışındaysa null. */
export function cleanExp(v: unknown, now = Date.now()): string | null {
  const m = typeof v === 'string' ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(v.trim()) : null;
  if (!m) return null;
  const t = Date.UTC(+m[1], +m[2] - 1, +m[3]);
  const d = new Date(t);
  if (d.getUTCFullYear() !== +m[1] || d.getUTCMonth() !== +m[2] - 1 || d.getUTCDate() !== +m[3]) return null;
  const days = (t - now) / 864e5;
  return days > -30 && days < 365 * 3 ? v!.toString().trim() : null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function clean(kind: Kind, r: Record<string, any>, now = Date.now()) {
  const note = str(r.note, 240);
  if (kind === 'fridge') {
    const items = (Array.isArray(r.items) ? r.items : []).slice(0, 40).flatMap((x: any) => {
      const name = str(x?.name, 40);
      if (!name) return [];
      const lvl = ['var', 'az', 'yok'].includes(x?.lvl) ? x.lvl : 'var';
      return [{ name, qty: str(x?.qty, 30), lvl, match: nameOrNull(x?.match), conf: cleanConf(x?.conf), exp: cleanExp(x?.exp, now) }];
    });
    const missing = (Array.isArray(r.missing) ? r.missing : []).map((x: unknown) => str(x, 60)).filter(Boolean).slice(0, 40);
    return { items, missing, note };
  }
  const pieces = (Array.isArray(r.pieces) ? r.pieces : []).slice(0, 20).flatMap((x: any) => {
    const name = str(x?.name, 40);
    if (!name) return [];
    const kind = typeof x?.kind === 'string' && KINDS[x.kind] ? x.kind : null;
    const color = str(x?.color, 20).toLocaleLowerCase('tr-TR');
    return [{
      name,
      kind,
      cat: kind ? KINDS[kind] : CATS.includes(x?.cat) ? x.cat : 'Aksesuar',
      color: COLORS.includes(color) ? color : null,
      hex: typeof x?.hex === 'string' && /^#[0-9a-f]{6}$/i.test(x.hex) ? x.hex : null,
      fabric: FABRICS.includes(x?.fabric) ? x.fabric : null,
      pattern: x?.pattern === 'desenli' ? 'desenli' : 'düz',
      wash: WASH.includes(x?.wash) ? x.wash : null,
      match: nameOrNull(x?.match),
      conf: cleanConf(x?.conf),
    }];
  });
  return { pieces, worn: r.worn === true, note };
}

