import type { HomeData } from './types';

/** Aile paylaşımı (Premium). Ayrıntılar: src/family/FamilyProvider.tsx ve supabase/migrations/…_premium.sql. */
export type FamilyMember = { id: string; name: string; owner: boolean };

export type FamilyInfo = {
  role: 'owner' | 'member';
  ownerId: string;
  ownerName: string;
  /** Sadece ev sahibine gösterilir. */
  code: string | null;
  /** Ev sahibinin paylaştığı evin kimliği (onun telefonundaki `homeId`). */
  homeId: string;
  /** Ev sahibinin Premium üyeliği sürüyor mu. Bitince paylaşım durur, herkesin kopyası kalır. */
  active: boolean;
  members: FamilyMember[];
};

export type SharedHome = { state: HomeData; updatedAt: string };

/** Bir ailede en fazla kaç kişi (ev sahibi dahil). Sunucu da aynı sınırı uygular. */
export const FAMILY_MAX = 6;

/** Ailenin ortak hedefi (ör. "Bu ay 10 kitap"). Sunucu: `goals_list()` (…_aile_evi.sql). */
export type FamilyGoal = {
  id: string;
  title: string;
  emoji: string;
  target: number;
  unit: string;
  due: string | null;
  done: boolean;
  createdBy: string;
  total: number;
  /** Kişi kimliği → o kişinin ilerlemesi. */
  byMember: Record<string, number>;
};

/** Hedef için hazır öneriler. */
export const GOAL_IDEAS: { emoji: string; title: string; target: number; unit: string }[] = [
  { emoji: '📚', title: 'Birlikte kitap okuyalım', target: 10, unit: 'kitap' },
  { emoji: '🏃', title: 'Bu ay spor yapalım', target: 20, unit: 'gün' },
  { emoji: '🍽️', title: 'Evde yemek yiyelim', target: 15, unit: 'öğün' },
  { emoji: '💧', title: 'Su içelim', target: 60, unit: 'bardak' },
  { emoji: '🧹', title: 'Ev işlerini bölüşelim', target: 30, unit: 'iş' },
];

export const goalPct = (g: FamilyGoal) => Math.min(100, Math.round((g.total / g.target) * 100));
