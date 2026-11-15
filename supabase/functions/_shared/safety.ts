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
  /죽고\s*싶/, /자살/, /자해/, /목숨을?\s*끊/, /살고\s*싶지\s*않/, /죽어버리/, /생을\s*마감/,
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

const REPLY_KO =
  '말씀해 주셔서 고마워요, 제가 곁에 있을게요 💛 저는 AI이고, 이 일은 실제로 도와줄 수 있는 사람들이 있어요. ' +
  '스스로를 해칠 수도 있을 것 같다면 지금 바로 가까운 응급 번호(한국은 112·119, 자살예방상담전화 109)로 전화하고, 믿을 수 있는 사람이나 전문가와 이야기해 주세요. ' +
  '당신은 혼자가 아니고, 이 마음은 지나갈 수 있어요. 준비되면 언제든 여기 있을게요.';

export const crisisReply = (lang: unknown) => (lang === 'en' ? REPLY_EN : lang === 'ko' ? REPLY_KO : REPLY_TR);
