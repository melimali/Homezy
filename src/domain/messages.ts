import type { RoomType, StatusKind, StockItem } from './types';

/**
 * Telsiz anonslarındaki mesajlar. Aynı gün aynı görev için hep aynı mesaj çıkar
 * (ekran her yenilendiğinde değişmesin), ertesi gün başka bir tanesi gelir.
 */

/** Metinden ve günden sabit bir sayı üretir; havuzdan mesaj seçmek için. */
function pick<T>(pool: readonly T[], key: string, now: number): T {
  const day = Math.floor(now / 864e5);
  let h = day;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
  return pool[Math.abs(h) % pool.length];
}

/** Görev adında geçen kelimeye göre telsiz anonsları. İlk eşleşen kullanılır. */
const TASK_LINES: [RegExp, string[]][] = [
  [/bulaşık/i, ['Tabak yığını barikata dönüştü, dağıtalım 🫧🍽️', 'Kirli tabak kokusu sürüyü çeker, lavaboya koş 🧽', 'Temiz tabak = morali yüksek sığınak ✨']],
  [/tezgah/i, ['Erzak tezgâhı steril kalmalı, bir sil-süpür 🧽', 'Tezgâhta kırıntı bırakma, fareler de hayatta kalmaya çalışıyor 🐀']],
  [/çöp/i, ['Çöpü çevre hattının dışına taşı, koku sürüyü çağırıyor 🗑️🧟', 'Çöp tahliyesi zamanı, burnun ve barikatlar teşekkür edecek 👃']],
  [/buzdolabı/i, ['Soğuk hava deposu kontrol bekliyor 🧊🧽', 'Raflarda bozulmuş erzak var mı? Kontaminasyon taraması 🔍']],
  [/fırın/i, ['Seyyar ocak bakım istiyor 🔥🔧', 'Fırını temizle, son ekmek tayınları yanmasın 🍞']],
  [/çarşaf/i, ['Dinlenme ranzasının çarşafı değişmeli 🛏️', 'Temiz çarşaf, nöbetten sonra derin uyku demek 😴']],
  [/yastık|yorgan/i, ['Yorganları havalandır, rutubet de bir düşman ☀️🛏️', 'Yastıklar güneş görsün, mantar ordusu geri çekilsin ☁️']],
  [/havalandır/i, ['Sığınağı havalandır, ama önce dürbünle etrafı kontrol et 🌬️🔭', 'Temiz hava filtresi devrede, pencereyi aç 🍃']],
  [/toz/i, ['Toz bulutu görüş mesafesini düşürüyor, temizle 🪶', 'Raflardaki tozu al, teçhizat paslanmasın 🧹']],
  [/süpür/i, ['Sektörü süpür, iz bırakma 🧹', 'Yerde cam kırığı ve kırıntı var, bir tarama turu 🧹']],
  [/yer silme|sil$/i, ['Zemini dezenfekte et, enfeksiyon riski sıfırlansın 🫧', 'Bir paspas turu, botlar kaymasın 🥾']],
  [/lavabo|ayna/i, ['Aynayı sil, ısırık izi kontrolü için net görmelisin 🪞', 'Lavaboyu arındır, su kaynağı temiz kalsın 🚰']],
  [/klozet/i, ['Arındırma sektörü bakım bekliyor 🚽🫧', 'Hijyen protokolü: klozet dezenfeksiyonu 🧪']],
  [/duş|küvet/i, ['Dekontaminasyon duşu parlamalı 🚿', 'Küveti temizle, acil su deposu olarak lazım olabilir 🛁']],
  [/havlu/i, ['Havluları değiştir, bakteriler sürü halinde geliyor 🧺', 'Temiz havlu, temiz hayatta kalan 🧼']],
  [/cam|korkuluk/i, ['Gözetleme camlarını sil, yaklaşan sürüyü erken gör 🔭🪟', 'Korkulukları kontrol et, tırmanan olmasın 🧗']],
  [/koltuk|minder/i, ['Komuta merkezinin minderlerini kabart, moral önemli 🛋️', 'Minderleri havalandır, nöbet arası şekerleme için 😴']],
  [/oyuncak/i, ['Çaylaklar teçhizatını toplasın, yerde tuzak gibi duruyor 🧸', 'Toplama tatbikatı! En hızlı kim? 🏁']],
  [/çamaşır yıka/i, ['Çamaşır birikti, 2 km\'den kokuyorsun 🧺🧟', 'Dekontaminasyon ünitesini çalıştır, kokun seni ele veriyor 🫧']],
  [/ütü/i, ['Kırışık üniforma moral bozar, ütüyü ısıt ♨️', 'Biraz ütü, keşif teçhizatı dimdik 💁']],
  [/filtre/i, ['Makine filtresi tıkanmış, ünite arıza vermeden temizle 🔧']],
  [/ayakkabı/i, ['Botları sıraya diz, alarmda 5 saniyede giyilmeli 🥾', 'Ayakkabılığı düzenle, kaçış yolu açık kalsın 🚪']],
  [/masa/i, ['Telsiz masasını topla, haritalar karışmasın 🗺️', 'Harekât masasına minik bir düzen 📻']],
  [/kablo|şarj/i, ['Kablolar dolanmış, acil durumda takılıp düşme 🔌', 'Bataryaları şarj et, telsiz susmasın 🔋']],
  [/kombi|petek/i, ['Isıtma sistemi kışa hazır mı? Donmak da ölümcül 🔥🔧', 'Petekleri kontrol et, sığınak sıcak kalsın ♨️']],
  [/klima/i, ['Hava filtresini temizle, spor sızmasın ❄️🧽', 'Temiz filtre, enfeksiyonsuz hava 🌬️']],
  [/arıtma/i, ['Su arıtma filtresini değiştir, içme suyu hayati 💧🔧']],
  [/dedektör/i, ['Dedektörü test et, bip demeli 🔔', 'Duman dedektörü hâlâ nöbette mi? Kontrol et 🚨']],
  [/sayaç/i, ['Jeneratör ve sayaç kayıtlarını al 📸🔌', 'Ay doldu, kaynak tüketim raporu zamanı 📸💧']],
  [/mama|tüy|battaniye/i, ['Sığınak köpeği de hayatta kalan, ona bak 🐾', 'Patili nöbetçin için minik bir görev 🐶🐱']],
  [/halı/i, ['Halı toz ve sporla dolu, bir silkele 🧶🧹']],
];

