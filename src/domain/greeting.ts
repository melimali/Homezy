/** Yerel saate göre karşılama. Ana ekranın üstünde ve sabah özetinin başlığında kullanılır. */
export function greeting(now = new Date()) {
  const h = now.getHours();
  if (h >= 5 && h < 12) return { hello: 'Günaydın', emoji: '☀️', line: 'Güne güzel bir başlangıç yapalım.' };
  if (h >= 12 && h < 17) return { hello: 'İyi öğlenler', emoji: '🌤️', line: 'Günün yarısı geride, harika gidiyorsun.' };
  if (h >= 17 && h < 22) return { hello: 'İyi akşamlar', emoji: '🌇', line: 'Evde huzurlu bir akşam olsun.' };
  return { hello: 'İyi geceler', emoji: '🌙', line: 'Yarına hazır, tatlı rüyalar.' };
}

/** "Günaydın Melih! ☀️" Ad yoksa "Günaydın! ☀️" */
export function greet(now = new Date(), name?: string | null) {
  const g = greeting(now);
  const who = name?.trim() && name !== 'Misafir' ? ` ${name.trim().split(/\s+/)[0]}` : '';
  return `${g.hello}${who}! ${g.emoji}`;
}
