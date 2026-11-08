import type { Garden } from './garden';
import type { PersonaId } from './items';
import type { CheckIn, DailyAsk } from './mood';
import type { HouseLook } from './look';
export type RoomType =
  | 'yatak'
  | 'mutfak'
  | 'banyo'
  | 'salon'
  | 'calisma'
  | 'cocuk'
  | 'antre'
  | 'balkon'
  | 'camasir';

export type RoomModule = 'gardirop' | 'buzdolabi' | 'stok' | 'bitki' | null;

export type Room = { id: string; type: RoomType; name: string };

/** Rutin, bitki ya da ev bakımı işi: her `every` günde bir yapılır. */
export type Task = {
  id: string;
  name: string;
  every: number;
  last: number | null;
  /** Aile paylaşımında bu işi kimin yapacağı (üyenin adı). */
  who?: string | null;
  /** Tahmini süre (dakika). Yoksa addan tahmin edilir (`taskMin`). */
  min?: number;
  /** Ertelendiyse ya da bu sefer atlandıysa yeni vade günü (günün başlangıcı). "Tamamladım" siler. */
  snooze?: number | null;
  /** Kurulum sorusundan gelen işin etiketi (ör. `p:evcil`); cevap "hayır" olunca bu işler kalkar. */
  tag?: string | null;
  /** Sayaç fotoğrafı gibi fotoğrafla yapılan işlerde son fotoğraf (telefondaki dosya). */
  photo?: string | null;
};

export type ClothState = 'temiz' | 'kirli' | 'utu';
/** Yıkama türü: aynı türden 3 parça bir makine dolusu sayılır. */
export type WashType = 'beyaz' | 'renkli' | 'koyu' | 'hassas';
export type Cloth = {
  id: string;
  name: string;
  cat: string;
  state: ClothState;
  wash?: WashType;
  /** Son giyildiği an (kirliye geçtiği an). */
  worn?: number | null;
  /** Dolaba eklendiği an. */
  added?: number;
  /** Kombin önerisi için (src/domain/style.ts). Fotoğraf taramasından gelir; yoksa addan tahmin edilir. */
  kind?: string;
  color?: string;
  hex?: string;
  fabric?: string;
  pattern?: 'düz' | 'desenli';
};

export type StockLevel = 'var' | 'az' | 'yok';
/** `exp`: son kullanma tarihi (günün başlangıcı), sadece buzdolabı ürünlerinde. */
export type StockItem = { id: string; name: string; lvl: StockLevel; exp?: number | null };

export type WardrobeFilter = 'all' | ClothState;

export type RoomExtras = {
  wardrobe?: Cloth[];
  filter?: WardrobeFilter;
  photo?: string | null;
  photoAt?: number | null;
  stock?: StockItem[];
  plants?: Task[];
};

