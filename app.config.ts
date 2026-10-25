import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * app.json'u okur, AdMob uygulama kimliklerini ortamdan (.env.local ya da EAS ortam değişkenleri) ekler.
 * Girilmemişse Google'ın test kimlikleri kalır. Bkz. docs/reklam.md
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const android = process.env.EXPO_PUBLIC_ADMOB_APP_ID_ANDROID;
  const ios = process.env.EXPO_PUBLIC_ADMOB_APP_ID_IOS;
  const plugins = (config.plugins ?? []).map(p => {
    if (!Array.isArray(p) || p[0] !== 'react-native-google-mobile-ads') return p;
    const opts = { ...(p[1] as Record<string, unknown>) };
    if (android) opts.androidAppId = android;
    if (ios) opts.iosAppId = ios;
    return [p[0], opts] as [string, Record<string, unknown>];
  });
  return { ...config, plugins } as ExpoConfig;
};
