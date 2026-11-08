// scripts/slice-wordmark.js tarafından üretildi. Yazı logosunun parçaları (assets/intro/wm-*.png), 1086x362 tuvalde.
export const WORDMARK = { w: 1086, h: 362 };
export const WM_PARTS = {
  h: { ...{"x":99,"y":52,"w":263,"h":235}, src: require('../../assets/intro/wm-h.png') },
  o: { ...{"x":319,"y":69,"w":130,"h":184}, src: require('../../assets/intro/wm-o.png') },
  m: { ...{"x":435,"y":125,"w":209,"h":138}, src: require('../../assets/intro/wm-m.png') },
  e: { ...{"x":628,"y":124,"w":119,"h":127}, src: require('../../assets/intro/wm-e.png') },
  z: { ...{"x":740,"y":126,"w":168,"h":158}, src: require('../../assets/intro/wm-z.png') },
  y: { ...{"x":837,"y":126,"w":132,"h":197}, src: require('../../assets/intro/wm-y.png') },
  swoosh: { ...{"x":309,"y":263,"w":497,"h":47}, src: require('../../assets/intro/wm-swoosh.png') },
  spark: { ...{"x":931,"y":75,"w":76,"h":86}, src: require('../../assets/intro/wm-spark.png') },
} as const;
export type WmKey = keyof typeof WM_PARTS;
