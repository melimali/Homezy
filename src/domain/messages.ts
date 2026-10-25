import type { RoomType, StatusKind, StockItem } from './types';

/**
 * Bildirimlerdeki tatlı, emojili mesajlar. Aynı gün aynı iş için hep aynı mesaj çıkar
 * (ekran her yenilendiğinde değişmesin), ertesi gün başka bir tanesi gelir.
 */

/** Metinden ve günden sabit bir sayı üretir; havuzdan mesaj seçmek için. */
function pick<T>(pool: readonly T[], key: string, now: number): T {
  const day = Math.floor(now / 864e5);
  let h = day;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
  return pool[Math.abs(h) % pool.length];
}

/** İş adında geçen kelimeye göre mesajlar. İlk eşleşen kullanılır. */
const TASK_LINES: [RegExp, string[]][] = [
  [/bulaşık/i, ['Tabaklar köpük partisi bekliyor 🫧🍽️', 'Lavabo biraz kalabalık, bulaşıklar sırada 🧽', 'Bulaşıklar parıl parıl olmak istiyor ✨']],
  [/tezgah/i, ['Tezgaha minik bir sil-süpür yeter 🧽✨', 'Tezgah ışıl ışıl olunca mutfak gülümser 😊']],
  [/çöp/i, ['Çöp poşeti kapıya kadar eşlik bekliyor 🗑️👋', 'Çöpü çıkarma vakti, burnun teşekkür edecek 👃💐']],
  [/buzdolabı/i, ['Buzdolabı içini bir tazelemek istiyor 🧊🧽', 'Raflarda unutulmuş bir şey var mı? Bir bakalım 🔍🥶']],
  [/fırın/i, ['Fırın biraz parlamak istiyor 🔥✨', 'Fırına küçük bir bakım, kekler daha güzel kabarır 🧁']],
  [/çarşaf/i, ['Mis kokulu çarşaflar seni bekliyor 🛏️🌸', 'Taze çarşafla uyku bir başka olur 😴💤']],
  [/yastık|yorgan/i, ['Yastıklar biraz güneş görmek istiyor ☀️🛏️', 'Yorgan bir havalansın, kabarsın ☁️']],
  [/havalandır/i, ['Pencereyi aç, oda derin bir nefes alsın 🌬️🪟', 'Biraz taze hava herkese iyi gelir 🍃']],
  [/toz/i, ['Tozlar saklambaç oynuyor, bul onları 🪶✨', 'Bir toz bezi turu, raflar parlasın 🧹']],
  [/süpür/i, ['Süpürge dans pistine çıkmak istiyor 🧹💃', 'Yerlerde minik kırıntılar var, bir tur atalım 🧹']],
  [/yer silme|sil$/i, ['Yerler parlasın, çorapla kayalım 🧦✨', 'Bir paspas turu, yerler mis gibi olsun 🫧']],
  [/lavabo|ayna/i, ['Ayna seni daha net görmek istiyor 🪞✨', 'Lavaboya küçük bir parlatma 🚰💧']],
  [/klozet/i, ['Banyo tazelik bekliyor 🚽🫧', 'Minik bir banyo temizliği, büyük ferahlık 🌼']],
  [/duş|küvet/i, ['Duş köşesi parlamak için sabırsızlanıyor 🚿✨', 'Küvete bir köpük banyosu yaptıralım 🛁🫧']],
  [/havlu/i, ['Yumuşacık temiz havlular zamanı 🧺☁️', 'Havlular değişsin, banyo mis koksun 🌸']],
  [/cam|korkuluk/i, ['Camlar parlasın, güneş içeri dolsun ☀️🪟', 'Pencereden manzara daha net görünsün 🌤️']],
  [/koltuk|minder/i, ['Minderleri bir kabart, koltuk sarılmak istiyor 🛋️🤗', 'Koltuk minderleri biraz tazelensin ☁️']],
  [/oyuncak/i, ['Oyuncaklar evlerine dönmek istiyor 🧸🏠', 'Toplama oyunu zamanı! En hızlı kim? 🏁🧩']],
  [/çamaşır yıka/i, ['Çamaşır makinesi seni özledi 🧺🫧', 'Bir makine çamaşır, mis gibi koku 🌸']],
  [/ütü/i, ['Ütü kırışıklıklarla randevu bekliyor 👕♨️', 'Biraz ütü, kıyafetler dimdik 💁']],
  [/filtre/i, ['Makine filtresi bir temizlik istiyor 🔧🫧']],
  [/ayakkabı/i, ['Ayakkabılar sıraya girmek istiyor 👟👞', 'Ayakkabılık bir düzene kavuşsun 👠✨']],
  [/masa/i, ['Masa ferahlasın, fikirler uçuşsun 💡🗂️', 'Çalışma masana minik bir düzen 📚✨']],
  [/kablo|şarj/i, ['Kablolar birbirine dolanmış olabilir 🔌🧶', 'Şarj köşesine bir düzen verelim 🔋']],
  [/kombi|petek/i, ['Kombi kışa hazır mı? Küçük bir kontrol 🔥🔧', 'Petekler ısınsın, ev mis gibi sıcacık olsun ♨️']],
  [/klima/i, ['Klima nefes alsın, filtresi temizlensin ❄️🧽', 'Temiz filtre, ferah hava 🌬️']],
  [/arıtma/i, ['Su arıtmanın filtresi değişim istiyor 💧🔧']],
  [/dedektör/i, ['Dedektörün düğmesine bir bas, bip desin 🔔🙂', 'Duman dedektörü hâlâ nöbette mi? Bir test edelim 🚨']],
  [/sayaç/i, ['Sayaçların fotoğrafını çek, faturayı karşılaştır 📸🔌', 'Ay doldu, sayaç fotoğrafı zamanı 📸💧']],
  [/mama|tüy|battaniye/i, ['Patili dostun teşekkür eder 🐾💛', 'Minik dostun için minik bir iş 🐶🐱']],
  [/halı/i, ['Halı biraz ilgi istiyor 🧶🧹']],
];

