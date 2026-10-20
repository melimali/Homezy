import { useRouter } from 'expo-router';

import { PlanEditor } from '@/components/PlanEditor';
import { useToast } from '@/components/Toast';

/** Plan sekmesi: ev planını düzenle. */
export default function PlanTab() {
  const router = useRouter();
  const toast = useToast();
  return (
    <PlanEditor
      onSaved={() => {
        router.navigate('/odalar');
        toast('Plan kaydedildi.');
      }}
    />
  );
}