const ROOM_LINES: Record<RoomType, string[]> = {
  yatak: ['Dinlenme sektörü tahkimat bekliyor 🛏️🛡️'],
  mutfak: ['Erzak deposu kontrol istiyor 🥫'],
  banyo: ['Arındırma sektörü hijyen bekliyor 🧼'],
  salon: ['Komuta merkezi toparlanmalı 📻'],
  calisma: ['Telsiz odası düzen istiyor 📡'],
  cocuk: ['Çaylak sektörü bakım bekliyor 🧸'],
  antre: ['Giriş barikatını kontrol et 🚪🪵'],
  balkon: ['Gözetleme kulesi denetim bekliyor 🔭'],
  camasir: ['Dekontaminasyon ünitesi seni bekliyor 🧺'],
};

const WATER_LINES = [
  'susadı, tayından bir bardak su ayır 💧🌱',
  'kuruyor, bu sığınağın tek yeşili o 🌿',
  'için sulama günü, vitamin kaynağı büyüsün 🌱',
];

const CARE_LINES = ['Sığınak altyapısı bakım istiyor 🔧', 'Küçük bir onarım, uzun ömürlü bir sığınak 🛠️'];

/** Görev, bitki ya da sığınak bakımı anonsu. `type` null ise sığınak bakımı. */
export function taskLine(o: { name: string; type: RoomType | null; plant: boolean; k: StatusKind; key: string; now: number }) {
  if (o.plant) return `${o.name} ${pick(WATER_LINES, o.key, o.now)}`;
  const pool = TASK_LINES.find(([re]) => re.test(o.name))?.[1] ?? (o.type ? ROOM_LINES[o.type] : CARE_LINES);
  return pick(pool, o.key, o.now);
}