const ROOM_LINES: Record<RoomType, string[]> = {
  yatak: ['Yatak odan biraz ilgi istiyor 🛏️💕'],
  mutfak: ['Mutfak seni bekliyor 🍳😊'],
  banyo: ['Banyo biraz tazelik istiyor 🛁🫧'],
  salon: ['Salon biraz sevgi istiyor 🛋️💛'],
  calisma: ['Çalışma köşen minik bir düzen istiyor 💻✨'],
  cocuk: ['Çocuk odası biraz ilgi bekliyor 🧸💛'],
  antre: ['Antre misafirleri güzel karşılasın 🚪😊'],
  balkon: ['Balkon biraz sevgi bekliyor 🌿☀️'],
  camasir: ['Çamaşır köşesi seni bekliyor 🧺'],
};

const WATER_LINES = [
  'susadı, bir bardak su lütfen 💧🌱',
  'su içmek istiyor, yaprakları sana el sallıyor 🌿👋',
  'için sulama günü, büyümeye devam 🌱✨',
];

const CARE_LINES = ['Evin küçük bir bakım istiyor 🔧🏡', 'Minik bir bakım, uzun ömürlü bir ev 🛠️✨'];

/** Rutin, bitki ya da ev bakımı bildirimi. `type` null ise ev bakımı. */
export function taskLine(o: { name: string; type: RoomType | null; plant: boolean; k: StatusKind; key: string; now: number }) {
  if (o.plant) return `${o.name} ${pick(WATER_LINES, o.key, o.now)}`;
  const pool = TASK_LINES.find(([re]) => re.test(o.name))?.[1] ?? (o.type ? ROOM_LINES[o.type] : CARE_LINES);
  return pick(pool, o.key, o.now);
}

