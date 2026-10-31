// Uygulamanın ses efektlerini üretir (assets/sounds/*.wav). Sesler burada sentezlenir, dışarıdan
// alınmış bir kayıt yok; lisans derdi olmasın diye. Değiştirmek için: node scripts/make-sounds.js
/* global Buffer, __dirname */
const fs = require('fs');
const path = require('path');

const RATE = 44100;

/** Yumuşak, çan benzeri bir nota: ana ton + iki üst ton, hızlı atak, üstel sönüm. */
function bell(f, start, dur, gain, buf) {
  const s0 = Math.floor(start * RATE);
  const n = Math.floor(dur * RATE);
  for (let i = 0; i < n && s0 + i < buf.length; i++) {
    const t = i / RATE;
    const attack = Math.min(1, t / 0.006);
    const env = attack * Math.exp(-t * (4.5 / dur));
    const v = Math.sin(2 * Math.PI * f * t) + 0.35 * Math.sin(2 * Math.PI * f * 2 * t) * Math.exp(-t * 8) + 0.12 * Math.sin(2 * Math.PI * f * 3.01 * t) * Math.exp(-t * 14);
    buf[s0 + i] += v * env * gain;
  }
}

/** Kısa, tok bir "pıt": perdesi hızla düşen bir sinüs. */
function pop(start, gain, buf) {
  const s0 = Math.floor(start * RATE);
  const n = Math.floor(0.07 * RATE);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    const f = 520 * Math.exp(-t * 22) + 260;
    ph += (2 * Math.PI * f) / RATE;
    buf[s0 + i] += Math.sin(ph) * Math.min(1, t / 0.002) * Math.exp(-t * 55) * gain;
  }
}

function write(name, seconds, draw) {
  const buf = new Float32Array(Math.ceil(seconds * RATE));
  draw(buf);
  const peak = buf.reduce((m, v) => Math.max(m, Math.abs(v)), 0) || 1;
  const pcm = Buffer.alloc(buf.length * 2);
  for (let i = 0; i < buf.length; i++) {
    // Sonda kısa bir kısma, tık sesi olmasın.
    const fade = Math.min(1, (buf.length - i) / (0.01 * RATE));
    pcm.writeInt16LE(Math.round((buf[i] / peak) * 0.8 * fade * 32767), i * 2);
  }
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8);
  h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(RATE, 24); h.writeUInt32LE(RATE * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34);
  h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
  const out = path.join(__dirname, '..', 'assets', 'sounds', `${name}.wav`);
  fs.writeFileSync(out, Buffer.concat([h, pcm]));
  console.log(out, `${(seconds * 1000) | 0} ms`);
}

const NOTE = { C5: 523.25, E5: 659.25, G5: 783.99, A5: 880, C6: 1046.5, D6: 1174.66, E6: 1318.51, G6: 1567.98 };

// Dokunuş: çok kısa ve yumuşak.
write('tap', 0.09, b => pop(0, 1, b));
// İş tamamlandı: iki notalı neşeli bir çan.
write('done', 0.55, b => { bell(NOTE.E5, 0, 0.45, 0.8, b); bell(NOTE.C6, 0.09, 0.45, 1, b); });
// Puan: küçük bir ışıltı.
write('coin', 0.45, b => { bell(NOTE.E6, 0, 0.3, 0.7, b); bell(NOTE.G6, 0.07, 0.35, 0.8, b); });
// Kutlama (ev bitti, oda tertemiz): yükselen dörtlü.
write('party', 1.1, b => {
  [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6].forEach((f, i) => bell(f, i * 0.11, 0.7, 0.8, b));
  bell(NOTE.E6, 0.44, 0.6, 0.5, b);
});
// Seviye atlama: iki katlı yükselen arpej ve parlak son.
write('levelup', 1.4, b => {
  [NOTE.C5, NOTE.G5, NOTE.C6, NOTE.E6, NOTE.G6].forEach((f, i) => bell(f, i * 0.1, 0.8, 0.75, b));
  bell(NOTE.C6, 0.55, 0.8, 0.6, b); bell(NOTE.G6, 0.55, 0.8, 0.5, b);
});
// Küçük baloncuk patlaması.
write('pop', 0.12, b => { pop(0, 1, b); pop(0.03, 0.5, b); });
