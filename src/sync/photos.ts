import { File } from 'expo-file-system';

import { supabase } from '@/lib/supabase';

/**
 * Premium fotoğraf yedeği: günlük fotoğrafları Supabase Storage'daki özel `yedek` kovasına,
 * kullanıcının kendi klasörüne (`<kullanıcı id>/…`) yüklenir. Kova kuralları sadece Premium
 * üyenin kendi klasörüne yazmasına izin verir (supabase/migrations/…_premium.sql).
 * Telefon değişince fotoğraf buradan, kısa süreli imzalı bağlantıyla gösterilir.
 */
const BUCKET = 'yedek';

export async function uploadPhoto(userId: string, uri: string, name: string): Promise<string | null> {
  if (!supabase) return null;
  try {
    const key = `${userId}/${name}.jpg`;
    const body = await new File(uri).arrayBuffer();
    const { error } = await supabase.storage.from(BUCKET).upload(key, body, { contentType: 'image/jpeg', upsert: true });
    return error ? null : key;
  } catch {
    return null;
  }
}

export async function removePhoto(key: string) {
  await supabase?.storage.from(BUCKET).remove([key]).catch(() => {});
}

const cache = new Map<string, { url: string; until: number }>();

/** Yedekteki fotoğrafın bir saatlik bağlantısı. */
export async function photoUrl(key: string): Promise<string | null> {
  const hit = cache.get(key);
  if (hit && hit.until > Date.now()) return hit.url;
  if (!supabase) return null;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(key, 3600);
  if (error || !data) return null;
  cache.set(key, { url: data.signedUrl, until: Date.now() + 3000_000 });
  return data.signedUrl;
}

/** Hesap silinirken kullanıcının bütün yedek fotoğraflarını siler. */
export async function removeAllPhotos(userId: string) {
  if (!supabase) return;
  try {
    const { data } = await supabase.storage.from(BUCKET).list(`${userId}/gunluk`, { limit: 1000 });
    if (data?.length) await supabase.storage.from(BUCKET).remove(data.map(f => `${userId}/gunluk/${f.name}`));
  } catch {
    // Silinemeyenler kullanıcı silinince sahipsiz kalır; Supabase panelinden temizlenebilir.
  }
}
