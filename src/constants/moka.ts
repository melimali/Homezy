import type { ImageSourcePropType } from 'react-native';

import type { RoomType } from '@/domain/types';

/**
 * Maskot: Kahveci Kakapo Moka. 24 sticker `assets/moka/moka_<poz>.png` (512×512, saydam zemin,
 * `scripts/slice-moka.py` ile iki sticker sayfasından kesildi). Hangi pozun ne zaman seçildiği
 * `src/domain/moka.ts`'te.
 */

/** Kahve ve duygu durumu pozları. */
export const MOKA_EXPRESSIONS = [
  'happy', 'sleepy', 'shocked', 'analyzing', 'sassy', 'party',
  'cozy_plant', 'chef', 'wink', 'panicked', 'begging', 'blanket',
] as const;

/** Ev işi pozları. */
export const MOKA_CHORES = [
  'sweeping', 'dusting', 'laundry', 'mirror', 'dishes', 'maintenance',
  'plants', 'trash', 'rest', 'checklist', 'vacuuming', 'sparkling_complete',
] as const;

export type MokaExpression = (typeof MOKA_EXPRESSIONS)[number];
export type MokaChore = (typeof MOKA_CHORES)[number];
export type MokaPose = MokaExpression | MokaChore;

export const MOKA_POSES: readonly MokaPose[] = [...MOKA_EXPRESSIONS, ...MOKA_CHORES];

export const MOKA_ASSETS: Record<MokaPose, ImageSourcePropType> = {
  happy: require('../../assets/moka/moka_happy.png'),
  sleepy: require('../../assets/moka/moka_sleepy.png'),
  shocked: require('../../assets/moka/moka_shocked.png'),
  analyzing: require('../../assets/moka/moka_analyzing.png'),
  sassy: require('../../assets/moka/moka_sassy.png'),
  party: require('../../assets/moka/moka_party.png'),
  cozy_plant: require('../../assets/moka/moka_cozy_plant.png'),
  chef: require('../../assets/moka/moka_chef.png'),
  wink: require('../../assets/moka/moka_wink.png'),
  panicked: require('../../assets/moka/moka_panicked.png'),
  begging: require('../../assets/moka/moka_begging.png'),
  blanket: require('../../assets/moka/moka_blanket.png'),
  sweeping: require('../../assets/moka/moka_sweeping.png'),
  dusting: require('../../assets/moka/moka_dusting.png'),
  laundry: require('../../assets/moka/moka_laundry.png'),
  mirror: require('../../assets/moka/moka_mirror.png'),
  dishes: require('../../assets/moka/moka_dishes.png'),
  maintenance: require('../../assets/moka/moka_maintenance.png'),
  plants: require('../../assets/moka/moka_plants.png'),
  trash: require('../../assets/moka/moka_trash.png'),
  rest: require('../../assets/moka/moka_rest.png'),
  checklist: require('../../assets/moka/moka_checklist.png'),
  vacuuming: require('../../assets/moka/moka_vacuuming.png'),
  sparkling_complete: require('../../assets/moka/moka_sparkling_complete.png'),
};

export type MokaQuote = { title: string; message: string };

/**
 * Her poz için başlık ve konuşma balonu metinleri. Metinde `{n}` sayıyla (gecikmiş ya da bekleyen iş),
 * `{oda}` oda adıyla değiştirilir. Oda adı ek almasın diye cümleler "{oda}: …" ya da "{oda} …" diye kurulur.
 */
