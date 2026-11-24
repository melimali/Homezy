// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'supabase/functions/*'],
  },
  {
    // House3D.tsx'te rules-of-hooks yol analizi üstel büyüyor (tek dosya dakikalarca kilitleniyor, tam lint 29+ dk).
    // Bu dosya için kapalı; hook kurallarını elle takip et.
    files: ['src/components/House3D.tsx'],
    rules: { 'react-hooks/rules-of-hooks': 'off' },
  },
  {
    // React Compiler önerileri (hata değil, performans/stil önerisi): uyarı olarak kalsın, lint'i kırmasın.
    rules: {
      'react-hooks/refs': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/static-components': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/globals': 'warn',
    },
  },
]);
