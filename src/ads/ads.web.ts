/** Web önizlemesinde reklam modülü yok (yerel kod); uygulama reklamsız çalışır. Telefonda `ads.ts`. */
type AdsModule = typeof import('react-native-google-mobile-ads');

export const getAds = (): AdsModule | null => null;
export const bannerUnit = (): string | null => null;
export const startAds = async () => false;
