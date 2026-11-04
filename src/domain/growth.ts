import type { Book, DayKey, Growth, LearnDay, WatchKind } from './types';
import type { Feel } from './mood';
import type { Persona } from './persona';

/**
 * Kişisel gelişim: Moka'nın günlük önerisi, okuma takibi, izleme listesi, günlük hedef, aylık özet,
 * kelime / mini ders / nefes ve rozetler. Hepsi telefonda, `Play.growth` içinde durur (yedeğe dahil).
 * - Bu dosya `play.ts` ile birbirini içe aktarmasın diye gün anahtarı burada ayrıca hesaplanır.
 * - Puan: okuma hedefi, mini ders, nefes ve kelime "iş" gibi günde bir kez puan verir (`gorev:buyume:*`),
 *   sunucuda ek tablo gerekmez. Zeka exp'si `mokaLevel.addXp` ile eklenir.
 */

const pad = (n: number) => String(n).padStart(2, '0');
export const gKey = (ts = Date.now()): DayKey => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const shift = (k: DayKey, n: number): DayKey => {
  const [y, m, d] = k.split('-').map(Number);
  return gKey(new Date(y, m - 1, d + n, 12).getTime());
};

export const GOALS = [10, 15, 30, 45];
export const emptyGrowth = (): Growth => ({
  goalMin: 15, reads: [], books: [], watch: [], goalDays: [], pick: null, learn: {}, badges: {}, seenBadges: [],
});

export const WATCH_KINDS: { id: WatchKind; emoji: string; name: string }[] = [
  { id: 'film', emoji: '🎬', name: 'Film' },
  { id: 'dizi', emoji: '📺', name: 'Dizi' },
  { id: 'belgesel', emoji: '🌍', name: 'Belgesel' },
  { id: 'podcast', emoji: '🎧', name: 'Podcast' },
];
export const kindEmoji = (k: WatchKind | 'kitap') => (k === 'kitap' ? '📖' : WATCH_KINDS.find(x => x.id === k)?.emoji ?? '🎬');

/** Listede görünen ilerleme: dizide "Sezon 2 · Bölüm 5", diğerlerinde "%50". */
export function watchProgress(w: { kind: WatchKind; season?: number; ep?: number; pct?: number }): string | null {
  if (w.kind === 'dizi') return w.ep || w.season ? `Sezon ${w.season ?? 1} · Bölüm ${w.ep ?? 0}` : null;
  return w.pct ? `%${w.pct}` : null;
}
/** Kitabın yüzdesi. */
export const bookPct = (b: { read: number; pages: number }) => Math.round((100 * b.read) / Math.max(1, b.pages));

/* ---------- günlük hedef ve okuma ---------- */

export const readMin = (G: Growth, day: DayKey) => G.reads.filter(r => r.day === day).reduce((a, r) => a + r.min, 0);
export const goalPct = (G: Growth, day: DayKey) => Math.min(100, Math.round((100 * readMin(G, day)) / Math.max(1, G.goalMin)));
export const goalMet = (G: Growth, day: DayKey) => readMin(G, day) >= G.goalMin;

/** Hedefin tutturulduğu günlerin kesintisiz serisi (bugün henüz tutmadıysa dünden geriye sayılır). */
export function readStreak(G: Growth, now = Date.now()): number {
  const set = new Set(G.goalDays);
  const today = gKey(now);
  let n = 0;
  for (let d = set.has(today) ? today : shift(today, -1); set.has(d); d = shift(d, -1)) n++;
  return n;
}

/**
 * Taslak `Growth` üzerinde okuma kaydı ekler. Kitap seçildiyse sayfalar kitaba işlenir; sayfa toplamı
 * kitabın sayfasına ulaşırsa kitap biter. Döner: bittiyse kitap, hedef bugün ilk kez tuttuysa true.
 */
export function addRead(G: Growth, e: { min: number; pages: number; book: string | null }, now = Date.now()) {
  const day = gKey(now);
  const wasMet = goalMet(G, day);
  G.reads = [...G.reads, { day, min: e.min, pages: e.pages, book: e.book }].slice(-600);
  let finished: Book | null = null;
  const b = e.book ? G.books.find(x => x.id === e.book) : undefined;
  if (b && !b.done) {
    b.read = Math.min(b.pages, b.read + Math.max(0, e.pages));
    if (b.read >= b.pages) {
      b.done = day;
      finished = b;
    }
  }
  const justMet = !wasMet && goalMet(G, day);
  if (justMet && !G.goalDays.includes(day)) G.goalDays = [...G.goalDays, day].sort().slice(-400);
  return { finished, justMet };
}

/* ---------- öneri ---------- */

export type Tag = 'hafif' | 'derin' | 'ogren' | 'ilham' | 'sakin' | 'yemek' | 'aile';
export type SuggestKind = 'kitap' | WatchKind;
export type Suggestion = { id: string; kind: SuggestKind; title: string; by: string; why: string; tags: Tag[]; pages?: number };

const S = (id: string, kind: SuggestKind, title: string, by: string, why: string, tags: Tag[], pages?: number): Suggestion => ({ id, kind, title, by, why, tags, pages });

