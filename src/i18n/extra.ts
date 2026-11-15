/**
 * Birkaç ekranda dile göre elle yazılmış cümlelerin sözlük karşılıkları (hepsi tek tabloda, `tx()` ile).
 * Türkçe metin anahtardır; runtime.ts bunları ilgili dilin sözlüğünün üstüne bindirir.
 */
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
];

export type ExtraLang = 'en' | 'de' | 'es' | 'fr' | 'pt' | 'ja' | 'ko' | 'ar';
const ORDER: ExtraLang[] = ['en', 'de', 'es', 'fr', 'pt', 'ja', 'ko', 'ar'];

export const EXTRA: Record<ExtraLang, Record<string, string>> = { en: {}, de: {}, es: {}, fr: {}, pt: {}, ja: {}, ko: {}, ar: {} };
for (const row of ROWS) ORDER.forEach((l, i) => { EXTRA[l][row[0]] = row[i + 1]!; });
