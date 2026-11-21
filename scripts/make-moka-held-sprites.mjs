import { Buffer } from 'node:buffer';
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const sharp = require(process.env.MOKA_SPRITE_SHARP || 'sharp');
const project = resolve(process.argv[2] ?? fileURLToPath(new URL('..', import.meta.url)));
const output = resolve(process.argv[3] ?? project);
const { holds, fingers } = JSON.parse(await readFile(new URL('moka-held-poses.json', import.meta.url), 'utf8'));
const canvas = 512;
const furs = ['orman', 'kahve', 'gri', 'mavi', 'mor', 'pembe', 'turuncu', 'kirmizi'];
const input = join(project, 'assets', 'moka');
const outputSprites = join(output, 'assets', 'moka', 'held');
const indexFile = join(output, 'src', 'constants', 'mokaHeldSprites.ts');

async function embed(path) {
  const png = await sharp(path).png().toBuffer();
  return 'data:image/png;base64,' + png.toString('base64');
}

const wings = Object.fromEntries(await Promise.all(furs.map(async fur => {
  const base = fur === 'orman' ? join(input, 'rig') : join(input, 'rig', 'fur', fur);
  return [fur, await Promise.all(['kanat_b.webp', 'kanat_a.webp'].map(file => embed(join(base, file))))];
})));

function fromItem(pose, [x, y]) {
  const radians = pose.angle * Math.PI / 180;
  const [gx, gy] = pose.grip;
  return [
    pose.wrist[0] + pose.scale * ((x - gx) * Math.cos(radians) - (y - gy) * Math.sin(radians)),
    pose.wrist[1] + pose.scale * ((x - gx) * Math.sin(radians) + (y - gy) * Math.cos(radians)),
  ];
}

function picture(href, extra = '') {
  return '<image x="0" y="0" width="512" height="512" href="' + href + '" ' + extra + '/>';
}

function render(id, pose, href, fur, frame) {
  const gripX = pose.left ? 517 - pose.wrist[0] : pose.wrist[0];
  const finger = pose.left ? fingers.left : fingers.right;
  const target = (pose.left ? gripX < 153 : gripX >= 370) ? finger.outer : finger.inner;
  const support = pose.support && (fromItem(pose, pose.support)[0] < 153 ? fingers.left.outer : fingers.left.inner);
  const depth = 'M0 0H512V512H0Z' + target + (support || '');
  const flip = pose.left ? 'translate(517 0) scale(-1 1)' : '';
  const transform = 'translate(' + pose.wrist.join(' ') + ') rotate(' + pose.angle + ') scale(' + pose.scale + ') translate(' + pose.grip.map(x => -x).join(' ') + ')';
  let art;
  const defs = [
    '<clipPath id="depth"><path clip-rule="evenodd" fill-rule="evenodd" d="' + depth + '"/></clipPath>',
  ];
  if (id === 'el_semsiye') {
    const top = fromItem(pose, [376, 348]);
    const bottom = fromItem(pose, [376, 369]);
    const line = 'M' + (top[0] + 22) + ' ' + (top[1] - 76) + 'L' + bottom.join(' ');
    defs.push('<clipPath id="canopy"><path d="M0 0H512V351H0Z"/></clipPath>', '<clipPath id="handle"><path d="M369 361H396V512H369Z"/></clipPath>');
    art = '<path d="' + line + '" stroke="#543F36" stroke-width="8"/><path d="' + line + '" stroke="#DAA17F" stroke-width="4"/>' +
      '<g transform="translate(22 -72) ' + transform + '">' + picture(href, 'clip-path="url(#canopy)"') + '</g>' +
      '<g transform="' + transform + '">' + picture(href, 'clip-path="url(#handle)"') + '</g>';
  } else {
    let clip = '';
    let detail = '';
    let moving = '';
    let rotation = '';
    if (id === 'el_fincan') {
      defs.push('<clipPath id="cup"><path d="M0 322H348Q367 313 388 321H512V512H0Z"/></clipPath>');
      clip = 'clip-path="url(#cup)"';
    }
    if (id === 'el_kitap') {
      defs.push('<linearGradient id="cover" x2="1" y2="1"><stop stop-color="#AACDBA"/><stop offset="1" stop-color="#79A398"/></linearGradient>');
      detail = '<path d="M331 311L388 293Q398 290 402 302L425 351Q430 359 421 364L367 375Z" fill="url(#cover)"/>';
    }
    if (id === 'el_balon') rotation = 'rotate(' + (frame * 7) + ' ' + pose.wrist.join(' ') + ') ';
    if (pose.fish) {
      defs.push('<clipPath id="rod"><path d="M0 0H512V354H393V414H512V512H0Z"/></clipPath>', '<clipPath id="fish"><path d="M393 354H442V414H393Z"/></clipPath>');
      clip = 'clip-path="url(#rod)"';
      moving = '<g transform="rotate(' + (frame * 12) + ' ' + fromItem(pose, [414, 354]).join(' ') + ') ' + transform + '">' + picture(href, 'clip-path="url(#fish)"') + '</g>';
    }
    art = '<g transform="' + flip + '"><g transform="' + rotation + transform + '">' + picture(href, clip) + detail + '</g>' + moving + '</g>';
  }
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><defs>' + defs.join('') + '</defs>' +
    wings[fur].map(src => picture(src)).join('') + '<g clip-path="url(#depth)">' + art + '</g></svg>';
  return sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer();
}

