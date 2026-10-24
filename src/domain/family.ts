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