export const SUGGESTIONS: Suggestion[] = [
  // Kitaplar
  S('k-prens', 'kitap', 'Küçük Prens', 'Antoine de Saint-Exupéry', 'Kısa, sıcak, her yaşta bir şey bırakır.', ['hafif', 'sakin', 'ilham'], 96),
  S('k-simyaci', 'kitap', 'Simyacı', 'Paulo Coelho', 'Hayalinin peşinden gitmek üzerine akıcı bir masal.', ['ilham', 'hafif'], 184),
  S('k-atomik', 'kitap', 'Atomik Alışkanlıklar', 'James Clear', 'Küçük adımlarla büyük değişim, tam senin tarzın.', ['ogren', 'ilham'], 320),
  S('k-madonna', 'kitap', 'Kürk Mantolu Madonna', 'Sabahattin Ali', 'Yavaş okunan, içe işleyen bir aşk hikâyesi.', ['sakin', 'derin'], 160),
  S('k-seytan', 'kitap', 'İçimizdeki Şeytan', 'Sabahattin Ali', 'Kendinle yüzleşmek isteyen günler için.', ['derin'], 240),
  S('k-hayvan', 'kitap', 'Hayvan Çiftliği', 'George Orwell', 'İnce ama düşündüren bir klasik.', ['derin', 'hafif'], 152),
  S('k-sapiens', 'kitap', 'Sapiens', 'Yuval Noah Harari', 'İnsanlığın hikâyesi, merakını doyurur.', ['ogren', 'derin'], 450),
  S('k-suc', 'kitap', 'Suç ve Ceza', 'Fyodor Dostoyevski', 'Uzun soluklu, derin bir yolculuk.', ['derin'], 600),
  S('k-derin', 'kitap', 'Derin Çalışma', 'Cal Newport', 'Dikkatini toplamayı öğreten pratik bir kitap.', ['ogren'], 304),
  S('k-akis', 'kitap', 'Akış', 'Mihaly Csikszentmihalyi', 'Neyi yaparken zamanın aktığını fark etmek.', ['ogren', 'ilham', 'sakin'], 320),
  S('k-momo', 'kitap', 'Momo', 'Michael Ende', 'Zamanın değeri üzerine sevimli bir hikâye.', ['sakin', 'ilham', 'aile'], 304),
  S('k-yabanci', 'kitap', 'Yabancı', 'Albert Camus', 'Kısa ama uzun uzun düşündürür.', ['derin'], 120),
  S('k-balik', 'kitap', 'Küçük Kara Balık', 'Samed Behrengi', '10 dakikada biter, bir ömür kalır.', ['hafif', 'ilham', 'aile'], 40),
  S('k-saat', 'kitap', 'Saatleri Ayarlama Enstitüsü', 'Ahmet Hamdi Tanpınar', 'Zaman ve hayat üzerine ustaca bir roman.', ['derin'], 400),
  S('k-hizli', 'kitap', 'Hızlı ve Yavaş Düşünme', 'Daniel Kahneman', 'Beynin kararları nasıl veriyor, görmek isteyenlere.', ['ogren', 'derin'], 600),
  S('k-tuz', 'kitap', 'Tuz Yağ Asit Isı', 'Samin Nosrat', 'Mutfağı seviyorsan, yemeğin mantığını anlatır.', ['yemek', 'ogren'], 480),
  S('k-tutunamayanlar', 'kitap', 'Tutunamayanlar', 'Oğuz Atay', 'Uzun, tatlı, zor; sabırlı günlere göre.', ['derin'], 724),
  // Filmler
  S('f-amelie', 'film', 'Amélie', 'Jean-Pierre Jeunet', 'Küçük iyiliklerin büyüsü. Hafif ve renkli.', ['hafif', 'sakin']),
  S('f-ratatouille', 'film', 'Ratatouille', 'Pixar', 'Mutfak, tutku ve cesaret. Aileyle de olur.', ['yemek', 'hafif', 'aile']),
  S('f-soul', 'film', 'Soul', 'Pixar', 'Hayatın tadı küçük anlarda. Moka çok sever.', ['ilham', 'sakin', 'aile']),
  S('f-insideout', 'film', 'Ters Yüz', 'Pixar', 'Duygularını tanımak için sevimli bir yol.', ['hafif', 'aile', 'ilham']),
  S('f-paterson', 'film', 'Paterson', 'Jim Jarmusch', 'Sıradan günün güzelliği. Çok sakin.', ['sakin']),
  S('f-spirited', 'film', 'Ruhların Kaçışı', 'Hayao Miyazaki', 'Cesaret ve büyü; evde rahatça izlenir.', ['sakin', 'ilham', 'aile']),
  S('f-dead', 'film', 'Ölü Ozanlar Derneği', 'Peter Weir', 'Anı yaşamak ve öğrenmek üzerine.', ['ilham', 'ogren']),
  S('f-whiplash', 'film', 'Whiplash', 'Damien Chazelle', 'Disiplin ve tutku; enerjin yüksekken.', ['derin', 'ilham']),
  S('f-chef', 'film', 'Şef', 'Jon Favreau', 'Yemek yapma sevinci, bol müzik.', ['yemek', 'hafif']),
  S('f-julie', 'film', 'Julie & Julia', 'Nora Ephron', 'Bir yemek kitabı, bir yıl, bir hedef.', ['yemek', 'ilham', 'hafif']),
  S('f-organize', 'film', 'Organize İşler', 'Yılmaz Erdoğan', 'Gülmek isteyen günler için.', ['hafif']),
  S('f-babam', 'film', 'Babam ve Oğlum', 'Çağan Irmak', 'Aile üzerine dokunaklı bir klasik.', ['derin', 'aile']),
  S('f-sunshine', 'film', 'Küçük Miss Sunshine', 'Dayton & Faris', 'Tuhaf bir aile, büyük bir kalp.', ['hafif', 'aile']),
  S('f-cinema', 'film', 'Cinema Paradiso', 'Giuseppe Tornatore', 'Sinema aşkı ve nostalji.', ['sakin', 'derin']),
  // Diziler
  S('d-lasso', 'dizi', 'Ted Lasso', 'Apple TV+', 'Nazik olmanın gücü. Hafif ve moral verici.', ['hafif', 'ilham']),
  S('d-bear', 'dizi', 'The Bear', 'FX', 'Mutfakta yoğun bir hayat; yemek sevenlere.', ['yemek', 'derin']),
  S('d-midnight', 'dizi', 'Gece Yarısı Lokantası', 'Netflix', 'Küçük bir lokanta, sıcak hikâyeler. Çok sakin.', ['yemek', 'sakin']),
  S('d-b99', 'dizi', 'Brooklyn Nine-Nine', 'NBC', 'Gülmek ve rahatlamak isteyen günler için.', ['hafif']),
  S('d-gibi', 'dizi', 'Gibi', 'Gülse Birsel', 'Aile ve gündelik hayat, bol kahkaha.', ['hafif', 'aile']),
  S('d-bir', 'dizi', 'Bir Başkadır', 'Netflix', 'İnsanı anlamak üzerine derin bir Türk dizisi.', ['derin']),
  S('d-cernobil', 'dizi', 'Çernobil', 'HBO', 'Gerçek bir felaketin ağır ama öğretici hikâyesi.', ['derin', 'ogren']),
  S('d-gambit', 'dizi', 'Vezirin Gambiti', 'Netflix', 'Tutku ve disiplinle yükselen bir hikâye.', ['ilham', 'derin']),
  S('d-avatar', 'dizi', 'Avatar: Son Hava Bükücü', 'Nickelodeon', 'Aileyle izlenir; cesaret ve denge üzerine.', ['aile', 'ilham', 'sakin']),
  S('d-blackmirror', 'dizi', 'Black Mirror', 'Charlie Brooker', 'Teknolojiyi düşündüren tekil bölümler.', ['derin', 'ogren']),
  // Belgeseller
  S('b-octopus', 'belgesel', 'Ahtapotum Öğretmenim', 'Pippa Ehrlich', 'Doğayla bağ kurmak üzerine huzurlu bir belgesel.', ['sakin', 'ilham']),
  S('b-planet', 'belgesel', 'Gezegenimiz', 'Netflix', 'Doğa manzaraları, rahatlamak için ideal.', ['sakin', 'ogren']),
  S('b-jiro', 'belgesel', 'Jiro Dreams of Sushi', 'David Gelb', 'Bir işi ömür boyu iyi yapmanın hikâyesi.', ['yemek', 'ilham']),
  S('b-minimal', 'belgesel', 'Minimalism', 'Matt D\'Avella', 'Eşyalarla ilişkini ve evini düşündürür.', ['ogren', 'sakin']),
  S('b-kondo', 'belgesel', 'Marie Kondo ile Toparlanma', 'Netflix', 'Evi toparlamaya motive eden bölümler.', ['hafif', 'ogren']),
  S('b-cosmos', 'belgesel', 'Cosmos', 'Neil deGrasse Tyson', 'Evrene bakınca günlük dertler küçülür.', ['ogren', 'derin']),
  S('b-free', 'belgesel', 'Free Solo', 'Chin & Vasarhelyi', 'Cesaret ve hazırlık üzerine soluk kesen bir film.', ['ilham', 'derin']),
  S('b-chef', 'belgesel', 'Chef\'s Table', 'Netflix', 'Şeflerin tutkulu dünyası.', ['yemek', 'ilham']),
  // Podcast
  S('p-hidden', 'podcast', 'Hidden Brain', 'NPR', 'İnsan davranışını bilimle anlatır. İngilizce.', ['ogren', 'derin']),
  S('p-ted', 'podcast', 'TED Talks Daily', 'TED', 'Her gün tek bir fikir, kısa ve ilham verici.', ['ilham', 'ogren']),
  S('p-radiolab', 'podcast', 'Radiolab', 'WNYC', 'Merak uyandıran hikâyeler. İngilizce.', ['ogren', 'hafif']),
  S('p-99', 'podcast', '99% Invisible', 'Roman Mars', 'Çevrendeki tasarımın gizli hikâyeleri.', ['ogren', 'sakin']),
  S('p-tenpercent', 'podcast', 'Ten Percent Happier', 'Dan Harris', 'Meditasyon ve zihin sakinliği. İngilizce.', ['sakin', 'ilham']),
  S('p-freakonomics', 'podcast', 'Freakonomics Radio', 'Stephen Dubner', 'Gündelik hayata ekonomi gözüyle bakmak.', ['ogren']),
];
const byId = new Map(SUGGESTIONS.map(x => [x.id, x]));
export const suggestionById = (id: string) => byId.get(id);

