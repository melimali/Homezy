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
  /** "HH:MM" */
  time: string;
  routine: boolean;
  stock: boolean;
  laundry: boolean;
  /** Akşam, o gün hiçbir şey yapılmadıysa "serin bozulmasın" hatırlatması. */
  streak: boolean;
  /** Spor hatırlatması. */
  sport: boolean;
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

export type HouseTheme = 'gunduz' | 'gece' | 'kis' | 'sonbahar';

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
  /** Harcanabilir puan. Hesap varsa sunucudaki değer esas alınır. */
  points: number;
  /** Bir şey yapılan (puan kazanılan) günler, sıralı. Seri ve evin inşaatı bundan hesaplanır. */
  days: DayKey[];
  /** Mağazadan alınan eşyaların kimlikleri. */
  owned: string[];
  /** Eşya kimliği → konduğu oda (null: depoda). */
  placed: Record<string, string | null>;
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
};

/** Bir evin kendine ait kısmı. Puan, seri, günlük ve ayarlar bütün evlerde ortak. */
export type HomeData = {
  cols: number;
  rows: number;
  cells: (string | null)[];
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

export type AppState = {
  v: 1;
  setup: boolean;
  cols: number;
  rows: number;
  /** Satır satır, `cols * rows` uzunluğunda; her hücrede oda id'si ya da null. */
  cells: (string | null)[];
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
