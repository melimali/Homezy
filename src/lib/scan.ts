import { FunctionsHttpError } from '@supabase/supabase-js';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { LIMITS } from '@/domain/premium';
import { supabase } from '@/lib/supabase';
import type { StockLevel, WashType } from '@/domain/types';

/**
 * Yapay zekâ ile fotoğraf taraması. Fotoğraf `scan` sunucu fonksiyonuna gider (supabase/functions/scan);
 * fonksiyon hakkı kontrol eder, Claude'a sorar ve listeyi döner. Fotoğraf sunucuda saklanmaz.
 * Sınır sunucuda tutulur: ücretsizde haftada 2, Premium'da günde 50 (bkz. docs/premium.md).
 */
export type ScanKind = 'fridge' | 'look';

export type FridgeScan = {
  items: { name: string; qty: string; lvl: StockLevel; match: string | null }[];
  missing: string[];
  note: string;
};

export type LookScan = {
  /** Tür, renk, kumaş ve desen sunucunun yeni sürümünde var; eski sürümde yoksa addan tahmin edilir. */
  pieces: {
    name: string; cat: string; wash: WashType | null; match: string | null;
    kind?: string | null; color?: string | null; hex?: string | null; fabric?: string | null; pattern?: 'düz' | 'desenli';
  }[];
  worn: boolean;
  note: string;
};

type Ok<T> = { ok: true; result: T; used: number; limit: number; premium: boolean };
type Fail = { ok: false; message: string; limit?: boolean; retry?: boolean };

export async function scanPhoto(kind: 'fridge', uri: string, known: string[]): Promise<Ok<FridgeScan> | Fail>;
export async function scanPhoto(kind: 'look', uri: string, known: string[]): Promise<Ok<LookScan> | Fail>;
export async function scanPhoto(kind: ScanKind, uri: string, known: string[]): Promise<Ok<FridgeScan | LookScan> | Fail> {
  if (!supabase) return { ok: false, message: 'Tarama bu sürümde kullanılamıyor.' };
  const image = await prepare(uri);
  if (!image) return { ok: false, message: 'Fotoğraf okunamadı. Başka bir fotoğraf dene.' };
  // Sunucu kullanıcıyı oturumundan tanır; misafirin anonim oturumu henüz açılmadıysa şimdi açılır.
  const { data: auth } = await supabase.auth.getSession();
  if (!auth.session) {
    const { error: anonErr } = await supabase.auth.signInAnonymously();
    if (anonErr) return { ok: false, message: 'Tarama için internete bağlı olman gerekiyor. Bağlantını kontrol edip tekrar dene.', retry: true };
  }
  const { data, error } = await supabase.functions.invoke('scan', {
    body: { kind, image, mediaType: 'image/jpeg', known },
    timeout: TIMEOUT,
  });
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
        : `Bu haftaki ${body.limit} ücretsiz taramanı kullandın. Pazartesi yenilenir; Premium'da her gün ${LIMITS.premium.scans} tarama var.`,
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
        : 'Fotoğraftan teçhizatı çıkaramadım. Daha aydınlık ve yakından çekilmiş bir fotoğraf dene.',
    };
  }
  if (status === 502 && body.error === 'busy') return { ok: false, message: 'Yapay zekâ şu an çok yoğun. Bir dakika sonra tekrar dene; hakkından düşmedi.', retry: true };
  if (status === 503 && body.error === 'not_configured') return { ok: false, message: 'Tarama henüz açılmadı (yapay zekâ anahtarı girilmemiş). Listeyi elle güncelleyebilirsin.' };
  if (status === 404) return { ok: false, message: 'Tarama şu an kullanılamıyor. Listeyi elle güncelleyebilirsin.' };
  return { ok: false, message: 'Şu an tarama yapılamıyor. Biraz sonra tekrar dene; hakkından düşmedi.', retry: true };
}

/** Claude görseli uzun kenarı en fazla 1568 piksel olacak şekilde küçültür; daha büyüğü sadece yüklemeyi uzatır. */
const MAX_SIDE = 1568;
/** Tarama yarım dakika kadar sürer; iki dakikada cevap gelmezse bağlantı sorunu sayılır. */
const TIMEOUT = 120_000;

/**
 * Fotoğrafı küçültüp JPEG'e çevirir ve base64 döner. Telefon kamerası 12 MP ve HEIC çekebiliyor:
 * büyük dosya Claude'un 5 MB görsel sınırını aşıyor, HEIC hiç okunmuyordu. Okunamazsa null.
 */
async function prepare(uri: string): Promise<string | null> {
  try {
    const ref = await ImageManipulator.manipulate(uri, { maxWidth: MAX_SIDE, maxHeight: MAX_SIDE }).renderAsync();
    const big = Math.max(ref.width, ref.height);
    const img = big > MAX_SIDE
      ? await ImageManipulator.manipulate(ref).resize(ref.width >= ref.height ? { width: MAX_SIDE } : { height: MAX_SIDE }).renderAsync()
      : ref;
    const out = await img.saveAsync({ format: SaveFormat.JPEG, compress: 0.8, base64: true });
    return out.base64 || null;
  } catch (e) {
    console.warn('scan: photo prepare failed', e);
    return null;
  }
}

/** Türkçe büyük-küçük harf duyarsız karşılaştırma için. */
export const trLow = (s: string | null | undefined) => String(s ?? '').toLocaleLowerCase('tr-TR').trim();