const PERSONA_TAGS: Record<Persona, Tag[]> = {
  ogrenci: ['ogren', 'ilham'], genc: ['ilham', 'hafif', 'aile'], tek: ['derin', 'sakin'],
  cift: ['hafif', 'sakin'], anne: ['sakin', 'hafif', 'aile'], sef: ['yemek', 'ilham'],
};
const LOW_FEELS: Feel[] = ['yorgun', 'bunalmis', 'keyifsiz'];

const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967295;
};

/**
 * Bugünün önerisi. Ruh hali düşükse hafif ve sakin, enerjikse derin ve öğretici; kişiye göre etiketler
 * ağırlık kazanır. Listede zaten olanlar ve en çok 2 yakın gündeki öneriler elenir. Günün tarihi ve
 * `shuffle` sayısı seçimi değiştirir ama aynı gün aynı sonucu verir (telefon yeniden açılınca sabit kalır).
 */
export function suggest(G: Growth, persona: Persona | null, feel: Feel | null, day: DayKey, shuffle = 0): Suggestion {
  const have = new Set([...G.books.map(b => b.title), ...G.watch.map(w => w.title)]);
  const low = feel ? LOW_FEELS.includes(feel) : false;
  const mood: Tag[] = feel ? (low ? ['hafif', 'sakin'] : feel === 'enerjik' ? ['derin', 'ogren', 'ilham'] : ['ilham', 'ogren']) : [];
  const likes = persona ? PERSONA_TAGS[persona] : [];
  let best = SUGGESTIONS[0];
  let top = -1;
  for (const s of SUGGESTIONS) {
    if (have.has(s.title)) continue;
    // Düşük ruh halinde uzun kitap (>350 sayfa) önerilmez.
    if (low && s.kind === 'kitap' && (s.pages ?? 0) > 350) continue;
    let sc = hash(`${day}|${shuffle}|${s.id}`) * 1.6;
    for (const t of s.tags) {
      if (mood.includes(t)) sc += 1;
      if (likes.includes(t)) sc += 0.7;
    }
    if (sc > top) { top = sc; best = s; }
  }
  return best;
}

