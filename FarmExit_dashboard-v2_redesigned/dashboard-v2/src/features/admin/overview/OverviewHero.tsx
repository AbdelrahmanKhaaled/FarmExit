import { getLocale, getTranslations } from 'next-intl/server';
import { Badge } from '@/components/ui';
import { staffRoleLabelKey } from '@/lib/admin/roles';
import { attentionCount } from './overview-metrics';
import type { AdminDashboardOverview, AdminWorkQueue } from '@/lib/api/types/admin-dashboard';

export async function OverviewHero({
  displayName,
  overview,
  queue,
  roles,
}: {
  displayName: string | null;
  overview: AdminDashboardOverview;
  queue: AdminWorkQueue;
  roles: string[];
}) {
  const t = await getTranslations('admin.overview');
  const locale = await getLocale();
  const date = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date());
  const attention = attentionCount(queue, overview);
  const roleLabel = t(staffRoleLabelKey(roles));

  return (
    <header className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end md:gap-8">
      <div className="min-w-0">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Badge variant="gold">{roleLabel}</Badge>
          {attention > 0 && <Badge variant="warning">{t('attentionBadge', { count: attention })}</Badge>}
        </div>
        <h1 className="text-xl font-semibold tracking-tight text-[var(--admin-text-primary)] md:text-2xl">
          {displayName ? t('welcome', { name: displayName }) : t('welcomeFallback')}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--admin-text-muted)]">{t('heroSummary')}</p>
      </div>
      <div className="flex flex-col gap-1 text-xs text-[var(--admin-text-muted)] md:justify-self-end md:text-end">
        <span>{date}</span>
        <span className="text-[var(--admin-brand-primary)]">{t('context')}</span>
      </div>
    </header>
  );
}
