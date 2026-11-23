import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Image, Pressable, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';

import Svg, { ClipPath, Defs, G, Image as Artwork, Path, RadialGradient, Rect, Stop as SvgStop } from 'react-native-svg';

import { useReduceMotion } from '@/components/motion';
import { ISIK, MOTION, ODA, ODA_H, ODA_W, PARCA, type Box, type OdaLayers, type OdaPart, type OdaPhase, type OdaTouch, type Pt } from '@/constants/oda';
import { useActive } from '@/hooks/useActive';
import type { SkyKind } from '@/lib/weather';
import { clearNightCondition } from '@/domain/roomScene';

/** Saate göre oda: 06:30-16:29 sabah, 16:30-19:29 akşam, 19:30-06:29 gece. */
export function odaPhaseOf(d = new Date()): OdaPhase {
  const h = d.getHours() + d.getMinutes() / 60;
  if (h >= 19.5 || h < 6.5) return 'gece';
  return h >= 16.5 ? 'aksam' : 'sabah';
}
/** Moka'nın oturduğu nokta (o saatin resminde yastığın ortası). */
export const seatOf = (p: OdaPhase): Pt => ODA[p].seat;

/** Oda resminin `cover` yerleşimi: ekran boyutundan ölçek ve kaydırma. Resim koordinatını ekrana çevirmek için. */
export const odaMap = (w: number, h: number) => {
  const s = Math.max(w / ODA_W, h / ODA_H);
  return { s, ox: (w - ODA_W * s) / 2, oy: (h - ODA_H * s) / 2 };
};

export type RoomTouch = OdaTouch;
const PARTS = Object.keys(MOTION) as OdaPart[];
const sine = Easing.inOut(Easing.sin);
type Stop = { stop: () => void };

/** Değeri 0→1→0 yavaşça gidip getiren döngü. */
function loop(v: Animated.Value, ms: number, delay = 0): Stop {
  const a = Animated.loop(Animated.sequence([
    Animated.delay(delay),
    Animated.timing(v, { toValue: 1, duration: ms, easing: sine, useNativeDriver: true, isInteraction: false }),
    Animated.timing(v, { toValue: 0, duration: ms, easing: sine, useNativeDriver: true, isInteraction: false }),
  ]));
  a.start();
  return a;
}
/** Gidiş ve dönüş süresi her turda biraz değişen salınım: bitki gibi doğal, mekanik durmaz. */
function sway(v: Animated.Value, ms: number, delay = 0, jitter = 0.3): Stop {
  let dead = false;
  let movement: Animated.CompositeAnimation | undefined;
  const go = () => {
    if (dead) return;
    const a = ms * (1 - jitter / 2 + Math.random() * jitter);
    const b = ms * (1.1 - jitter / 2 + Math.random() * jitter);
    const peak = 0.75 + Math.random() * 0.25;
    movement = Animated.sequence([
      Animated.timing(v, { toValue: 0.5 + peak / 2, duration: a, easing: sine, useNativeDriver: true, isInteraction: false }),
      Animated.timing(v, { toValue: 0.5 - peak / 2, duration: b, easing: sine, useNativeDriver: true, isInteraction: false }),
    ]);
    movement.start(({ finished }) => { if (finished) go(); });
  };
  const t = setTimeout(go, delay);
  return { stop: () => { dead = true; clearTimeout(t); movement?.stop(); } };
}
/** Kitaplar: 7-14 sn'de bir hafifçe yana yatıp yaylanarak yerine oturur. */
function rock(v: Animated.Value, delay: number): Stop {
  let dead = false;
  let t: ReturnType<typeof setTimeout>;
  const go = () => {
    if (dead) return;
    Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: 260, easing: Easing.out(Easing.quad), useNativeDriver: true, isInteraction: false }),
      Animated.spring(v, { toValue: 0.5, friction: 3, tension: 70, useNativeDriver: true, isInteraction: false }),
    ]).start(({ finished }) => { if (!dead && finished) t = setTimeout(go, 7000 + Math.random() * 7000); });
  };
  t = setTimeout(go, delay);
  return { stop: () => { dead = true; clearTimeout(t); v.stopAnimation(); } };
}
/** Değeri 0'dan 1'e akıtıp başa saran döngü (düşen ya da yükselen parçacık). */
function rise(v: Animated.Value, ms: number, delay = 0, easing: (t: number) => number = Easing.linear): Stop {
  const a = Animated.loop(Animated.sequence([Animated.delay(delay), Animated.timing(v, { toValue: 1, duration: ms, easing, useNativeDriver: true, isInteraction: false }), Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: true, isInteraction: false })]));
  a.start();
  return a;
}
/** Uzun aralıklı tek seferlik olay (yaprak düşmesi, şimşek): bekle, oynat, yeniden bekle. */
function every(v: Animated.Value, minMs: number, maxMs: number, play: (v: Animated.Value) => Animated.CompositeAnimation, first = 3000): Stop {
  let dead = false;
  let t: ReturnType<typeof setTimeout>;
  let movement: Animated.CompositeAnimation | undefined;
  const schedule = () => { if (!dead) t = setTimeout(start, minMs + Math.random() * (maxMs - minMs)); };
  const start = () => {
    if (dead) return;
    v.stopAnimation();
    v.setValue(0);
    movement = play(v);
    movement.start(({ finished }) => { if (finished) schedule(); });
  };
  t = setTimeout(start, first);
  return {
    stop: () => { dead = true; clearTimeout(t); movement?.stop(); v.stopAnimation(); },
  };
}
/** Lamba: yavaşça "nefes alır" (6 sn); arada minicik tek titreşim. */
function breathe(v: Animated.Value): Stop {
  const flick = Animated.sequence([
    Animated.timing(v, { toValue: 0.78, duration: 90, easing: Easing.linear, useNativeDriver: true, isInteraction: false }),
    Animated.timing(v, { toValue: 0.97, duration: 140, easing: Easing.linear, useNativeDriver: true, isInteraction: false }),
  ]);
  const cycle = (n: number) => Array.from({ length: n }, () => [
    Animated.timing(v, { toValue: 1, duration: 3000, easing: sine, useNativeDriver: true, isInteraction: false }),
    Animated.timing(v, { toValue: 0.88, duration: 3000, easing: sine, useNativeDriver: true, isInteraction: false }),
  ]).flat();
  const a = Animated.loop(Animated.sequence([...cycle(7), flick, ...cycle(5 + Math.floor(Math.random() * 4)), flick]));
  a.start();
  return a;
}

type Vals = {
  part: Record<OdaPart, Animated.Value>; nudge: Record<OdaPart, Animated.Value>;
  lamp: Animated.Value; moon: Animated.Value; sun: Animated.Value; beam: Animated.Value; cloud: Animated.Value; halo: Animated.Value;
  twinkle: Animated.Value[]; cup: Animated.Value[]; chainLights: Animated.Value[]; chainSweep: Animated.Value; fest: Animated.Value; stars: Animated.Value[]; dust: Animated.Value[]; steam: Animated.Value[];
  rain: Animated.Value[]; drops: Animated.Value[]; drift: Animated.Value; flash: Animated.Value; weather: Animated.Value; leaf: Animated.Value; tapLeaf: Animated.Value; boost: Animated.Value; pot: Animated.Value; ivy: Animated.Value;
};
/** Loşluk için köşelere konan koyu haleler (oda resmi koordinatı). */
const VIGNETTE = [{ x: 0, y: 0, r: 700 }, { x: 852, y: 0, r: 700 }, { x: 0, y: 1846, r: 760 }, { x: 852, y: 1846, r: 760 }, { x: 0, y: 920, r: 420 }, { x: 852, y: 920, r: 420 }];
const MOTES = {
  day: [
    { x: 250, y: 790, r: 2 }, { x: 315, y: 860, r: 3 }, { x: 380, y: 920, r: 2 },
    { x: 435, y: 980, r: 2 }, { x: 500, y: 1040, r: 3 }, { x: 565, y: 1100, r: 2 },
  ],
  night: [
    { x: 650, y: 710, r: 2 }, { x: 700, y: 760, r: 3 }, { x: 755, y: 800, r: 2 },
    { x: 815, y: 850, r: 2 }, { x: 690, y: 900, r: 3 }, { x: 770, y: 980, r: 2 },
  ],
} as const;
/** Havaya göre camın rengi ve yoğunluğu. */
const GLASS: Partial<Record<SkyKind, { tone: string; op: number }>> = {
  cloudy: { tone: '#8C97A8', op: 0.36 }, rain: { tone: '#55657A', op: 0.48 }, storm: { tone: '#1E2533', op: 0.6 },
  snow: { tone: '#E6EDF5', op: 0.38 }, fog: { tone: '#EEF1F4', op: 0.58 },
};
const SHELF_WALL: Record<OdaPhase, { clip: string; cx: number; cy: number; r: number; color: string }> = {
  sabah: { clip: 'M442 602H665V723H442Z', cx: 554, cy: 661, r: 122, color: '#F3D6B0' },
  aksam: { clip: 'M430 596H678V728H430Z', cx: 554, cy: 660, r: 128, color: '#BA7B55' },
  gece: { clip: 'M430 595H678V728H430Z', cx: 554, cy: 660, r: 128, color: '#50343A' },
};
const RAIN_N = 12;