/** Bugünün önerisini (yoksa) seçip döner. Taslak state üzerinde çağrılır; `pick` günü değiştirir. */
export function ensurePick(G: Growth, persona: Persona | null, feel: Feel | null, day: DayKey) {
  if (!G.pick || G.pick.day !== day || !suggestionById(G.pick.id)) {
    G.pick = { day, id: suggest(G, persona, feel, day, 0).id, shuffles: 0, saved: false };
  }
  return G.pick;
}

/** Başka öner: bugünkü sayıyı artırır. */
export function reshuffle(G: Growth, persona: Persona | null, feel: Feel | null, day: DayKey) {
  const cur = ensurePick(G, persona, feel, day);
  const n = cur.shuffles + 1;
  G.pick = { day, id: suggest(G, persona, feel, day, n).id, shuffles: n, saved: false };
}

/** Öneriyi kitaplığa ya da izleme listesine ekler. */
export function saveSuggestion(G: Growth, s: Suggestion, id: string, now = Date.now()) {
  if (s.kind === 'kitap') G.books.unshift({ id, title: s.title, author: s.by, pages: s.pages ?? 200, read: 0, added: now, done: null });
  else G.watch.unshift({ id, title: s.title, kind: s.kind, added: now, seen: null });
  if (G.pick) G.pick.saved = true;
}

/** Bir günde istenebilecek başka öneri sayısı (Premium'da daha çok). Sınırlar src/domain/premium.ts'de. */
export const shufflesLeft = (G: Growth, max: number, day: DayKey) => Math.max(0, max - (G.pick && G.pick.day === day ? G.pick.shuffles : 0));

/* ---------- öğrenme: kelime, mini ders ---------- */