export type Settings = {
  /** Kademeli başlangıç kapalı: tüm işler baştan görünür ("Hepsini aç"). Yoksa/false: aşama aşama açılır (src/domain/ramp.ts). */
  rampOff?: boolean;
  /** Disiplin sorularından: "neden" (kisilik.ts WHY_LINE), "mola anı" (CUE_LABEL) ve "engel" (quit) cevap anahtarları. */
  why?: string;
  cue?: string;
  obstacle?: string;
  /** Moka'nın kutladığı en son aşama (1…5). Yeni aşamaya geçince kutlama kartı bir kere çıkar. */
  rampSeen?: number;
  /** "Hafif gün": bu gün anahtarı bugünse Bugün sadece 1-2 iş gösterir; gün yine de sayılır. */
  lightDay?: string | null;
  /** If-then niyet: "ne zaman / nerede / ne" (src/domain/niyet.ts). Bir güne bağlı; başka günde yok sayılır. */
  intent?: { day: string; when: string; task: string; place: string } | null;
  /** Tek oda modu: doluysa işler, bildirimler ve puan sadece bu odaya göre (oda kimliği). Yoksa tüm ev. */
  solo?: string | null;
  /** "HH:MM" */
  time: string;
  routine: boolean;
  stock: boolean;
  laundry: boolean;
  /** Akşam, o gün hiçbir şey yapılmadıysa "serin bozulmasın" hatırlatması. */
  streak: boolean;
  /** Spor hatırlatması. */
  sport: boolean;
  /** Akşam okuma hedefi hatırlatması (kitap ya da okuma kaydı varsa). */
  read: boolean;
  /** Gün içinde su hatırlatması (12:00, 17:00), hedef tutulmadıysa. */
  water: boolean;
  /** Yatış saatinden 30 dk önce uyku hatırlatması. */
  sleepRemind: boolean;
  /** "HH:MM" */
  sportTime: string;
  /** Spor günleri: 0 pazar … 6 cumartesi. */
  sportDays: number[];
  /** Premium: hatırlatmaları kişinin alışkanlığına göre ayarla (bkz. notifications/schedule.ts). */
  smart: boolean;
  /** Evin görünümü. Gündüz dışındakiler Premium. */
  theme: HouseTheme;
  /** Premium: kişisel antrenman planı. null: plan yok. */
  workout: Workout | null;
  /** Faturalar, garanti belgeleri, ev bakımı ve mevsimlik işler. */
  bills: boolean;
  /** Buzdolabındaki ürünlerin son kullanma tarihleri. */
  expiry: boolean;
  /** İlaç hatırlatmaları (vakit ve nazik ikinci hatırlatma). */
  meds: boolean;
  /** Evcil hayvan bakım hatırlatmaları (mama, yıkama, aşı…). */
  pets: boolean;
  /** Cumartesi sabahı alışveriş listesi hatırlatması. */
  shop: boolean;
  /** Pazar akşamı haftalık özet. */
  weekly: boolean;
  /** Esnek zamanlama: zamanı geçen iş, sıklığının yarısı kadar gün daha gecikmiş sayılmaz. */
  flex: boolean;
  /** Bir oda tertemiz olunca kutlama. */
  celebrate: boolean;
  /** Dokunuş, iş tamamlama ve kutlama sesleri ile titreşim. */
  sound: boolean;
  /** Bugünün işleri için ayrı bildirim; bildirimden "Yaptım" / "Yapmadım" diye cevaplanır. */
  actions: boolean;
  language: 'tr' | 'en' | 'de' | 'es' | 'ja' | 'ko' | 'fr' | 'pt' | 'ar';
};

/* ---------- ev profili, modlar, faturalar, garantiler ---------- */

/** Kurulum soruları (src/domain/home.ts, `PROFILE`). */
export type ProfileKey = 'evcil' | 'bulasik' | 'hali' | 'kombi' | 'klima' | 'aritma' | 'bitki';
export type HomeProfile = { asked: boolean } & Record<ProfileKey, boolean>;

export type ModeKind = 'misafir' | 'tatil' | 'yogun' | 'bayram';
export type CheckItem = { id: string; name: string; done: boolean };
/** Etkin mod. `since`: başladığı an; tatilde rutinler bu anda donar. `list`: bayram temizliği listesi. */
export type Mode = { k: ModeKind; since: number; list?: CheckItem[] };

/** Fatura: her ayın `day`. günü ödenir. `paid`: en son ödendi işaretlenen ay ("YYYY-MM"). */
export type Bill = { id: string; name: string; day: number; paid: string | null };

/** Garanti belgesi: `end` bitiş günü. */
export type Warranty = { id: string; name: string; end: number };

export type HouseTheme = 'gunduz' | 'gece' | 'kis' | 'sonbahar' | 'cottage' | 'minimal' | 'lavanta';

export type WorkoutGoal = 'form' | 'kilo' | 'guc' | 'esneklik';
export type WorkoutLevel = 'yeni' | 'orta' | 'ileri';
export type Workout = { goal: WorkoutGoal; level: WorkoutLevel };

/* ---------- puan, seri, spor ve günlük ---------- */

/** Puan getiren işler. `gorev`: bir rutin ya da bitki; her biri günde bir kez puan verir. */
export type PlayKind = 'gorev' | 'spor' | 'gunluk';

