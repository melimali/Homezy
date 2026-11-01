# Mağaza görselleri nasıl yeniden üretilir

Gerçek uygulama ekranları web çıktısından yakalanır, sonra telefon çerçevesine ve başlıklara yerleştirilir.

1. Web çıktısı (Supabase kapalı, Premium açık görünsün diye `PurchasesProvider.tsx` içindeki `devPremium` satırını geçici olarak `true` yap, sonra geri al):
   `EXPO_PUBLIC_SUPABASE_URL= EXPO_PUBLIC_SUPABASE_KEY= EXPO_PUBLIC_REVENUECAT_ANDROID_KEY= npx expo export --platform web`
2. `node scripts/store/serve.js 8099` (ayrı terminalde)
3. Örnek veri ve İngilizce çeviri paketi (esbuild geçici kurulur: `npm i --no-save esbuild`):
   - `esbuild scripts/store/seed-state.ts --bundle --platform=node --alias:@=./src --outfile=/tmp/seed.cjs`
   - `node /tmp/seed.cjs tr > /tmp/seed-tr.json; node /tmp/seed.cjs en > /tmp/seed-en.json`
   - `esbuild scripts/store/tx-bundle.ts --bundle --format=iife --platform=browser --alias:@=./src --outfile=/tmp/tx.js`
4. `node scripts/store/capture.js tr` ve `node scripts/store/capture.js en` (playwright gerekir) → `/tmp/raw/<dil>/*.png`; sonra `cp -r /tmp/raw/tr /tmp/raw/en docs/magaza/ham/`
5. `python3 scripts/store/make-store-art.py` → `docs/magaza/<dil>/...`

Not: web çıktısında çeviri yaması çalışmadığı için İngilizce ekranlar `tx-bundle` ile DOM'da çevrilir; çevrilmemiş birkaç dinamik metin `capture.js` içindeki `OV` listesiyle düzeltilir. Bu metinler uygulamada da İngilizce olmalı (bkz. rapor).
