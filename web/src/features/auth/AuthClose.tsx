'use client';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Icon } from '@/components/icons/Icon';
export function AuthClose() {
  const t = useTranslations('common.actions');
  const router = useRouter();
  return (
    <button
      type="button"
      aria-label={t('close')}
      onClick={() => router.push('/')}
      className="inline-flex size-44 items-center justify-center gap-8 rounded-full bg-bg-muted type-label-small-strong text-text-secondary tablet:w-auto tablet:bg-transparent tablet:px-12"
    >
      <Icon name="close" size={18} />
      <span className="hidden tablet:inline">{t('close')}</span>
    </button>
  );
}