/** "YYYY-MM-DD", telefonun yerel günü. */
export type DayKey = string;

/** Sunucuya gidecek kayıt: puan alan bir iş ya da `dondur` (o gün seri dondurma hakkıyla korundu). */
export type PlayEvent = { kind: PlayKind | 'dondur'; ref: string; day: DayKey };

export type SportEntry = { id: string; day: DayKey; type: string; min: number; at: number };

export type JournalEntry = {
  text: string;
  mood: string | null;
  at: number;
  /** Premium: günün fotoğrafı (telefondaki dosya). */
  photo?: string | null;
  /** Fotoğrafın buluttaki yedeği (Supabase Storage yolu). */
  photoKey?: string | null;
};

export type Play = {
  /** Sadece sahip hesapta gizli araçla ayarlanır: evin seviyesini elle belirler (null: gerçek hesap). */
  debugLevel?: number | null;
  /** Harcanabilir puan. Hesap varsa sunucudaki değer esas alınır. */
  points: number;
  /** Bir şey yapılan (puan kazanılan) günler, sıralı. Seri ve evin inşaatı bundan hesaplanır. */
  days: DayKey[];
  /** Mağazadan alınan eşyaların kimlikleri. */
  owned: string[];
  /** Eşya kimliği → konduğu oda (null: depoda). */
  placed: Record<string, string | null>;
  /** Eşya kimliği → konduğu bloğun sırası (`cells` indeksi). Yoksa oda içinde boş bir yere kendisi dizilir. */
  spots?: Record<string, number>;
  /** Evin görünümü: zemin, duvar, pencere, dış cephe (src/domain/look.ts). */
  look?: HouseLook;
  /** O gün puan alınmış işler: `gorev:<id>`, `spor`, `gunluk` → gün. Günde bir kuralı için. */
  awarded: Record<string, DayKey>;
  /** Gün → o gün tamamlananların kısa adları (günlükte "bugün neler yaptım"). */
  log: Record<DayKey, string[]>;
  sport: SportEntry[];
  journal: Record<DayKey, JournalEntry>;
  /** Sunucuya henüz yazılamamış puanlar (internet yokken). */
  pending: PlayEvent[];
  /** Kutlaması gösterilmiş en yüksek ev seviyesi. */
  celebrated: number;
  /** Seri dondurma hakkıyla korunan (kaçırıldığı hâlde seriyi bozmayan) günler. */
  frozen: DayKey[];
  /** Son tamamlanan işlerin günün kaçıncı dakikasında yapıldığı (akıllı bildirimler için, en fazla 40). */
  times: number[];
  /** "Tekrar hoş geldin" karşılamasının en son kapatıldığı gün. */
  welcomed: DayKey | null;
  /** Haftalık özet kartının en son açıldığı gün (ana ekrandaki "özetin hazır" şeridi için). */
  weekSeen: DayKey | null;
  /** Moka'nın bahçesi: saksılar, albüm, bugünün gübreleri (src/domain/garden.ts). */
  garden: Garden;
  /** Evin seçili kişiliği. Sıcak ücretsiz; diğerleri puanla bir kere alınır (`owned` içinde `kisilik_<id>`). */
  persona: PersonaId;
  /** Günün ilk açılışındaki "Bugün nasıl hissediyorsun?" cevapları, gün → cevap (src/domain/mood.ts). */
  checkins: Record<DayKey, CheckIn>;
  /** Günlük iki soru: 1. açılış "nasılsın", 2. açılış "evde misin" (src/domain/mood.ts `stageOf`). */
  ask?: DailyAsk;
  /** Moka'nın seviyesi ve statları (src/domain/mokaLevel.ts). */
  moka: MokaGrowth;
  /** Moka sohbetinde "yarın için not al" ile alınan notlar (src/domain/chat.ts). */
  notes: MokaNote[];
  /** Kişisel gelişim: kitaplık, izleme listesi, okuma hedefi, öğrenme (src/domain/growth.ts). */
  growth: Growth;
  /** Alışkanlık paketleri, su ve uyku takibi (src/domain/habits.ts). */
  habits: Habits;
};