/** Durumu kısa ve yumuşak anlatan ek. */
export function statusTail(k: StatusKind, diff: number, never: boolean) {
  if (k === 'late') return diff <= -7 ? `${-diff} gündür bekliyor 🥺` : `${-diff} gün gecikti ⏰`;
  if (never) return 'Hadi ilk kez yapalım 🌟';
  return 'Bugün yapılacak 📅';
}

const ITEM_ICON: [RegExp, string][] = [
  [/süt/i, '🥛'], [/yumurta/i, '🥚'], [/peynir/i, '🧀'], [/ekmek/i, '🍞'], [/domates/i, '🍅'],
  [/biber/i, '🫑'], [/yoğurt/i, '🥣'], [/tereyağ/i, '🧈'], [/meyve|elma/i, '🍎'], [/muz/i, '🍌'],
  [/tavuk|et\b/i, '🍗'], [/tuvalet/i, '🧻'], [/şampuan|krem/i, '🧴'], [/diş/i, '🪥'], [/sabun/i, '🧼'],
  [/deterjan|yumuşatıcı|leke/i, '🫧'], [/kahve/i, '☕'], [/çay/i, '🍵'], [/su\b/i, '💧'],
];

export const itemIcon = (name: string) => ITEM_ICON.find(([re]) => re.test(name))?.[1] ?? '🛒';

const list = (xs: StockItem[]) => {
  const names = xs.map(x => `${x.name} ${itemIcon(x.name)}`);
  return names.length <= 3 ? names.join(', ') : `${names.slice(0, 3).join(', ')} ve ${names.length - 3} ürün daha`;
};

/** Biten ürünler. Mutfakta buzdolabı, banyo ve çamaşır odasında dolap dili. */
export function stockLine(out: StockItem[], fridge: boolean, key: string, now: number) {
  const ends = fridge
    ? ['Buzdolabı seni özledi 🥺 Alışveriş listesine ekledim 🛒', 'Market zamanı! Listen hazır 🛍️', 'Raflar biraz boşaldı, tamamlayalım 🧺']
    : ['Dolap boşalıyor, alışveriş listene ekledim 🛒', 'Bir sonraki market turunda unutmayalım 🛍️'];
  return `${list(out)} bitti. ${pick(ends, key, now)}`;
}

export function stockTitle(room: string, n: number, fridge: boolean) {
  return fridge ? `🧊 ${room} · ${n} ürün bitti` : `🛒 ${room} · ${n} ürün bitti`;
}

export function photoLine(daysAgo: number | null, key: string, now: number) {
  if (daysAgo == null) return 'Buzdolabının ilk fotoğrafını çekelim mi? Markette çok işine yarar 📸🧊';
  return pick(
    [`Son fotoğraf ${daysAgo} gün önceydi. Buzdolabına bir göz atalım mı? 📸👀`, `Buzdolabı yeni bir poz vermek istiyor 📸😊 (son fotoğraf ${daysAgo} gün önce)`],
    key,
    now,
  );
}

export function laundryLine(n: number, key: string, now: number) {
  return pick(
    [`${n} parça kirli birikti, çamaşır makinesi göz kırpıyor 😉🫧`, `Kirli sepeti doldu taştı 🧺 Bir makine çalıştıralım mı?`, `${n} kıyafet yıkanmayı bekliyor, mis kokular yolda 🌸`],
    key,
    now,
  );
}

/** Sabah özeti başlığının sonuna eklenen, iş sayısına göre tatlı bir cümle. */
export function summaryTail(urgent: number) {
  if (!urgent) return 'Evde birkaç minik hatırlatma var 💌';
  if (urgent === 1) return 'Bugün seni 1 minik iş bekliyor 🐣';
  if (urgent <= 4) return `Bugün ${urgent} iş seni bekliyor 💪`;
  return `Bugün ${urgent} iş var, adım adım halledelim 🐢✨`;
}

