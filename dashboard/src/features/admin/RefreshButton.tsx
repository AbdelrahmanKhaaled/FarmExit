'use client';

import { useRouter } from '@/i18n/navigation';
import { Button } from '@/design-system';

export function RefreshButton({ label }: { label: string }) {
  const router = useRouter();
  return (
    <Button type="button" variant="secondary" size="sm" onClick={() => router.refresh()}>
      {label}
    </Button>
  );
}
