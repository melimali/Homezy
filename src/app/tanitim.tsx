import { useEffect, useRef, useState, type ComponentRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/AuthProvider';
import { useStore } from '@/store/AppStore';
import { Burst, Squish, useReduceMotion } from '@/components/motion';
import { Btn } from '@/components/ui';
import { IntroDeco, type DecoKind } from '@/components/IntroDeco';
import { MOKA_ASSETS } from '@/constants/moka';
import { LANGUAGES } from '@/i18n/translations';
import { HERO_SCENES } from '@/domain/heroScenes';
import { sfx } from '@/lib/sfx';
import { ForceScheme, brand, fonts, radius, useColors, useIsDark, type Colors } from '@/theme';

// Web önizlemesinde yerel sürücü yok; orada kaydırma JS ile izlenir.
const PAPER = '#FFFDF8';
const DECO_H = 130;
const BOTTOM = 132; // noktalar + düğme
const native = Platform.OS !== 'web';

type Copy = { eyebrow: string; title: string; text: string; /** Polaroid alt yazı şeridi. */ caption: string };
type Page = { tr: Copy; en: Copy; fr: Copy; de: Copy; es: Copy; pt: Copy; ja: Copy; ko: Copy; ar: Copy; scene: IntroScene; tint: (c: Colors) => string; deco: DecoKind };
type Lang = 'tr' | 'en' | 'fr' | 'de' | 'es' | 'pt' | 'ja' | 'ko' | 'ar';

/**
 * Polaroid sahnesi: sabit arka plan + ayrı Moka çıkartması. Konum arka plan RESMİNE göre
 * (x = yatay merkez, bottom = ayakların resmin üstünden uzaklığı, size = çıkartma genişliği; hepsi resim oranı).
 * Resim "cover" ile kırpılsa da Moka resimde aynı yerde kalır (ana ekrandaki HeroMoka ile aynı mantık).
 */
type IntroScene = { background: ImageSourcePropType; sticker: ImageSourcePropType; x: number; bottom: number; size: number };
const heroScene = (id: string): IntroScene => {
  const s = HERO_SCENES.find(h => h.id === id)!;
  return { background: s.background, sticker: s.sticker, x: s.x, bottom: s.bottom, size: s.size };
};
const SCENES: Record<string, IntroScene> = {
  hello: heroScene('salon-kanepe'),
  draw: { background: require('../../assets/arkaplan/merdiven.webp'), sticker: MOKA_ASSETS.handyman, x: 0.46, bottom: 0.9, size: 0.4 },
  sweep: { background: require('../../assets/arkaplan/koridor.webp'), sticker: MOKA_ASSETS.sweeping, x: 0.5, bottom: 0.9, size: 0.4 },
  wow: { background: require('../../assets/arkaplan/salon_tv.webp'), sticker: MOKA_ASSETS.amazed, x: 0.5, bottom: 0.9, size: 0.36 },
  garden: heroScene('bitki-kosesi'),
  read: heroScene('pencere-sedir'),
};

// Hikâye: küçük günlük işler → ev büyür (ihmalde toz, dönünce parlar) → bahçe → kendin için.
// Her sayfa: kısa başlık + başlığı tekrar etmeyen iki cümle. Metinler iki dilde ayrı yazılır, dil karışmaz.
const PAGES: Page[] = [
  {
    tr: { eyebrow: 'Tanışalım', title: 'Merhaba, ben Moka', text: 'Ev işlerini küçük, kolay adımlara bölerim. Sen her gün biraz yaparsın, gerisini birlikte hallederiz.', caption: 'Hazır mısın?' },
    en: { eyebrow: 'Say hello', title: 'Hi, I’m Moka', text: 'I break housework into small, easy steps. You do a little each day, and we handle the rest together.', caption: 'Ready?' },
    fr: { eyebrow: 'Faisons connaissance', title: 'Salut, moi c’est Moka', text: 'Je découpe les tâches ménagères en petites étapes faciles. Tu en fais un peu chaque jour, et on s’occupe du reste ensemble.', caption: 'Prêt·e ?' },
    de: { eyebrow: 'Hallo sagen', title: 'Hi, ich bin Moka', text: 'Ich teile Hausarbeit in kleine, leichte Schritte auf. Du machst jeden Tag ein bisschen, den Rest schaffen wir gemeinsam.', caption: 'Bereit?' },
    es: { eyebrow: 'Hola', title: 'Hola, soy Moka', text: 'Divido las tareas de la casa en pasos pequeños y fáciles. Tú haces un poco cada día y el resto lo hacemos juntos.', caption: '¿Listo?' },
    pt: { eyebrow: 'Oi', title: 'Oi, eu sou a Moka', text: 'Eu divido as tarefas de casa em passos pequenos e fáceis. Você faz um pouco por dia e o resto resolvemos juntos.', caption: 'Pronto?' },
    ja: { eyebrow: 'はじめまして', title: 'こんにちは、Mokaだよ', text: '家事を小さくて簡単なステップに分けるよ。毎日少しずつやれば、あとはいっしょに片付けよう。', caption: '準備はいい？' },
    ko: { eyebrow: '인사', title: '안녕, 나는 Moka야', text: '집안일을 작고 쉬운 단계로 나눠줄게. 매일 조금씩만 하면 나머지는 같이 해결해요.', caption: '준비됐어?' },
    ar: { eyebrow: 'تعارف', title: 'مرحبًا، أنا موكا', text: 'أقسّم أعمال المنزل إلى خطوات صغيرة وسهلة. أنت تفعل القليل كل يوم، ونتولى الباقي معًا.', caption: 'هل أنت جاهز؟' },
    scene: SCENES.hello,
    deco: 'hello',
    tint: c => c.peachSoft,
  },
  {
    tr: { eyebrow: 'Plan', title: 'Evini çiz', text: 'Odalarını birkaç dokunuşla yerleştir. Her odanın işleri kendiliğinden hazırlanır.', caption: 'Önce planı çizelim' },
    en: { eyebrow: 'Plan', title: 'Draw your home', text: 'Place your rooms with a few taps. Each room gets its own chores, ready to go.', caption: 'Let’s sketch it first' },
    fr: { eyebrow: 'Plan', title: 'Dessine ta maison', text: 'Place tes pièces en quelques touches. Chaque pièce reçoit ses propres tâches, prêtes à l’emploi.', caption: 'On dessine d’abord le plan' },
    de: { eyebrow: 'Plan', title: 'Zeichne dein Zuhause', text: 'Platziere deine Räume mit ein paar Fingertipps. Jeder Raum bekommt seine eigenen Aufgaben, startklar.', caption: 'Erst der Plan' },
    es: { eyebrow: 'Plan', title: 'Dibuja tu casa', text: 'Coloca tus habitaciones con unos toques. Cada una recibe sus propias tareas, listas para usar.', caption: 'Primero el plano' },
    pt: { eyebrow: 'Plano', title: 'Desenhe sua casa', text: 'Posicione os cômodos com alguns toques. Cada cômodo ganha as próprias tarefas, prontas para usar.', caption: 'Primeiro o plano' },
    ja: { eyebrow: 'プラン', title: 'おうちを描こう', text: '数回タップするだけで部屋を配置できます。部屋ごとに家事がすぐ用意されます。', caption: 'まずは間取りから' },
    ko: { eyebrow: '플랜', title: '우리 집을 그려요', text: '몇 번 터치로 방을 배치하세요. 방마다 할 일이 알아서 준비돼요.', caption: '먼저 구조부터' },
    ar: { eyebrow: 'الخطة', title: 'ارسم منزلك', text: 'ضع غرفك ببضع لمسات. تحصل كل غرفة على مهامها الخاصة جاهزة.', caption: 'لنرسم الخطة أولًا' },
    scene: SCENES.draw,
    deco: 'draw',
    tint: c => c.sageSoft,
  },
  {
    tr: { eyebrow: 'Her gün', title: 'Günde birkaç iş', text: 'Bugün ne yapacağını tek listede gör, bitirdikçe işaretle. Küçük adımlar zamanla alışkanlığa dönüşür.', caption: 'Süpürge hazır' },
    en: { eyebrow: 'Every day', title: 'A few tasks a day', text: 'See today’s to-dos in one list and tick them off. Small steps quietly turn into habits.', caption: 'Broom ready' },
    fr: { eyebrow: 'Chaque jour', title: 'Quelques tâches par jour', text: 'Vois les tâches du jour dans une seule liste et coche-les. Les petits pas deviennent doucement des habitudes.', caption: 'Le balai est prêt' },
    de: { eyebrow: 'Jeden Tag', title: 'Ein paar Aufgaben am Tag', text: 'Sieh die Aufgaben von heute in einer Liste und hake sie ab. Kleine Schritte werden leise zur Gewohnheit.', caption: 'Besen bereit' },
    es: { eyebrow: 'Cada día', title: 'Unas pocas tareas al día', text: 'Mira las tareas de hoy en una sola lista y márcalas. Los pasos pequeños se convierten en hábitos.', caption: 'Escoba lista' },
    pt: { eyebrow: 'Todo dia', title: 'Algumas tarefas por dia', text: 'Veja as tarefas de hoje numa lista só e vá marcando. Passos pequenos viram hábitos.', caption: 'Vassoura pronta' },
    ja: { eyebrow: '毎日', title: '1日に数個のタスク', text: '今日のやることを1つのリストで見て、終わったらチェック。小さな一歩がいつの間にか習慣に。', caption: 'ほうきの準備OK' },
    ko: { eyebrow: '매일', title: '하루 몇 가지 할 일', text: '오늘 할 일을 한 목록에서 보고 하나씩 체크하세요. 작은 걸음이 어느새 습관이 돼요.', caption: '빗자루 준비 완료' },
    ar: { eyebrow: 'كل يوم', title: 'بضع مهام يوميًا', text: 'شاهد مهام اليوم في قائمة واحدة وضع علامة عليها. الخطوات الصغيرة تصبح عادة.', caption: 'المكنسة جاهزة' },
    scene: SCENES.sweep,
    deco: 'tasks',
    tint: c => c.roseSoft,
  },
  {
    tr: { eyebrow: 'Evin', title: 'Evin seninle büyür', text: 'Düzenli kaldıkça evine yeni katlar eklenir. Ara verirsen toz tutar; döndüğünde yeniden parlar.', caption: 'Vay, ne büyüdü!' },
    en: { eyebrow: 'Your home', title: 'Your home grows', text: 'Stay consistent and new floors appear. Take a break and dust settles; come back and it shines again.', caption: 'Wow, look at it!' },
    fr: { eyebrow: 'Ta maison', title: 'Ta maison grandit', text: 'Reste régulier·ère et de nouveaux étages apparaissent. Fais une pause et la poussière s’installe ; reviens et tout brille à nouveau.', caption: 'Waouh, regarde ça !' },
    de: { eyebrow: 'Dein Zuhause', title: 'Dein Zuhause wächst', text: 'Bleib dran, und neue Stockwerke entstehen. Machst du Pause, setzt sich Staub; kommst du zurück, glänzt es wieder.', caption: 'Wow, schau mal!' },
    es: { eyebrow: 'Tu casa', title: 'Tu casa crece', text: 'Sé constante y aparecerán nuevos pisos. Si paras, se acumula el polvo; vuelve y brillará otra vez.', caption: '¡Guau, mira!' },
    pt: { eyebrow: 'Sua casa', title: 'Sua casa cresce', text: 'Seja constante e novos andares aparecem. Se parar, a poeira assenta; volte e ela brilha de novo.', caption: 'Uau, olha só!' },
    ja: { eyebrow: 'あなたのおうち', title: 'おうちが育つ', text: '続けるほど新しい階が増えます。休むとほこりがたまり、戻ればまたピカピカに。', caption: 'わあ、見て！' },
    ko: { eyebrow: '우리 집', title: '집이 함께 자라요', text: '꾸준히 하면 새 층이 생겨요. 쉬면 먼지가 쌓이고, 돌아오면 다시 반짝여요.', caption: '와, 많이 컸다!' },
    ar: { eyebrow: 'منزلك', title: 'منزلك ينمو', text: 'حافظ على الانتظام وستظهر طوابق جديدة. إن توقفت يتراكم الغبار، وحين تعود يلمع من جديد.', caption: 'يا للروعة!' },
    scene: SCENES.wow,
    deco: 'house',
    tint: c => c.peachSoft,
  },
  {
    tr: { eyebrow: 'Bahçe', title: 'Bahçen çiçek açar', text: 'Bitirdiğin her iş bahçene yeni bir çiçek ekler. İstikrarlı oldukça bahçen renklenir.', caption: 'Birlikte sulayalım' },
    en: { eyebrow: 'Garden', title: 'Your garden blooms', text: 'Every task you finish plants a new flower. The steadier you are, the more colorful it gets.', caption: 'Let’s water it' },
    fr: { eyebrow: 'Jardin', title: 'Ton jardin fleurit', text: 'Chaque tâche terminée plante une nouvelle fleur. Plus tu es constant·e, plus il se colore.', caption: 'On arrose ensemble' },
    de: { eyebrow: 'Garten', title: 'Dein Garten blüht', text: 'Jede erledigte Aufgabe pflanzt eine neue Blume. Je beständiger du bist, desto bunter wird er.', caption: 'Gießen wir zusammen' },
    es: { eyebrow: 'Jardín', title: 'Tu jardín florece', text: 'Cada tarea terminada planta una flor nueva. Cuanto más constante seas, más colorido será.', caption: 'Reguemos juntos' },
    pt: { eyebrow: 'Jardim', title: 'Seu jardim floresce', text: 'Cada tarefa concluída planta uma flor nova. Quanto mais constante, mais colorido.', caption: 'Vamos regar juntos' },
    ja: { eyebrow: '庭', title: '庭に花が咲く', text: '終えたタスクごとに新しい花が植わります。続けるほど庭がカラフルに。', caption: 'いっしょに水やり' },
    ko: { eyebrow: '정원', title: '정원에 꽃이 피어요', text: '할 일을 끝낼 때마다 꽃이 한 송이씩 심어져요. 꾸준할수록 더 알록달록해져요.', caption: '같이 물 주자' },
    ar: { eyebrow: 'الحديقة', title: 'حديقتك تزدهر', text: 'كل مهمة تنجزها تزرع زهرة جديدة. كلما ثبتّ أكثر، ازدادت ألوانها.', caption: 'لنسقِها معًا' },
    scene: SCENES.garden,
    deco: 'garden',
    tint: c => c.sageSoft,
  },
  {
    tr: { eyebrow: 'Kendin için', title: 'Sıra sende', text: 'Evin düzene girince spor, günlük ve huzur için vakit ayır. Disiplin evde başlar, hayatına yayılır.', caption: 'Sen de değerlisin' },
    en: { eyebrow: 'For you', title: 'Now it’s your turn', text: 'Once home is in order, make time for workouts, journaling and calm. Discipline starts at home and spreads to everything.', caption: 'You matter too' },
    fr: { eyebrow: 'Pour toi', title: 'C’est ton tour', text: 'Une fois la maison en ordre, prends du temps pour le sport, ton journal et le calme. La discipline commence à la maison et se répand partout.', caption: 'Tu comptes aussi' },
    de: { eyebrow: 'Für dich', title: 'Jetzt bist du dran', text: 'Ist das Zuhause in Ordnung, nimm dir Zeit für Sport, Tagebuch und Ruhe. Disziplin beginnt zu Hause und breitet sich aus.', caption: 'Du zählst auch' },
    es: { eyebrow: 'Para ti', title: 'Ahora te toca a ti', text: 'Cuando la casa esté en orden, dedica tiempo al deporte, al diario y a la calma. La disciplina empieza en casa y se extiende a todo.', caption: 'Tú también importas' },
    pt: { eyebrow: 'Para você', title: 'Agora é a sua vez', text: 'Com a casa em ordem, reserve tempo para treino, diário e calma. A disciplina começa em casa e se espalha.', caption: 'Você importa também' },
    ja: { eyebrow: '自分のために', title: '次はあなたの番', text: 'おうちが整ったら、運動や日記、心を休める時間を。習慣はおうちから始まり、暮らし全体に広がります。', caption: 'あなたも大切' },
    ko: { eyebrow: '나를 위해', title: '이제 네 차례', text: '집이 정돈되면 운동, 일기, 쉼을 위한 시간을 가져요. 규율은 집에서 시작해 삶 전체로 퍼져요.', caption: '너도 소중해' },
    ar: { eyebrow: 'لأجلك', title: 'حان دورك', text: 'حين يصبح المنزل مرتبًا، خصّص وقتًا للرياضة واليوميات والهدوء. الانضباط يبدأ من البيت ويمتد لكل شيء.', caption: 'أنت مهم أيضًا' },
    scene: SCENES.read,
    deco: 'self',
    tint: c => c.lavenderSoft,
  },
];


function SceneView({ scene, w, h }: { scene: IntroScene; w: number; h: number }) {
  const src = Image.resolveAssetSource(scene.background);
  const iw = src?.width || 1, ih = src?.height || 1;
  const k = Math.max(w / iw, h / ih);
  const offX = (w - iw * k) / 2, offY = (h - ih * k) / 2;
  const sz = Math.round(scene.size * iw * k);
  const feetY = offY + scene.bottom * ih * k;
  return (
    <View style={{ width: w, height: h, borderRadius: 6, overflow: 'hidden' }}>
      <Image source={scene.background} style={{ position: 'absolute', left: 0, top: 0, width: w, height: h }} resizeMode="cover" accessibilityIgnoresInvertColors />
      <Image source={scene.sticker} style={{ position: 'absolute', width: sz, height: sz, left: Math.round(offX + scene.x * iw * k - sz / 2), top: Math.round(feetY - sz) }} resizeMode="contain" accessibilityIgnoresInvertColors />
    </View>
  );
}

const UI = {
  tr: { skip: 'Atla', next: 'Devam', start: 'Hadi başlayalım', page: 'Sayfa', hintStart: 'Hesap ekranına geçer', hintNext: 'Sonraki sayfaya geçer', poke: 'Moka’ya dokun' },
  en: { skip: 'Skip', next: 'Continue', start: 'Let’s begin', page: 'Page', hintStart: 'Opens the account screen', hintNext: 'Goes to the next page', poke: 'Tap Moka' },
  fr: { skip: 'Passer', next: 'Continuer', start: 'C’est parti', page: 'Page', hintStart: 'Ouvre l’écran du compte', hintNext: 'Passe à la page suivante', poke: 'Touche Moka' },
  de: { skip: 'Überspringen', next: 'Weiter', start: 'Los geht’s', page: 'Seite', hintStart: 'Öffnet den Kontobildschirm', hintNext: 'Geht zur nächsten Seite', poke: 'Tippe Moka an' },
  es: { skip: 'Omitir', next: 'Continuar', start: 'Empecemos', page: 'Página', hintStart: 'Abre la pantalla de la cuenta', hintNext: 'Va a la página siguiente', poke: 'Toca a Moka' },
  pt: { skip: 'Pular', next: 'Continuar', start: 'Vamos começar', page: 'Página', hintStart: 'Abre a tela da conta', hintNext: 'Vai para a próxima página', poke: 'Toque na Moka' },
  ja: { skip: 'スキップ', next: '続ける', start: 'はじめよう', page: 'ページ', hintStart: 'アカウント画面を開きます', hintNext: '次のページへ進みます', poke: 'Mokaをタップ' },
  ko: { skip: '건너뛰기', next: '계속', start: '시작하자', page: '페이지', hintStart: '계정 화면으로 이동해요', hintNext: '다음 페이지로 이동해요', poke: 'Moka를 눌러봐' },
  ar: { skip: 'تخطي', next: 'متابعة', start: 'هيا نبدأ', page: 'صفحة', hintStart: 'يفتح شاشة الحساب', hintNext: 'ينتقل إلى الصفحة التالية', poke: 'المس موكا' },
};

/** İlk açılış: yana kaydırılan, Moka sahneli tanıtım. Her zaman krem (açık) temada. */
export default function Tanitim() {
  return (
    <ForceScheme scheme="light">
      <TanitimInner />
    </ForceScheme>
  );
}

function TanitimInner() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { finishIntro } = useAuth();
  const { state: appState, update } = useStore();
  const code = appState.settings.language;
  // i18n/runtime.setLang ile aynı kural: ayar yoksa ya da tr ise Türkçe, başka her şey İngilizce.
  const lang: Lang = !code || code === 'tr' ? 'tr' : (['fr', 'de', 'es', 'pt', 'ja', 'ko', 'ar'] as const).find(x => x === code) ?? 'en';
  const [switching, setSwitching] = useState(false);
  const langTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => langTimers.current.forEach(clearTimeout), []);
  const pickLang = (l: Lang) => {
    if (l === lang || switching) return;
    setSwitching(true);
    // Önce yükleme ekranı çizilsin, sonra dil değişsin; çeviri oturunca kapat.
    langTimers.current.push(setTimeout(() => update(d => void (d.settings.language = l)), 80));
    langTimers.current.push(setTimeout(() => setSwitching(false), 900));
  };
  const dark = useIsDark();
  const reduce = useReduceMotion();
  const [{ w, h }, setSize] = useState({ w: 0, h: 0 });
  const [page, setPage] = useState(0);
  const pageRef = useRef(0);
  const [pop, setPop] = useState(0);
  const scroll = useRef<ComponentRef<typeof Animated.ScrollView>>(null);
  const [x] = useState(() => new Animated.Value(0));

  const onLayout = (e: LayoutChangeEvent) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });
  const onScroll = Animated.event([{ nativeEvent: { contentOffset: { x } } }], {
    useNativeDriver: native,
    listener: (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!w) return;
      const p = Math.max(0, Math.min(PAGES.length - 1, Math.round(e.nativeEvent.contentOffset.x / w)));
      // Yan etki (ses) state güncelleyicisinin içinde olmasın: iOS'ta çizim sırasında ses oynatıcıları kurulup takılıyordu.
      if (pageRef.current === p) return;
      pageRef.current = p;
      setPage(p);
      setTimeout(() => {
        try { sfx('tap'); } catch { /* ses olmasa da olur */ }
      }, 0);
    },
  });

  const last = page === PAGES.length - 1;
  // Logo ortada; soldaki dil seçici ve sağdaki Atla ile çakışmasın.
  const logoW = Math.max(84, Math.min(156, w - 252));
  const next = () => {
    if (last) finishIntro();
    else scroll.current?.scrollTo({ x: (page + 1) * w, animated: !reduce && Platform.OS !== 'ios' });
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }} onLayout={onLayout}>
      {/* Zemin: sayfanın tonuna kayan yumuşak renk */}
      {w > 0 && PAGES.map((p, i) => (
        <Animated.View
          key={p.deco}
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: p.tint(c), opacity: x.interpolate({ inputRange: [(i - 1) * w, i * w, (i + 1) * w], outputRange: [0, 1, 0], extrapolate: 'clamp' }) }]}
        />
      ))}

      {w > 0 && (
        <Animated.ScrollView
          ref={scroll}
          horizontal
          pagingEnabled
          onScroll={onScroll}
          scrollEventThrottle={16}
          showsHorizontalScrollIndicator={false}
          bounces={false}
          overScrollMode="never"
        >
          {PAGES.map((p, i) => (
            <PageView
              key={p.deco}
              p={p}
              i={i}
              w={w}
              h={h}
              x={x}
              top={insets.top}
              bottom={insets.bottom}
              active={page === i}
              lang={lang}
              c={c}
              onPoke={() => {
                sfx('pop');
                setPop(n => n + 1);
              }}
            />
          ))}
        </Animated.ScrollView>
      )}

      {/* Üst: logo ve "Atla" */}
      <View pointerEvents="box-none" style={[st.top, { top: insets.top + 10 }]}>
        <View style={[st.langPill, { backgroundColor: c.surface }]} accessibilityRole="radiogroup">
          {Array.from(new Set<Lang>(['tr', 'en', 'fr', lang])).map(l => (
            <Pressable key={l} onPress={() => pickLang(l)} hitSlop={6} accessibilityRole="radio" accessibilityState={{ selected: lang === l }} accessibilityLabel={LANGUAGES.find(x => x.code === l)?.label ?? 'English'} style={[st.langOpt, lang === l && { backgroundColor: c.ink }]}>
              <Text style={{ fontFamily: fonts.bodyBlack, fontSize: 13.5, color: lang === l ? c.bg : c.muted }}>{l.toUpperCase()}</Text>
            </Pressable>
          ))}
        </View>
        <View pointerEvents="none" style={st.logoCenter}>
          <View style={[st.logoPill, dark && { backgroundColor: brand.mint }]}>
            <Image source={require('../../assets/logo-yatay.png')} style={{ width: logoW, height: logoW / 3 }} resizeMode="contain" accessibilityLabel="Homezy" />
          </View>
        </View>
        {!last && (
          <Pressable onPress={finishIntro} accessibilityRole="button" hitSlop={10} style={({ pressed }) => [st.skip, { backgroundColor: c.surface }, pressed && { opacity: 0.6 }]}>
            <Text style={{ fontFamily: fonts.bodyBlack, fontSize: 14, color: c.muted }}>{UI[lang].skip}</Text>
          </Pressable>
        )}
      </View>

      {switching && (
        <View style={[StyleSheet.absoluteFill, st.langLoad, { backgroundColor: c.bg }]} accessibilityLiveRegion="polite">
          <Image source={MOKA_ASSETS.happy} style={{ width: 120, height: 120 }} resizeMode="contain" />
          <ActivityIndicator color={c.ink} style={{ marginTop: 14 }} />
        </View>
      )}
      <View pointerEvents="none" style={st.burst}><Burst fire={pop} /></View>

      {/* Alt: hap şeklinde sayfa göstergesi ve buton */}
      <View pointerEvents="box-none" style={[st.bottom, { paddingBottom: insets.bottom + 18 }]}>
        {w > 0 && (
          <View style={st.dots} accessibilityLabel={`${UI[lang].page} ${page + 1} / ${PAGES.length}`}>
            {PAGES.map((_, i) => {
              const r = [(i - 1) * w, i * w, (i + 1) * w];
              const scaleX = x.interpolate({ inputRange: r, outputRange: [1, 3, 1], extrapolate: 'clamp' });
              const opacity = x.interpolate({ inputRange: r, outputRange: [0.35, 1, 0.35], extrapolate: 'clamp' });
              return <Animated.View key={i} style={[st.dot, { backgroundColor: c.ink, opacity, transform: [{ scaleX }] }]} />;
            })}
          </View>
        )}
        <Btn
          label={last ? UI[lang].start : UI[lang].next}
          kind="primary"
          onPress={next}
          style={{ alignSelf: 'stretch', paddingVertical: 16 }}
          accessibilityHint={last ? UI[lang].hintStart : UI[lang].hintNext}
        />
      </View>
    </View>
  );
}

