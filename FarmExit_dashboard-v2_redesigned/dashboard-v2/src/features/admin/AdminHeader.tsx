'use client';

import { useLocale, useTranslations } from 'next-intl';
import { usePathname, Link } from '@/i18n/navigation';
import type { StaffMe } from '@/lib/api/types/admin-dashboard';
import { type Locale } from '@/i18n/routing';
import { IconChevron, IconMenu } from '@/components/icons';
import { cn } from '@/lib/cn';
import { LuxeUserMenu } from './shell/LuxeUserMenu';

const SEGMENT_NAV_KEY: Record<string, string> = {
  analytics: 'analytics', farms: 'farms', listings: 'listings', 'listing-pipeline': 'listingPipeline',
  requests: 'requestsHub', proposals: 'proposals', 'co-purchase': 'coPurchase', 'farm-details': 'farmDetails',
  'farm-management': 'farmManagement', partnerships: 'partnerships', verification: 'verification',
  evaluations: 'evaluations', communications: 'communications', users: 'users',
  administrators: 'administrators', 'audit-logs': 'auditLogs',
};

type Props = {
  staff: StaffMe;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onOpenMobile: () => void;
  onLogout: () => void;
};

export function AdminHeader({ staff, collapsed, onToggleCollapse, onOpenMobile, onLogout }: Props) {
  const t = useTranslations('admin.header');
  const tCrumb = useTranslations('admin.breadcrumb');
  const tNav = useTranslations('admin.nav');
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const otherLocale: Locale = locale === 'en' ? 'ar' : 'en';
  const segments = pathname.replace(/^\/admin\/?/, '').split('/').filter(Boolean);
  const current = segments[0] ? SEGMENT_NAV_KEY[segments[0]] : undefined;
  const currentLabel = current ? tNav(current) : tCrumb('overview');

  return (
    <header data-testid="admin-topbar" className="luxe-topbar sticky top-0 z-30">
      <div className="flex min-w-0 items-center gap-3 md:gap-5">
        <button type="button" className="luxe-topbar-btn md:hidden" onClick={onOpenMobile} aria-label={t('openMenu')}><IconMenu /></button>
        <button type="button" className="luxe-topbar-btn hidden md:inline-grid" onClick={onToggleCollapse} aria-label={collapsed ? t('expandSidebar') : t('collapseSidebar')}>
          <IconChevron className={cn('transition-transform', collapsed && 'rotate-180')} />
        </button>
        <span className="hidden h-8 w-px bg-[var(--admin-border-subtle)] md:block" aria-hidden />
        <div className="min-w-0">
          <p className="luxe-topbar-title truncate">{currentLabel}</p>
          <p className="luxe-topbar-subtitle hidden truncate sm:block">{t('workspaceLabel')}</p>
        </div>
        {segments.length > 1 && (
          <span className="hidden max-w-[14rem] truncate rounded-md bg-[#f0f6f2] px-2.5 py-1 text-xs font-medium text-[#698077] lg:inline-block">
            {segments[segments.length - 1]}
          </span>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2.5">
        <span className="hidden items-center gap-2 rounded-full border border-[#d9e9e1] bg-[#f5fbf7] px-3 py-1.5 text-[.68rem] font-semibold text-[#226445] lg:inline-flex">
          <span className="size-1.5 rounded-full bg-[#31ae74]" aria-hidden />{t('consoleLabel')}
        </span>
        <Link href={pathname} locale={otherLocale} className="luxe-topbar-lang" aria-label={t('language')}>
          {otherLocale === 'ar' ? 'العربية' : 'EN'}
        </Link>
        <div className="mx-1 hidden h-7 w-px bg-[var(--admin-border-subtle)] sm:block" aria-hidden />
        <LuxeUserMenu staff={staff} onLogout={onLogout} />
      </div>
    </header>
  );
}
