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

/** Rutin ya da bitki: her `every` günde bir yapılır. */
export type Task = {
  id: string;
  name: string;
  every: number;
  last: number | null;
  /** Aile paylaşımında bu işi kimin yapacağı (üyenin adı). */
  who?: string | null;
};

export type ClothState = 'temiz' | 'kirli' | 'utu';
export type Cloth = { id: string; name: string; cat: string; state: ClothState };

export type StockLevel = 'var' | 'az' | 'yok';
export type StockItem = { id: string; name: string; lvl: StockLevel };

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
};

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
};

export type TaskList = 'tasks' | 'plants';

export type StatusKind = 'late' | 'today' | 'ok';
export type TaskStatus = { k: StatusKind; diff: number; label: string };

export type TaskRef = { t: Task; rid: string; list: TaskList; s: TaskStatus };

export type Notice = { k: StatusKind; rid: string; title: string; text: string };