function PageView({ p: page, i, w, h, x, top, bottom, active, lang, c, onPoke }: { p: Page; lang: Lang; i: number; w: number; h: number; x: Animated.Value; top: number; bottom: number; active: boolean; c: Colors; onPoke: () => void }) {
  const p = { ...page, ...page[lang] };
  const r = [(i - 1) * w, i * w, (i + 1) * w];
  // Kaydırırken sahne metinden yavaş kayar (parallax) ve hafifçe döner; gelen sayfa büyüyerek belirir.
  const sceneX = x.interpolate({ inputRange: r, outputRange: [w * 0.35, 0, -w * 0.35], extrapolate: 'clamp' });
  const rotate = x.interpolate({ inputRange: r, outputRange: ['6deg', i % 2 ? '1.5deg' : '-1.5deg', '-6deg'], extrapolate: 'clamp' });
  const scale = x.interpolate({ inputRange: r, outputRange: [0.82, 1, 0.82], extrapolate: 'clamp' });
  const textY = x.interpolate({ inputRange: r, outputRange: [40, 0, 40], extrapolate: 'clamp' });
  const fade = x.interpolate({ inputRange: [r[0] + w * 0.3, r[1], r[2] - w * 0.3], outputRange: [0, 1, 0], extrapolate: 'clamp' });
  // Küçük ekranda metne ve alttaki düğmeye yer kalsın diye kart yüksekliğe göre de küçülür.
  const padB = BOTTOM + bottom;
  // Kart: üstte logo, altta metin (~150), sahne (DECO_H) ve düğmeler için yer bırakır.
  // Kart yüksekliği ≈ 0,75·genişlik + 51; metin ~155, sahne en az 90 kalsın.
  const card = Math.max(150, Math.min(w - 64, 380, (h - top - 70 - padB - 51 - 22 - 155 - 90) / 0.75));

  return (
    <View style={{ width: w, height: h, paddingTop: top + 70, paddingBottom: padB, paddingHorizontal: 24, alignItems: 'center' }} accessible accessibilityLabel={`${p.eyebrow}. ${p.title}. ${p.text}`}>
      <Animated.View style={{ transform: [{ translateX: sceneX }, { rotate }, { scale }, { rotate: i % 2 ? '2.5deg' : '-2.5deg' }] }}>
        <Squish quiet onPress={onPoke} accessibilityLabel={UI[lang].poke} style={[st.polaroid, { width: card, backgroundColor: PAPER, shadowColor: c.shadow }]}>
          <View style={[st.tape, { backgroundColor: p.tint(c) }]} />
          <SceneView scene={p.scene} w={card - 28} h={((card - 28) * 3) / 4} />
          <View style={st.strip}>
            <Text style={[st.caption, { color: brand.navy }, card < 230 && { fontSize: 15.5, lineHeight: 20 }]}>{p.caption}</Text>
          </View>
        </Squish>
      </Animated.View>

      <Animated.View style={{ opacity: fade, transform: [{ translateY: textY }], width: Math.min(440, w - 48), marginTop: 22 }}>
        <Text style={[st.eyebrow, { color: c.warm }]}>{`${i + 1} / ${PAGES.length} · ${p.eyebrow}`.toLocaleUpperCase(lang === 'tr' ? 'tr-TR' : 'en-US')}</Text>
        <Text style={[st.title, { color: c.ink }]}>{p.title}</Text>
        <Text style={[st.text, { color: c.muted }]}>{p.text}</Text>
      </Animated.View>
      {/* Sahne metnin hemen altında, kalan boşluğun ortasında; düğmelere yapışmaz. */}
      <Animated.View pointerEvents="none" style={{ flex: 1, alignSelf: 'stretch', minHeight: 70, marginTop: 8, justifyContent: 'center', opacity: fade }}>
        <View style={{ flex: 1, maxHeight: DECO_H }}>
          <IntroDeco kind={p.deco} active={active} />
        </View>
      </Animated.View>
    </View>
  );
}

