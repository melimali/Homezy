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
};

export type TaskList = 'tasks' | 'plants';

export type StatusKind = 'late' | 'today' | 'ok';
export type TaskStatus = { k: StatusKind; diff: number; label: string };

export type TaskRef = { t: Task; rid: string; list: TaskList; s: TaskStatus };

export type Notice = { k: StatusKind; rid: string; title: string; text: string };
