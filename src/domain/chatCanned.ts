import type { ChatCtx } from './chat';

/**
 * Moka sohbetinde yapay zekâ gerekmeyen kısa mesajlar (selam, teşekkür, hoşça kal): telefonda hazır cevap
 * verilir, sunucu çağrılmaz, günlük hak düşmez. Türkçe ve İngilizce ayrı listelerdir; uygulama diline göre biri seçilir.
 */
type Kind = 'greet' | 'thanks' | 'bye';
type Lang = 'tr' | 'en' | 'fr' | 'de' | 'es' | 'pt' | 'ja' | 'ko' | 'ar';

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
  fr: {
    greet: ['salut', 'bonjour', 'coucou', 'hello', 'hey', 'hey moka', 'salut moka', 'bonjour moka', 'bonsoir', 'ca va', 'comment ca va'],
    thanks: ['merci', 'merci moka', 'merci beaucoup', 'mrc', 'thanks'],
    bye: ['au revoir', 'a bientot', 'a plus', 'bye', 'bonne nuit', 'salut a plus', 'ciao'],
  },
  de: {
    greet: ['hi', 'hallo', 'hey', 'hey moka', 'hi moka', 'hallo moka', 'moin', 'servus', 'na', 'wie gehts', 'guten morgen', 'guten abend', 'guten tag'],
    thanks: ['danke', 'danke dir', 'danke schon', 'vielen dank', 'dankeschon', 'danke moka', 'thx', 'dankee'],
    bye: ['tschuss', 'tschau', 'ciao', 'bis spater', 'bis bald', 'bis morgen', 'gute nacht', 'gn', 'auf wiedersehen'],
  },
  es: {
    greet: ['hola', 'hola moka', 'buenas', 'buenos dias', 'buenas tardes', 'buenas noches', 'que tal', 'como estas', 'hey', 'hey moka'],
    thanks: ['gracias', 'muchas gracias', 'gracias moka', 'mil gracias', 'thx', 'thanks'],
    bye: ['adios', 'hasta luego', 'hasta manana', 'chao', 'nos vemos', 'buenas noches', 'bye'],
  },
  pt: {
    greet: ['oi', 'ola', 'oi moka', 'ola moka', 'e ai', 'eai', 'tudo bem', 'como vai', 'bom dia', 'boa tarde', 'boa noite', 'opa', 'oie'],
    thanks: ['obrigado', 'obrigada', 'valeu', 'muito obrigado', 'muito obrigada', 'obrigado moka', 'obrigada moka', 'brigado', 'brigada'],
    bye: ['tchau', 'ate logo', 'ate mais', 'ate amanha', 'xau', 'fui', 'flw', 'tchau moka'],
  },
  ja: {
    greet: ['hi', 'hello', 'hey', 'hey moka', 'hi moka', 'こんにちは', 'こんにちわ', 'こんばんは', 'おはよう', 'おはようございます', 'やあ', 'もしもし', 'モカ', 'こんにちは モカ', 'おはよう モカ'],
    thanks: ['ありがとう', 'ありがとうございます', 'ありがとう モカ', 'どうも', 'サンキュー', 'thx', 'thanks', 'ありがと', '感謝'],
    bye: ['バイバイ', 'じゃあね', 'またね', 'さようなら', 'おやすみ', 'おやすみなさい', 'また明日', 'bye', 'ばいばい'],
  },
  ko: {
    greet: ['안녕', '안녕하세요', '안녕 모카', '하이', '헬로', '좋은 아침', '굿모닝', 'hi', 'hello', 'hey', 'hey moka'],
    thanks: ['고마워', '고마워요', '감사합니다', '감사해요', '고마워 모카', '땡큐', 'thx', 'thanks'],
    bye: ['잘가', '안녕히 가세요', '다음에 봐', '잘 자', '잘자', '내일 봐', '바이', 'bye'],
  },
  ar: {
    greet: ['مرحبا', 'مرحبا موكا', 'اهلا', 'اهلا موكا', 'السلام عليكم', 'سلام', 'هلا', 'هاي', 'صباح الخير', 'مساء الخير', 'كيف حالك', 'كيفك', 'شلونك'],
    thanks: ['شكرا', 'شكرا موكا', 'شكرا لك', 'شكرا جزيلا', 'مشكور', 'يعطيك العافية', 'تسلم'],
    bye: ['وداعا', 'مع السلامة', 'الى اللقاء', 'تصبح على خير', 'تصبحين على خير', 'اراك لاحقا', 'باي'],
  },
};

