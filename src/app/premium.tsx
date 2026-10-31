import { useLocalSearchParams, useRouter } from 'expo-router';

import { PremiumChoice } from '@/components/PremiumChoice';
import type { PaywallMoment } from '@/domain/paywall';

/** Hesabım'dan ya da bir paywall anından açılan Ücretsiz / Premium ekranı. */
export default function PremiumScreen() {
  const router = useRouter();
  const { moment } = useLocalSearchParams<{ moment?: PaywallMoment }>();
  const close = () => (router.canGoBack() ? router.back() : router.replace('/hesap'));
  return <PremiumChoice onDone={close} onClose={close} moment={moment} />;
}