export const MOKA_QUOTES: Record<MokaPose, MokaQuote[]> = {
  happy: [
    { title: '☕ Günaydın!', message: 'Kahvem hazır, enerjim tavan. Bugün evle birlikte parlayalım!' },
    { title: '😊 Ne güzel bir gün', message: 'Küçük bir işle başlayalım, gerisi kendiliğinden gelir.' },
  ],
  sleepy: [
    { title: '😴 Uyku vakti', message: 'Bugünlük bu kadar yeter. Yarın taze kahveyle devam ederiz.' },
    { title: '🌙 Esniyorum…', message: 'Ev bekler, sen dinlen. Tatlı rüyalar!' },
  ],
  shocked: [
    { title: '😳 Aaa, {n} iş gecikmiş!', message: 'Kahvemi döktüm! Hadi bir tanesinden başlayalım, gerisi kolay.' },
    { title: '☕💦 Eyvah!', message: '{n} iş sırada bekliyor. En kısasını seçelim mi?' },
  ],
  analyzing: [
    { title: '🧐 Evi inceliyorum', message: 'Biraz toz birikmiş gibi. Hangi oda en çok ilgi bekliyor, bakalım.' },
    { title: '📋 Durum raporu', message: 'Ev puanı biraz düşmüş. 10 dakikalık bir tur her şeyi değiştirir.' },
  ],
  sassy: [
    { title: '🤨 Hmm…', message: 'Bu işi yarına mı bırakıyoruz yine? Ben bir şey demiyorum.' },
    { title: '😏 Sana güveniyorum', message: 'Erteleme ustası değil, ev kahramanısın. Hadi!' },
  ],
  party: [
    { title: '🎉 Seri {n} gün!', message: 'Kutlama kahvesi benden! Böyle devam et.' },
    { title: '🥳 Harikasın!', message: 'Bugün her şeyi bitirdin. Moka gururlu!' },
  ],
  cozy_plant: [
    { title: '🌿 Huzurlu bir akşam', message: 'İşler yolunda. Bir kahve al, biraz keyif yap.' },
    { title: '🪴 Sakin mod', message: 'Evin bugün çok güzel görünüyor. Tadını çıkar.' },
  ],
  chef: [
    { title: '👨‍🍳 Mutfakta neler var?', message: 'Buzdolabına bir göz atalım, eksikleri listeye ekleyelim.' },
    { title: '🍳 Şef Moka', message: 'Temiz tezgâh, mutlu yemek. Mutfağa kısa bir tur atalım mı?' },
  ],
  wink: [
    { title: '😉 Sende bu iş', message: 'Bugün her şey yolunda. Ben buradayım, bir şey olursa haber veririm.' },
    { title: '✨ Küçük bir ipucu', message: '"Ne kadar vaktin var?" ile 10 dakikaya sığan işleri bulabilirsin.' },
  ],
  panicked: [
    { title: '😱 İmdaat, {n} iş gecikti!', message: 'Panik yok, panik yok! Tek tek gideriz. İlk işi birlikte seçelim.' },
    { title: '🆘 Ev alarmı', message: '{n} iş birikmiş. Bugün sadece en acil üçünü yapsak yeter.' },
  ],
  begging: [
    { title: '🥺 Bir tanecik iş…', message: '{n} iş seni bekliyor. Yapar mısın, lütfeeen?' },
    { title: '🙏 Moka rica ediyor', message: 'Küçük bir iş, kocaman bir rahatlama. Hadi bir tane!' },
  ],
  blanket: [
    { title: '🏖️ Tatildesin', message: 'Rutinler dondu, ben de battaniyeme sarıldım. Keyfine bak!' },
    { title: '🧣 Battaniye modu', message: 'Ev seni bekler, acele yok. Dönünce kaldığımız yerden devam.' },
  ],
  sweeping: [
    { title: '🧹 Zeminler parıldıyor', message: 'Şöyle 5 dakikada yerleri süpürelim, {oda} ferahlasın.' },
    { title: '🧹 Süpürge benden', message: '{oda}: kırıntılara savaş açtık. Hazır mısın?' },
  ],
  dusting: [
    { title: '🪶 Toz alma vakti', message: 'Raflar ve köşeler… Tüy süpürgem hazır!' },
    { title: '✨ Pırıl pırıl raflar', message: 'Göz önündeki yerlerin tozunu alalım, ev ışıl ışıl olsun.' },
  ],
  laundry: [
    { title: '🧺 Çamaşır günü', message: '{oda}: kirliler birikmiş gibi. Bir makine atalım mı?' },
    { title: '👕 Sepet doldu', message: 'Çamaşırları ayıralım, gerisini makine halletsin.' },
  ],
  mirror: [
    { title: '🪞 Ayna ayna söyle bana', message: '{oda}: aynalar ve musluklar parlasın, 5 dakika yeter.' },
    { title: '🧴 Parlatma zamanı', message: 'Bir sprey, bir bez. Banyo pırıl pırıl!' },
  ],
  dishes: [
    { title: '🍽️ Bulaşık bekliyor', message: '{oda}: tezgâhı toplayıp bulaşıkları halledelim.' },
    { title: '🧽 Köpük partisi', message: 'Bulaşıklar bitince kahve benden!' },
  ],
  maintenance: [
    { title: '🔧 Ev bakımı', message: 'Kombi, filtre, dedektör… Küçük bakımlar büyük dertleri önler.' },
    { title: '🛠️ Usta Moka iş başında', message: 'Bakım listesinde sırası gelen bir iş var. Bakalım mı?' },
  ],
  plants: [
    { title: '🪴 Bitkiler susamış', message: '{oda}: yapraklar su istiyor. Sulama vakti!' },
    { title: '💧 Yeşil dostlar', message: 'Bitkilere biraz su, eve biraz hayat.' },
  ],
  trash: [
    { title: '🗑️ Çöp günü', message: 'Çöpü çıkaralım, ev hafiflesin.' },
    { title: '♻️ Hafifleyelim', message: 'Bir torba çöp, bir rahat nefes. Hadi kapıya kadar!' },
  ],
  rest: [
    { title: '🤒 Dinlenme modu', message: 'Sadece her gün yapılan işler görünüyor. Kendine iyi bak.' },
    { title: '🛌 Yavaş gidiyoruz', message: 'Bugün kendine iyi bak. Ev biraz bekleyebilir.' },
  ],
  checklist: [
    { title: '📋 Liste hazır', message: '{oda}: sıradaki işleri işaretleyerek gidelim.' },
    { title: '✅ Adım adım', message: 'Büyük temizlik küçük adımlardan oluşur. Bir tane işaretle!' },
  ],
  vacuuming: [
    { title: '🎶 Süpürge şarkısı', message: '{oda}: halılar ve köşeler için kısa bir süpürge turu.' },
    { title: '🌀 Vıııın!', message: 'Müziği aç, süpürgeyi al. 10 dakikada biter.' },
  ],
  sparkling_complete: [
    { title: '✨ Ev pırıl pırıl', message: 'Bugünün işleri bitti. Şimdi kahve ve keyif zamanı!' },
    { title: '🌟 Görev tamam', message: 'Her şey yerli yerinde. Seninle gurur duyuyorum!' },
  ],
};

/** Oda türüne göre iş pozu (o odada bekleyen iş varken). */
export const ROOM_POSE: Record<RoomType, MokaChore> = {
  yatak: 'laundry',
  mutfak: 'dishes',
  banyo: 'mirror',
  salon: 'vacuuming',
  calisma: 'checklist',
  cocuk: 'dusting',
  antre: 'sweeping',
  balkon: 'plants',
  camasir: 'laundry',
};
