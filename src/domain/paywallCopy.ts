import { LIMITS } from './premium';

/**
 * Ödeme ekranı metinleri (Moka'nın ağzından). Sayılar `LIMITS`'ten gelir; sunucu sınırlarıyla aynı kalır.
 * Dil: 'tr' Türkçe, 'ko' Korece, diğer her şey İngilizce (src/i18n/i18n.ts ile aynı kural).
 */
export type PaywallLang = 'tr' | 'en' | 'ko';

const P = LIMITS.premium;
const F = LIMITS.free;

export const PAYWALL_COPY = {
  tr: {
    eyebrow: 'MOKA\'DAN SANA',
    title: 'Her gün yanında olacağım',
    sub: 'Evin işleri hep ücretsiz kalacak. Ama ben Premium\'da seninle gerçekten konuşabiliyorum: bugün neye ihtiyacın varsa, birlikte çözeriz ☕',
    chatTitle: 'Moka seni takip eder',
    chatSub: `Günde ${P.chats} mesaja kadar benimle konuş. Seni tanırım, dünü hatırlarım, bugünü birlikte planlarız.`,
    chat: [
      { who: 'moka', text: 'Günaydın! Dün banyoyu yarım bıraktın. Bugün 10 dakikan var mı? Birlikte bitirelim 🧽' },
      { who: 'me', text: 'Akşam misafir geliyor, yetişemem gibi…' },
      { who: 'moka', text: 'Sakin. Sana 3 küçük iş çıkardım: salon, mutfak tezgâhı, antre. Takvimine ekledim. Her birini bitirince söyle, ben işaretlerim ✓' },
    ],
    lockedTitle: 'Şu an kilitli olanlar',
    locked: [
      { emoji: '💬', title: 'Moka ile sohbet', text: `Günde ${P.chats} mesaj. Sohbetten iş ekle, yapılanı işaretlet, takvime not düş.` },
      { emoji: '📸', title: 'Daha çok fotoğraf tarama', text: `Günde ${P.scans} tarama (ücretsizde haftada ${F.scans}): dolap, buzdolabı, kombin.` },
      { emoji: '🧊', title: 'Seri dondurma', text: `Ayda ${P.freezes} kez serini koru. Hasta ya da yolda olsan da seri bozulmaz.` },
      { emoji: '⭐', title: `${String(P.mult).replace('.', ',')} kat puan`, text: 'Her işte daha çok puan, evin daha hızlı büyür.' },
      { emoji: '🏡', title: '2. kat, temalar, 5 ev', text: 'Evini istediğin gibi süsle; anneannenin evi de listende dursun.' },
      { emoji: '👨‍👩‍👧', title: 'Aile paylaşımı', text: 'İşleri birlikte yapın, kim ne yaptı görün.' },
      { emoji: '🚫', title: 'Reklamsız', text: 'Sadece sen, ev ve ben.' },
    ],
    plansTitle: 'Planını seç',
    trialLine: (d: number) => `${d} gün ücretsiz dene. İstediğin zaman iptal et.`,
    ctaTrial: (d: number) => `${d} gün ücretsiz başla`,
    ctaBuy: (price: string, unit: string) => `Premium ile başla · ${price}/${unit}`,
    ctaNote: 'Deneme bitmeden iptal edersen ücret alınmaz.',
    compare: 'Ücretsiz ile Premium karşılaştırması',
    skip: 'Şimdilik ücretsiz devam',
    unitY: 'yıl', unitM: 'ay',
    legal: (plan: string, price: string, unit: string, trial: number) =>
      `Homezy Premium (${plan}): ${price}/${unit}. ${trial ? `İlk ${trial} gün ücretsiz; deneme bitmeden iptal etmezsen ${price}/${unit} tahsil edilir. ` : ''}Ödeme, satın alma onayında Apple ID / Google Play hesabından alınır. Abonelik, dönem bitiminden en az 24 saat önce iptal edilmezse her ${unit} kendiliğinden yenilenir. İptal ve yönetim: App Store / Google Play abonelik ayarları. Kart bilgilerin bize gelmez. Satın alarak Kullanım Koşulları’nı (Apple standart EULA dahil) ve Gizlilik Politikası’nı kabul edersin.`,
    planY: 'Yıllık', planM: 'Aylık',
  },
  en: {
    eyebrow: 'FROM MOKA',
    title: 'I want to see you here every day',
    sub: 'Your home chores stay free forever. But with Premium I can really talk with you: whatever you need today, we sort it out together ☕',
    chatTitle: 'Moka keeps up with you',
    chatSub: `Chat with me up to ${P.chats} messages a day. I know you, I remember yesterday, and we plan today together.`,
    chat: [
      { who: 'moka', text: 'Good morning! You left the bathroom half done yesterday. Got 10 minutes today? Let\'s finish it together 🧽' },
      { who: 'me', text: 'Guests are coming tonight, I won\'t make it…' },
      { who: 'moka', text: 'Easy. I picked 3 small tasks: living room, kitchen counter, entryway. Added to your calendar. Tell me when each is done and I\'ll tick it ✓' },
    ],
    lockedTitle: 'What\'s locked right now',
    locked: [
      { emoji: '💬', title: 'Chat with Moka', text: `${P.chats} messages a day. Add tasks from chat, tick off what's done, drop notes in your calendar.` },
      { emoji: '📸', title: 'More photo scans', text: `${P.scans} scans a day (free: ${F.scans} a week): wardrobe, fridge, outfits.` },
      { emoji: '🧊', title: 'Streak freeze', text: `Protect your streak ${P.freezes} times a month, even when you're sick or away.` },
      { emoji: '⭐', title: `${P.mult}x points`, text: 'More points on every task, your home grows faster.' },
      { emoji: '🏡', title: '2nd floor, themes, 5 homes', text: 'Decorate your way; keep grandma\'s house on your list too.' },
      { emoji: '👨‍👩‍👧', title: 'Family sharing', text: 'Do chores together and see who did what.' },
      { emoji: '🚫', title: 'No ads', text: 'Just you, your home and me.' },
    ],
    plansTitle: 'Pick your plan',
    trialLine: (d: number) => `Try free for ${d} days. Cancel anytime.`,
    ctaTrial: (d: number) => `Start ${d} days free`,
    ctaBuy: (price: string, unit: string) => `Go Premium · ${price}/${unit}`,
    ctaNote: 'Cancel before the trial ends and you won\'t be charged.',
    compare: 'Free vs Premium',
    skip: 'Continue free for now',
    unitY: 'year', unitM: 'month',
    legal: (plan: string, price: string, unit: string, trial: number) =>
      `Homezy Premium (${plan}): ${price}/${unit}. ${trial ? `Free for the first ${trial} days; if you don't cancel before the trial ends, ${price}/${unit} is charged. ` : ''}Payment is charged to your Apple ID / Google Play account at purchase confirmation. The subscription renews automatically every ${unit} unless canceled at least 24 hours before the end of the current period. Manage or cancel in your App Store / Google Play subscription settings. We never receive your card details. By subscribing you accept the Terms of Use (including Apple's standard EULA) and the Privacy Policy.`,
    planY: 'Yearly', planM: 'Monthly',
  },
  ko: {
    eyebrow: '모카가 전해요',
    title: '매일 곁에 있을게요',
    sub: '집안일은 앞으로도 계속 무료예요. 하지만 프리미엄에서는 저와 진짜 대화할 수 있어요. 오늘 필요한 게 뭐든 함께 해결해요 ☕',
    chatTitle: '모카가 챙겨드려요',
    chatSub: `하루 최대 ${P.chats}번까지 저와 이야기해요. 저는 당신을 알고, 어제를 기억하고, 오늘을 함께 계획해요.`,
    chat: [
      { who: 'moka', text: '좋은 아침이에요! 어제 욕실 청소를 반쯤 하다 말았어요. 오늘 10분 있나요? 같이 끝내요 🧽' },
      { who: 'me', text: '저녁에 손님이 오는데 시간이 안 될 것 같아요…' },
      { who: 'moka', text: '걱정 마세요. 작은 일 3개를 골랐어요: 거실, 주방 조리대, 현관. 캘린더에 넣어뒀어요. 하나씩 끝낼 때마다 알려주세요, 제가 체크할게요 ✓' },
    ],
    lockedTitle: '지금 잠겨 있는 기능',
    locked: [
      { emoji: '💬', title: '모카와 대화', text: `하루 ${P.chats}번. 대화로 할 일을 추가하고, 끝낸 일을 체크하고, 캘린더에 메모를 남겨요.` },
      { emoji: '📸', title: '사진 스캔 더 많이', text: `하루 ${P.scans}번 스캔 (무료는 주 ${F.scans}번): 옷장, 냉장고, 코디.` },
      { emoji: '🧊', title: '연속 기록 보호', text: `한 달에 ${P.freezes}번 연속 기록을 지켜요. 아프거나 여행 중이어도 끊기지 않아요.` },
      { emoji: '⭐', title: `포인트 ${P.mult}배`, text: '일을 할 때마다 포인트가 더 쌓여서 집이 더 빨리 자라요.' },
      { emoji: '🏡', title: '2층, 테마, 집 5채', text: '원하는 대로 꾸미고, 할머니 댁도 목록에 함께 두세요.' },
      { emoji: '👨‍👩‍👧', title: '가족 공유', text: '집안일을 함께 하고 누가 무엇을 했는지 확인해요.' },
      { emoji: '🚫', title: '광고 없음', text: '오직 당신, 집, 그리고 저뿐이에요.' },
    ],
    plansTitle: '플랜을 선택하세요',
    trialLine: (d: number) => `${d}일 무료 체험. 언제든 취소할 수 있어요.`,
    ctaTrial: (d: number) => `${d}일 무료로 시작`,
    ctaBuy: (price: string, unit: string) => `프리미엄 시작 · ${price}/${unit}`,
    ctaNote: '체험이 끝나기 전에 취소하면 요금이 청구되지 않아요.',
    compare: '무료와 프리미엄 비교',
    skip: '일단 무료로 계속하기',
    unitY: '년', unitM: '월',
    legal: (plan: string, price: string, unit: string, trial: number) =>
      `Homezy 프리미엄(${plan}): ${price}/${unit}. ${trial ? `처음 ${trial}일은 무료이며, 체험 종료 전에 취소하지 않으면 ${price}/${unit}이(가) 청구됩니다. ` : ''}결제는 구매 확인 시 Apple ID / Google Play 계정으로 청구됩니다. 현재 기간이 끝나기 최소 24시간 전에 취소하지 않으면 구독은 ${unit}마다 자동으로 갱신됩니다. 관리 및 취소는 App Store / Google Play 구독 설정에서 할 수 있습니다. 카드 정보는 저희에게 전달되지 않습니다. 구독하면 이용약관(Apple 표준 EULA 포함)과 개인정보 처리방침에 동의하는 것으로 간주됩니다.`,
    planY: '연간', planM: '월간',
  },
} as const;
