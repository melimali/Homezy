import { File } from 'expo-file-system';
import { FunctionsHttpError } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';
import type { StockLevel, WashType } from '@/domain/types';

/**
 * Yapay zekâ ile fotoğraf taraması. Fotoğraf `scan` sunucu fonksiyonuna gider (supabase/functions/scan);
 * fonksiyon hakkı kontrol eder, Claude'a sorar ve listeyi döner. Fotoğraf sunucuda saklanmaz.
 * Sınır sunucuda tutulur: ücretsizde haftada 2, Premium'da günde 2 (bkz. docs/premium.md).
 */
export type ScanKind = 'fridge' | 'look';

export type FridgeScan = {
  items: { name: string; qty: string; lvl: StockLevel; match: string | null }[];
  missing: string[];
  note: string;
};

export type LookScan = {
  pieces: { name: string; cat: string; wash: WashType | null; match: string | null }[];
  worn: boolean;
  note: string;
};

type Ok<T> = { ok: true; result: T; used: number; limit: number; premium: boolean };
type Fail = { ok: false; message: string; limit?: boolean; retry?: boolean };

export async function scanPhoto(kind: 'fridge', uri: string, known: string[]): Promise<Ok<FridgeScan> | Fail>;
export async function scanPhoto(kind: 'look', uri: string, known: string[]): Promise<Ok<LookScan> | Fail>;
export async function scanPhoto(kind: ScanKind, uri: string, known: string[]): Promise<Ok<FridgeScan | LookScan> | Fail> {
  if (!supabase) return { ok: false, message: 'Tarama bu sürümde kullanılamıyor.' };
  let image: string;
  try {
    image = await new File(uri).base64();
  } catch {
    return { ok: false, message: 'Fotoğraf okunamadı. Başka bir fotoğraf dene.' };
  }
  const mediaType = /\.png$/i.test(uri) ? 'image/png' : /\.webp$/i.test(uri) ? 'image/webp' : 'image/jpeg';
  const { data, error } = await supabase.functions.invoke('scan', { body: { kind, image, mediaType, known } });
  if (!error) return { ok: true, ...data };

  if (!(error instanceof FunctionsHttpError)) return { ok: false, message: 'Bağlantıda bir sorun oldu. İnternetini kontrol edip tekrar dene.', retry: true };
  const status = error.context.status as number;
  const body = await error.context.json().catch(() => ({}));
  if (status === 429) {
    return {
      ok: false,
      limit: true,
      message: body.premium
        ? `Bugünkü ${body.limit} taramanı yaptın. Gece yarısı yenilenir, o zamana kadar listeyi elle güncelleyebilirsin.`
        : `Bu haftaki ${body.limit} ücretsiz taramanı kullandın. Pazartesi yenilenir; Premium'da her gün 2 tarama var.`,
    };
  }
  if (status === 401) return { ok: false, message: 'Oturumun kapanmış. Uygulamayı kapatıp açtıktan sonra tekrar dene.', retry: true };
  if (status === 413) return { ok: false, message: 'Fotoğraf çok büyük. Biraz uzaktan ya da galeriden daha küçük bir fotoğraf dene.' };
  if (status === 422) {
    return {
      ok: false,
      retry: true,
      message: kind === 'fridge'
        ? 'Fotoğraftan bir liste çıkaramadım. Daha aydınlık ve yakından çekilmiş bir fotoğraf dene.'
        : 'Fotoğraftan kıyafetleri çıkaramadım. Daha aydınlık ve yakından çekilmiş bir fotoğraf dene.',
    };
  }
  if (status === 404) return { ok: false, message: 'Tarama şu an kullanılamıyor. Listeyi elle güncelleyebilirsin.' };
  return { ok: false, message: 'Şu an tarama yapılamıyor. Biraz sonra tekrar dene; hakkından düşmedi.', retry: true };
}

/** Türkçe büyük-küçük harf duyarsız karşılaştırma için. */
export const trLow = (s: string | null | undefined) => String(s ?? '').toLocaleLowerCase('tr-TR').trim();
