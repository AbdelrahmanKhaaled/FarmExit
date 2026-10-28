'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { staffRoleLabelKey } from '@/lib/admin/roles';
import type { StaffMe } from '@/lib/api/types/admin-dashboard';
export function LuxeUserMenu({ staff, onLogout }: { staff: StaffMe; onLogout: () => void }) {
  const t = useTranslations('admin.header');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const roleLabel = t(staffRoleLabelKey(staff.roles));
  const initials = (staff.fullName ?? 'A')
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="luxe-topbar-user"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className="luxe-topbar-user__avatar" aria-hidden>{initials}</span>
        <span className="hidden min-w-0 text-start sm:block">
          <span className="block truncate text-sm font-semibold">{staff.fullName ?? t('account')}</span>
          <span className="block truncate text-[0.65rem] text-[var(--admin-topbar-muted)]">{roleLabel}</span>
        </span>
      </button>
      {open && (
        <div className="luxe-dropdown" role="menu">
          <p className="px-3 py-2 text-xs text-[var(--admin-text-muted)]">{roleLabel}</p>
          <button type="button" className="luxe-dropdown__item w-full text-start" role="menuitem" onClick={onLogout}>
            {t('logout')}
          </button>
        </div>
      )}
    </div>
  );
}
