/**
 * Birkaç ekranda dile göre elle yazılmış cümlelerin sözlük karşılıkları (hepsi tek tabloda, `tx()` ile).
 * Türkçe metin anahtardır; runtime.ts bunları ilgili dilin sözlüğünün üstüne bindirir.
 */
import { ROZET_ROWS } from './rozet';

type Row = [tr: string, en: string, de: string, es: string, fr: string, pt: string, ja: string, ko: string, ar: string];

const ROWS: Row[] = [
  ['Premium üyesin ✓ Tüm özellikler açık', 'You are Premium ✓ Everything is unlocked', 'Du bist Premium ✓ Alles ist freigeschaltet', 'Eres Premium ✓ Todo está desbloqueado', 'Tu es Premium ✓ Tout est débloqué', 'Você é Premium ✓ Tudo está liberado', 'Premium会員です ✓ すべての機能が使えます', '프리미엄 회원이에요 ✓ 모든 기능이 열려 있어요', 'أنت مشترك في بريميوم ✓ كل شيء مفتوح'],
  ['Moka ile sohbet, 1,5 kat puan, reklamsız ve fazlası. İstediğin zaman iptal et.', 'Chat with Moka, 1.5x points, no ads and more. Cancel anytime.', 'Chatte mit Moka, 1,5-fache Punkte, keine Werbung und mehr. Jederzeit kündbar.', 'Chatea con Moka, puntos ×1,5, sin anuncios y más. Cancela cuando quieras.', 'Discute avec Moka, points ×1,5, sans pub et plus encore. Résilie quand tu veux.', 'Converse com a Moka, pontos ×1,5, sem anúncios e mais. Cancele quando quiser.', 'Mokaとチャット、ポイント1.5倍、広告なしなど。いつでも解約できます。', 'Moka와 채팅, 포인트 1.5배, 광고 없음 등. 언제든 해지할 수 있어요.', 'تحدّث مع موكا، نقاط ×1.5، بلا إعلانات وأكثر. ألغِ في أي وقت.'],
  ['🎁 İlk {} gün ücretsiz!', '🎁 First {} days free!', '🎁 Die ersten {} Tage gratis!', '🎁 ¡Los primeros {} días gratis!', '🎁 {} premiers jours gratuits !', '🎁 Primeiros {} dias grátis!', '🎁 最初の{}日間は無料！', '🎁 처음 {}일 무료!', '🎁 أول {} أيام مجانًا!'],
  ["Homezy her sabah {}'da bunları telefonuna bildirim olarak gönderir.", 'Every morning at {} Homezy sends these to your phone as a notification.', 'Jeden Morgen um {} Uhr sendet Homezy dir diese als Benachrichtigung aufs Handy.', 'Cada mañana a las {} Homezy te envía esto como notificación al móvil.', 'Chaque matin à {}, Homezy t’envoie ceci en notification sur ton téléphone.', 'Toda manhã às {} o Homezy envia isto como notificação para o seu celular.', '毎朝{}に、Homezyがこれらを通知でスマホにお届けします。', '매일 아침 {}에 Homezy가 이 내용을 알림으로 보내드려요.', 'كل صباح في {} يرسل Homezy هذه إلى هاتفك كإشعار.'],
  ['Eksikler yaklaşık {} tutar. Fiyatlar tahminidir.', 'The missing items cost about {}. Prices are estimates.', 'Die fehlenden Zutaten kosten etwa {}. Preise sind Schätzungen.', 'Lo que falta cuesta unos {}. Los precios son estimados.', 'Ce qui manque coûte environ {}. Les prix sont des estimations.', 'O que falta custa cerca de {}. Os preços são estimativas.', '足りないものは約{}です。価格は目安です。', '부족한 것은 약 {}이에요. 가격은 추정치예요.', 'الناقص يكلّف نحو {}. الأسعار تقديرية.'],
  ['Vazgeç', 'Cancel', 'Abbrechen', 'Cancelar', 'Annuler', 'Cancelar', 'キャンセル', '취소', 'إلغاء'],
  ['Kaydet', 'Save', 'Speichern', 'Guardar', 'Enregistrer', 'Salvar', '保存', '저장', 'حفظ'],
  ['Oda adı', 'Room name', 'Raumname', 'Nombre de la habitación', 'Nom de la pièce', 'Nome do cômodo', '部屋の名前', '방 이름', 'اسم الغرفة'],
  ['Oda adını değiştir', 'Rename room', 'Raum umbenennen', 'Renombrar habitación', 'Renommer la pièce', 'Renomear cômodo', '部屋の名前を変更', '방 이름 바꾸기', 'تغيير اسم الغرفة'],
  ['Çeviri hatası mı gördün? Bize yaz, birlikte düzeltelim 💛', 'Spotted a translation mistake? Write to us and we’ll fix it together 💛', 'Einen Übersetzungsfehler entdeckt? Schreib uns, wir korrigieren ihn gemeinsam 💛', '¿Viste un error de traducción? Escríbenos y lo arreglamos juntos 💛', 'Une erreur de traduction ? Écris-nous, on la corrige ensemble 💛', 'Viu um erro de tradução? Escreva para nós e corrigimos juntos 💛', '翻訳のミスを見つけたら、ぜひ教えてください。いっしょに直しましょう 💛', '번역 오류를 발견하셨나요? 알려주세요, 함께 고쳐요 💛', 'هل لاحظت خطأً في الترجمة؟ راسلنا وسنصلحه معًا 💛'],
  ['Bahçeyi göster', 'Show garden', 'Garten zeigen', 'Mostrar jardín', 'Afficher le jardin', 'Mostrar jardim', '庭を表示', '정원 보기', 'إظهار الحديقة'],
  ['Bahçeyi gizle', 'Hide garden', 'Garten ausblenden', 'Ocultar jardín', 'Masquer le jardin', 'Ocultar jardim', '庭を隠す', '정원 숨기기', 'إخفاء الحديقة'],
  ['Bahçeye git', 'Go to garden', 'Zum Garten', 'Ir al jardín', 'Aller au jardin', 'Ir ao jardim', '庭へ行く', '정원으로 가기', 'اذهب إلى الحديقة'],
  ['🌷 Bahçe', '🌷 Garden', '🌷 Garten', '🌷 Jardín', '🌷 Jardin', '🌷 Jardim', '🌷 庭', '🌷 정원', '🌷 الحديقة'],
  ['Bahçen henüz boş. İlk tohumu ek, işlerle büyüsün 🌱', 'Your garden is empty. Plant the first seed and grow it with your chores 🌱', 'Dein Garten ist noch leer. Pflanze den ersten Samen, mit Aufgaben wächst er 🌱', 'Tu jardín está vacío. Planta la primera semilla y hazla crecer con tus tareas 🌱', 'Ton jardin est vide. Plante la première graine, elle grandit avec tes tâches 🌱', 'Seu jardim está vazio. Plante a primeira semente e cresça com suas tarefas 🌱', '庭はまだ空っぽです。最初の種をまいて、家事で育てましょう 🌱', '정원이 아직 비어 있어요. 첫 씨앗을 심고 집안일로 키워보세요 🌱', 'حديقتك فارغة بعد. ازرع أول بذرة ودعها تنمو بمهامك 🌱'],
  ['Her iş çiçeklerine su olur 💧', 'Every chore waters your flowers 💧', 'Jede Aufgabe gießt deine Blumen 💧', 'Cada tarea riega tus flores 💧', 'Chaque tâche arrose tes fleurs 💧', 'Cada tarefa rega suas flores 💧', '家事をするたびに花に水がやれます 💧', '집안일을 할 때마다 꽃에 물이 줘져요 💧', 'كل مهمة تسقي أزهارك 💧'],
  ['Çiçekler susadı. Bir iş yap, hemen canlanırlar 🥀', 'The flowers are thirsty. Do one chore and they perk right up 🥀', 'Die Blumen haben Durst. Erledige eine Aufgabe, und sie blühen auf 🥀', 'Las flores tienen sed. Haz una tarea y revivirán al instante 🥀', 'Les fleurs ont soif. Fais une tâche et elles revivent aussitôt 🥀', 'As flores estão com sede. Faça uma tarefa e elas revivem na hora 🥀', '花がのどが渇いています。家事を1つすればすぐ元気になります 🥀', '꽃이 목말라해요. 집안일을 하나 하면 바로 살아나요 🥀', 'الأزهار عطشى. أنجز مهمة وستنتعش فورًا 🥀'],
];

export type ExtraLang = 'en' | 'de' | 'es' | 'fr' | 'pt' | 'ja' | 'ko' | 'ar';
const ORDER: ExtraLang[] = ['en', 'de', 'es', 'fr', 'pt', 'ja', 'ko', 'ar'];

export const EXTRA: Record<ExtraLang, Record<string, string>> = { en: {}, de: {}, es: {}, fr: {}, pt: {}, ja: {}, ko: {}, ar: {} };
for (const row of [...ROWS, ...ROZET_ROWS]) ORDER.forEach((l, i) => { EXTRA[l][row[0]] = row[i + 1]!; });
