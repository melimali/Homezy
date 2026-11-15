// Kriz algılama (kendine zarar / intihar). Model çağrılmadan ÖNCE, sunucuda ve sabit kurallarla çalışır:
// küçük model sistem istemindeki kriz kuralını atlasa bile kullanıcı her zaman aynı güvenli cevabı alır.
// Cevap sabittir (yapay zekâ üretmez), hak düşmez, mesaj saklanmaz. Saf TypeScript: jest ile test edilir.

/** Türkçe ve İngilizce kriz ifadeleri. Kasıtlı olarak geniş; yanlış alarm zararsız (sıcak bir destek mesajı), kaçırmak değil. */
const CRISIS = [
  /intihar/, /kendimi\s+(öldür|oldur|asa|asmak|kes|yak|bitir)/, /kendime\s+zarar/, /kendime\s+k[ıi]y/, /can[ıi]ma\s+k[ıi]y/,
  /(ölmek|olmek)\s*ist/, /yaşamak\s+istemiyorum/, /yasamak\s+istemiyorum/,
  /hayat[ıi]ma\s+son/, /hayata\s+veda/, /bile[ğg]imi\s+kes/, /bileklerimi\s+kes/, /(ölsem|olsem)\s+(daha\s+iyi|keşke)/,
  /ya[sş]ama(m|y[ıi]|k)?\s+(art[ıi]k\s+)?anlams[ıi]z/, /kendimi\s+(zarar|incit)/,
  /suicid/, /kill\s+my\s*self/, /end\s+my\s+life/, /take\s+my\s+(own\s+)?life/, /want\s+to\s+die/, /wanna\s+die/, /don'?t\s+want\s+to\s+(live|be\s+alive)/,
  /self[\s-]?harm/, /hurt\s+my\s*self/, /cut\s+my\s*self/, /better\s+off\s+(dead|without\s+me)/,
];

const norm = (s: string) => s.toLocaleLowerCase('tr-TR').normalize('NFC');

export function isCrisis(text: string): boolean {
  const t = norm(text);
  return CRISIS.some(re => re.test(t));
}

const REPLY_TR =
  'Bunu benimle paylaştığın için teşekkür ederim, yanındayım 💛 Ben bir yapay zekâyım, bu konuda sana gerçek destek olabilecek kişiler var. ' +
  'Şu an kendine zarar verebileceğini düşünüyorsan lütfen hemen 112\'yi ara (ya da bulunduğun ülkenin acil numarasını) ve güvendiğin biriyle, bir yakınınla ya da bir uzmanla konuş. ' +
  'Yalnız değilsin, bu duygu geçebilir. Hazır olduğunda buradayım.';

const REPLY_EN =
  'Thank you for telling me, I\'m here with you 💛 I\'m an AI, and there are real people who can help with this. ' +
  'If you might hurt yourself, please call your local emergency number right now (112 in Turkey and the EU, 988 in the US) and talk to someone you trust or a professional. ' +
  'You are not alone, and this feeling can pass. I\'ll be here whenever you\'re ready.';


const REPLY_FR =
  'Merci de m’en parler, je suis là avec toi 💛 Je suis une IA, et il existe de vraies personnes qui peuvent t’aider. ' +
  'Si tu risques de te faire du mal, appelle tout de suite le numéro d’urgence local (112 en Europe, 3114 en France pour la prévention du suicide) et parle à quelqu’un de confiance ou à un professionnel. ' +
  'Tu n’es pas seul·e, et cette sensation peut passer. Je suis là quand tu veux.';
export const crisisReply = (lang: unknown) => (lang === 'en' ? REPLY_EN : lang === 'fr' ? REPLY_FR : REPLY_TR);
