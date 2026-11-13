/**
 * Şema geçişi: kayıtlı sürüm < güncel ise adımlar sırayla çalışır. Kurallar:
 * - Adımlar yalnız ekler/dönüştürür, hiçbir veri silmez (silme/yeniden adlandırma için önce yeni alan doldurulur, eskisi kalır).
 * - Adım hata verirse sürüm yükseltilmez, eski veri olduğu gibi kalır; hata ve yedek anahtarı bırakılır, uygulama açılmaya devam eder.
 * - Adımlar tekrar çalışmaya dayanıklı (idempotent) yazılır.
 */
export type Migration<C> = (ctx: C) => Promise<void> | void;

export type MigrationResult = { from: number; to: number; ok: boolean; error?: string };

/** `steps[v]`, sürüm v-1'den v'ye geçiş adımıdır (steps[0] kullanılmaz). */
export async function runMigrations<C>(
  from: number,
  target: number,
  steps: Record<number, Migration<C>>,
  ctx: C,
  onStep?: (version: number) => Promise<void> | void,
): Promise<MigrationResult> {
  if (!(from < target)) return { from, to: from, ok: true };
  let at = from;
  try {
    for (let v = from + 1; v <= target; v++) {
      await steps[v]?.(ctx);
      at = v;
      await onStep?.(v);
    }
    return { from, to: at, ok: true };
  } catch (e) {
    return { from, to: at, ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Kayıtlı sürümü okur; yoksa (çok eski kayıt) 1. */
export const storedVersion = (raw: string | number | null | undefined): number => {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
};