/** Durumu kısa anlatan ek. */
export function statusTail(k: StatusKind, diff: number, never: boolean) {
  if (k === 'late') return diff <= -7 ? `${-diff} gündür savunmasız 🧟` : `${-diff} gün gecikti ⚠️`;
  if (never) return 'İlk tahkimatı yapalım 🛡️';
  return 'Bugünkü görev 📻';
}

const ITEM_ICON: [RegExp, string][] = [
  [/süt/i, '🥛'], [/yumurta/i, '🥚'], [/peynir/i, '🧀'], [/ekmek/i, '🍞'], [/domates/i, '🍅'],
  [/biber/i, '🫑'], [/yoğurt/i, '🥣'], [/tereyağ/i, '🧈'], [/meyve|elma/i, '🍎'], [/muz/i, '🍌'],
  [/tavuk|et\b/i, '🍗'], [/tuvalet/i, '🧻'], [/şampuan|krem/i, '🧴'], [/diş/i, '🪥'], [/sabun/i, '🧼'],
  [/deterjan|yumuşatıcı|leke/i, '🫧'], [/kahve/i, '☕'], [/çay/i, '🍵'], [/su\b/i, '💧'],
];

export const itemIcon = (name: string) => ITEM_ICON.find(([re]) => re.test(name))?.[1] ?? '🎒';

const list = (xs: StockItem[]) => {
  const names = xs.map(x => `${x.name} ${itemIcon(x.name)}`);
  return names.length <= 3 ? names.join(', ') : `${names.slice(0, 3).join(', ')} ve ${names.length - 3} ürün daha`;
};

/** Tükenen erzak. Erzak deposunda soğuk hava dili, diğer sektörlerde ambar dili. */
export function stockLine(out: StockItem[], fridge: boolean, key: string, now: number) {
  const ends = fridge
    ? ['Erzak tükeniyor 🥫 Tedarik listesine ekledim 🎒', 'Keşif zamanı! Tedarik listen hazır 🗺️', 'Raflar boşaldı, sürü gelmeden tamamlayalım 🧟']
    : ['Ambar boşalıyor, tedarik listene ekledim 🎒', 'Bir sonraki keşif seferinde unutma 🗺️'];
  return `${list(out)} tükendi. ${pick(ends, key, now)}`;
}

export function stockTitle(room: string, n: number, fridge: boolean) {
  return fridge ? `🥫 ${room} · ${n} erzak tükendi` : `🎒 ${room} · ${n} malzeme tükendi`;
}

export function photoLine(daysAgo: number | null, key: string, now: number) {
  if (daysAgo == null) return 'İlk erzak taramasını yapalım mı? Keşifte hayat kurtarır 📸🥫';
  return pick(
    [`Son tarama ${daysAgo} gün önceydi. Erzak deposuna bir göz atalım mı? 📸👀`, `Ambar sayımı eskidi 📸 (son tarama ${daysAgo} gün önce)`],
    key,
    now,
  );
}

export function laundryLine(n: number, key: string, now: number) {
  return pick(
    [`${n} parça kontamine, 2 km'den kokuyorsun 🧟🫧`, `Kirli sepeti taştı 🧺 Sürü kokunu almadan bir makine çalıştır`, `${n} parça teçhizat dekontaminasyon bekliyor 🧼`],
    key,
    now,
  );
}

/** Sabah telsiz anonsunun başlığına eklenen, görev sayısına göre cümle. */
export function summaryTail(urgent: number) {
  if (!urgent) return 'Sığınakta birkaç küçük rapor var 📻';
  if (urgent === 1) return 'Bugün 1 tahkimat görevi var 🛡️';
  if (urgent <= 4) return `Bugün ${urgent} görev seni bekliyor 💪`;
  return `Bugün ${urgent} görev var, sektör sektör temizleyelim 🧟`;
}