/** Su (bardak), uyku (uyanılan gün → kayıt) ve eklenen alışkanlık paketleri. */
export type Habits = {
  water: Record<DayKey, number>;
  waterGoal: number;

  sleep: Record<DayKey, { bed: string; wake: string; min: number }>;
  /** Hedef uyku süresi, saat. */
  sleepGoal: number;
  /** Son seçilen yatış ve kalkış saati "HH:MM". */
  bedtime: string;
  wake: string;
  packs: string[];
};

/** Kitaplıktaki bir kitap. `read` okunan sayfa, `done` bittiği gün. */
export type Book = { id: string; title: string; author: string; pages: number; read: number; added: number; done: DayKey | null; note?: string };
export type WatchKind = 'film' | 'dizi' | 'belgesel' | 'podcast';
/** İzleme listesindeki bir film, dizi, belgesel ya da podcast. `seen`: izlendiği gün. */
export type Watch = {
  id: string; title: string; kind: WatchKind; added: number; seen: DayKey | null; rating?: number; note?: string;
  /** Dizi: kaldığın sezon ve son izlediğin bölüm. Film / belgesel / podcast: `pct` kaldığın yer (%). */
  season?: number; ep?: number; pct?: number;
};
/** Bir okuma kaydı: dakika ve (varsa) sayfa. */
export type ReadLog = { day: DayKey; min: number; pages: number; book: string | null };
/** O gün yapılan öğrenme etkinlikleri. */
export type LearnDay = { word?: boolean; lesson?: string; breath?: number };
export type Growth = {
  /** Günlük okuma hedefi, dakika. */
  goalMin: number;
  reads: ReadLog[];
  books: Book[];
  watch: Watch[];
  /** Hedefin tutturulduğu günler (seriye ve rozetlere bakılır). */
  goalDays: DayKey[];
  /** Moka'nın bugünkü önerisi; `shuffles`: bugün kaç kez başka öneri istendi, `saved`: listeye eklendi. */
  pick: { day: DayKey; id: string; shuffles: number; saved: boolean } | null;
  learn: Record<DayKey, LearnDay>;
  /** Kazanılan Moka rozetleri → kazanıldığı gün. */
  badges: Record<string, DayKey>;
  /** Kutlaması gösterilen son rozet sayısı olmasın diye: yeni rozetler bir kere söylenir. */
  seenBadges: string[];
  /** İsteğe bağlı bonus öneriler: gün → kategori → yapıldı / atlandı. Puan ve seriyi etkilemez. */
  bonus: Record<DayKey, Record<string, 'done' | 'skip' | 'add'>>;
  /** Moka Uçuş oyunu: en iyi skor ve günlük oyun sayısı. Puan / XP vermez. */
  fun?: { best: number; day: DayKey; plays: number };
};

export type MokaNote = { id: string; day: DayKey; text: string; at: number };

export type MokaStat = 'zeka' | 'disiplin' | 'saglik';
/** Bir odak (Pomodoro) oturumu: gün, dakika, ne için, bitiş zamanı. */
export type FocusSession = { day: DayKey; min: number; topic: string; at: number };
export type MokaGrowth = {
  /** Stat başına toplam deneyim. Seviye üç statın toplamından hesaplanır. */
  xp: Record<MokaStat, number>;
  /** Gün → stat → o gün kazanılan exp (günlük sınırlar için, sadece bugün tutulur). */
  today: { day: DayKey; xp: Record<MokaStat, number> };
  /** Kutlaması gösterilmiş en yüksek Moka seviyesi. */
  seen: number;
  /** Tamamlanan odak oturumları (son 200). */
  focus: FocusSession[];
};

/** Bir evin kendine ait kısmı. Puan, seri, günlük ve ayarlar bütün evlerde ortak. */
export type HomeData = {
  cols: number;
  rows: number;
  cells: (string | null)[];
  /** 2. kat (dubleks, Premium): `cells` ile aynı boyutta. null/yok: tek katlı ev. */
  cells2?: (string | null)[] | null;
  rooms: Record<string, Room>;
  order: string[];
  tasks: Record<string, Task[]>;
  mod: Record<string, RoomExtras>;
  home: HomeProfile;
  mode: Mode | null;
  care: Task[];
  bills: Bill[];
  warranties: Warranty[];
  seasonal: Record<string, number>;
};