const st = StyleSheet.create({
  top: { position: 'absolute', left: 20, right: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  logoCenter: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  logoPill: { borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 4 },
  langLoad: { alignItems: 'center', justifyContent: 'center', zIndex: 50 },
  langPill: { flexDirection: 'row', borderRadius: radius.pill, padding: 3 },
  langOpt: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: radius.pill },
  skip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: radius.pill },
  burst: { position: 'absolute', top: '35%', alignSelf: 'center' },
  bottom: { position: 'absolute', left: 24, right: 24, bottom: 0, gap: 16, alignItems: 'center', maxWidth: 440, alignSelf: 'center' },
  dots: { flexDirection: 'row', gap: 14, height: 8, alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  polaroid: {
    borderRadius: 6, padding: 14, paddingBottom: 12,
    shadowOffset: { width: 0, height: 14 }, shadowOpacity: 1, shadowRadius: 24, elevation: 8,
  },
  strip: { gap: 8, paddingTop: 12, paddingBottom: 2, alignItems: 'center' },
  caption: { fontFamily: fonts.displayBold, fontSize: 19, lineHeight: 24 },
  tape: { position: 'absolute', top: -9, alignSelf: 'center', width: 70, height: 20, borderRadius: 7, zIndex: 2, opacity: 0.95, transform: [{ rotate: '-3deg' }] },
  badge: { position: 'absolute', top: 14, right: 14, zIndex: 3, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5 },
  badgeT: { fontFamily: fonts.bodyBlack, fontSize: 12, color: '#fff' },
  eyebrow: { fontFamily: fonts.bodyBlack, fontSize: 12, letterSpacing: 1.1, marginBottom: 6, textAlign: 'center' },
  title: { fontFamily: fonts.displayBold, fontSize: 28, lineHeight: 33, letterSpacing: -0.2, textAlign: 'center' },
  text: { fontFamily: fonts.body, fontSize: 16, lineHeight: 23, marginTop: 8, textAlign: 'center' },
});
