import { LoadingState, PageContainer } from '@/components/ui';
import { useTranslations } from 'next-intl';

export default function ConsoleLoading() {
  const t = useTranslations('admin');
  return (
    <PageContainer>
      <LoadingState rows={5} label={t('loading')} />
    </PageContainer>
  );
}