export type Word = { w: string; tr: string; ex: string };
export const WORDS: Word[] = [
  { w: 'serendipity', tr: 'Şans eseri güzel bir şey bulmak', ex: 'Finding that cafe was pure serendipity.' },
  { w: 'resilient', tr: 'Dirençli, çabuk toparlanan', ex: 'Children are often more resilient than we think.' },
  { w: 'ephemeral', tr: 'Kısa ömürlü, geçici', ex: 'Cherry blossoms are beautiful and ephemeral.' },
  { w: 'meticulous', tr: 'Titiz, ince eleyip sık dokuyan', ex: 'She is meticulous about her notes.' },
  { w: 'candid', tr: 'Açık sözlü, samimi', ex: 'Thank you for your candid feedback.' },
  { w: 'ubiquitous', tr: 'Her yerde bulunan', ex: 'Smartphones are ubiquitous these days.' },
  { w: 'nostalgia', tr: 'Geçmişe özlem', ex: 'The old song filled him with nostalgia.' },
  { w: 'empathy', tr: 'Empati, başkasının yerine kendini koyma', ex: 'Good leaders listen with empathy.' },
  { w: 'pragmatic', tr: 'Pratik, sonuç odaklı', ex: 'Let\'s take a pragmatic approach.' },
  { w: 'eloquent', tr: 'Etkili ve güzel konuşan', ex: 'He gave an eloquent speech.' },
  { w: 'tenacious', tr: 'Azimli, pes etmeyen', ex: 'A tenacious learner always finds a way.' },
  { w: 'mundane', tr: 'Sıradan, gündelik', ex: 'Even mundane chores can feel calm.' },
  { w: 'thrive', tr: 'Gelişmek, serpilmek', ex: 'Plants thrive near a sunny window.' },
  { w: 'ambiguous', tr: 'Belirsiz, çok anlamlı', ex: 'The instructions were ambiguous.' },
  { w: 'diligent', tr: 'Çalışkan, gayretli', ex: 'A diligent student reviews every day.' },
  { w: 'vivid', tr: 'Canlı, parlak', ex: 'I have a vivid memory of that day.' },
  { w: 'humble', tr: 'Alçakgönüllü', ex: 'Stay humble and keep learning.' },
  { w: 'inevitable', tr: 'Kaçınılmaz', ex: 'Some mistakes are inevitable.' },
  { w: 'cozy', tr: 'Sıcak, rahat, konforlu', ex: 'We spent a cozy evening at home.' },
  { w: 'gratitude', tr: 'Minnet, şükran', ex: 'She wrote down three things in gratitude.' },
  { w: 'procrastinate', tr: 'Ertelemek, sürekli sonraya bırakmak', ex: 'Don\'t procrastinate, start with five minutes.' },
  { w: 'profound', tr: 'Derin, etkileyici', ex: 'The book had a profound effect on me.' },
  { w: 'curate', tr: 'Özenle seçip derlemek', ex: 'I curate a playlist for every season.' },
  { w: 'whimsical', tr: 'Tuhaf ve sevimli, kaprisli', ex: 'The shop had a whimsical charm.' },
  { w: 'savor', tr: 'Tadını çıkarmak', ex: 'Savor your coffee, there\'s no rush.' },
  { w: 'persevere', tr: 'Sebat etmek, devam etmek', ex: 'If you persevere, it gets easier.' },
  { w: 'subtle', tr: 'İnce, belli belirsiz', ex: 'There is a subtle difference between the two.' },
  { w: 'mindful', tr: 'Farkında, dikkatli', ex: 'Be mindful of how you spend your time.' },
  { w: 'authentic', tr: 'Gerçek, özgün', ex: 'He wants an authentic life.' },
  { w: 'embrace', tr: 'Kucaklamak, benimsemek', ex: 'Embrace small habits, they add up.' },
  { w: 'solitude', tr: 'Yalnızlığın huzuru', ex: 'She enjoys her morning solitude.' },
  { w: 'harmony', tr: 'Uyum', ex: 'The colors in the room live in harmony.' },
  { w: 'spontaneous', tr: 'Anlık, içten gelen', ex: 'We took a spontaneous trip.' },
  { w: 'insight', tr: 'Kavrayış, içgörü', ex: 'Reading gave me a new insight.' },
  { w: 'endeavor', tr: 'Girişim, uğraş', ex: 'Learning a language is a great endeavor.' },
  { w: 'wholesome', tr: 'Sağlıklı, iyi gelen', ex: 'A wholesome meal and an early night.' },
  { w: 'flourish', tr: 'Yeşermek, gelişmek', ex: 'Habits flourish with daily care.' },
  { w: 'reluctant', tr: 'İsteksiz, gönülsüz', ex: 'I was reluctant at first, then I loved it.' },
  { w: 'astonish', tr: 'Şaşırtmak', ex: 'The view will astonish you.' },
];
export type TrWord = { w: string; en: string; ex: string; exEn: string };
/** İngilizce modda Öğren sekmesinde gösterilen Türkçe kelimeler (kelime ve örnek Türkçe, anlam ve çeviri İngilizce). */
export const TR_WORDS: TrWord[] = [
  { w: 'merhaba', en: 'hello', ex: 'Merhaba, nasılsın?', exEn: 'Hello, how are you?' },
  { w: 'teşekkürler', en: 'thank you', ex: 'Çok teşekkürler, harikaydı.', exEn: 'Thank you very much, it was great.' },
  { w: 'güzel', en: 'beautiful, nice', ex: 'Bugün hava çok güzel.', exEn: 'The weather is lovely today.' },
  { w: 'ev', en: 'home, house', ex: 'Evim küçük ama sıcak.', exEn: 'My home is small but warm.' },
  { w: 'arkadaş', en: 'friend', ex: 'Arkadaşımla kahve içtik.', exEn: 'I had coffee with my friend.' },
  { w: 'kahve', en: 'coffee', ex: 'Sabahları bir kahve içerim.', exEn: 'I drink a coffee in the mornings.' },
  { w: 'sevgi', en: 'love, affection', ex: 'Sevgi her şeyin başıdır.', exEn: 'Love is the start of everything.' },
  { w: 'huzur', en: 'peace, calm', ex: 'Evde huzur buldum.', exEn: 'I found peace at home.' },
  { w: 'hoş geldin', en: 'welcome', ex: 'Eve hoş geldin!', exEn: 'Welcome home!' },
  { w: 'afiyet olsun', en: 'enjoy your meal', ex: 'Yemek hazır, afiyet olsun.', exEn: 'Dinner is ready, enjoy your meal.' },
  { w: 'kolay gelsin', en: 'may your work go easy', ex: 'İşin başındayım. Kolay gelsin!', exEn: 'Good luck with your work!' },
  { w: 'geçmiş olsun', en: 'get well soon', ex: 'Geçmiş olsun, çabuk iyileş.', exEn: 'Get well soon, recover quickly.' },
  { w: 'mutlu', en: 'happy', ex: 'Bugün çok mutluyum.', exEn: 'I am very happy today.' },
  { w: 'yavaş', en: 'slow, slowly', ex: 'Yavaş yavaş ilerliyoruz.', exEn: 'We are moving forward little by little.' },
  { w: 'hadi', en: 'come on, let\'s go', ex: 'Hadi, bir çay içelim.', exEn: 'Come on, let\'s have a tea.' },
  { w: 'çay', en: 'tea', ex: 'Çay demlendi.', exEn: 'The tea has been brewed.' },
  { w: 'komşu', en: 'neighbor', ex: 'Komşum bana kek getirdi.', exEn: 'My neighbor brought me a cake.' },
  { w: 'sabah', en: 'morning', ex: 'Sabah erken kalktım.', exEn: 'I woke up early in the morning.' },
  { w: 'akşam', en: 'evening', ex: 'Akşam yürüyüşe çıkarız.', exEn: 'We go for a walk in the evening.' },
  { w: 'gece', en: 'night', ex: 'İyi geceler, tatlı rüyalar.', exEn: 'Good night, sweet dreams.' },
  { w: 'yarın', en: 'tomorrow', ex: 'Yarın yeni bir gün.', exEn: 'Tomorrow is a new day.' },
  { w: 'bugün', en: 'today', ex: 'Bugün ne yapıyoruz?', exEn: 'What are we doing today?' },
  { w: 'su', en: 'water', ex: 'Bir bardak su alabilir miyim?', exEn: 'Could I have a glass of water?' },
  { w: 'ekmek', en: 'bread', ex: 'Fırından sıcak ekmek aldım.', exEn: 'I bought warm bread from the bakery.' },
  { w: 'pencere', en: 'window', ex: 'Pencereyi açar mısın?', exEn: 'Could you open the window?' },
  { w: 'kitap', en: 'book', ex: 'Bu kitabı çok sevdim.', exEn: 'I really liked this book.' },
  { w: 'güneş', en: 'sun', ex: 'Güneş doğdu.', exEn: 'The sun has risen.' },
  { w: 'yağmur', en: 'rain', ex: 'Yağmur yağıyor.', exEn: 'It is raining.' },
  { w: 'kedi', en: 'cat', ex: 'Kedim kucağımda uyuyor.', exEn: 'My cat is sleeping in my lap.' },
  { w: 'köpek', en: 'dog', ex: 'Köpeği gezmeye çıkardım.', exEn: 'I took the dog out for a walk.' },
  { w: 'çiçek', en: 'flower', ex: 'Balkonda çiçekler açtı.', exEn: 'Flowers have bloomed on the balcony.' },
  { w: 'sağ ol', en: 'thanks, thank you', ex: 'Yardımın için sağ ol.', exEn: 'Thanks for your help.' },
  { w: 'lütfen', en: 'please', ex: 'Lütfen kapıyı kapat.', exEn: 'Please close the door.' },
  { w: 'özür dilerim', en: 'I am sorry', ex: 'Geç kaldım, özür dilerim.', exEn: 'I am late, I am sorry.' },
  { w: 'tamam', en: 'okay, all right', ex: 'Tamam, hemen geliyorum.', exEn: 'Okay, I am coming right away.' },
  { w: 'hayat', en: 'life', ex: 'Hayat küçük anlardan oluşur.', exEn: 'Life is made of small moments.' },
  { w: 'zaman', en: 'time', ex: 'Zaman çok çabuk geçiyor.', exEn: 'Time passes very quickly.' },
  { w: 'gülümsemek', en: 'to smile', ex: 'Bana gülümsedi.', exEn: 'They smiled at me.' },
  { w: 'temiz', en: 'clean', ex: 'Mutfak pırıl pırıl temiz.', exEn: 'The kitchen is spotlessly clean.' },
  { w: 'keyif', en: 'pleasure, enjoyment', ex: 'Kahvemi keyifle içtim.', exEn: 'I enjoyed my coffee.' },
  { w: 'canım', en: 'my dear', ex: 'Canım, yardım eder misin?', exEn: 'My dear, could you help me?' },
];
const dayIndex = (day: DayKey) => {
  const [y, m, d] = day.split('-').map(Number);
  return Math.floor(new Date(y, m - 1, d, 12).getTime() / 86400000);
};
export const wordOf = (day: DayKey): Word => WORDS[dayIndex(day) % WORDS.length];
export const trWordOf = (day: DayKey): TrWord => TR_WORDS[dayIndex(day) % TR_WORDS.length];

