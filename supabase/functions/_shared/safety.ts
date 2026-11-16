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
  /quiero\s+morir/, /quitarme\s+la\s+vida/, /acabar\s+con\s+mi\s+vida/, /no\s+quiero\s+vivir/, /hacerme\s+da[ñn]o/, /matarme/, /autolesi/, /mejor\s+(estar[ií]a\s+)?muert/,
  /죽고\s*싶/, /자살/, /자해/, /목숨을?\s*끊/, /살고\s*싶지\s*않/, /죽어버리/, /생을\s*마감/,
  /انتحار/, /[اأإ]نتحر/, /[اأإ]قتل\s+نفسي/, /[اأإ]ريد\s+([اأإ]ن\s+)?[اأإ]موت/, /لا\s+[اأإ]ريد\s+([اأإ]ن\s+)?[اأإ]عيش/, /[اأإ]ؤذي\s+نفسي/, /[اأإ]يذاء\s+نفسي/, /[اأإ]نهي\s+حياتي/,
  /quero\s+morrer/, /tirar\s+(a\s+)?minha\s+vida/, /acabar\s+com\s+(a\s+)?minha\s+vida/, /n[ãa]o\s+quero\s+(mais\s+)?viver/, /me\s+machucar/, /me\s+matar/, /autoles/, /melhor\s+(eu\s+)?(estar\s+)?morto/,
  /ich\s+will\s+(nicht\s+mehr\s+leben|sterben)/, /nicht\s+mehr\s+leben/, /suizid/, /selbstmord/, /mir\s+(et)?was\s+antun/, /umbringen/, /selbstverletz/,
  /je\s+veux\s+mourir/, /me\s+suicider/, /mettre\s+fin\s+[àa]\s+(mes\s+jours|ma\s+vie)/, /plus\s+envie\s+de\s+vivre/, /me\s+faire\s+du\s+mal/, /automutil/,
  /死にたい/, /自殺/, /消えたい/, /自傷/, /生きていたくない/,
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
const REPLY_ES =
  'Gracias por contármelo, estoy contigo 💛 Soy una IA, y hay personas reales que pueden ayudarte con esto. ' +
  'Si podrías hacerte daño, por favor llama ahora mismo a tu número de emergencias local (112 en España y la UE, 911 en México y EE. UU.; en España también el 024, línea de atención a la conducta suicida) y habla con alguien de confianza o con un profesional. ' +
  'No estás solo y este sentimiento puede pasar. Aquí estaré cuando estés listo.';

const REPLY_DE =
  'Danke, dass du es mir sagst, ich bin bei dir 💛 Ich bin eine KI, und es gibt echte Menschen, die dir dabei helfen können. ' +
  'Wenn du dir etwas antun könntest, ruf bitte jetzt den Notruf an (112 in Deutschland, Österreich und der EU) oder die Telefonseelsorge (0800 111 0 111, kostenlos und rund um die Uhr) und sprich mit jemandem, dem du vertraust, oder mit einer Fachperson. ' +
  'Du bist nicht allein, und dieses Gefühl kann vorübergehen. Ich bin hier, wenn du bereit bist.';

const REPLY_JA =
  '話してくれてありがとう。そばにいるよ 💛 わたしはAIだけど、あなたを支えてくれる本当の人たちがいます。' +
  '自分を傷つけてしまいそうなときは、今すぐ119番か、よりそいホットライン（0120-279-338、24時間・無料）に電話して、信頼できる人や専門家に話してください。' +
  'あなたはひとりじゃないし、この気持ちは過ぎ去っていきます。準備ができたら、いつでもここにいるよ。';

const REPLY_KO =
  '말씀해 주셔서 고마워요, 제가 곁에 있을게요 💛 저는 AI이고, 이 일은 실제로 도와줄 수 있는 사람들이 있어요. ' +
  '스스로를 해칠 수도 있을 것 같다면 지금 바로 가까운 응급 번호(한국은 112·119, 자살예방상담전화 109)로 전화하고, 믿을 수 있는 사람이나 전문가와 이야기해 주세요. ' +
  '당신은 혼자가 아니고, 이 마음은 지나갈 수 있어요. 준비되면 언제든 여기 있을게요.';

const REPLY_AR =
  'شكرًا لأنك أخبرتني، أنا معك 💛 أنا ذكاء اصطناعي، وهناك أشخاص حقيقيون يستطيعون مساعدتك في هذا. ' +
  'إذا كنت تفكّر في إيذاء نفسك، فاتصل الآن برقم الطوارئ في بلدك (112 في تركيا والاتحاد الأوروبي، 988 في الولايات المتحدة) وتحدّث مع شخص تثق به أو مع مختص. ' +
  'لست وحدك، وهذا الشعور يمكن أن يزول. سأكون هنا متى كنت مستعدًا.';

const REPLY_PT =
  'Obrigada por me contar, estou aqui com você 💛 Sou uma IA, e existem pessoas de verdade que podem te ajudar com isso. ' +
  'Se você pode se machucar, por favor ligue agora para o número de emergência local (192 ou 188 no Brasil, 112 em Portugal) e fale com alguém de confiança ou com um profissional. ' +
  'Você não está sozinho(a) e esse sentimento pode passar. Estarei aqui quando você estiver pronto(a).';


const REPLIES: Record<string, string> = { tr: REPLY_TR, en: REPLY_EN, fr: REPLY_FR, es: REPLY_ES, de: REPLY_DE, ja: REPLY_JA, ko: REPLY_KO, ar: REPLY_AR, pt: REPLY_PT };
export const crisisReply = (lang: unknown) => (typeof lang === 'string' && REPLIES[lang]) || REPLY_TR;
