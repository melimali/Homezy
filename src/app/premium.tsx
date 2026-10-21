import { useRouter } from 'expo-router';

import { PremiumChoice } from '@/components/PremiumChoice';

/** Hesabım'dan açılan Ücretsiz / Premium ekranı. */
export default function PremiumScreen() {
  const router = useRouter();
  const close = () => (router.canGoBack() ? router.back() : router.replace('/hesap'));
  return <PremiumChoice onDone={close} onClose={close} />;
}