export type Lesson = { id: string; emoji: string; title: string; steps: string[]; try: string };
export const LESSONS: Lesson[] = [
  { id: 'pomodoro', emoji: '🍅', title: 'Pomodoro tekniği', steps: ['25 dakika tek bir işe odaklan, telefonu uzağa koy.', 'Süre bitince 5 dakika gerçekten dinlen: kalk, su iç, uzağa bak.', 'Dört turdan sonra 15-20 dakikalık uzun mola ver.'], try: 'Şimdi bir iş seç ve Odaklan ekranından 25 dakikalık tur başlat.' },
  { id: 'iki-dk', emoji: '⏱️', title: '2 dakika kuralı', steps: ['2 dakikadan kısa süren bir iş aklına geldiyse hemen yap.', 'Uzun sürecek işler için ilk 2 dakikayı başlangıç say: "Sadece yatağı toplayacağım".', 'Başlamak zor kısım; devamı kendiliğinden gelir.'], try: 'Aklındaki 2 dakikalık bir işi şimdi bitir.' },
  { id: 'feynman', emoji: '🧒', title: 'Feynman tekniği', steps: ['Öğrendiğin bir konuyu 10 yaşında birine anlatır gibi yaz.', 'Takıldığın yerler tam anlamadığın yerlerdir; oraya geri dön.', 'Karmaşık sözcükleri sade olanlarla değiştir.'], try: 'Bugün öğrendiğin bir şeyi 3 cümleyle sade biçimde anlat.' },
  { id: 'butce', emoji: '💰', title: '50/30/20 bütçe', steps: ['Gelirinin %50\'si ihtiyaçlara: kira, fatura, market.', '%30\'u isteklere: dışarıda yemek, hobi, eğlence.', '%20\'si birikime ve borçlara. Önce bunu ayır.'], try: 'Bu ayki gelirine göre üç rakamı hesapla.' },
  { id: 'aralikli', emoji: '🔁', title: 'Aralıklı tekrar', steps: ['Bir şeyi öğrenince 1 gün, 3 gün, 7 gün, 21 gün sonra tekrar et.', 'Tekrarlar kısa olsun; hatırlamaya çalışmak, tekrar okumaktan iyidir.', 'Kelimeler, formüller ve ezber için çok işe yarar.'], try: 'Bugünün kelimesini yarın, 3 gün sonra ve haftaya tekrar et.' },
  { id: 'nefes', emoji: '🌬️', title: '4-7-8 nefesi', steps: ['4 saniye burnundan nefes al.', '7 saniye tut.', '8 saniye yavaşça ağzından ver. Dört tur yap.'], try: 'Nefes ekranında bir tur sakinleş.' },
  { id: 'eisenhower', emoji: '🧭', title: 'Acil mi, önemli mi?', steps: ['İşleri dört kutuya ayır: acil+önemli, önemli, acil, ikisi de değil.', 'En çok değeri "önemli ama acil olmayan" kutu verir: spor, öğrenme, ilişkiler.', 'İkisi de olmayanları listeden çıkar.'], try: 'Bugünkü işlerini dört kutuya yerleştir.' },
  { id: '20-20', emoji: '👀', title: '20-20-20 göz molası', steps: ['Her 20 dakikada bir...', '...20 feet (yaklaşık 6 m) uzağa...', '...20 saniye bak. Gözlerin dinlenir.'], try: 'Şimdi pencereden uzağa 20 saniye bak.' },
  { id: 'minnet', emoji: '🙏', title: 'Minnet günlüğü', steps: ['Akşam bugün için minnettar olduğun 3 şeyi yaz.', 'Büyük şeyler olmak zorunda değil: sıcak bir çay, bir selam.', 'Birkaç haftada ruh halin değişmeye başlar.'], try: 'Günlüğe bugün için 3 minnet yaz.' },
  { id: 'uyku', emoji: '😴', title: 'Daha iyi uyku', steps: ['Her gün aynı saatte yat ve kalk, hafta sonu da.', 'Yatmadan 1 saat önce ekranları kapat, ışığı kıs.', 'Oda serin ve karanlık olsun.'], try: 'Bu gece için yatış saatini belirle.' },
  { id: 'dinleme', emoji: '👂', title: 'Dinlemeyi öğren', steps: ['Karşındaki konuşurken cevabını hazırlama; sadece dinle.', 'Bitirince söylediğini kendi cümlenle tekrar et: "Yani şunu diyorsun…"', 'Soru sor, merak et. İnsanlar anlaşıldığını hissetmek ister.'], try: 'Bugün biriyle sohbette bu tekrarı dene.' },
  { id: 'yazi', emoji: '✍️', title: 'Serbest yazı', steps: ['Zamanlayıcıyı 5 dakikaya kur.', 'Aklına ne gelirse durmadan yaz, düzeltme.', 'Sonra oku; bazen en güzel fikirler orada çıkar.'], try: 'Günlükte 5 dakikalık serbest yazı yaz.' },
  { id: 'yirmi-saat', emoji: '🎯', title: 'İlk 20 saat', steps: ['Yeni bir beceri için ilk 20 saat çabuk fark yaratır.', 'Beceriyi küçük parçalara böl, en önemli parçadan başla.', 'Günde 20 dakika yap; bir ayda 10 saat olur.'], try: 'Öğrenmek istediğin bir beceriyi seç ve ilk 20 dakikayı ayır.' },
];
export const lessonOf = (day: DayKey): Lesson => LESSONS[dayIndex(day) % LESSONS.length];