/** Premium: şu an açık olmayan diğer evler (yazlık, iş yeri…). */
export type SavedHome = HomeData & { id: string; name: string; setup: boolean };

/** İlaç takibi: sadece telefonda tutulur, buluta yedeklenmez (sağlık verisi). `days`: boşsa her gün, değilse 0 pazar … 6 cumartesi. */
export type Med = { id: string; name: string; dose: string; times: string[]; days: number[]; start: number;
  /** 'takviye': vitamin, mineral vb. Yoksa ilaç. */
  kind?: 'ilac' | 'takviye' };
export type MedMark = { s: 'taken' | 'skipped'; at: number };
/** Gün anahtarı → `ilacId@HH:MM` → işaret. */
export type MedLog = Record<string, Record<string, MedMark>>;

/** Evcil hayvan: kullanıcının eklediği bakım işleri (mama, yıkama, aşı…) ve son yapılma zamanları. */
export type PetKind = 'kedi' | 'kopek' | 'kus' | 'balik' | 'diger';
/** `everyH`: kaç saatte bir. `last`: son yapılma (yoksa null, o zaman `start`'tan sayılır). `remind`: bildirim gelsin mi. */
export type PetItem = { id: string; name: string; emoji: string; everyH: number; last: number | null; start: number; remind: boolean };
export type Pet = { id: string; name: string; kind: PetKind; emoji?: string; items: PetItem[] };

/** Alışveriş listesi. `usual`: daha önce alınıp listeden temizlenenler (bitince tek dokunuşla tekrar eklenir). */
export type ShopCat = 'market' | 'temizlik' | 'ev' | 'evcil';
export type ShopItem = { id: string; name: string; cat: ShopCat; done: boolean; at: number };
export type ShopUsual = { name: string; cat: ShopCat };

export type AppState = {
  v: 1;
  setup: boolean;
  cols: number;
  rows: number;
  /** Satır satır, `cols * rows` uzunluğunda; her hücrede oda id'si ya da null. */
  cells: (string | null)[];
  /** 2. kat (dubleks, Premium): `cells` ile aynı boyutta, satır satır. null/yok: tek katlı ev. */
  cells2?: (string | null)[] | null;
  rooms: Record<string, Room>;
  order: string[];
  tasks: Record<string, Task[]>;
  mod: Record<string, RoomExtras>;
  settings: Settings;
  play: Play;
  /** Açık evin kimliği ve adı. */
  homeId: string;
  homeName: string;
  others: SavedHome[];
  home: HomeProfile;
  mode: Mode | null;
  /** Ev bakımı işleri (kombi, klima, dedektör, sayaç…); bir odaya bağlı değil. */
  care: Task[];
  bills: Bill[];
  warranties: Warranty[];
  /** Mevsimlik iş kimliği → en son yapıldığı yıl. */
  seasonal: Record<string, number>;
  meds: Med[];
  medLog: MedLog;
  pets: Pet[];
  shop: ShopItem[];
  shopUsual: ShopUsual[];
  /** İpucu kartını gizlediği gün (`dayKey`); ertesi gün yeniden görünür. */
  shopHide: string;
};

export type TaskList = 'tasks' | 'plants' | 'care';

export type StatusKind = 'late' | 'today' | 'ok';
export type TaskStatus = { k: StatusKind; diff: number; label: string };

export type TaskRef = { t: Task; rid: string; list: TaskList; s: TaskStatus };

/** `url` verilirse dokununca oraya gidilir; yoksa `rid` odasına. */
export type Notice = {
  k: StatusKind; rid: string; title: string; text: string; url?: string;
  /** Rutin ya da bitki hatırlatmasıysa işin kimliği ve listesi (bildirimden "Yaptım" için). */
  tid?: string; list?: TaskList;
};
