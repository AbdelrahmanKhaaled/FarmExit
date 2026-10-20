'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/Button';

export function LogoutButton() {
  const t = useTranslations('auth');
  const router = useRouter();

  return (
    <Button
      variant="ghost"
      size="sm"
      className="justify-start"
      onClick={async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.replace('/');
        router.refresh();
      }}
    >
      {t('signOut')}
    </Button>
  );
}
