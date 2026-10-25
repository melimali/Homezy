/**
 * İş, ürün ve kıyafet adlarından emoji tahmini. Uzun yazıyı okumak yerine işi resminden tanımak için.
 * Kural sırası önemli: ilk eşleşen kazanır. Ad küçük harfe (Türkçe kurallarıyla) çevrilip aranır.
 */

const TASK_RULES: [RegExp, string][] = [
  [/sula|bitki|çiçek/, '💧'],
  [/bulaşık/, '🍽️'],
  [/çöp/, '🗑️'],
  [/çarşaf|yatak|nevresim/, '🛏️'],
  [/yastık|yorgan/, '🧸'],
  [/havlu/, '🧻'],
  [/havalandır/, '🌬️'],
  [/lavabo/, '🚰'],
  [/cam|pencere|ayna|korkuluk/, '🪟'],
  [/toz/, '🪶'],
  [/süpür/, '🧹'],
  [/yer sil|paspas|yer/, '🧽'],
  [/tezgah|masa|sil/, '🧽'],
  [/klozet|tuvalet/, '🚽'],
  [/duş|küvet/, '🚿'],
  [/fırın/, '♨️'],
  [/buzdolab/, '🧊'],
  [/ütü/, '💨'],
  [/çamaşır|yıka/, '🧺'],
  [/filtre|makine/, '⚙️'],
  [/oyuncak/, '🧸'],
  [/ayakkabı/, '👟'],
  [/kablo|şarj/, '🔌'],
  [/minder|koltuk/, '🛋️'],
  [/perde/, '🪟'],
  [/kombi|petek|klima/, '🌡️'],
  [/sayaç|fatura/, '📸'],
  [/mama|kedi|köpek|kum|evcil/, '🐾'],
  [/düzen|topla/, '📦'],
];

const ITEM_RULES: [RegExp, string][] = [
  [/süt/, '🥛'], [/yumurta/, '🥚'], [/peynir/, '🧀'], [/ekmek|simit/, '🍞'], [/yoğurt|ayran/, '🥣'],
  [/tereyağ|margarin/, '🧈'], [/domates/, '🍅'], [/salatalık|hıyar/, '🥒'], [/biber/, '🫑'], [/soğan|sarımsak/, '🧅'],
  [/patates/, '🥔'], [/havuç/, '🥕'], [/marul|ıspanak|maydanoz|yeşillik/, '🥬'], [/elma/, '🍎'], [/muz/, '🍌'],
  [/limon/, '🍋'], [/portakal|mandalina/, '🍊'], [/üzüm/, '🍇'], [/çilek/, '🍓'], [/zeytin/, '🫒'],
  [/tavuk/, '🍗'], [/et|kıyma|köfte/, '🥩'], [/balık/, '🐟'], [/sucuk|salam|sosis/, '🌭'], [/pirinç|bulgur/, '🍚'],
  [/makarna/, '🍝'], [/un\b|un$/, '🌾'], [/şeker/, '🍬'], [/çay/, '🍵'], [/kahve/, '☕'], [/su\b|su$/, '💧'],
  [/meyve suyu|kola|gazoz|içecek/, '🧃'], [/bal|reçel/, '🍯'], [/çikolata/, '🍫'], [/yağ/, '🫗'],
  [/tuvalet kağıdı|peçete|kağıt havlu/, '🧻'], [/şampuan|sabun|duş jeli|krem|losyon/, '🧴'], [/diş/, '🪥'],
  [/deterjan|yumuşatıcı|çamaşır suyu|leke/, '🫧'], [/sünger/, '🧽'], [/çöp poşeti|poşet/, '🛍️'], [/pil/, '🔋'],
  [/ilaç/, '💊'], [/bebek bezi|mendil/, '🍼'],
];

const CAT_EMOJI: Record<string, string> = {
  'Üst': '👕', 'Alt': '👖', 'Elbise / Takım': '👗', 'Dış giyim': '🧥', 'Ev / Pijama': '🩳', 'İç giyim': '🧦', 'Ayakkabı': '👟', 'Aksesuar': '🧢',
};

const find = (rules: [RegExp, string][], name: string, fallback: string) => {
  const n = name.toLocaleLowerCase('tr-TR');
  return rules.find(([re]) => re.test(n))?.[1] ?? fallback;
};

export const taskEmoji = (name: string, plant = false) => (plant ? '🪴' : find(TASK_RULES, name, '✨'));
export const itemEmoji = (name: string) => find(ITEM_RULES, name, '📦');
export const clothEmoji = (cat: string) => CAT_EMOJI[cat] ?? '👚';
