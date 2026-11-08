import type { ChatCtx } from './chat';

/**
 * Moka sohbetinde yapay zekâ gerekmeyen kısa mesajlar (selam, teşekkür, hoşça kal): telefonda hazır cevap
 * verilir, sunucu çağrılmaz, günlük hak düşmez. Türkçe ve İngilizce ayrı listelerdir; uygulama diline göre biri seçilir.
 */
type Kind = 'greet' | 'thanks' | 'bye';
type Lang = 'tr' | 'en';

const WORDS: Record<Lang, Record<Kind, string[]>> = {
  tr: {
    greet: ['selam', 'merhaba', 'meraba', 'mrb', 'sa', 'slm', 'naber', 'nbr', 'nasilsin', 'nasilsin moka', 'selam moka', 'merhaba moka', 'gunaydin', 'iyi aksamlar', 'hey', 'hey moka'],
    thanks: ['tesekkurler', 'tesekkur ederim', 'sagol', 'sag ol', 'eyvallah', 'tsk', 'cok sagol', 'tesekkurler moka', 'sagol moka'],
    bye: ['gorusuruz', 'hoscakal', 'hosca kal', 'bye', 'bay bay', 'iyi geceler', 'bb', 'sonra konusuruz'],
  },
  en: {
    greet: ['hi', 'hello', 'hey', 'hey moka', 'hi moka', 'hello moka', 'yo', 'sup', 'whats up', 'how are you', 'good morning', 'good evening'],
    thanks: ['thanks', 'thank you', 'thx', 'ty', 'thanks moka', 'thank you moka', 'many thanks'],
    bye: ['bye', 'goodbye', 'see you', 'see ya', 'good night', 'gn', 'later'],
  },
};

const norm = (s: string) =>
  s
    .toLocaleLowerCase('tr')
    .replace(/[çÇ]/g, 'c').replace(/[ğĞ]/g, 'g').replace(/[ıİ]/g, 'i').replace(/[öÖ]/g, 'o').replace(/[şŞ]/g, 's').replace(/[üÜ]/g, 'u')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

function greetLine(lang: Lang, ctx: ChatCtx, n: number): string {
  if (lang === 'en') {
    if (ctx.late > 0) return `Hi! ☕ ${ctx.late} task${ctx.late > 1 ? 's are' : ' is'} running late. Want to pick one and tackle it together? 💛`;
    if (ctx.due > 0) return `Hi! ☕ You have ${ctx.due} task${ctx.due > 1 ? 's' : ''} today. Ready when you are 💛`;
    return ['Hi! ☕ Nothing is waiting today, nicely done!', 'Hey there! ☕ All calm at home. Need anything?'][n % 2];
  }
  if (ctx.late > 0) return `Selam! ☕ ${ctx.late} işin gecikmiş durumda. Birini seçip birlikte halledelim mi? 💛`;
  if (ctx.due > 0) return `Selam! ☕ Bugün ${ctx.due} işin var. Hazırsan başlayalım 💛`;
  return ['Selam! ☕ Bugün bekleyen iş yok, harikasın!', 'Merhaba! ☕ Ev sakin görünüyor. Bir şey lazım mı?'][n % 2];
}

const LINES: Record<Lang, Record<Exclude<Kind, 'greet'>, string[]>> = {
  tr: {
    thanks: ['Rica ederim! ☕', 'Ne demek, her zaman 💛', 'Ne demek! Kahve molası da unutma ☕'],
    bye: ['Görüşürüz! ☕', 'İyi dinlen, yarın yine buradayım 💛', 'Hoşça kal! ☕'],
  },
  en: {
    thanks: ["You're welcome! ☕", 'Anytime 💛', "Happy to help! Don't forget a coffee break ☕"],
    bye: ['See you! ☕', "Rest well, I'll be here tomorrow 💛", 'Bye for now! ☕'],
  },
};

/** Hazır cevap varsa metni, yoksa null döner. `n` her kullanımda artar, böylece cevap değişir. */
export function cannedReply(msg: string, lang: Lang, ctx: ChatCtx, n = 0): string | null {
  const m = norm(msg);
  if (!m || m.split(' ').length > 3) return null;
  const set = WORDS[lang];
  if (set.greet.includes(m)) return greetLine(lang, ctx, n);
  for (const k of ['thanks', 'bye'] as const) {
    if (set[k].includes(m)) return LINES[lang][k][n % LINES[lang][k].length];
  }
  return null;
}