/** Akşam seri hatırlatması (o gün hiçbir şey yapılmadıysa). */
export function streakLine(streak: number, built: boolean, key: string, now: number) {
  if (streak > 0)
    return pick(
      [
        `🔥 ${streak} günlük hayatta kalma serin bozulmasın! Tek görev yeter 💪`,
        `Sığınak seni bekliyor 🛡️ ${streak} günlük seriyi sürdürelim mi?`,
        `Bugün hiç görev yapmadın 🧟 Tek bir tahkimat, barikat çökmesin 🪵`,
      ],
      key,
      now,
    );
  if (built)
    return pick(['Sığınak seni bekliyor 🛡️ Tek görev yeter, barikat zayıflamasın 🪵', 'Bugün hiç görev yapmadın 🧟 Yeni bir seri başlatalım mı? 🔥'], key, now);
  return pick(
    ['Bugün bir görev tamamla, sığınağın inşaatı başlasın 🏗️', 'Minik bir adım, sağlam bir sığınak 🪵 Bugün bir görev yapalım mı?'],
    key,
    now,
  );
}

/** Spor hatırlatması. */
export function sportLine(key: string, now: number) {
  return pick(
    [
      'Kaçış antrenmanı zamanı! Sürüden hızlı olmalısın 🏃🧟',
      'Kardiyo hayatta tutar. Hazır mısın? 💨',
      '15 dakikalık bir devriye yürüyüşü bile seriyi sürdürür 🚶',
      'Kaslar uyansın, barikat taşımak kolay değil 💪',
    ],
    key,
    now,
  );
}

/** Pazar akşamı haftalık rapor. */
export function weeklyLine(o: { done: number; days: number; score: number; best: string | null }) {
  if (!o.done) return 'Bu hafta telsiz sessizdi 🌙 Yeni haftaya bir tahkimatla başlayalım mı?';
  const best = o.best ? ` En sağlam sektör: ${o.best} 🛡️` : '';
  return `Bu hafta ${o.done} görev tamamladın, ${o.days} gün sığınağı savundun 💪 Savunma seviyesi %${o.score}.${best}`;
}

/**
 * Akşam anonsunun başlığı ve metni. `idle`: o akşam hiçbir şey yapılmazsa sığınağın kaç gündür
 * bekleyeceği (dondurma hakları düşülmüş). `away`: son bir şey yapılan günden beri geçen gün.
 * Uzun süre gelmeyene ceza dili yerine "birlikte toparlayalım" denir.
 */
export function eveningNudge(o: { streak: number; idle: number; away: number | null; built: boolean; key: string; now: number }) {
  const { streak, idle, away, built, key, now } = o;
  if (away != null && away >= 3)
    return {
      title: pick(['📻 Telsizden ses yok, iyi misin?', '🛡️ Sığınak hâlâ ayakta', '🔦 Seni bekliyoruz, hayatta kalan'], key, now),
      body: pick(
        [
          'Ceza yok, kaldığın yerden devam. Tek bir görev seç, sığınağı birlikte toparlayalım 🛡️',
          'Bir görev yap, onarım hemen başlasın 🔨 Yavaş yavaş, birlikte.',
          '5 dakikalık tek görev yeter. Gerisini sektör sektör hallederiz 🐢',
        ],
        key,
        now,
      ),
    };
  if (idle >= 2) return { title: '🚨 Son uyarı: yarın barikatlar çökmeye başlıyor', body: 'Bu akşam tek bir görev yap, sığınak düşmesin. Minik bir görev bile yeter 💪' };
  if (idle === 1) return { title: '🧟 Sürü yaklaşıyor', body: 'Bu akşam bir görev yapmazsan yarın duvarlarda çatlaklar çıkar. Bir dakikalık görev yeter.' };
  return { title: streak ? `🔥 ${streak} günlük hayatta kalma serisi` : '🛡️ Sığınak seni bekliyor', body: streakLine(streak, built, key, now) };
}

/** Haftalık rapor kartı paylaşılırken (ya da görsel paylaşılamazsa) giden metin. */
export function weekShareText(o: { done: number; days: number; streak: number }) {
  const streak = o.streak > 1 ? ` 🔥 ${o.streak} günlük hayatta kalma serim var.` : '';
  return `Bu hafta Safehouse: Daily Ops ile ${o.done} tahkimat görevi tamamladım, ${o.days} gün sığınağımı savundum 💪${streak} Sığınağını tahkim et, hayatta kal 🛡️`;
}
