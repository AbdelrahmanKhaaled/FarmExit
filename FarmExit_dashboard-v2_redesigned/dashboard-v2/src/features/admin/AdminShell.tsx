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
    <div data-testid="admin-shell" className="luxe-shell flex h-dvh overflow-hidden">
      <AdminSidebar
        staff={staff}
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        onLogout={() => logout()}
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <AdminHeader
          staff={staff}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((c) => !c)}
          onOpenMobile={() => setMobileOpen(true)}
          onLogout={() => logout()}
        />
        <main id="admin-main" className="admin-main min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain">
          {children}
        </main>
      </div>
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          aria-label="Close"
          onClick={() => setMobileOpen(false)}
        />
      )}
    </div>
  );
}
