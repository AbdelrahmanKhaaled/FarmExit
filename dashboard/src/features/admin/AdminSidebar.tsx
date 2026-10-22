'use client';

import { useTranslations } from 'next-intl';
import { usePathname } from '@/i18n/navigation';
import { Link } from '@/i18n/navigation';
import { Logo } from '@/components/brand/Logo';
import { Badge } from '@/design-system';
import { filterAdminNavigation } from '@/lib/admin/console-routes';
import { staffRoleLabelKey } from '@/lib/admin/roles';
import { staffIsAdminScope } from '@/lib/admin/staff-permissions';
import type { StaffMe } from '@/lib/api/types/admin-dashboard';
import { cn } from '@/lib/cn';
import { sidebarMobileMotionClass } from './shell/sidebar-motion';
import { NavIcon } from './shell/nav-icons';

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
  const navigation = filterAdminNavigation(staff);
  const initials = (staff.fullName ?? 'A').split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');
  const showAdminBadge = staffIsAdminScope(staff.roles);

  return (
    <aside
      data-testid="admin-sidebar"
      className={cn(
        'z-50 flex shrink-0 flex-col bg-[var(--admin-sidebar-bg)] text-[var(--admin-sidebar-text)]',
        'transition-[width,transform] duration-300 ease-out motion-reduce:transition-none',
        'max-md:fixed max-md:inset-y-0 max-md:inset-inline-start-0 max-md:shadow-[var(--admin-shadow-sidebar)]',
        'md:relative md:top-0 md:h-dvh md:border-e md:border-[var(--admin-sidebar-border)]',
        sidebarMobileMotionClass(mobileOpen),
        collapsed ? 'w-[var(--admin-sidebar-collapsed)]' : 'w-[var(--admin-sidebar-width)]',
      )}
    >
      <div
        className={cn(
          'flex items-center gap-3 border-b border-[var(--admin-sidebar-border)] px-4 py-5',
          collapsed && 'justify-center px-2',
        )}
      >
        <Logo variant="icon" tone="dark" height={32} className="shrink-0" />
        {!collapsed && (
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-semibold tracking-tight">FarmExit</span>
              {showAdminBadge ? (
                <Badge variant="gold" className="px-1.5 py-0 text-[0.55rem] text-[#8a6b12]">OPS</Badge>
              ) : null}
            </div>
            <p className="truncate text-[0.65rem] text-[var(--admin-sidebar-muted)]">{t('workspaceSubtitle')}</p>
          </div>
        )}
      </div>
      <nav className="flex-1 space-y-5 overflow-y-auto px-2 py-4" aria-label="Admin">
        {navigation.map((group) => (
          <div key={group.key}>
            {!collapsed && (
              <p className="mb-2 px-3 text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-[var(--admin-sidebar-muted)]">
                {t(`groups.${group.key}`)}
              </p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(pathname, item.href);
                const icon = <NavIcon itemKey={item.key} className={cn('size-[1.125rem] shrink-0', active ? 'text-[var(--admin-sidebar-active-border)]' : 'text-[var(--admin-sidebar-muted)]')} />;
                const label = !collapsed && <span className={cn('truncate', active && 'font-semibold')}>{t(item.key)}</span>;
                if (!item.enabled) {
                  return (
                    <li key={item.key}>
                      <span
                        className={cn(
                          'flex cursor-not-allowed items-center gap-2.5 rounded-[var(--admin-radius-md)] px-3 py-2.5 text-sm opacity-35',
                          collapsed && 'justify-center',
                        )}
                        title={t('soon')}
                      >
                        {icon}
                        {label}
                      </span>
                    </li>
                  );
                }
                return (
                  <li key={item.key}>
                    <Link
                      href={item.href}
                      onClick={onMobileClose}
                      title={collapsed ? t(item.key) : undefined}
                      className={cn(
                        'relative flex items-center gap-2.5 rounded-[var(--admin-radius-md)] px-3 py-2.5 text-sm transition-colors',
                        active
                          ? 'bg-[var(--admin-sidebar-active)] text-[var(--admin-sidebar-text)]'
                          : 'text-[var(--admin-sidebar-muted)] hover:bg-[var(--admin-sidebar-hover)] hover:text-[var(--admin-sidebar-text)]',
                        collapsed && 'justify-center',
                      )}
                    >
                      {active && (
                        <span
                          className="absolute inset-y-2 w-0.5 rounded-full bg-[var(--admin-sidebar-active-border)] start-0"
                          aria-hidden
                        />
                      )}
                      {icon}
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="border-t border-[var(--admin-sidebar-border)] bg-[var(--admin-sidebar-bg-elevated)] p-3">
        <div className={cn('flex items-center gap-2.5', collapsed && 'justify-center')}>
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--admin-brand-primary)_35%,#142d25)] text-xs font-bold text-[var(--admin-sidebar-active-border)]">
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
            className="mt-3 w-full rounded-[var(--admin-radius-md)] px-3 py-2 text-start text-sm text-[var(--admin-sidebar-muted)] transition-colors hover:bg-[var(--admin-sidebar-hover)] hover:text-[var(--admin-sidebar-text)]"
          >
            {tHeader('logout')}
          </button>
        )}
      </div>
    </aside>
  );
}
