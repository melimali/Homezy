import type { MokaPose } from '@/constants/moka';

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
/** Aksesuar ve ayakkabıda ad daha belirleyici (çanta şapka gibi görünmesin). */
const CLOTH_RULES: [RegExp, string][] = [
  [/çanta|sırt çantası/, '👜'], [/şapka|bere|kasket/, '🧢'], [/atkı|şal|eşarp/, '🧣'], [/eldiven/, '🧤'],
  [/gözlük/, '🕶️'], [/kemer|saat|kolye|küpe|bileklik|yüzük/, '💍'], [/çorap/, '🧦'],
  [/bot|çizme/, '🥾'], [/topuklu/, '👠'], [/sandalet|terlik/, '🩴'], [/klasik ayakkabı|loafer|makosen/, '👞'],
  [/elbise/, '👗'], [/etek/, '👗'], [/şort/, '🩳'], [/mont|kaban|ceket|palto|trenç/, '🧥'],
];
export const clothEmoji = (cat: string, name = '') => find(CLOTH_RULES, name, CAT_EMOJI[cat] ?? '👚');

/** İş adından o işi yapan Moka pozu (listelerde emoji yerine sticker). Eşleşmezse `null`. */
const TASK_POSES: [RegExp, MokaPose][] = [
  [/sula|bitki|çiçek/, 'watering'],
  [/bulaşık/, 'dishes'],
  [/çöp/, 'trash_bag'],
  [/çarşaf|yatak|nevresim|yastık|yorgan|havlu|çamaşır|ütü|katla/, 'laundry_basket'],
  [/cam|pencere|ayna/, 'mirror'],
  [/toz/, 'dusting'],
  [/süpür/, 'vacuuming'],
  [/yer sil|paspas|lavabo|klozet|tuvalet|duş|küvet|fırçala|ovala/, 'scrubbing'],
  [/tezgah|masa|sil|buzdolab|fırın|ocak/, 'spray_clean'],
  [/yemek|pişir|kek/, 'baking'],
  [/filtre|makine|kombi|petek|klima|tamir|ampul/, 'handyman'],
  [/sayaç|fatura|liste|plan/, 'todo'],
  [/düzen|topla|oyuncak|ayakkabı/, 'checklist'],
  [/kum|mama/, 'dustpan'],
];

export const taskPose = (name: string, plant = false): MokaPose | null => {
  if (plant) return 'watering';
  const n = name.toLocaleLowerCase('tr-TR');
  return TASK_POSES.find(([re]) => re.test(n))?.[1] ?? null;
};

/** İş ekranındaki adımlar, Moka'nın cümlesi ve bitince söylediği söz; işin pozuna göre. Sadece görünüm için. */
const TASK_ART: Partial<Record<MokaPose, { steps: string[]; line: string; cheer: string }>> = {
  dishes: { steps: ['Kirli tabakları topla', 'Sıcak suyu hazırla', 'Bulaşıkları yıka', 'Tezgâhı temizle'], line: 'Köpük partisi! Bulaşıklar bitince kahve benden!', cheer: 'Köpükler gitti, kahve geldi. ☕ Bir adım daha güzel bir eve!' },
  trash_bag: { steps: ['Çöpleri topla', 'Poşeti bağla', 'Dışarı çıkar', 'Yeni poşet tak'], line: 'Dışarısı seni bekliyor, hadi bir tur!', cheer: 'Ev hafifledi, sen de hafifledin. 🌿' },
  laundry_basket: { steps: ['Çamaşırları ayır', 'Makineye yerleştir', 'As ya da kurut', 'Katla, yerleştir'], line: 'Mis gibi koksun!', cheer: 'Dolap mis kokuyor, ben de sarılmak istiyorum. 🧺' },
  mirror: { steps: ['Bezi ve spreyi hazırla', 'Sıkıp sil', 'Kuru bezle parlat'], line: 'Parlasın ki kendimize gülümseyelim!', cheer: 'Pırıl pırıl! Aynadaki sen de çok mutlu. ✨' },
  dusting: { steps: ['Yüzeyleri boşalt', 'Tozu al', 'Eşyaları yerine koy'], line: 'Toz tanesi kalmasın, hapşu!', cheer: 'Toz bulutu dağıldı, hava tertemiz. 🪶' },
  vacuuming: { steps: ['Yerdekileri kaldır', 'Köşelerden başla', 'Halıları da süpür', 'Haznesini boşalt'], line: 'Vın vın! Yerler bizi bekliyor.', cheer: 'Yerler tertemiz, çıplak ayakla gezme vakti! 🧹' },
  scrubbing: { steps: ['Temizleyiciyi sık', 'Biraz beklet', 'Fırçala', 'Durula ve kurula'], line: 'Biraz köpük, biraz kas gücü!', cheer: 'Parıl parıl oldu, köpük kahramanı sensin. 🫧' },
  spray_clean: { steps: ['Yüzeyi boşalt', 'Sprey sık', 'Sil ve kurula'], line: 'Fıs fıs, sil sil, bitti!', cheer: 'Tezgâh ışıl ışıl, kahveyi buraya koyalım. ☕' },
  watering: { steps: ['Toprağı yokla', 'Suyu hazırla', 'Yavaşça sula', 'Tabağı boşalt'], line: 'Yeşil dostlar mutlu olsun!', cheer: 'Yapraklar teşekkür ediyor, ben de! 🌱' },
  handyman: { steps: ['Gerekenleri hazırla', 'Kontrol et', 'Temizle ya da değiştir'], line: 'Kask tamam, alet çantası tamam!', cheer: 'Usta işi oldu, ev sana minnettar. 🔧' },
  todo: { steps: ['Fotoğrafını çek ya da not al', 'Kaydet'], line: 'Küçük bir not, büyük bir düzen.', cheer: 'Kayıtlar tamam, kafan rahat. 📋' },
  checklist: { steps: ['Ortalıktakileri topla', 'Yerlerine yerleştir', 'Son bir göz at'], line: 'Daha ferah bir alan seni bekliyor ✨', cheer: 'Ferah ferah! Nefes almak bile güzel. 📦' },
  baking: { steps: ['Malzemeleri hazırla', 'Pişir', 'Mutfağı topla'], line: 'Mutfaktan güzel kokular gelsin!', cheer: 'Ellerine sağlık, kokusu buraya geldi. 🍰' },
  dustpan: { steps: ['Kirli kumu topla', 'Kabı temizle', 'Taze kum ekle'], line: 'Patili dostumuz teşekkür edecek!', cheer: 'Patiler mutlu, ev mis gibi. 🐾' },
};

const DEFAULT_ART = { steps: ['Gerekenleri hazırla', 'İşi yap', 'Ortalığı topla'], line: 'Küçük bir iş, kocaman bir rahatlama.', cheer: 'Bir adım daha güzel bir eve! ☕' };

export const taskArt = (pose: MokaPose | null) => (pose && TASK_ART[pose]) || DEFAULT_ART;