export const learnOf = (G: Growth, day: DayKey): LearnDay => G.learn[day] ?? {};

/** Etkinliği kaydeder (taslak üzerinde). Eski günleri 120 günle sınırlar. */
export function markLearn(G: Growth, day: DayKey, patch: Partial<LearnDay>) {
  G.learn[day] = { ...G.learn[day], ...patch };
  const keys = Object.keys(G.learn).sort();
  for (const k of keys.slice(0, Math.max(0, keys.length - 400))) delete G.learn[k];
}

/* ---------- rozetler ---------- */

export type BadgeDef = { id: string; emoji: string; name: string; hint: string; ok: (G: Growth, now: number) => boolean };
const booksDone = (G: Growth) => G.books.filter(b => b.done).length;
const watched = (G: Growth) => G.watch.filter(w => w.seen).length;
const learnCount = (G: Growth) => Object.values(G.learn).reduce((a, l) => a + (l.word ? 1 : 0) + (l.lesson ? 1 : 0), 0);
const breathCount = (G: Growth) => Object.values(G.learn).filter(l => l.breath).length;

export const BADGES: BadgeDef[] = [
  { id: 'ilk-kitap', emoji: '📖', name: 'İlk kitap', hint: 'Bir kitabı bitir', ok: G => booksDone(G) >= 1 },
  { id: 'kitap-kurdu', emoji: '🐛', name: 'Kitap kurdu', hint: '3 kitap bitir', ok: G => booksDone(G) >= 3 },
  { id: 'kutuphane', emoji: '🏛️', name: 'Kütüphane Moka', hint: '10 kitap bitir', ok: G => booksDone(G) >= 10 },
  { id: 'oku-3', emoji: '🔥', name: 'Okuma serisi', hint: '3 gün üst üste hedefi tut', ok: G => maxRun(G) >= 3 },
  { id: 'oku-7', emoji: '🌟', name: 'Haftalık okur', hint: '7 gün üst üste hedefi tut', ok: G => maxRun(G) >= 7 },
  { id: 'sinema', emoji: '🍿', name: 'Sinema Moka', hint: '5 film, dizi ya da belgesel izle', ok: G => watched(G) >= 5 },
  { id: 'merakli', emoji: '🧠', name: 'Meraklı', hint: '10 kelime ya da ders tamamla', ok: G => learnCount(G) >= 10 },
  { id: 'huzur', emoji: '🧘', name: 'Huzurlu Moka', hint: '5 gün nefes egzersizi yap', ok: G => breathCount(G) >= 5 },
];
/** Hedefin tutturulduğu en uzun kesintisiz gün serisi. */
function maxRun(G: Growth): number {
  const days = [...new Set(G.goalDays)].sort();
  let best = 0, run = 0, prev = '';
  for (const d of days) {
    run = prev && shift(prev, 1) === d ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}

/** Yeni kazanılan rozetleri işler (taslak üzerinde) ve kimliklerini döner. */
export function grantBadges(G: Growth, now = Date.now()): BadgeDef[] {
  const day = gKey(now);
  const fresh: BadgeDef[] = [];
  for (const b of BADGES) {
    if (!G.badges[b.id] && b.ok(G, now)) {
      G.badges[b.id] = day;
      fresh.push(b);
    }
  }
  return fresh;
}

/** Rozetlere göre Moka'nın unvanı (en son kazanılan). */
export function growthTitle(G: Growth): string | null {
  const order = ['kutuphane', 'kitap-kurdu', 'oku-7', 'sinema', 'huzur', 'merakli', 'oku-3', 'ilk-kitap'];
  const titles: Record<string, string> = {
    kutuphane: 'Kütüphaneci Moka', 'kitap-kurdu': 'Kitap Kurdu Moka', 'oku-7': 'Okuyucu Moka', sinema: 'Sinemasever Moka',
    huzur: 'Sakin Moka', merakli: 'Meraklı Moka', 'oku-3': 'Okur Moka', 'ilk-kitap': 'Okur Moka',
  };
  const id = order.find(x => G.badges[x]);
  return id ? titles[id] : null;
}

/* ---------- aylık özet ---------- */

export type MonthRow = { key: string; label: string; readMin: number; pages: number; books: number; watched: number; learned: number; breath: number; goalDays: number };
const MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

/** Son `n` ayın özeti (eskiden yeniye). */
export function monthRows(G: Growth, now = Date.now(), n = 6): MonthRow[] {
  const d0 = new Date(now);
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(d0.getFullYear(), d0.getMonth() - (n - 1 - i), 1);
    const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
    const inM = (k: string | null) => !!k && k.startsWith(key);
    const reads = G.reads.filter(r => inM(r.day));
    return {
      key, label: MONTHS[d.getMonth()],
      readMin: reads.reduce((a, r) => a + r.min, 0),
      pages: reads.reduce((a, r) => a + r.pages, 0),
      books: G.books.filter(b => inM(b.done)).length,
      watched: G.watch.filter(w => inM(w.seen)).length,
      learned: Object.entries(G.learn).filter(([k]) => inM(k)).reduce((a, [, l]) => a + (l.word ? 1 : 0) + (l.lesson ? 1 : 0), 0),
      breath: Object.entries(G.learn).filter(([k]) => inM(k) && G.learn[k].breath).length,
      goalDays: G.goalDays.filter(inM).length,
    };
  });
}

/** Moka'nın aylık özet cümlesi: yapılanı öne çıkarır, eksikle suçlamaz. */
export function monthLine(m: MonthRow) {
  if (!m.readMin && !m.watched && !m.learned && !m.breath) return 'Bu ay yeni başlıyoruz. Günde 15 dakika yeter ☕';
  const bits: string[] = [];
  if (m.readMin) bits.push(`${m.readMin} dakika okudun`);
  if (m.books) bits.push(`${m.books} kitap bitirdin`);
  if (m.watched) bits.push(`${m.watched} yapım izledin`);
  if (m.learned) bits.push(`${m.learned} şey öğrendin`);
  return `Bu ay ${bits.join(', ')} 🌷`;
}

/** Bugünün okunan dakikası ve kitaplıktaki bitmemiş kitaplar (okuma ekranında seçilsin). */
export const openBooks = (G: Growth) => G.books.filter(b => !b.done);