/** Akşam seri hatırlatması (o gün hiçbir şey yapılmadıysa). */
export function streakLine(streak: number, built: boolean, key: string, now: number) {
  if (streak > 0)
    return pick(
      [
        `🔥 ${streak} günlük serin bozulmasın! Minik bir iş yeter 💪`,
        `Evin seni bekliyor 🏡 ${streak} günlük seriyi sürdürelim mi?`,
        `Bugün daha bir şey yapmadın 🥺 Tek bir iş, ev tozlanmasın 🧹`,
      ],
      key,
      now,
    );
  if (built)
    return pick(['Evin seni özledi 🏡 Minik bir iş yeter, tozlanmasın 🧹', 'Bugün daha bir şey yapmadın 🥺 Yeni bir seri başlatalım mı? 🔥'], key, now);
  return pick(
    ['Bugün bir iş tamamla, evinin inşaatı başlasın 🏗️', 'Minik bir adım, büyük bir ev 🪵✨ Bugün bir iş yapalım mı?'],
    key,
    now,
  );
}

/** Spor hatırlatması. */
export function sportLine(key: string, now: number) {
  return pick(
    [
      'Spor zamanı! Ayakkabılar seni bekliyor 👟💨',
      'Biraz hareket iyi gelir 🧘 Hazır mısın?',
      '15 dakikalık bir yürüyüş bile seriyi sürdürür 🚶✨',
      'Kaslar uyanmak istiyor 💪😄',
    ],
    key,
    now,
  );
}

/** Pazar akşamı haftalık özet. */
export function weeklyLine(o: { done: number; days: number; score: number; best: string | null }) {
  if (!o.done) return 'Bu hafta sakin geçti 🌙 Yeni haftaya minik bir işle başlayalım mı?';
  const best = o.best ? ` En parlak oda: ${o.best} ✨` : '';
  return `Bu hafta ${o.done} iş yaptın, ${o.days} gün evine vakit ayırdın 💪 Ev puanı %${o.score}.${best}`;
}

/**
 * Akşam hatırlatmasının başlığı ve metni. `idle`: o akşam hiçbir şey yapılmazsa evin kaç gündür
 * bekleyeceği (dondurma hakları düşülmüş). `away`: son bir şey yapılan günden beri geçen gün.
 * Uzun süre gelmeyene ceza dili yerine "birlikte toparlayalım" denir.
 */
export function eveningNudge(o: { streak: number; idle: number; away: number | null; built: boolean; key: string; now: number }) {
  const { streak, idle, away, built, key, now } = o;
  if (away != null && away >= 3)
    return {
      title: pick(['🤗 Evin seni özledi', '🏡 Kaldığın yerden devam', '💛 Seni bekliyoruz'], key, now),
      body: pick(
        [
          'Ceza yok, kaldığın yerden devam. Tek bir minik iş seç, evini birlikte toparlayalım 🏡',
          'Bir iş yap, tamir hemen başlasın 🔨 Yavaş yavaş, birlikte.',
          '5 dakikalık tek bir iş yeter. Gerisini adım adım hallederiz 🐢✨',
        ],
        key,
        now,
      ),
    };
  if (idle >= 2) return { title: '🛟 Son şans: yarın evin çökmeye başlıyor', body: 'Bu akşam tek bir iş yap, evin kurtulsun. Minik bir iş bile yeter 💪' };
  if (idle === 1) return { title: '🌫️ Evin tozlandı', body: 'Bu akşam bir iş yapmazsan yarın duvarlarda çatlaklar çıkar 😟 Bir dakikalık iş yeter.' };
  return { title: streak ? `🔥 ${streak} günlük seri` : '🏡 Evin seni bekliyor', body: streakLine(streak, built, key, now) };
}

/** Haftalık özet kartı paylaşılırken (ya da görsel paylaşılamazsa) giden metin. */
export function weekShareText(o: { done: number; days: number; streak: number }) {
  const streak = o.streak > 1 ? ` 🔥 ${o.streak} günlük serim var.` : '';
  return `Bu hafta Layfapp ile ${o.done} ev işi yaptım, ${o.days} gün evime vakit ayırdım 💪${streak} Evini topla, evin büyüsün 🏡`;
}
