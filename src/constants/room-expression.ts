export const ROOM_EXPRESSIONS = [
  'content', 'happy', 'cheer', 'wow', 'curious', 'shy', 'playful', 'proud',
  'thinking', 'focused', 'empathetic', 'worried', 'sleepy', 'cozy', 'tickled', 'sad',
] as const;

export type RoomExpression = (typeof ROOM_EXPRESSIONS)[number];
export type RoomFaceAccent = 'blush' | 'sparkle' | 'question' | 'heart' | 'sweat' | 'tear' | 'thought' | 'warmth';
export type RoomFacePreset = {
  eyeOpen: number;
  gaze: number;
  brow: number;
  cheek: number;
  beakOpen: number;
  accent?: RoomFaceAccent;
};

const expressionSet: ReadonlySet<string> = new Set(ROOM_EXPRESSIONS);

export function isRoomExpression(value: unknown): value is RoomExpression {
  return typeof value === 'string' && expressionSet.has(value);
}

export const ROOM_FACE_PRESETS: Record<RoomExpression, RoomFacePreset> = {
  content:   { eyeOpen: 0.92, gaze: 0,     brow: 0,     cheek: 0.08, beakOpen: 0 },
  happy:     { eyeOpen: 0.98, gaze: 0,     brow: 0.1,   cheek: 0.45, beakOpen: 0.1, accent: 'blush' },
  cheer:     { eyeOpen: 1.04, gaze: 0,     brow: -0.2,  cheek: 0.55, beakOpen: 0.2, accent: 'sparkle' },
  wow:       { eyeOpen: 1.12, gaze: 0,     brow: -0.75, cheek: 0.12, beakOpen: 0.9, accent: 'sparkle' },
  curious:   { eyeOpen: 1.02, gaze: 0.45,  brow: -0.35, cheek: 0.18, beakOpen: 0.16, accent: 'question' },
  shy:       { eyeOpen: 0.78, gaze: -0.35, brow: 0.45,  cheek: 0.82, beakOpen: 0, accent: 'blush' },
  playful:   { eyeOpen: 0.96, gaze: 0.55,  brow: -0.55, cheek: 0.36, beakOpen: 0.14, accent: 'sparkle' },
  proud:     { eyeOpen: 0.94, gaze: 0,     brow: -0.25, cheek: 0.38, beakOpen: 0.08, accent: 'sparkle' },
  thinking:  { eyeOpen: 0.84, gaze: 0.5,   brow: 0.55,  cheek: 0.08, beakOpen: 0, accent: 'thought' },
  focused:   { eyeOpen: 0.78, gaze: 0.05,  brow: -0.65, cheek: 0.04, beakOpen: 0 },
  empathetic:{ eyeOpen: 0.84, gaze: -0.22, brow: 0.58,  cheek: 0.38, beakOpen: 0.06, accent: 'heart' },
  worried:   { eyeOpen: 0.9,  gaze: -0.2,  brow: 0.78,  cheek: 0.18, beakOpen: 0.12, accent: 'sweat' },
  sleepy:    { eyeOpen: 0.3,  gaze: -0.1,  brow: 0.18,  cheek: 0.08, beakOpen: 0 },
  cozy:      { eyeOpen: 0.72, gaze: 0.08,  brow: 0.12,  cheek: 0.5,  beakOpen: 0.04, accent: 'warmth' },
  tickled:   { eyeOpen: 0.99, gaze: 0,     brow: -0.18, cheek: 0.9,  beakOpen: 0.32, accent: 'heart' },
  sad:       { eyeOpen: 0.7,  gaze: -0.4,  brow: 0.82,  cheek: 0.08, beakOpen: 0, accent: 'tear' },
};