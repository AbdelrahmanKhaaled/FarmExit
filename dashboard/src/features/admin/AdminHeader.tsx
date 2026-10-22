'use client';

import { useTranslations, useLocale } from 'next-intl';
import { usePathname, Link } from '@/i18n/navigation';
import type { StaffMe } from '@/lib/api/types/admin-dashboard';
import { staffRoleLabelKey } from '@/lib/admin/roles';
import { type Locale } from '@/i18n/routing';
import { Badge } from '@/design-system';
import { IconChevron, IconMenu } from '@/design-system/icons';
import { cn } from '@/lib/cn';

const SEGMENT_NAV_KEY: Record<string, string> = {
  analytics: 'analytics',
  farms: 'farms',
  listings: 'listings',
  'listing-pipeline': 'listingPipeline',
  requests: 'requestsHub',
  proposals: 'proposals',
  'co-purchase': 'coPurchase',
  'farm-details': 'farmDetails',
  'farm-management': 'farmManagement',
  partnerships: 'partnerships',
  verification: 'verification',
  evaluations: 'evaluations',
  communications: 'communications',
  users: 'users',
  administrators: 'administrators',
  'audit-logs': 'auditLogs',
};

type Props = {
  staff: StaffMe;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onOpenMobile: () => void;
};

export function AdminHeader({ staff, collapsed, onToggleCollapse, onOpenMobile }: Props) {
  const t = useTranslations('admin.header');
  const tCrumb = useTranslations('admin.breadcrumb');
  const tNav = useTranslations('admin.nav');
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const otherLocale: Locale = locale === 'en' ? 'ar' : 'en';
  const roleLabel = t(staffRoleLabelKey(staff.roles));

  const initials = (staff.fullName ?? 'A')
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

  const segments = pathname.replace(/^\/admin\/?/, '').split('/').filter(Boolean);
  const onOverview = segments.length === 0;

  return (
    <header
      data-testid="admin-topbar"
      className={cn(
        'sticky top-0 z-30 flex h-[var(--admin-topbar-height)] items-center justify-between gap-3',
        'border-b border-[var(--admin-border-subtle)] bg-[color-mix(in_srgb,var(--admin-surface)_92%,transparent)] backdrop-blur-md',
        'px-4 md:px-6',
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          className="inline-flex rounded-[var(--admin-radius-sm)] p-2 text-[var(--admin-text-primary)] hover:bg-[var(--admin-surface-sunken)] md:hidden"
          onClick={onOpenMobile}
          aria-label={t('openMenu')}
        >
          <IconMenu />
        </button>
        <button
          type="button"
          className="hidden rounded-[var(--admin-radius-sm)] p-2 hover:bg-[var(--admin-surface-sunken)] md:inline-flex"
          onClick={onToggleCollapse}
          aria-label={collapsed ? t('expandSidebar') : t('collapseSidebar')}
        >
          <IconChevron className={cn('transition-transform', collapsed && 'rotate-180')} />
        </button>
        <nav aria-label="Breadcrumb" className="hidden min-w-0 md:block">
          <ol className="flex flex-wrap items-center gap-1.5 text-sm text-[var(--admin-text-muted)]">
            <li>{tCrumb('admin')}</li>
            {onOverview ? (
              <>
                <li aria-hidden className="opacity-35">/</li>
                <li className="font-semibold text-[var(--admin-text-primary)]">{tCrumb('overview')}</li>
              </>
            ) : (
              segments.map((seg, i) => {
                const navKey = SEGMENT_NAV_KEY[seg];
                const label = navKey ? tNav(navKey) : seg.startsWith('applications') ? tNav('partnerships') : `#${seg}`;
                const isLast = i === segments.length - 1;
                return (
                  <li key={`${seg}-${i}`} className="flex items-center gap-1.5">
                    <span aria-hidden className="opacity-35">/</span>
                    <span className={cn(isLast && 'font-semibold text-[var(--admin-text-primary)]')}>{label}</span>
                  </li>
                );
              })
            )}
          </ol>
          {onOverview && (
            <p className="mt-0.5 truncate text-xs text-[var(--admin-text-muted)]">{tCrumb('overviewSubtitle')}</p>
          )}
        </nav>
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <Link
          href={pathname}
          locale={otherLocale}
          className={cn(
            'rounded-full border border-[var(--admin-border-subtle)] bg-[var(--admin-surface)] px-3 py-1.5 text-xs font-semibold',
            'text-[var(--admin-text-secondary)] transition-colors hover:border-[var(--admin-brand-secondary)] hover:text-[var(--admin-brand-primary)]',
          )}
          aria-label={t('language')}
        >
          {otherLocale === 'ar' ? 'العربية' : 'EN'}
        </Link>
        <div className="hidden items-center gap-2 sm:flex">
          <span
            className="flex size-9 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--admin-brand-primary)_10%,white)] text-xs font-bold text-[var(--admin-brand-primary)]"
            aria-hidden
          >
            {initials}
          </span>
          <div className="min-w-0 max-w-[11rem]">
            <p className="truncate text-sm font-medium text-[var(--admin-text-primary)]">
              {staff.fullName ?? t('account')}
            </p>
            <Badge variant="outline" className="mt-0.5 normal-case tracking-normal">
              {roleLabel}
            </Badge>
          </div>
        </div>
      </div>
    </header>
  );
}