function frameBounds(frames) {
  let left = canvas, top = canvas, right = 0, bottom = 0;
  for (const pixels of frames) {
    for (let y = 0; y < canvas; y++) {
      for (let x = 0; x < canvas; x++) {
        if (pixels[(y * canvas + x) * 4 + 3] < 12) continue;
        left = Math.min(left, x);
        top = Math.min(top, y);
        right = Math.max(right, x + 1);
        bottom = Math.max(bottom, y + 1);
      }
    }
  }
  if (right <= left || bottom <= top) throw new Error('Empty rendered sprite');
  left = Math.max(0, left - 2);
  top = Math.max(0, top - 2);
  return { left, top, width: Math.min(canvas, right + 2) - left, height: Math.min(canvas, bottom + 2) - top };
}

async function encode(file, frames, box) {
  const { left, top, width, height } = box;
  const pitch = width * frames.length;
  const strip = Buffer.alloc(pitch * height * 4);
  frames.forEach((pixels, frame) => {
    for (let y = 0; y < height; y++) {
      const from = ((top + y) * canvas + left) * 4;
      pixels.copy(strip, (y * pitch + width * frame) * 4, from, from + width * 4);
    }
  });
  await sharp(strip, { raw: { width: pitch, height, channels: 4 } })
    .webp({ quality: 87, alphaQuality: 100, effort: 4 }).toFile(file);
}

await mkdir(outputSprites, { recursive: true });
await mkdir(join(output, 'src', 'constants'), { recursive: true });
const index = [];
for (const [id, pose] of Object.entries(holds)) {
  const href = await embed(join(input, 'esya', id + '.webp'));
  const positions = id === 'el_balon' || pose.fish ? [-1, -.75, -.5, -.25, 0, .25, .5, .75, 1] : [0];
  const geometry = await Promise.all(positions.map(frame => render(id, pose, href, furs[0], frame)));
  const box = frameBounds(geometry);
  const files = [];
  for (const fur of furs) {
    const name = id + '_' + fur + '.webp';
    const frames = fur === furs[0] ? geometry : await Promise.all(positions.map(frame => render(id, pose, href, fur, frame)));
    await encode(join(outputSprites, name), frames, box);
    files.push('    ' + fur + ": require('../../assets/moka/held/" + name + "'),");
  }
  index.push('  ' + id + ': { x: ' + box.left + ', y: ' + box.top + ', width: ' + box.width + ', height: ' + box.height + ', frames: ' + positions.length + ', files: {\n' + files.join('\n') + '\n  } },');
  console.log(id + ': ' + positions.length + ' frame(s), ' + furs.length + ' colors');
}
const data = '/* Generated by scripts/make-moka-held-sprites.mjs. */\n' +
  "import type { ImageSourcePropType } from 'react-native';\n\n" +
  'type HeldSprite = { x: number; y: number; width: number; height: number; frames: number; files: Record<string, ImageSourcePropType> };\n\n' +
  'export const HELD_SPRITES: Record<string, HeldSprite | undefined> = {\n' + index.join('\n') + '\n};\n\n' +
  'export const HELD_POSES = ' + JSON.stringify(holds, null, 2) + ' as const;\n';
await writeFile(indexFile, data);