/** Zincirin 7 ampulü: iki uç arasında hafifçe sarkar. */
const chainPts = (L: OdaLayers) => Array.from({ length: 7 }, (_, i) => {
  const t = i / 6;
  const [a, b] = L.chain;
  return { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) + Math.sin(t * Math.PI) * 26 };
});
function Chain({ pts, lights, sweep, s, night }: { pts: Pt[]; lights: Animated.Value[]; sweep: Animated.Value; s: number; night: boolean }) {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0 }}>
      {pts.slice(1).map((p, i) => {
        const q = pts[i]!;
        const len = Math.hypot(p.x - q.x, p.y - q.y);
        return <View key={'wire-' + i} style={{ position: 'absolute', left: ((p.x + q.x) / 2 - len / 2) * s, top: ((p.y + q.y) / 2) * s, width: len * s, height: Math.max(1, 1.6 * s), backgroundColor: '#3B2A20', opacity: 0.55, transform: [{ rotate: Math.atan2(p.y - q.y, p.x - q.x) + 'rad' }] }} />;
      })}
      {pts.map((p, i) => {
        const center = 0.14 + i * 0.115;
        const glimmer = sweep.interpolate({
          inputRange: [center - 0.14, center, center + 0.14],
          outputRange: [0, night ? 0.65 : 0.42, 0], extrapolate: 'clamp',
        });
        const light = Animated.add(Animated.multiply(lights[i]!, 0.82), glimmer).interpolate({
          inputRange: [0, 1], outputRange: [0, 1], extrapolate: 'clamp',
        });
        const glowOpacity = light.interpolate({ inputRange: [0, 1], outputRange: [0, night ? 0.85 : 0.55] });
        const r = 26;
        return (
          <View key={'bulb-' + i}>
            <Animated.Image source={ISIK} pointerEvents="none" style={{ position: 'absolute', left: (p.x - r) * s, top: (p.y + 4 - r) * s, width: 2 * r * s, height: 2 * r * s, tintColor: '#FFC27A', opacity: glowOpacity }} />
            <View style={{ position: 'absolute', left: (p.x - 5) * s, top: (p.y - 1) * s, width: 10 * s, height: 13 * s, borderRadius: 5 * s, backgroundColor: '#75604D', borderWidth: Math.max(1, 1.2 * s), borderColor: '#3B2A20', overflow: 'hidden' }}>
              <Animated.View style={{ position: 'absolute', left: Math.max(1, s), right: Math.max(1, s), top: Math.max(1, s), bottom: Math.max(1, s), borderRadius: 4 * s, backgroundColor: '#FFE3A3', opacity: light }} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

// Leaf masks keep opaque wall/window pixels in the source crops stationary.
const PLANTER = {
  sabah: {
    cutout: require('../../assets/oda/sabah_asma.webp'), box: [22, 42, 319, 592], joint: [236, 316],
    body: 'M244 153L259 153L270 157L285 170L294 184L292 186L275 185L270 193L259 197L250 192L237 190L227 177L225 169L235 156ZM116 154L135 160L142 168L144 185L138 196L128 197L124 200L105 197L99 192L99 188L75 177L72 173L75 169L97 158ZM195 164L205 164L210 169L215 185L226 204L223 207L215 207L206 211L199 211L193 208L185 211L176 204L165 206L163 204L163 198L165 197L163 194L164 189L173 183L175 177L183 168ZM216 168L223 172L224 179L231 187L226 193L222 191L218 182L216 172L214 171ZM70 182L77 182L87 186L95 195L96 209L85 220L99 220L109 227L109 236L117 259L108 267L101 270L86 271L68 282L64 277L60 247L66 234L80 222L58 221L55 218L44 218L35 221L33 215L40 202L50 191L59 185ZM190 183L189 185L197 184ZM186 184L180 188L188 185ZM147 188L150 190L151 195L151 201L148 205L141 199L142 194ZM236 194L257 200L266 209L270 219L266 221L259 217L250 217L243 211L235 208L231 201ZM102 200L108 200L114 204L114 209L107 221L97 215L99 203ZM128 200L140 200L149 208L154 206L163 207L168 212L169 227L166 234L157 242L132 252L124 259L118 251L114 240L111 221L116 210ZM175 207L183 212L184 217L174 222L172 220L172 211ZM221 209L223 211L230 209L242 213L248 220L240 228L251 219L262 220L274 228L280 241L280 262L276 276L272 280L258 264L251 262L248 264L245 261L241 261L233 253L224 279L220 283L206 269L195 263L187 262L181 257L176 249L174 236L178 226L187 218L197 220L197 217L201 214L212 214L221 218L228 225L231 232L239 229L234 229L219 214ZM296 212L310 216L323 229L330 251L330 259L328 261L313 256L297 258L294 253L287 251L281 245L281 236L277 229L283 226L283 221L287 217ZM40 256L49 257L59 264L62 283L53 291L39 292L26 299L24 297L24 275L28 265ZM250 267L256 267L260 270L264 274L262 280L264 279L267 283L273 282L278 278L282 284L281 294L274 304L253 318L249 316L247 309L239 301L236 293L240 276ZM109 276L121 278L125 282L125 290L114 300L108 299L98 308L95 305L96 291L100 284Z',
    vines: 'M317 300L321 301L331 310L336 322L334 345L329 355L323 349L315 349L309 342L305 343L297 335L291 323L292 315L299 306L307 308L311 301ZM118 327L125 327L131 334L136 332L142 334L149 342L150 352L146 362L136 372L123 375L110 388L107 388L98 363L97 350L100 348L102 340L106 335ZM271 334L278 335L283 341L293 340L300 350L300 360L298 365L289 374L270 383L260 393L252 375L251 355L255 345L262 338ZM166 380L177 382L186 391L188 410L184 416L156 400L156 390ZM247 391L254 391L258 396L265 397L269 401L270 410L257 426L237 436L231 429L230 411L234 400L240 394ZM148 402L150 404L159 403L163 406L171 420L167 435L162 438L153 455L150 455L145 450L134 434L131 425L133 412L140 405L147 404ZM305 402L316 405L323 412L327 420L328 433L320 458L317 461L313 459L308 451L299 449L296 444L286 439L280 426L281 416L287 407L291 405L300 407ZM261 442L268 442L274 448L283 448L289 455L290 467L287 474L280 481L272 486L264 487L252 496L247 490L243 468L248 452ZM296 502L309 506L317 520L316 534L311 548L300 541L296 543L291 541L289 536L280 527L277 519L278 512L283 506L293 506ZM255 533L262 535L268 542L267 544L272 542L276 546L278 554L275 560L266 568L252 572L242 578L239 571L240 552ZM275 583L290 584L299 595L298 606L283 630L278 627L267 613L263 603L265 592Z',
    rope: 'M138 39L142 39L92 169L87 167ZM140 39L144 39L198 170L193 172ZM139 39L143 39L144 188L140 188Z',
    pot: 'M61 274Q102 255 140 268Q187 262 224 288Q236 291 230 309Q221 341 208 345Q185 354 150 351L105 347Q87 341 79 325Q67 301 61 274Z',
  },
  aksam: {
    cutout: require('../../assets/oda/aksam_asma.webp'), box: [23, 26, 330, 648], joint: [246, 344],
    body: 'M258 173L272 173L286 177L305 189L317 202L315 204L301 204L282 216L273 219L260 220L247 216L244 217L256 221L278 220L288 229L289 234L286 237L296 234L310 234L322 239L332 248L342 263L348 284L348 288L345 291L332 286L311 286L295 280L287 274L286 267L281 258L264 246L246 244L235 251L229 245L214 237L224 246L228 255L231 252L237 253L243 248L258 246L272 252L283 266L286 276L284 284L276 277L265 274L261 275L263 279L267 279L281 288L285 296L275 323L276 326L270 328L265 325L266 348L263 355L255 356L252 352L244 355L240 351L240 339L247 313L251 310L251 307L243 301L237 300L226 288L224 280L227 276L223 277L219 297L213 300L206 292L202 291L201 287L189 281L178 267L179 272L177 273L176 282L183 280L195 289L201 300L202 318L196 335L193 338L189 338L186 335L185 340L176 353L175 359L172 362L167 360L167 357L154 338L161 313L154 316L147 324L145 322L146 317L143 315L143 308L140 309L138 307L138 302L144 290L154 281L168 281L167 262L171 256L174 257L173 251L161 267L144 274L139 273L133 278L129 278L123 286L115 283L106 296L82 308L82 318L80 320L81 337L75 342L73 352L66 357L65 362L59 367L54 367L51 364L50 356L53 353L51 352L50 344L53 332L58 320L62 316L67 318L66 316L70 312L71 300L65 301L62 298L62 280L67 267L61 276L60 292L55 297L57 300L55 302L53 300L47 302L27 317L23 315L23 279L31 264L45 252L60 250L75 257L86 248L82 246L78 253L73 254L71 248L74 243L71 239L64 239L60 235L44 240L36 238L41 224L56 201L72 191L89 189L109 197L125 216L120 204L117 184L120 181L140 180L150 183L161 192L162 205L175 192L183 189L192 189L197 190L202 196L203 204L201 206L216 206L228 212L230 209L228 201L234 187L243 179ZM144 217L144 219L150 221L155 226L155 230L161 228L157 228L151 220ZM240 217L234 219L233 222ZM184 237L182 241L188 241ZM198 238L191 243L194 243ZM110 241L105 246L108 250L109 261L111 261Z',
    vines: 'M297 313L301 315L305 323L315 323L327 329L335 338L341 357L340 369L337 371L335 383L329 395L326 395L312 379L309 379L307 376L303 377L313 385L319 401L312 415L309 415L307 419L303 418L295 413L290 401L286 405L292 410L294 415L298 416L297 420L299 421L300 430L317 435L327 446L332 459L330 481L323 497L314 490L313 486L309 483L306 485L303 482L304 480L297 475L293 477L292 483L292 494L294 495L292 498L295 500L296 519L299 523L310 526L318 534L323 547L323 558L315 580L312 580L299 566L293 562L288 562L287 568L284 570L284 572L288 573L286 575L287 586L285 592L272 607L257 617L255 615L256 597L259 587L263 584L264 577L259 570L263 567L269 568L277 564L279 553L278 537L288 523L288 519L287 512L285 512L256 537L252 537L242 512L242 499L246 489L256 478L265 473L279 475L282 472L281 447L285 437L292 431L289 421L280 431L279 442L264 457L258 459L255 455L254 442L258 429L257 426L265 419L250 427L240 428L241 431L238 434L232 429L233 422L236 420L235 408L240 404L238 401L242 396L242 392L248 381L257 373L268 369L276 374L279 372L284 373L290 382L292 397L294 372L286 364L283 349L286 347L288 334L295 327L293 317ZM109 344L129 348L131 350L131 358L125 369L126 373L119 378L118 382L111 389L105 394L100 395L92 377L91 365L99 350ZM146 396L148 398L151 396L155 398L156 409L163 408L166 410L167 408L172 408L176 410L186 419L190 429L189 445L184 453L175 446L170 445L158 434L158 442L162 443L163 447L171 455L172 470L164 486L156 495L151 492L149 480L142 473L144 466L148 468L150 466L149 464L147 466L144 464L146 461L142 457L143 451L149 446L149 435L135 444L125 447L126 450L124 452L117 452L110 446L112 444L111 439L114 437L118 441L123 433L124 426L122 424L125 422L125 417L122 418L120 416L123 413L122 410L132 402L145 401L144 398ZM244 409L243 415L245 414ZM283 410L271 418L270 422ZM156 419L152 427L157 431L155 426ZM293 447L290 450L291 459L294 453ZM289 535L287 537L288 548L290 545ZM285 592L289 594L292 605L300 607L305 612L311 624L310 642L307 645L304 645L289 633L294 654L287 671L279 664L282 659L281 649L280 645L275 643L283 627L282 618L285 612L283 611L281 597Z',
    rope: 'M138 43L142 43L88 187L83 185ZM140 43L144 43L209 193L204 195ZM139 43L143 43L144 194L140 194Z',
    pot: 'M78 300Q116 280 151 291Q201 291 219 308L229 337Q232 364 211 376Q172 388 124 374Q98 363 92 343Z',
  },
  gece: {
    cutout: require('../../assets/oda/gece_asma.webp'), box: [24, 27, 329, 648], joint: [246, 344],
    body: 'M263 173L277 174L293 180L305 188L317 202L315 204L298 205L286 214L269 220L259 220L243 215L233 219L233 222L240 218L248 218L257 222L276 220L288 229L287 238L305 234L322 240L334 251L343 266L348 281L348 290L346 292L332 286L314 287L293 279L287 273L280 257L264 246L246 244L235 251L223 241L213 237L226 250L230 266L229 274L226 278L223 277L222 287L216 299L212 299L204 289L191 283L184 276L175 260L175 250L173 250L171 256L159 268L146 274L140 273L121 283L115 283L111 291L104 298L80 310L82 313L80 314L79 337L64 361L60 364L56 362L54 359L56 351L54 343L56 341L53 338L53 334L58 320L62 316L69 320L66 317L67 313L63 305L61 285L64 274L71 262L68 263L61 275L60 293L54 299L32 312L27 318L24 316L24 278L31 265L40 256L49 251L63 251L75 258L88 247L63 238L49 238L41 241L36 239L45 216L55 203L76 191L95 191L110 198L118 206L120 213L125 216L125 221L145 219L154 225L155 230L159 230L155 223L148 218L135 217L128 219L126 217L117 187L120 181L138 180L147 182L161 194L161 219L163 226L164 203L175 193L184 189L197 190L203 197L203 204L194 210L213 206L222 208L229 214L229 200L235 187L246 178ZM185 237L181 239L181 242L188 241L193 244L199 239L211 238L200 237L192 242ZM111 240L105 246L95 246L104 248L108 252ZM247 247L260 247L272 253L280 261L286 279L286 284L283 286L274 277L260 275L263 279L268 279L283 289L285 297L276 324L272 328L265 325L265 353L257 358L252 352L244 356L239 347L247 313L251 310L251 307L238 301L227 289L231 275L229 255L231 253L238 253L241 249ZM109 253L108 262L112 262L109 258ZM172 258L183 274L180 279L176 279L176 282L184 281L188 283L195 289L200 298L202 319L194 338L190 340L187 334L185 342L177 351L174 359L170 361L156 342L160 314L145 329L137 320L137 311L139 310L138 303L142 294L151 284L159 280L168 281L168 262Z',
    vines: 'M297 314L301 316L304 324L316 324L326 329L335 339L341 355L341 369L337 373L335 385L329 397L313 381L310 381L307 377L302 378L309 382L315 391L315 409L308 417L299 416L291 403L291 383L296 375L289 368L284 354L287 337L296 327L294 317ZM109 345L126 348L130 352L130 361L121 376L111 370L119 380L113 388L100 395L93 381L94 378L91 375L91 365L93 358L99 351L107 358L106 348ZM267 370L272 371L276 376L282 374L291 387L291 396L287 406L269 421L271 422L278 418L285 408L289 406L295 418L299 421L299 430L315 434L327 446L332 460L332 474L327 493L323 498L297 476L291 480L291 494L292 502L295 506L296 522L312 528L322 542L324 557L318 578L315 581L311 580L301 568L297 568L291 561L288 562L287 567L283 570L287 581L284 594L268 611L256 618L252 615L256 600L248 598L248 586L253 576L260 569L277 565L279 555L277 539L288 525L287 511L253 538L248 531L252 527L243 518L241 503L246 490L256 479L268 474L279 476L282 473L281 451L283 443L292 436L290 429L291 419L284 427L278 427L279 438L274 449L259 461L255 455L254 441L258 426L263 421L248 427L236 435L233 431L233 416L235 408L239 406L241 395L247 383L260 372ZM148 400L151 402L153 412L162 407L165 411L172 409L179 413L188 423L190 433L189 446L184 454L158 434L159 445L171 456L173 468L171 475L157 495L146 484L138 466L140 464L140 457L149 447L149 432L154 428L158 433L155 426L156 417L153 426L143 439L120 452L116 450L113 437L114 424L119 413L133 402L144 403ZM288 542L286 543L287 547ZM286 593L290 597L292 606L300 608L307 615L312 626L311 640L307 647L289 634L295 655L287 672L277 663L279 660L282 662L280 654L276 656L272 652L273 643L281 635L282 628L284 627L282 625L282 616L285 611L283 610L282 597ZM279 645L278 650L280 649Z',
    rope: 'M138 43L142 43L88 187L83 185ZM140 43L144 43L209 193L204 195ZM139 43L143 43L144 194L140 194Z',
    pot: 'M78 300Q116 280 151 291Q201 291 219 308L229 337Q232 364 211 376Q172 388 124 374Q98 363 92 343Z',
  },
} as const;

function HangingPlanter({ phase, s, ivy }: { phase: OdaPhase; s: number; ivy: Animated.Value }) {
  const id = 'planter-' + useId().replace(/[^a-z0-9]/gi, '');
  const { box: scene, pivot, src } = ODA[phase].parts.asma;
  const art = PLANTER[phase];
  const [x, y, width, height] = art.box;
  const [jx, jy] = art.joint;
  const image = <Artwork href={art.cutout} x={x} y={y} width={width} height={height} />;
  const viewBox = `0 0 ${scene.w} ${scene.h}`;
  const dx = (jx - scene.w / 2) * s;
  const dy = (jy - scene.h / 2) * s;
  const frame = { position: 'absolute' as const, left: (scene.x - pivot.x) * s, top: (scene.y - pivot.y) * s, width: scene.w * s, height: scene.h * s };
  return <>
    <Svg pointerEvents="none" style={frame} width={frame.width} height={frame.height} viewBox={viewBox}>
      <Defs>
        <ClipPath id={id + '-body'}>
          <Path d={art.body} />
          <Path d={art.rope} />
        </ClipPath>
        <ClipPath id={id + '-vines'}><Path d={art.vines} /></ClipPath>
        <ClipPath id={id + '-pot'}><Path d={art.pot} /></ClipPath>
      </Defs>
      <G clipPath={'url(#' + id + '-body)'}>{image}</G>
      <G clipPath={'url(#' + id + '-pot)'}><Artwork href={src} width={scene.w} height={scene.h} /></G>
    </Svg>
    <Animated.View pointerEvents="none" style={[frame, { transform: [
      { translateX: dx }, { translateY: dy },
      { rotate: ivy.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['-0.8deg', '0deg', '0.8deg'] }) },
      { translateX: -dx }, { translateY: -dy },
    ] }]}>
      <Svg width={frame.width} height={frame.height} viewBox={viewBox}>
        <G clipPath={'url(#' + id + '-vines)'}>{image}</G>
      </Svg>
    </Animated.View>
  </>;
}

/** Bir saatin (sabah/akşam/gece) resmi: taban, cam havası, hareketli parçalar, düşen yaprak. */
function PhaseLayer({ phase, s, vals, sky, chain, tilt, opacity, weatherOpacity, onReady }: { phase: OdaPhase; s: number; vals: Vals; sky: SkyKind; chain: number; tilt?: Animated.ValueXY; opacity: Animated.Value | number; weatherOpacity: Animated.Value; onReady?: () => void }) {
  const layerId = 'room-layer-' + useId().replace(/[^a-z0-9]/gi, '');
  const L = ODA[phase];
  const shelfWall = SHELF_WALL[phase];
  const box = (b: Box) => ({ position: 'absolute' as const, left: b.x * s, top: b.y * s, width: b.w * s, height: b.h * s });
  const shift = (x: number, y: number) => (tilt ? [{ translateX: tilt.x.interpolate({ inputRange: [-1, 1], outputRange: [x, -x] }) }, { translateY: tilt.y.interpolate({ inputRange: [-1, 1], outputRange: [y, -y] }) }] : []);
  const glass = GLASS[sky];
  const wet = sky === 'rain' || sky === 'storm';
  const snow = sky === 'snow';
  const clouds = true;
  const cloudOpacity = sky === 'clear' ? 0.22 : sky === 'fog' ? 0.14 : wet ? 0.28 : 0.34;
  const big = L.cells.filter(c => c.w >= 60);
  const asma = L.parts.asma;
  // Yaprak asma saksının alt ucundan kopar.
  const leafFrom = { x: asma.box.x + asma.box.w * 0.62, y: asma.box.y + asma.box.h * 0.82 };
  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width: ODA_W * s, height: ODA_H * s, opacity }}>
      <Image source={L.taban} fadeDuration={0} onLoad={onReady} onError={onReady} style={{ width: ODA_W * s, height: ODA_H * s }} resizeMode="stretch" accessibilityIgnoresInvertColors />

      {/* Soft, phase-matched wall correction ends above the shelf board. */}
      <Svg pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0 }} width={ODA_W * s} height={ODA_H * s} viewBox={'0 0 ' + ODA_W + ' ' + ODA_H}>
        <Defs>
          <ClipPath id={layerId + '-shelf-clip'}><Path d={shelfWall.clip} /></ClipPath>
          <RadialGradient id={layerId + '-shelf-gradient'} cx={shelfWall.cx} cy={shelfWall.cy} r={shelfWall.r} gradientUnits="userSpaceOnUse">
            <SvgStop offset="0" stopColor={shelfWall.color} stopOpacity={0.82} />
            <SvgStop offset="0.42" stopColor={shelfWall.color} stopOpacity={0.62} />
            <SvgStop offset="0.78" stopColor={shelfWall.color} stopOpacity={0.14} />
            <SvgStop offset="1" stopColor={shelfWall.color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x={442} y={595} width={236} height={133} fill={'url(#' + layerId + '-shelf-gradient)'} clipPath={'url(#' + layerId + '-shelf-clip)'} />
      </Svg>

      {/* Cam: havaya göre renk, içinde bulut, yağmur, kar, damlalar, şimşek. */}
      {glass && <Animated.Image source={L.cam.src} style={[box(L.cam.box), { tintColor: glass.tone, opacity: Animated.multiply(weatherOpacity, glass.op) }]} />}
      {sky === 'storm' && <Animated.Image source={L.cam.src} style={[box(L.cam.box), { tintColor: '#F4F7FF', opacity: Animated.multiply(weatherOpacity, vals.flash.interpolate({ inputRange: [0, 0.08, 0.16, 0.24, 1], outputRange: [0, 0.85, 0.1, 0.6, 0] })) }]} />}
      {(clouds || wet || snow) && L.cells.map((c, ci) => (
        <View key={ci} style={[box(c), { overflow: 'hidden' }]}>
          {clouds && c.w >= 60 && (
            <Animated.Image
              source={PARCA.bulut}
              style={{
                position: 'absolute', top: (c.h * 0.12 + (ci % 2) * 24) * s, width: 150 * s, height: 112 * s, opacity: Animated.multiply(weatherOpacity, cloudOpacity), tintColor: wet ? '#C9D1DC' : sky === 'fog' ? '#EDF1F5' : undefined,
                transform: [{ translateX: vals.drift.interpolate({ inputRange: [0, 1], outputRange: [-150 * s - ci * 20 * s, (c.w + 40) * s] }) }],
              }}
            />
          )}
          {(wet || snow) && vals.rain.map((r, i) => {
            if (i % L.cells.length !== ci || (snow && c.w < 60)) return null;
            const x = (2 + ((i * 37 + ci * 23) % 96)) / 100;
            const move = { translateY: r.interpolate({ inputRange: [0, 1], outputRange: [-(snow ? 14 : 30) * s, (c.h + 6) * s] }) };
            return snow ? (
              <Animated.Image
                key={i}
                source={PARCA.kar}
                style={{
                  position: 'absolute', left: x * c.w * s, top: 0, width: (9 + (i % 3) * 3) * s, height: (8 + (i % 3) * 3) * s, opacity: Animated.multiply(weatherOpacity, 0.95),
                  transform: [move, { translateX: r.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, (i % 2 ? 9 : -9) * s, 0] }) }, { rotate: r.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${i % 2 ? 120 : -120}deg`] }) }],
                }}
              />
            ) : (
              <Animated.View key={i} style={{ position: 'absolute', left: x * c.w * s, top: 0, width: Math.max(1, 2 * s), height: (22 + (i % 4) * 6) * s, borderRadius: 2, backgroundColor: '#DCEBFA', opacity: Animated.multiply(weatherOpacity, ci < 2 ? 0.85 : 0.68), transform: [move, { rotate: '10deg' }] }} />
            );
          })}
        </View>
      ))}
      {wet && big.map((c, ci) => vals.drops.map((d, i) => i !== ci ? null : (
        <Animated.Image
          key={`d${ci}-${i}`}
          source={PARCA.damla}
          style={{
            position: 'absolute', left: (c.x + c.w * (0.18 + ((i * 41 + ci * 17) % 64) / 100)) * s, top: (c.y + c.h * (0.08 + ((i * 29 + ci * 11) % 40) / 100)) * s,
            width: 11 * s, height: 14 * s, opacity: Animated.multiply(d.interpolate({ inputRange: [0, 0.1, 0.85, 1], outputRange: [0, 0.85, 0.85, 0] }), weatherOpacity),
            transform: [{ translateY: d.interpolate({ inputRange: [0, 0.3, 0.45, 1], outputRange: [0, 4 * s, 10 * s, c.h * 0.5 * s] }) }],
          }}
        />
      )))}

      {/* Pencerenin önündekiler (çerçeve, yapraklar) havanın üstünde kalır. */}
      {(glass || clouds || snow) && <Animated.Image source={L.onCam.src} style={[box(L.onCam.box), { opacity: weatherOpacity }]} />}

      {/* Işık zinciri bitkilerin arkasında: seride her gün bir ampul yanar (7'de hepsi). */}
      {chain >= 0 && <Chain pts={chainPts(L)} lights={vals.chainLights} sweep={vals.chainSweep} s={s} night={phase === 'gece'} />}

      {/* Hareketli parçalar: bitkiler salınır, kupalar sarkaç gibi, kitaplar arada bir sallanır. */}
      {PARTS.map(k => {
        const P = L.parts[k];
        const m = MOTION[k];
        const rot = Animated.add(vals.part[k], vals.nudge[k]).interpolate({ inputRange: [-1, 0, 0.5, 1, 2], outputRange: [`${-m.deg * 5}deg`, `${-m.deg}deg`, '0deg', `${m.deg}deg`, `${m.deg * 5}deg`] });
        return (
          <Animated.View key={k} style={{ position: 'absolute', left: P.pivot.x * s, top: P.pivot.y * s, width: 0, height: 0, transform: [...shift(m.tilt, m.tilt * 0.6), { rotate: rot }] }}>
            {k === 'asma' ? <HangingPlanter phase={phase} s={s} ivy={vals.ivy} /> : (
              <Image source={P.src} resizeMode="stretch" fadeDuration={0} style={{ position: 'absolute', left: (P.box.x - P.pivot.x) * s, top: (P.box.y - P.pivot.y) * s, width: P.box.w * s, height: P.box.h * s }} accessibilityIgnoresInvertColors />
            )}
          </Animated.View>
        );
      })}

      {/* Pervazdaki gövde ve saksı sabit. Yapraklar saksının ağzından esner. */}
      <Animated.View style={{ position: 'absolute', left: 158 * s, top: 951 * s, width: 0, height: 0, transform: [{
        rotate: Animated.add(vals.part.pencerebitki, vals.nudge.pencerebitki).interpolate({
          inputRange: [-1, 0.5, 2], outputRange: ['-1.9deg', '0deg', '1.9deg'], extrapolate: 'clamp',
        }),
      }] }}>
        <Image source={L.sillLeaves} resizeMode="stretch" fadeDuration={0} style={{ position: 'absolute', left: -124 * s, top: -126 * s, width: 237 * s, height: 143 * s }} />
      </Animated.View>

      {/* Asma saksıdan arada bir, dokununca da bir yaprak süzülüp düşer. */}
      {[vals.leaf, vals.tapLeaf].map((leaf, i) => (
        <Animated.Image
          key={`falling-leaf-${i}`}
          source={L.yaprak.src}
          pointerEvents="none"
          style={{
            position: 'absolute', left: leafFrom.x * s, top: leafFrom.y * s, width: L.yaprak.w * 0.7 * s, height: L.yaprak.h * 0.7 * s,
            opacity: leaf.interpolate({ inputRange: [0, 0.04, 0.85, 1], outputRange: [0, 1, 1, 0] }),
            transform: [
              { translateY: leaf.interpolate({ inputRange: [0, 1], outputRange: [0, 520 * s] }) },
              { translateX: leaf.interpolate({ inputRange: [0, 0.2, 0.4, 0.6, 0.8, 1], outputRange: [0, 34 * s, -6 * s, 40 * s, 4 * s, 46 * s] }) },
              { rotate: leaf.interpolate({ inputRange: [0, 0.2, 0.4, 0.6, 0.8, 1], outputRange: ['0deg', '40deg', '-25deg', '45deg', '-15deg', '30deg'] }) },
            ],
          }}
        />
      ))}
    </Animated.View>
  );
}

/**
 * Moka'nın canlı odası (v6 resimleri).
 * - Saate göre sabah, akşam ya da gece resmi; saat değişince yumuşakça geçer.
 * - Bitkiler salınır, asılı kupalar sallanır, kitaplar arada bir oynar, yaprak düşer, lamba nefes alır, toz uçuşur,
 *   kahve sürahisinden ve kupadan buhar çıkar (seri), gece yıldızlar göz kırpar.
 * - Hava camda: bulut geçer, yağmur ve kar yağar, camda damlalar kayar, fırtınada şimşek çakar, sis camı buğular.
 * - `warm` bugünkü işlerle ışığı ısıtır, `dust` uzun uğramamada loşluk ekler. Dokunulabilir nesneler `onTouch` ile haber verir.
 * - `tilt` verilirse katmanlar farklı miktarda kayar (hafif 3B).
 * Ekran odakta değilse, uygulama arka plandaysa ya da "hareketi azalt" açıksa döngüler durur.
 */
export function RoomBackdrop({ cheer = 0, phase: phaseProp, mix, sky = 'clear', warm = 0, dust = 0, lampOff = false, steam = 1, potGlow = false, brew = 0, chain = -1, tilt, onTouch, onReady, style, children }: {
  /** Her artışta kutlama: lamba parlar, sürahi parıldar. */ cheer?: number;
  /** Saat resmi; verilmezse saate göre seçilir. */ phase?: OdaPhase;
  /** Eski API: 0 gündüz, 1 gece (phase yoksa kullanılır). */ mix?: number;
  sky?: SkyKind; warm?: number; dust?: number;
  /** Lamba söndürüldü: hale yok, oda biraz loş. */ lampOff?: boolean;
  /** Sürahiden çıkan buhar çizgisi (0-3): seri durumuna göre. */ steam?: number;
  /** Sürahinin etrafında sıcak hale (kahve taze). */ potGlow?: boolean;
  /** Artınca sürahi bir kez "fokurdar". */ brew?: number;
  /** Işık zincirinde yanan ampul (0-7); -1 zincir yok. */ chain?: number;
  /** Katman kayması için eğim (useTilt). */ tilt?: Animated.ValueXY;
  onTouch?: (t: RoomTouch) => void; onReady?: () => void; style?: StyleProp<ViewStyle>; children?: ReactNode;
}) {
  const phase: OdaPhase = phaseProp ?? (mix === undefined ? odaPhaseOf() : mix > 0.5 ? 'gece' : 'sabah');
  const L = ODA[phase];
  const night = phase === 'gece' ? 1 : 0;
  const dusk = phase === 'aksam' ? 1 : 0;
  const reduceM = useReduceMotion();
  const active = useActive();
  const run = !reduceM && active;
  const [size, setSize] = useState({ w: 0, h: 0 });
  const vals = useMemo<Vals>(() => ({
    part: Object.fromEntries(PARTS.map(k => [k, new Animated.Value(0.5)])) as Record<OdaPart, Animated.Value>,
    nudge: Object.fromEntries(PARTS.map(k => [k, new Animated.Value(0)])) as Record<OdaPart, Animated.Value>,
    lamp: new Animated.Value(0.9), moon: new Animated.Value(0.3), sun: new Animated.Value(0), boost: new Animated.Value(0), pot: new Animated.Value(0), ivy: new Animated.Value(0.5),
    beam: new Animated.Value(0), cloud: new Animated.Value(0), halo: new Animated.Value(0), fest: new Animated.Value(0),
    twinkle: [0, 1, 2, 3].map(() => new Animated.Value(0)), cup: [0, 1].map(() => new Animated.Value(0)), chainSweep: new Animated.Value(0), chainLights: Array.from({ length: 7 }, () => new Animated.Value(0)),
    stars: Array.from({ length: 8 }, () => new Animated.Value(0.3)), dust: MOTES.day.map(() => new Animated.Value(0)), steam: [0, 1, 2].map(() => new Animated.Value(0)),
    rain: Array.from({ length: RAIN_N }, () => new Animated.Value(0)), drops: [0, 1, 2].map(() => new Animated.Value(0)),
    drift: new Animated.Value(0), flash: new Animated.Value(0), weather: new Animated.Value(1), leaf: new Animated.Value(0), tapLeaf: new Animated.Value(0),
  }), []);
  const wet = sky === 'rain' || sky === 'storm' || sky === 'snow';
  const rainy = sky === 'rain' || sky === 'storm';
  const clearNight = clearNightCondition(night, sky);
  const motes = night ? MOTES.night : MOTES.day;

  // Saat değişince yeni resim eskinin üstünde 1,6 sn'de belirir (hareketi azaltta hemen geçer).
  const [layers, setLayers] = useState<{ p: OdaPhase; a: Animated.Value }[]>(() => [{ p: phase, a: new Animated.Value(1) }]);
  const top = layers[layers.length - 1]!;
  if (top.p !== phase) setLayers(ls => (run ? [...ls.slice(-1), { p: phase, a: new Animated.Value(0) }] : [{ p: phase, a: new Animated.Value(1) }]));
  useEffect(() => {
    if (layers.length < 2) return;
    const a = layers[layers.length - 1]!.a;
    const t = Animated.timing(a, { toValue: 1, duration: 1600, easing: sine, useNativeDriver: true });
    t.start(({ finished }) => { if (finished) setLayers(ls => ls.filter(l => l.a === a)); });
    return () => { t.stop(); a.setValue(1); };
  }, [layers]);

  useEffect(() => {
    vals.weather.stopAnimation();
    if (!run || sky === 'clear') {
      vals.weather.setValue(1);
      return;
    }
    vals.weather.setValue(0);
    const transition = Animated.timing(vals.weather, { toValue: 1, duration: 1100, easing: sine, useNativeDriver: true, isInteraction: false });
    transition.start();
    return () => transition.stop();
  }, [run, sky, vals]);

  useEffect(() => {
    if (!run) return;
    const leafFall = every(vals.leaf, 22000, 40000, v => Animated.timing(v, { toValue: 1, duration: 7000, easing: Easing.inOut(Easing.quad), useNativeDriver: true, isInteraction: false }), 6000);
    const anims: Stop[] = [
      ...PARTS.map(k => {
        const m = MOTION[k];
        const v = vals.part[k];
        return m.kind === 'rock' ? rock(v, m.delay) : m.kind === 'swing' ? sway(v, m.ms, m.delay, 0.12) : sway(v, m.ms, m.delay, 0.35);
      }),
      sway(vals.ivy, 5400, 650, 0.2),
      breathe(vals.lamp),
      ...(night ? [loop(vals.moon, 4200)] : []),
      ...(!night ? [loop(vals.sun, 7000)] : []),
      loop(vals.beam, 13000),
      loop(vals.halo, 4800, 600),
      // Bulut gölgesi: ışık huzmesi 30 sn'de bir kararıp geri gelir.
      (() => { const a = Animated.loop(Animated.sequence([Animated.delay(14000), Animated.timing(vals.cloud, { toValue: 1, duration: 4200, easing: sine, useNativeDriver: true, isInteraction: false }), Animated.delay(1800), Animated.timing(vals.cloud, { toValue: 0, duration: 5200, easing: sine, useNativeDriver: true, isInteraction: false }), Animated.delay(5000)])); a.start(); return a; })(),
      ...vals.twinkle.map((x, i) => { const a = Animated.loop(Animated.sequence([Animated.delay(i * 1300 + 600), Animated.timing(x, { toValue: 1, duration: 520, easing: Easing.out(Easing.quad), useNativeDriver: true, isInteraction: false }), Animated.timing(x, { toValue: 0, duration: 700, easing: Easing.in(Easing.quad), useNativeDriver: true, isInteraction: false }), Animated.delay(3600 + i * 700)])); a.start(); return a; }),
      ...vals.cup.map((x, i) => rise(x, 3000 + i * 600, i * 1400, Easing.out(Easing.quad))),
      ...(night ? vals.stars.map((x, i) => sway(x, 900 + ((i * 677) % 1900), i * 430, 0.7)) : []),
      ...vals.dust.map((x, i) => rise(x, 5200 + ((i * 937) % 3600), (i * 1130) % 6000, Easing.inOut(Easing.sin))),
      leafFall,
    ];
    return () => {
      anims.forEach(a => a.stop());
    };
  }, [run, vals, phase, night]);

  useEffect(() => {
    if (!run) return;
    if (wet) vals.rain.forEach(v => v.setValue(0));
    if (rainy) vals.drops.forEach(v => v.setValue(0));
    vals.drift.setValue(0);
    if (sky === 'storm') vals.flash.setValue(0);
    const anims: Stop[] = [
      ...(wet ? vals.rain.map((x, i) => rise(x, sky === 'snow' ? 4200 + (i % 4) * 700 : 700 + (i % 3) * 160, i * (sky === 'snow' ? 330 : 30))) : []),
      ...(rainy ? vals.drops.map((x, i) => rise(x, 5200 + i * 1300, i * 2100, Easing.in(Easing.quad))) : []),
      rise(vals.drift, 48000),
      ...(sky === 'storm' ? [every(vals.flash, 9000, 16000, v => Animated.timing(v, { toValue: 1, duration: 900, easing: Easing.linear, useNativeDriver: true, isInteraction: false }), 4000)] : []),
    ];
    return () => anims.forEach(a => a.stop());
  }, [run, vals, sky, wet, rainy]);

  useEffect(() => {
    if (!run || !steam) return;
    const anims = vals.steam.slice(0, steam).map((x, i) => rise(x, 3200 + i * 420, i * 1050 + i * i * 160, Easing.out(Easing.quad)));
    return () => anims.forEach(a => a.stop());
  }, [run, vals, steam]);

  // Seri ampulleri: mevcut yananlar korunur, yeni ampuller yavaşça sırayla açılır.
  const chainLit = useRef(0);
  useEffect(() => {
    const count = Math.max(0, Math.min(vals.chainLights.length, Math.floor(chain)));
    if (!run) {
      vals.chainLights.forEach((light, index) => light.setValue(index < count ? 1 : 0));
      chainLit.current = count;
      return;
    }
    const alreadyLit = Math.min(chainLit.current, count);
    vals.chainLights.forEach((light, index) => light.setValue(index < alreadyLit ? 1 : 0));
    const pending = vals.chainLights.slice(alreadyLit, count);
    chainLit.current = count;
    if (!pending.length) return;
    const animation = Animated.stagger(850, pending.map(light => Animated.timing(light, { toValue: 1, duration: 650, easing: Easing.out(Easing.quad), useNativeDriver: true })));
    animation.start();
    return () => animation.stop();
  }, [chain, run, vals]);
  const showChain = chain >= 0;
  useEffect(() => {
    vals.chainSweep.setValue(0);
    if (!run || !showChain) return;
    const wave = rise(vals.chainSweep, 10500, 1250);
    return () => wave.stop();
  }, [run, showChain, vals]);
  // Fokurdama: sürahi parlar, buhar bir an büyür.
  useEffect(() => {
    if (!brew || !run) return;
    vals.pot.setValue(0);
    const a = Animated.sequence([
      Animated.timing(vals.pot, { toValue: 1, duration: 260, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.delay(900),
      Animated.timing(vals.pot, { toValue: 0, duration: 1400, easing: sine, useNativeDriver: true }),
    ]);
    a.start();
    return () => a.stop();
  }, [brew, run, vals]);

  // Kutlama: lamba parlar, sürahi parıldar, kupalar ve bitkiler bir sevinçle sallanır.
  const lastCheer = useRef(cheer);
  useEffect(() => {
    if (cheer === lastCheer.current) return;
    lastCheer.current = cheer;
    if (!cheer || !run) return;
    vals.fest.setValue(0);
    const celebration = Animated.parallel([
      Animated.sequence([Animated.timing(vals.boost, { toValue: 1, duration: 200, useNativeDriver: true }), Animated.delay(1400), Animated.timing(vals.boost, { toValue: 0, duration: 1100, useNativeDriver: true })]),
      Animated.sequence([Animated.timing(vals.pot, { toValue: 0.8, duration: 260, useNativeDriver: true }), Animated.delay(900), Animated.timing(vals.pot, { toValue: 0, duration: 1400, useNativeDriver: true })]),
      Animated.timing(vals.fest, { toValue: 1, duration: 2600, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ...(['kupa1', 'kupa2', 'kitapust'] as OdaPart[]).map((k, i) => Animated.sequence([Animated.delay(i * 120), Animated.timing(vals.nudge[k], { toValue: 1.2, duration: 150, useNativeDriver: true }), Animated.spring(vals.nudge[k], { toValue: 0, friction: 2.4, tension: 80, useNativeDriver: true })])),
    ]);
    celebration.start();
    return () => celebration.stop();
  }, [cheer, run, vals]);

  /** Dokununca kısa tepki: lamba parlar, sürahi parlar, kupalar ya da bitki sallanır. */
  const kick = (k: OdaPart, amt = 1.4) => Animated.sequence([Animated.timing(vals.nudge[k], { toValue: amt, duration: 140, useNativeDriver: true }), Animated.spring(vals.nudge[k], { toValue: 0, friction: 2.2, tension: 90, useNativeDriver: true })]);
  const [reaction] = useState(() => new Map<RoomTouch | OdaPart, Animated.CompositeAnimation>());
  useEffect(() => {

    return () => {
      reaction.forEach(a => a.stop());
      reaction.clear();
      PARTS.forEach(k => { vals.nudge[k].setValue(0); vals.part[k].setValue(0.5); });
      vals.ivy.setValue(0.5);
      vals.boost.setValue(0);
      vals.pot.setValue(0);
      vals.fest.setValue(0);
    };
  }, [run, vals, reaction]);
  const react = (t: RoomTouch, plant: OdaPart = 'sehpabitki') => {
    onTouch?.(t);
    if (!run) return;
    const target = t === 'bitki' ? plant : t;
    const start = (animation: Animated.CompositeAnimation) => {
      reaction.get(target)?.stop();
      reaction.set(target, animation);
      animation.start();
    };
    if (t === 'lamba') start(Animated.sequence([Animated.timing(vals.boost, { toValue: 1, duration: 160, useNativeDriver: true }), Animated.delay(1600), Animated.timing(vals.boost, { toValue: 0, duration: 900, useNativeDriver: true })]));
    if (t === 'surahi') start(Animated.sequence([Animated.timing(vals.pot, { toValue: 0.7, duration: 180, useNativeDriver: true }), Animated.timing(vals.pot, { toValue: 0, duration: 1100, useNativeDriver: true })]));
    if (t === 'kupa') start(Animated.stagger(110, [kick('kupa1', 1.8), kick('kupa2', -1.6)]));
    if (t === 'bitki' && plant === 'asma') {
      vals.tapLeaf.stopAnimation();
      vals.tapLeaf.setValue(0);
      start(Animated.parallel([
        kick('asma', 1.35),
        Animated.sequence([
          Animated.delay(80),
          Animated.timing(vals.tapLeaf, { toValue: 1, duration: 7000, easing: Easing.inOut(Easing.quad), useNativeDriver: true, isInteraction: false }),
        ]),
      ]));
    } else if (t === 'bitki') start(kick(plant, 0.65));
  };

  const onLayout = (e: LayoutChangeEvent) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });
  const s = size.w ? Math.max(size.w / ODA_W, size.h / ODA_H) : 0;
  const W = ODA_W * s;
  const H = ODA_H * s;
  const ox = (size.w - W) / 2;
  const oy = (size.h - H) / 2;
  const box = (b: Box) => ({ position: 'absolute' as const, left: b.x * s, top: b.y * s, width: b.w * s, height: b.h * s });
  const glow = (x: number, y: number, r: number, color: string, opacity: Animated.AnimatedInterpolation<number> | Animated.Value | number, key?: string | number) => (
    <Animated.Image key={key} source={ISIK} pointerEvents="none" style={{ position: 'absolute', left: (x - r) * s, top: (y - r) * s, width: 2 * r * s, height: 2 * r * s, tintColor: color, opacity }} />
  );
  const lampOp = Animated.add(vals.lamp.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.4] }), vals.boost.interpolate({ inputRange: [0, 1], outputRange: [0, 0.35] }));
  const dim = Math.max(Math.min(0.4, dust * 0.4), lampOff ? 0.14 + 0.16 * night : 0);
  const lampOn = !lampOff;
  const LAMP = L.lamp;
  const POT = L.chemex;
  // Gece yıldızları: büyük cam gözlerinin üst kısmına serpiştirilir.
  const starPts = useMemo(() => {
    const cs = ODA.gece.cells.filter(c => c.w >= 60);
    return vals.stars.map((_, i) => {
      const c = cs[i % cs.length]!;
      return { x: c.x + c.w * (0.15 + ((i * 53) % 70) / 100), y: c.y + c.h * (0.1 + ((i * 37) % 45) / 100) };
    });
  }, [vals]);
  return (
    <View onLayout={onLayout} style={[{ overflow: 'hidden' }, style]} pointerEvents="box-none">
      {s > 0 && (
        <View style={{ position: 'absolute', left: ox, top: oy, width: W, height: H }} pointerEvents="box-none">
          {layers.map(l => <PhaseLayer key={l.p} phase={l.p} s={s} vals={vals} sky={sky} chain={chain} tilt={tilt} opacity={l.a} weatherOpacity={vals.weather} onReady={onReady} />)}

          {L.moon && clearNight && glow(L.moon.x, L.moon.y, 70, '#FFF3C4', vals.moon.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.6] }))}
          {clearNight && starPts.map((p, i) => (
            <Animated.Image key={`st${i}`} source={PARCA.yildiz} pointerEvents="none" style={{ position: 'absolute', left: (p.x - 6) * s, top: (p.y - 6) * s, width: 12 * s, height: 12 * s, tintColor: '#FFFBE0', opacity: vals.stars[i]!.interpolate({ inputRange: [0, 1], outputRange: [0.05, 0.95] }), transform: [{ scale: vals.stars[i]!.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }] }} />
          ))}
          {!night && glow(300, 1000, 230, dusk ? '#FFB870' : '#FFD68A', vals.sun.interpolate({ inputRange: [0, 1], outputRange: [0.02, dusk ? 0.24 : 0.18] }))}

          {/* Pencere ışığı: sabah sıcak, akşam altın, gece soğuk bir huzme yerde yavaşça kayar; bulut geçince söner. */}
          {sky !== 'storm' && [0, 1].map(k => (
            <Animated.Image
              key={`beam${k}`}
              source={ISIK}
              pointerEvents="none"
              style={{
                position: 'absolute', left: (150 + k * 40) * s, top: (640 + k * 150) * s, width: 760 * s, height: 150 * s, tintColor: night ? '#B7CBFF' : dusk ? '#FFC27A' : '#FFE7B0',
                opacity: Animated.multiply(Animated.multiply(Animated.multiply(vals.beam.interpolate({ inputRange: [0, 1], outputRange: k ? [0.08, 0.16] : [0.18, 0.1] }), vals.cloud.interpolate({ inputRange: [0, 1], outputRange: [1, 0.15] })), vals.weather), (night ? 0.5 : 1) * (wet || sky === 'cloudy' ? 0.45 : 1)),
                transform: [{ translateX: vals.beam.interpolate({ inputRange: [0, 1], outputRange: [-18 * s * (k ? -1 : 1), 24 * s * (k ? -1 : 1)] }) }, { rotate: `${16 + k * 7}deg` }],
              }}
            />
          ))}

          {/* Toz zerreleri: lamba ve pencere ışığında */}
          {motes.map((m, i) => (
            <Animated.View
              key={i}
              pointerEvents="none"
              style={{
                position: 'absolute', left: m.x * s, top: m.y * s, width: m.r * 2 * s, height: m.r * 2 * s, borderRadius: m.r * s, backgroundColor: '#FFE9B8',
                opacity: vals.dust[i]!.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, i % 3 === 0 || dust > 0.3 ? 0.75 : 0.45, 0] }),
                transform: [
                  ...(tilt ? [{ translateX: tilt.x.interpolate({ inputRange: [-1, 1], outputRange: [(8 + (i % 3) * 5) * s, -(8 + (i % 3) * 5) * s] }) }] : []),
                  { translateY: vals.dust[i]!.interpolate({ inputRange: [0, 1], outputRange: [0, -(26 + (i % 4) * 8) * s] }) },
                  { translateX: vals.dust[i]!.interpolate({ inputRange: [0, 0.35, 0.7, 1], outputRange: [0, (i % 2 ? 9 : -9) * s, (i % 2 ? -4 : 5) * s, (i % 2 ? 10 : -11) * s] }) },
                  { scale: vals.dust[i]!.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.7, 1.1, 0.8] }) },
                ],
              }}
            />
          ))}

          {/* Kahve sürahisi (seri): taze iken sıcak hale, ağzından kıvrılan buhar. */}
          {potGlow && glow(POT.x, POT.y + 60, 120, '#FFC98A', 0.22 + night * 0.12, 'potGlow')}
          {glow(POT.x, POT.y + 60, 150, '#FFD9A0', vals.pot.interpolate({ inputRange: [0, 1], outputRange: [0, 0.55] }), 'potBrew')}
          {vals.steam.slice(0, steam).map((st, i) => (
            <Animated.View
              key={`sb${i}`}
              pointerEvents="none"
              style={{
                position: 'absolute', left: (POT.x - 8 + (i - 1) * 12) * s, top: (POT.y - 6) * s, width: 16 * s, height: 24 * s, borderRadius: 12 * s, backgroundColor: '#FFFFFF',
                opacity: Animated.multiply(st.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, steam > 1 ? 0.5 : 0.34, 0] }), vals.pot.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] })),
                transform: [
                  { translateY: st.interpolate({ inputRange: [0, 1], outputRange: [0, -74 * s] }) },
                  { translateX: st.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [0, 6 * s, -2 * s, -8 * s, -3 * s] }) },
                  { scaleX: Animated.multiply(st.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1.7] }), vals.pot.interpolate({ inputRange: [0, 1], outputRange: [1, 1.5] })) },
                  { scaleY: st.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.3] }) },
                ],
              }}
            />
          ))}
          {vals.steam.slice(0, steam).map((st, i) => (
            <Animated.Image
              key={`sm${i}`}
              source={PARCA.buhar}
              pointerEvents="none"
              style={{
                position: 'absolute', left: (POT.x - 11 + (i - 1) * 14) * s, top: (POT.y - 80) * s, width: 22 * s, height: 80 * s, tintColor: '#FFFFFF',
                opacity: st.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 0.75, 0] }),
                transform: [{ translateY: st.interpolate({ inputRange: [0, 1], outputRange: [14 * s, -36 * s] }) }, { scaleX: st.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.4] }) }],
              }}
            />
          ))}
          {/* Raftaki kupadan ince buhar. */}
          {vals.cup.map((st, i) => (
            <Animated.Image
              key={`cup${i}`}
              source={PARCA.buhar}
              pointerEvents="none"
              style={{
                position: 'absolute', left: (L.mug.x - 10 + i * 12) * s, top: (L.mug.y - 56) * s, width: 18 * s, height: 56 * s, tintColor: '#FFFFFF',
                opacity: st.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0, 0.7, 0] }),
                transform: [{ translateY: st.interpolate({ inputRange: [0, 1], outputRange: [8 * s, -30 * s] }) }, { scaleX: st.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.5] }) }],
              }}
            />
          ))}
          {/* Sürahi ve kupa: parıltılar sırayla yanıp söner (kutlamada hepsi). */}
          {[{ x: POT.x - 30, y: POT.y + 50 }, { x: POT.x + 30, y: POT.y + 90 }, { x: L.mug.x + 20, y: L.mug.y + 10 }, { x: L.mug.x - 10, y: L.mug.y + 50 }].map((p, i) => (
            <Animated.Image
              key={`tw${i}`}
              source={PARCA.yildiz}
              pointerEvents="none"
              style={{
                position: 'absolute', left: (p.x - 10) * s, top: (p.y - 10) * s, width: 20 * s, height: 20 * s, tintColor: '#FFF3C4',
                opacity: Animated.add(vals.twinkle[i]!, vals.fest.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.8, 0] })),
                transform: [{ scale: vals.twinkle[i]!.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }) }, { rotate: vals.twinkle[i]!.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '70deg'] }) }],
              }}
            />
          ))}
          {lampOn && (
            <Animated.Image
              source={ISIK}
              pointerEvents="none"
              style={{ position: 'absolute', left: (LAMP.x - 260) * s, top: (LAMP.y - 260) * s, width: 520 * s, height: 520 * s, tintColor: '#FFB44D', opacity: Animated.multiply(lampOp, 0.6 + 0.25 * dusk + 0.4 * night + warm * 0.4), transform: [{ scale: Animated.add(vals.halo.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.05] }), vals.boost.interpolate({ inputRange: [0, 1], outputRange: [0, 0.08] })) }] }}
            />
          )}
          {lampOn && (
            <Animated.Image
              source={ISIK}
              pointerEvents="none"
              style={{ position: 'absolute', left: (LAMP.x - 120) * s, top: (LAMP.y - 90) * s, width: 240 * s, height: 180 * s, tintColor: '#FFE9A8', opacity: Animated.add(vals.lamp.interpolate({ inputRange: [0.5, 1], outputRange: [0.12, 0.45], extrapolate: 'clamp' }), vals.boost.interpolate({ inputRange: [0, 1], outputRange: [0, 0.3] })) }}
            />
          )}
          {/* Bugünkü işler lamba halesini büyütüp ısıtır. */}
          {warm > 0 && lampOn && glow(LAMP.x, LAMP.y + 120, 300 + warm * 160, '#FFC27A', Animated.multiply(vals.lamp, 0.12 + warm * 0.18))}
          {/* Günlerce uğranmadı: kenarlardan içe loşluk. */}
          {dim > 0 && VIGNETTE.map((p, i) => glow(p.x, p.y, p.r, '#141B2E', Math.min(0.9, dim * 1.6), i))}
          {onTouch && (Object.keys(L.hit) as RoomTouch[]).map(k => (
            <Pressable key={k} onPress={() => react(k)} accessibilityLabel={k} style={box(L.hit[k])} />
          ))}
          {onTouch && <>
            <Pressable accessible={false} onPress={() => react('bitki', 'asma')} style={box({ x: 0, y: L.parts.asma.pivot.y + 85, w: 320, h: 308 })} />
            <Pressable accessible={false} onPress={() => react('bitki', 'asma')} style={box({ x: 202, y: L.parts.asma.pivot.y + 393, w: 112, h: 245 })} />
            <Pressable accessible={false} onPress={() => react('bitki', 'pencerebitki')} style={box({ x: 60, y: 855, w: 230, h: 232 })} />
          </>}
        </View>
      )}
      {children}
    </View>
  );
}
