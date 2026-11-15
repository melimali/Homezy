import { LIMITS } from './premium';

/**
 * Ödeme ekranı metinleri (Moka'nın ağzından). Sayılar `LIMITS`'ten gelir; sunucu sınırlarıyla aynı kalır.
 * Dil: 'tr' Türkçe, diğer her şey İngilizce (src/i18n/i18n.ts ile aynı kural).
 */
export type PaywallLang = 'tr' | 'en' | 'fr';
export type PaywallLang = 'tr' | 'en' | 'de';
export type PaywallLang = 'tr' | 'en' | 'ja';

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
  fr: {
    eyebrow: 'DE LA PART DE MOKA',
    title: 'Je veux être là chaque jour',
    sub: 'Les tâches de la maison restent gratuites pour toujours. Mais avec Premium, je peux vraiment discuter avec toi : quoi que tu aies besoin aujourd’hui, on s’en occupe ensemble ☕',
    chatTitle: 'Moka te suit au quotidien',
    chatSub: `Discute avec moi jusqu’à ${P.chats} messages par jour. Je te connais, je me souviens d’hier, et on organise aujourd’hui ensemble.`,
    chat: [
      { who: 'moka', text: 'Bonjour ! Hier, tu as laissé la salle de bains à moitié faite. Tu as 10 minutes aujourd’hui ? On la termine ensemble 🧽' },
      { who: 'me', text: 'J’ai des invités ce soir, je n’y arriverai pas…' },
      { who: 'moka', text: 'Pas de panique. J’ai choisi 3 petites tâches : salon, plan de travail, entrée. Je les ai ajoutées à ton calendrier. Dis-moi quand chacune est finie et je la coche ✓' },
    ],
    lockedTitle: 'Ce qui est verrouillé pour l’instant',
    locked: [
      { emoji: '💬', title: 'Discuter avec Moka', text: `${P.chats} messages par jour. Ajoute des tâches depuis la discussion, fais cocher ce qui est fait, note des choses dans ton calendrier.` },
      { emoji: '📸', title: 'Plus de scans photo', text: `${P.scans} scans par jour (gratuit : ${F.scans} par semaine) : garde-robe, frigo, tenues.` },
      { emoji: '🧊', title: 'Gel de série', text: `Protège ta série ${P.freezes} fois par mois, même si tu es malade ou en voyage.` },
      { emoji: '⭐', title: `Points ×${String(P.mult).replace('.', ',')}`, text: 'Plus de points à chaque tâche, ta maison grandit plus vite.' },
      { emoji: '🏡', title: '2e étage, thèmes, 5 maisons', text: 'Décore à ton goût ; garde aussi la maison de mamie dans ta liste.' },
      { emoji: '👨‍👩‍👧', title: 'Partage en famille', text: 'Faites les tâches ensemble et voyez qui a fait quoi.' },
      { emoji: '🚫', title: 'Sans pub', text: 'Juste toi, ta maison et moi.' },
    ],
    plansTitle: 'Choisis ton offre',
    trialLine: (d: number) => `Essaie gratuitement ${d} jours. Résilie quand tu veux.`,
    ctaTrial: (d: number) => `Commencer ${d} jours gratuits`,
    ctaBuy: (price: string, unit: string) => `Passer à Premium · ${price}/${unit}`,
    ctaNote: 'Si tu résilies avant la fin de l’essai, tu ne paies rien.',
    compare: 'Gratuit vs Premium',
    skip: 'Continuer gratuitement pour l’instant',
    unitY: 'an', unitM: 'mois',
    legal: (plan: string, price: string, unit: string, trial: number) =>
      `Homezy Premium (${plan}) : ${price}/${unit}. ${trial ? `Gratuit les ${trial} premiers jours ; si tu ne résilies pas avant la fin de l’essai, ${price}/${unit} sera prélevé. ` : ''}Le paiement est débité sur ton compte Apple ID / Google Play à la confirmation de l’achat. L’abonnement se renouvelle automatiquement chaque ${unit}, sauf résiliation au moins 24 heures avant la fin de la période en cours. Gère ou résilie ton abonnement dans les réglages d’abonnement de l’App Store / Google Play. Nous ne recevons jamais les données de ta carte. En t’abonnant, tu acceptes les Conditions d’utilisation (y compris le CLUF standard d’Apple) et la Politique de confidentialité.`,
    planY: 'Annuel', planM: 'Mensuel',
  de: {
    eyebrow: 'VON MOKA',
    title: 'Ich möchte dich jeden Tag hier sehen',
    sub: 'Deine Hausarbeit bleibt für immer kostenlos. Aber mit Premium kann ich wirklich mit dir reden: Was auch immer du heute brauchst, wir lösen es zusammen ☕',
    chatTitle: 'Moka bleibt an dir dran',
    chatSub: `Schreib mir bis zu ${P.chats} Nachrichten am Tag. Ich kenne dich, ich erinnere mich an gestern, und wir planen heute zusammen.`,
    chat: [
      { who: 'moka', text: 'Guten Morgen! Gestern hast du das Bad halb fertig gelassen. Hast du heute 10 Minuten? Machen wir es zusammen fertig 🧽' },
      { who: 'me', text: 'Heute Abend kommt Besuch, das schaffe ich nicht…' },
      { who: 'moka', text: 'Ganz ruhig. Ich habe 3 kleine Aufgaben ausgesucht: Wohnzimmer, Küchenarbeitsplatte, Flur. Sie stehen schon in deinem Kalender. Sag mir Bescheid, wenn eine fertig ist, dann hake ich sie ab ✓' },
    ],
    lockedTitle: 'Was gerade gesperrt ist',
    locked: [
      { emoji: '💬', title: 'Chat mit Moka', text: `${P.chats} Nachrichten am Tag. Füge Aufgaben per Chat hinzu, hak Erledigtes ab, hinterlass Notizen im Kalender.` },
      { emoji: '📸', title: 'Mehr Foto-Scans', text: `${P.scans} Scans am Tag (kostenlos: ${F.scans} pro Woche): Kleiderschrank, Kühlschrank, Outfits.` },
      { emoji: '🧊', title: 'Serien-Freeze', text: `Schütze deine Serie ${P.freezes}-mal im Monat, auch wenn du krank oder unterwegs bist.` },
      { emoji: '⭐', title: `${String(P.mult).replace('.', ',')}-fache Punkte`, text: 'Mehr Punkte für jede Aufgabe, dein Zuhause wächst schneller.' },
      { emoji: '🏡', title: '2. Etage, Themes, 5 Zuhause', text: 'Richte dich ein, wie du willst; das Haus deiner Oma darf auch auf deiner Liste stehen.' },
      { emoji: '👨‍👩‍👧', title: 'Familienfreigabe', text: 'Erledigt Aufgaben gemeinsam und seht, wer was gemacht hat.' },
      { emoji: '🚫', title: 'Keine Werbung', text: 'Nur du, dein Zuhause und ich.' },
    ],
    plansTitle: 'Wähle deinen Tarif',
    trialLine: (d: number) => `${d} Tage kostenlos testen. Jederzeit kündbar.`,
    ctaTrial: (d: number) => `${d} Tage kostenlos starten`,
    ctaBuy: (price: string, unit: string) => `Premium holen · ${price}/${unit}`,
    ctaNote: 'Kündigst du vor Ende der Testphase, wird nichts berechnet.',
    compare: 'Kostenlos vs. Premium',
    skip: 'Vorerst kostenlos weitermachen',
    unitY: 'Jahr', unitM: 'Monat',
    legal: (plan: string, price: string, unit: string, trial: number) =>
      `Homezy Premium (${plan}): ${price}/${unit}. ${trial ? `Die ersten ${trial} Tage sind kostenlos; wenn du nicht vor Ende der Testphase kündigst, werden ${price}/${unit} berechnet. ` : ''}Die Zahlung wird bei Kaufbestätigung deinem Apple-ID- bzw. Google-Play-Konto belastet. Das Abo verlängert sich automatisch jeden ${unit}, es sei denn, es wird mindestens 24 Stunden vor Ende des laufenden Zeitraums gekündigt. Verwaltung und Kündigung in den Abo-Einstellungen von App Store / Google Play. Deine Kartendaten erhalten wir nie. Mit dem Abschluss akzeptierst du die Nutzungsbedingungen (einschließlich Apples Standard-EULA) und die Datenschutzerklärung.`,
    planY: 'Jährlich', planM: 'Monatlich',
  ja: {
    eyebrow: 'モカより',
    title: '毎日あなたのそばにいたいな',
    sub: 'おうちのタスクはずっと無料です。でもプレミアムなら、わたしとちゃんとおしゃべりできます。今日必要なことを、いっしょに解決しましょう ☕',
    chatTitle: 'モカがあなたをサポート',
    chatSub: `1日${P.chats}件までメッセージを送れます。あなたのことを知っていて、昨日のことも覚えていて、今日をいっしょに計画します。`,
    chat: [
      { who: 'moka', text: 'おはよう！昨日はお風呂掃除が途中だったね。今日10分ある？いっしょに終わらせよう 🧽' },
      { who: 'me', text: '今夜お客さんが来るから、間に合わないかも…' },
      { who: 'moka', text: '落ち着いて。小さなタスクを3つ選んだよ：リビング、キッチンのカウンター、玄関。カレンダーに入れておいたよ。終わったら教えてね、チェックしておくから ✓' },
    ],
    lockedTitle: '今ロックされている機能',
    locked: [
      { emoji: '💬', title: 'モカとおしゃべり', text: `1日${P.chats}件のメッセージ。チャットからタスクを追加したり、終わったものにチェックを入れたり、カレンダーにメモを残せます。` },
      { emoji: '📸', title: '写真スキャンをもっと', text: `1日${P.scans}回スキャン（無料は週${F.scans}回）：クローゼット、冷蔵庫、コーデ。` },
      { emoji: '🧊', title: 'ストリークフリーズ', text: `月に${P.freezes}回、ストリークを守れます。病気や外出中でも途切れません。` },
      { emoji: '⭐', title: `ポイント${P.mult}倍`, text: 'どのタスクでもポイントがたくさん、おうちがもっと早く成長します。' },
      { emoji: '🏡', title: '2階、テーマ、5つの家', text: '好きなようにおうちを飾れます。おばあちゃんの家もリストに入れておけます。' },
      { emoji: '👨‍👩‍👧', title: 'ファミリー共有', text: 'いっしょにタスクをこなして、だれが何をしたか見られます。' },
      { emoji: '🚫', title: '広告なし', text: 'あなたと、おうちと、わたしだけ。' },
    ],
    plansTitle: 'プランを選ぶ',
    trialLine: (d: number) => `${d}日間無料でお試し。いつでも解約できます。`,
    ctaTrial: (d: number) => `${d}日間無料で始める`,
    ctaBuy: (price: string, unit: string) => `プレミアムを始める · ${price}/${unit}`,
    ctaNote: 'お試し期間が終わる前に解約すれば、料金はかかりません。',
    compare: '無料とプレミアムの比較',
    skip: '今は無料で続ける',
    unitY: '年', unitM: '月',
    legal: (plan: string, price: string, unit: string, trial: number) =>
      `Homezy プレミアム（${plan}）：${price}/${unit}。${trial ? `最初の${trial}日間は無料です。お試し期間が終了する前に解約しない場合、${price}/${unit}が請求されます。` : ''}お支払いは購入確定時にApple IDまたはGoogle Playのアカウントに請求されます。サブスクリプションは、現在の期間が終了する24時間前までに解約しない限り、毎${unit}自動的に更新されます。購入後は、Apple IDまたはGoogle Playのアカウント設定から管理・解約できます。`,
    planY: '年額', planM: '月額',
  },
} as const;
