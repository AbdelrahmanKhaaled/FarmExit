import { getLocale, getTranslations } from 'next-intl/server';
import { Card, SectionHeader } from '@/design-system';
import { cn } from '@/lib/cn';
import type { AdminDashboardOverview } from '@/lib/api/types/admin-dashboard';
import { formatAdminNumber } from './overview-metrics';

const secondary: (keyof AdminDashboardOverview)[] = [
  'farmManagementRequests',
  'partnershipRequests',
  'partnershipApplications',
  'professionalVerificationRequests',
  'farmDetailsInquiries',
  'purchaseProposals',
];

export async function OverviewWorkflow({ overview }: { overview: AdminDashboardOverview }) {
  const t = await getTranslations('admin.overview');
  const locale = await getLocale();

  return (
    <section>
      <SectionHeader title={t('secondaryTitle')} description={t('workflowDesc')} />
      <div className="grid gap-3 sm:grid-cols-2">
        {secondary.map((key, i) => {
          const value = overview[key];
          const hot = value > 0;
          return (
            <Card
              key={key}
              variant="muted"
              className={cn('flex items-center justify-between gap-4 px-4 py-3 admin-stagger', hot && 'border-[color-mix(in_srgb,var(--admin-brand-gold)_30%,var(--admin-border-subtle))]')}
              style={{ animationDelay: `${i * 35}ms` }}
            >
              <span className="text-sm text-[var(--admin-text-muted)]">{t(`metrics.${key}`)}</span>
              <span className={cn('text-lg font-semibold tabular-nums', hot && 'text-[var(--admin-brand-primary)]')}>
                {formatAdminNumber(value, locale)}
              </span>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
