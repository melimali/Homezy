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
export type Task = { id: string; name: string; every: number; last: number | null };

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
};

/* ---------- puan, seri, spor ve günlük ---------- */

/** Puan getiren işler. `gorev`: bir rutin ya da bitki; her biri günde bir kez puan verir. */
export type PlayKind = 'gorev' | 'spor' | 'gunluk';

/** "YYYY-MM-DD", telefonun yerel günü. */
export type DayKey = string;

export type PlayEvent = { kind: PlayKind; ref: string; day: DayKey };

export type SportEntry = { id: string; day: DayKey; type: string; min: number; at: number };

export type JournalEntry = { text: string; mood: string | null; at: number };

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
};

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
};

export type TaskList = 'tasks' | 'plants';

export type StatusKind = 'late' | 'today' | 'ok';
export type TaskStatus = { k: StatusKind; diff: number; label: string };

export type TaskRef = { t: Task; rid: string; list: TaskList; s: TaskStatus };

export type Notice = { k: StatusKind; rid: string; title: string; text: string };
