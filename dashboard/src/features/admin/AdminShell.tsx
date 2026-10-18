'use client';

import { useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import type { StaffMe } from '@/lib/api/types/admin-dashboard';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';

type Props = {
  staff: StaffMe;
  children: React.ReactNode;
};

export function AdminShell({ staff, children }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();

  async function logout() {
    await fetch('/api/admin/auth/logout', { method: 'POST' });
    router.replace('/admin/login');
    router.refresh();
  }

  return (
    <div data-testid="admin-shell" className="flex min-h-dvh overflow-x-hidden bg-[var(--admin-bg-canvas)]">
      <AdminSidebar
        staff={staff}
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        onLogout={() => logout()}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminHeader
          staff={staff}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((c) => !c)}
          onOpenMobile={() => setMobileOpen(true)}
        />
        <main className="flex-1 px-4 py-5 md:px-6 md:py-6">{children}</main>
      </div>
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/30 md:hidden"
          aria-label="Close"
          onClick={() => setMobileOpen(false)}
        />
      )}
    </div>
  );
}
