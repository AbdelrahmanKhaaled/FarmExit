'use client';

import { useTranslations } from 'next-intl';
import { usePathname } from '@/i18n/navigation';
import { Link } from '@/i18n/navigation';
import { Logo } from '@/components/brand/Logo';
import { Badge } from '@/design-system';
import { adminNavigation } from '@/config/admin-navigation';
import { staffRoleLabelKey } from '@/lib/admin/roles';
import type { StaffMe } from '@/lib/api/types/admin-dashboard';
import { cn } from '@/lib/cn';
import { sidebarMobileMotionClass } from './shell/sidebar-motion';
import { IconOverview } from '@/design-system/icons';

type Props = {
  staff: StaffMe;
  collapsed: boolean;
  mobileOpen: boolean;
  onMobileClose: () => void;
  onLogout: () => void;
};

function isActive(pathname: string, href: string) {
  if (href === '/admin') return pathname === '/admin' || pathname.endsWith('/admin');
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminSidebar({ staff, collapsed, mobileOpen, onMobileClose, onLogout }: Props) {
  const t = useTranslations('admin.nav');
  const tHeader = useTranslations('admin.header');
  const pathname = usePathname();
  const roleLabel = tHeader(staffRoleLabelKey(staff.roles));
  const initials = (staff.fullName ?? 'A').split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');

  return (
    <aside
      data-testid="admin-sidebar"
      className={cn(
        'z-50 flex shrink-0 flex-col border-e border-[var(--admin-border-subtle)] bg-[var(--admin-sidebar-bg)] text-[var(--admin-sidebar-text)]',
        'transition-[width,transform] duration-300 ease-out motion-reduce:transition-none',
        'max-md:fixed max-md:inset-y-0 max-md:inset-inline-start-0 max-md:shadow-[var(--admin-shadow-card)]',
        'md:relative md:top-0 md:h-dvh',
        sidebarMobileMotionClass(mobileOpen),
        collapsed ? 'w-[var(--admin-sidebar-collapsed)]' : 'w-[var(--admin-sidebar-width)]',
      )}
    >
      <div className={cn('flex items-center gap-2 border-b border-[var(--admin-border-subtle)] px-4 py-4', collapsed && 'justify-center px-2')}>
        <Logo variant="icon" tone="light" height={28} className="shrink-0" />
        {!collapsed && (
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-semibold">FarmExit</span>
              <Badge variant="gold" className="px-1.5 py-0 text-[0.55rem]">ADMIN</Badge>
            </div>
            <p className="truncate text-[0.65rem] text-[var(--admin-sidebar-muted)]">{t('workspaceSubtitle')}</p>
          </div>
        )}
      </div>
      <nav className="flex-1 space-y-4 overflow-y-auto px-2 py-3" aria-label="Admin">
        {adminNavigation.map((group) => (
          <div key={group.key}>
            {!collapsed && (
              <p className="mb-1 px-2 text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-[var(--admin-sidebar-muted)]">
                {t(`groups.${group.key}`)}
              </p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(pathname, item.href);
                const content = (
                  <>
                    <IconOverview className={cn('size-4 shrink-0 opacity-70', active && 'text-[var(--admin-brand-primary)]')} />
                    {!collapsed && <span className="truncate">{t(item.key)}</span>}
                  </>
                );
                if (!item.enabled) {
                  return (
                    <li key={item.key}>
                      <span
                        className={cn(
                          'flex cursor-not-allowed items-center gap-2 rounded-[var(--admin-radius-md)] px-2.5 py-2 text-sm opacity-40',
                          collapsed && 'justify-center',
                        )}
                        title={t('soon')}
                      >
                        {content}
                      </span>
                    </li>
                  );
                }
                return (
                  <li key={item.key}>
                    <Link
                      href={item.href}
                      onClick={onMobileClose}
                      className={cn(
                        'relative flex items-center gap-2 rounded-[var(--admin-radius-md)] px-2.5 py-2 text-sm font-medium transition-colors',
                        active
                          ? 'bg-[var(--admin-sidebar-active)] text-[var(--admin-brand-primary)]'
                          : 'text-[var(--admin-sidebar-text)] hover:bg-[var(--admin-sidebar-hover)]',
                        collapsed && 'justify-center',
                      )}
                    >
                      {active && (
                        <span
                          className="absolute inset-y-1.5 w-0.5 rounded-full bg-[var(--admin-sidebar-active-border)] start-0"
                          aria-hidden
                        />
                      )}
                      {content}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="border-t border-[var(--admin-border-subtle)] p-3">
        <div className={cn('flex items-center gap-2', collapsed && 'justify-center')}>
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--admin-brand-primary)_12%,white)] text-xs font-bold text-[var(--admin-brand-primary)]">
            {initials}
          </span>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{staff.fullName ?? tHeader('account')}</p>
              <p className="truncate text-xs text-[var(--admin-sidebar-muted)]">{roleLabel}</p>
            </div>
          )}
        </div>
        {!collapsed && (
          <button
            type="button"
            onClick={onLogout}
            className="mt-2 w-full rounded-[var(--admin-radius-md)] px-2 py-2 text-start text-sm text-[var(--admin-text-muted)] hover:bg-[var(--admin-sidebar-hover)]"
          >
            {tHeader('logout')}
          </button>
        )}
      </div>
    </aside>
  );
}
