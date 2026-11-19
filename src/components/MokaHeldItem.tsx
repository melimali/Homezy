import type { ImageSourcePropType } from 'react-native';
import Svg, { ClipPath, Defs, G, Image as Artwork, Path } from 'react-native-svg';

type Point = readonly [number, number];
type Grip = 'pinch' | 'shaft' | 'hook' | 'edge' | 'cradle';
type Hold = {
  grip: Point; wrist: Point; scale: number; angle: number; fingers: Grip; motion: number; support?: Point;
};

// Coordinates are on the original 512 px item canvas. Each support point is on the object too,
// so both wings meet it when the book, tray or instrument tilts.
export const HOLDS: Record<string, Hold | undefined> = {
  el_fincan: { grip: [416, 357], wrist: [353, 330], scale: 0.96, angle: -4, fingers: 'hook', motion: 1.4 },
  el_kitap: { grip: [432, 368], wrist: [342, 354], scale: 0.93, angle: -7, fingers: 'edge', motion: 0.65, support: [319, 367] },
  el_cicek: { grip: [376, 381], wrist: [392, 350], scale: 1.08, angle: 23, fingers: 'pinch', motion: 2.4 },
  el_supurge: { grip: [395, 318], wrist: [358, 345], scale: 1.04, angle: 13, fingers: 'shaft', motion: 1.65 },
  el_balon: { grip: [375, 395], wrist: [402, 347], scale: 1.27, angle: 22, fingers: 'pinch', motion: 2.15 },
  el_telefon: { grip: [403, 374], wrist: [326, 344], scale: 0.85, angle: -7, fingers: 'edge', motion: 1.05 },
  el_kilic: { grip: [352, 379], wrist: [388, 350], scale: 1.13, angle: 9, fingers: 'shaft', motion: 2 },
  el_degnek: { grip: [354, 367], wrist: [393, 345], scale: 1.19, angle: 18, fingers: 'pinch', motion: 2.6 },
  el_gitar: { grip: [394, 327], wrist: [342, 321], scale: 1.22, angle: 4, fingers: 'shaft', motion: 1.15, support: [333, 374] },
  el_olta: { grip: [334, 379], wrist: [376, 351], scale: 1.02, angle: 3, fingers: 'shaft', motion: 1.85 },
  el_firca: { grip: [356, 372], wrist: [390, 344], scale: 1.07, angle: 11, fingers: 'pinch', motion: 2.35 },
  el_semsiye: { grip: [376, 384], wrist: [405, 350], scale: 1.19, angle: 14, fingers: 'hook', motion: 0.95 },
  el_hediye: { grip: [420, 373], wrist: [331, 365], scale: 0.94, angle: -1, fingers: 'cradle', motion: 0.65, support: [320, 373] },
  el_pasta: { grip: [417, 385], wrist: [327, 372], scale: 0.91, angle: 0, fingers: 'cradle', motion: 0.55, support: [327, 389] },
  el_fener: { grip: [381, 302], wrist: [369, 321], scale: 0.86, angle: 3, fingers: 'hook', motion: 1.5 },
  el_harita: { grip: [412, 358], wrist: [325, 342], scale: 1.12, angle: -5, fingers: 'edge', motion: 0.95, support: [326, 358] },
  el_megafon: { grip: [345, 369], wrist: [376, 346], scale: 0.96, angle: -12, fingers: 'shaft', motion: 1.4 },
  el_mum: { grip: [402, 382], wrist: [341, 367], scale: 0.84, angle: -2, fingers: 'cradle', motion: 0.7 },
  el_sulama: { grip: [422, 344], wrist: [345, 340], scale: 0.96, angle: -12, fingers: 'hook', motion: 1.6 },
  el_kamera: { grip: [421, 357], wrist: [323, 337], scale: 0.93, angle: 0, fingers: 'edge', motion: 0.75, support: [325, 358] },
};

// The wing-tip contours follow actual feather boundaries. Only the selected feathers cross the item.
const feathers: Record<Grip, { tip: Point; width: number; contour: string }> = {
  pinch: { tip: [320, 346], width: 0.82, contour: 'M308 315Q319 323 335 307Q333 331 319 351Q311 361 303 352Z' },
  shaft: { tip: [331, 361], width: 0.88, contour: 'M308 333Q322 344 344 322Q344 348 332 365Q323 383 312 374Z' },
  hook: { tip: [328, 365], width: 0.85, contour: 'M313 345Q326 347 345 326Q345 349 334 367Q322 382 314 375Z' },
  edge: { tip: [343, 370], width: 0.89, contour: 'M318 348Q337 353 359 330Q358 353 344 373Q331 389 317 377Z' },
  cradle: { tip: [363, 378], width: 0.94, contour: 'M334 361Q350 365 374 342Q377 359 388 348Q389 371 378 390H336Z' },
};

function objectPoint(pose: Hold, p: Point): Point {
  const angle = pose.angle * Math.PI / 180;
  const dx = (p[0] - pose.grip[0]) * pose.scale;
  const dy = (p[1] - pose.grip[1]) * pose.scale;
  return [pose.wrist[0] + dx * Math.cos(angle) - dy * Math.sin(angle), pose.wrist[1] + dx * Math.sin(angle) + dy * Math.cos(angle)];
}

function wingTransform(shoulder: Point, wrist: Point, grip: Grip, mirror: boolean) {
  const { tip, width } = feathers[grip];
  const sign = mirror ? -1 : 1;
  const dx = (tip[0] - 357) * sign;
  const dy = tip[1] - 264;
  const length = Math.hypot(dx, dy);
  const heading = Math.atan2(dy, dx) * 180 / Math.PI;
  const reachX = wrist[0] - shoulder[0];
  const reachY = wrist[1] - shoulder[1];
  const reach = Math.hypot(reachX, reachY) / length;
  const bearing = Math.atan2(reachY, reachX) * 180 / Math.PI;
  return `translate(${shoulder.join(' ')}) rotate(${bearing}) scale(${reach} ${width}) rotate(${-heading}) scale(${sign} 1) translate(-357 -264)`;
}

export function HeldItemModel({ size, pose, item, wing }: {
  size: number; pose: Hold; item: ImageSourcePropType; wing: ImageSourcePropType;
}) {
  const right = wingTransform([357, 264], pose.wrist, pose.fingers, false);
  const left = pose.support && wingTransform([160, 264], objectPoint(pose, pose.support), 'cradle', true);
  const itemTransform = `translate(${pose.wrist.join(' ')}) rotate(${pose.angle}) scale(${pose.scale}) translate(${-pose.grip[0]} ${-pose.grip[1]})`;
  const wingArt = <Artwork href={wing} x={0} y={0} width={512} height={512} />;
  return (
    <Svg width={size} height={size} viewBox="0 0 512 512" pointerEvents="none">
      <Defs>
        <ClipPath id="held-tip"><Path d={feathers[pose.fingers].contour} /></ClipPath>
        <ClipPath id="support-tip"><Path d={feathers.cradle.contour} /></ClipPath>
      </Defs>
      {left && <G transform={left}>{wingArt}</G>}
      <G transform={right}>{wingArt}</G>
      <G transform={itemTransform}><Artwork href={item} width={512} height={512} /></G>
      {left && <G transform={left}><G clipPath="url(#support-tip)">{wingArt}</G></G>}
      <G transform={right}><G clipPath="url(#held-tip)">{wingArt}</G></G>
    </Svg>
  );
}