const norm = (s: string) =>
  s
    .toLocaleLowerCase('tr')
    .replace(/[çÇ]/g, 'c').replace(/[ğĞ]/g, 'g').replace(/[ıİ]/g, 'i').replace(/[öÖ]/g, 'o').replace(/[şŞ]/g, 's').replace(/[üÜ]/g, 'u')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').normalize('NFC')
    .replace(/['’]/g, '')
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
    .replace(/[^a-z0-9\u0621-\u064A\u3040-\u30ff\u4e00-\u9fff\uac00-\ud7a3 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

function greetLine(lang: Lang, ctx: ChatCtx, n: number): string {
  if (lang === 'en') {
    if (ctx.late > 0) return `Hi! ☕ ${ctx.late} task${ctx.late > 1 ? 's are' : ' is'} running late. Want to pick one and tackle it together? 💛`;
    if (ctx.due > 0) return `Hi! ☕ You have ${ctx.due} task${ctx.due > 1 ? 's' : ''} today. Ready when you are 💛`;
    return ['Hi! ☕ Nothing is waiting today, nicely done!', 'Hey there! ☕ All calm at home. Need anything?'][n % 2];
  }
  if (lang === 'fr') {
    if (ctx.late > 0) return `Salut ! ☕ ${ctx.late} tâche${ctx.late > 1 ? 's sont' : ' est'} en retard. On en choisit une et on s’y met ensemble ? 💛`;
    if (ctx.due > 0) return `Salut ! ☕ Tu as ${ctx.due} tâche${ctx.due > 1 ? 's' : ''} aujourd’hui. Quand tu es prêt·e, on y va 💛`;
    return ['Salut ! ☕ Rien ne t’attend aujourd’hui, bravo !', 'Coucou ! ☕ Tout est calme à la maison. Tu as besoin de quelque chose ?'][n % 2];
  }
  if (lang === 'de') {
    if (ctx.late > 0) return `Hi! ☕ ${ctx.late} ${ctx.late > 1 ? 'Aufgaben sind' : 'Aufgabe ist'} überfällig. Sollen wir uns eine aussuchen und sie zusammen angehen? 💛`;
    if (ctx.due > 0) return `Hi! ☕ Du hast heute ${ctx.due} ${ctx.due > 1 ? 'Aufgaben' : 'Aufgabe'}. Ich bin bereit, wenn du es bist 💛`;
    return ['Hi! ☕ Heute wartet nichts auf dich, gut gemacht!', 'Hallo! ☕ Zu Hause ist alles ruhig. Brauchst du etwas?'][n % 2];
  }
  if (lang === 'es') {
    if (ctx.late > 0) return `¡Hola! ☕ Tienes ${ctx.late} ${ctx.late > 1 ? 'tareas atrasadas' : 'tarea atrasada'}. ¿Elegimos una y la hacemos juntos? 💛`;
    if (ctx.due > 0) return `¡Hola! ☕ Hoy tienes ${ctx.due} ${ctx.due > 1 ? 'tareas' : 'tarea'}. Cuando estés listo, empezamos 💛`;
    return ['¡Hola! ☕ Hoy no te espera nada, ¡bien hecho!', '¡Buenas! ☕ La casa está tranquila. ¿Necesitas algo?'][n % 2];
  }
  if (lang === 'pt') {
    if (ctx.late > 0) return `Oi! ☕ Você tem ${ctx.late} ${ctx.late > 1 ? 'tarefas atrasadas' : 'tarefa atrasada'}. Que tal escolher uma e resolver juntos? 💛`;
    if (ctx.due > 0) return `Oi! ☕ Você tem ${ctx.due} ${ctx.due > 1 ? 'tarefas' : 'tarefa'} hoje. Quando estiver pronto, vamos 💛`;
    return ['Oi! ☕ Nada pendente hoje, parabéns!', 'Olá! ☕ A casa está tranquila. Precisa de alguma coisa?'][n % 2];
  }
  if (lang === 'ja') {
    if (ctx.late > 0) return `こんにちは！☕ 期限切れのタスクが${ctx.late}件あります。ひとつ選んで、いっしょに片付けましょう 💛`;
    if (ctx.due > 0) return `こんにちは！☕ 今日のタスクは${ctx.due}件です。準備ができたら始めましょう 💛`;
    return ['こんにちは！☕ 今日待っているタスクはありません。すごい！', 'やあ！☕ おうちは穏やかですね。何か手伝いましょうか？'][n % 2];
  }
  if (lang === 'ko') {
    if (ctx.late > 0) return `안녕! ☕ 밀린 할 일이 ${ctx.late}개 있어요. 하나 골라서 같이 해볼까요? 💛`;
    if (ctx.due > 0) return `안녕! ☕ 오늘 할 일이 ${ctx.due}개 있어요. 준비되면 시작해요 💛`;
    return ['안녕! ☕ 오늘은 기다리는 일이 없어요, 잘했어요!', '안녕하세요! ☕ 집이 평화롭네요. 필요한 거 있어요?'][n % 2];
  }
  if (lang === 'ar') {
    if (ctx.late > 0) return `مرحبًا! ☕ لديك ${ctx.late} مهام متأخرة. هل نختار واحدة وننجزها معًا؟ 💛`;
    if (ctx.due > 0) return `مرحبًا! ☕ لديك ${ctx.due} مهام اليوم. أنا جاهزة متى شئت 💛`;
    return ['مرحبًا! ☕ لا شيء ينتظرك اليوم، أحسنت!', 'أهلًا! ☕ المنزل هادئ. هل تحتاج شيئًا؟'][n % 2];
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
  fr: {
    thanks: ['Avec plaisir ! ☕', 'Quand tu veux 💛', 'Avec plaisir ! N’oublie pas ta pause café ☕'],
    bye: ['À bientôt ! ☕', 'Repose-toi bien, je serai là demain 💛', 'À plus ! ☕'],
  },
  de: {
    thanks: ['Gern geschehen! ☕', 'Jederzeit 💛', 'Gern! Vergiss die Kaffeepause nicht ☕'],
    bye: ['Bis bald! ☕', 'Ruh dich gut aus, ich bin morgen wieder da 💛', 'Tschüss! ☕'],
  },
  es: {
    thanks: ['¡De nada! ☕', 'Cuando quieras 💛', '¡Un placer! No olvides tu pausa para el café ☕'],
    bye: ['¡Hasta pronto! ☕', 'Descansa, mañana sigo aquí 💛', '¡Chao! ☕'],
  },
  pt: {
    thanks: ['De nada! ☕', 'Sempre que precisar 💛', 'Imagina! Não esqueça a pausa para o café ☕'],
    bye: ['Até logo! ☕', 'Descanse bem, amanhã estou aqui 💛', 'Tchau! ☕'],
  },
  ja: {
    thanks: ['どういたしまして！☕', 'いつでもどうぞ 💛', 'お役に立てて嬉しいです！コーヒーブレイクも忘れずに ☕'],
    bye: ['またね！☕', 'ゆっくり休んでね、明日もここにいるよ 💛', 'いったんバイバイ！☕'],
  },
  ko: {
    thanks: ['천만에요! ☕', '언제든지요 💛', '도움이 되어 기뻐요! 커피 한 잔 쉬는 것도 잊지 마세요 ☕'],
    bye: ['또 만나요! ☕', '푹 쉬세요, 내일도 여기 있을게요 💛', '안녕! ☕'],
  },
  ar: {
    thanks: ['عفوًا! ☕', 'في أي وقت 💛', 'يسعدني ذلك! ولا تنسَ استراحة القهوة ☕'],
    bye: ['إلى اللقاء! ☕', 'استرح جيدًا، سأكون هنا غدًا 💛', 'مع السلامة! ☕'],
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
