'use client';

import { useTranslations } from 'next-intl';
import { usePathname, Link } from '@/i18n/navigation';
import { Logo } from '@/components/brand/Logo';
import { filterAdminNavigation } from '@/lib/admin/console-routes';
import { staffRoleLabelKey } from '@/lib/admin/roles';
import type { StaffMe } from '@/lib/api/types/admin-dashboard';
import { cn } from '@/lib/cn';
import { sidebarMobileMotionClass } from './shell/sidebar-motion';
import { NavIcon } from './shell/nav-icons';

const activeFor = (pathname: string, href: string) => href === '/admin'
  ? pathname === '/admin' || pathname.endsWith('/admin')
  : pathname === href || pathname.startsWith(`${href}/`);

type Props = {
  staff: StaffMe;
  collapsed: boolean;
  mobileOpen: boolean;
  onMobileClose: () => void;
  onLogout: () => void;
};

export function AdminSidebar({ staff, collapsed, mobileOpen, onMobileClose, onLogout }: Props) {
  const t = useTranslations('admin.nav');
  const tHeader = useTranslations('admin.header');
  const pathname = usePathname();
  const navigation = filterAdminNavigation(staff);
  const roleLabel = tHeader(staffRoleLabelKey(staff.roles));
  const initials = (staff.fullName || 'A').trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');

  return (
    <aside
      data-testid="admin-sidebar"
      className={cn(
        'luxe-sidenav z-50 shrink-0 transition-[width,transform] duration-300 ease-out motion-reduce:transition-none',
        'max-md:fixed max-md:inset-y-0 max-md:inset-inline-start-0 max-md:shadow-[var(--admin-shadow-sidebar)]',
        'md:sticky md:top-0 md:h-dvh',
        sidebarMobileMotionClass(mobileOpen),
        collapsed ? 'w-[var(--admin-sidebar-collapsed)]' : 'w-[var(--admin-sidebar-width)]',
      )}
    >
      <div className={cn('luxe-sidenav__brand', collapsed && 'justify-center !px-2')}>
        <Logo variant="icon" tone="dark" height={37} className="shrink-0" />
        {!collapsed && (
          <div className="min-w-0">
            <div className="luxe-sidenav__brand-title">FarmExit <span className="text-[#d8b164]">/ Admin</span></div>
            <span className="luxe-sidenav__brand-sub">{tHeader('workspaceLabel')}</span>
          </div>
        )}
      </div>

      <nav className="luxe-sidenav__nav" aria-label="Admin">
        {navigation.map((group) => (
          <div key={group.key} className="mb-2.5">
            {!collapsed && <p className="luxe-sidenav__group-label">{t(`groups.${group.key}`)}</p>}
            {collapsed && <div className="mx-auto my-3 h-px w-7 bg-white/15" />}
            <ul className="space-y-1">
              {group.items.map((item) => {
                const active = activeFor(pathname, item.href);
                const icon = <NavIcon itemKey={item.key} className="size-[1.12rem] shrink-0" />;
                if (!item.enabled) {
                  return (
                    <li key={item.key}>
                      <span className={cn('luxe-nav-link cursor-not-allowed opacity-40', collapsed && 'justify-center')} title={t('soon')}>
                        {icon}{!collapsed && <span className="truncate">{t(item.key)}</span>}
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
                      aria-current={active ? 'page' : undefined}
                      className={cn('luxe-nav-link', active && 'is-active', collapsed && 'justify-center')}
                    >
                      {icon}{!collapsed && <span className="min-w-0 flex-1 truncate">{t(item.key)}</span>}
                      {active && !collapsed && <span className="size-1.5 shrink-0 rounded-full bg-[#209664]" aria-hidden />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="luxe-sidenav__footer">
        <div className={cn('luxe-sidenav__profile !m-0', collapsed && '!p-2')}>
          <div className={cn('flex items-center gap-2.5', collapsed && 'justify-center')}>
            <span className="luxe-sidenav__profile-avatar">{initials}</span>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-[.76rem] font-bold text-white">{staff.fullName ?? tHeader('account')}</p>
                <p className="truncate text-[.67rem] text-[#a4c0b4]">{roleLabel}</p>
              </div>
            )}
          </div>
          {!collapsed && (
            <button type="button" onClick={onLogout} className="mt-3 w-full rounded-md border border-white/15 px-3 py-2 text-start text-[.72rem] font-semibold text-[#d1e6dc] transition-colors hover:bg-white/10">
              {tHeader('logout')}
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
