import { getTranslations } from 'next-intl/server';
import { EmptyState } from '@/design-system';
import { SectionHeader } from '@/design-system';
import { Card } from '@/design-system';

export async function OverviewActivity() {
  const t = await getTranslations('admin.overview');

  return (
    <section>
      <SectionHeader title={t('activityTitle')} description={t('activityDesc')} />
      <Card variant="elevated" className="p-2">
        <EmptyState title={t('activityEmpty')} description={t('activityEmptyDesc')} />
      </Card>
    </section>
  );
}
