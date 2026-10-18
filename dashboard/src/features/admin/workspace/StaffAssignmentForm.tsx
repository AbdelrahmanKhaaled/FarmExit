'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/design-system';

export type StaffOption = { userId: string; label: string };

export function StaffAssignmentForm({
  staffOptions,
  onAssign,
  showRoleSelect,
  role,
  onRoleChange,
}: {
  staffOptions: StaffOption[];
  onAssign: (staffId: string) => Promise<{ ok: boolean; message?: string }>;
  showRoleSelect?: boolean;
  role?: 'reviewer' | 'caseAgent';
  onRoleChange?: (role: 'reviewer' | 'caseAgent') => void;
}) {
  const t = useTranslations('admin.workflows');
  const [pending, start] = useTransition();
  const [staffId, setStaffId] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  return (
    <form
      className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        if (!staffId) return;
        setMessage(null);
        start(async () => {
          const res = await onAssign(staffId);
          setMessage(res.ok ? t('success') : (res.message ?? t('error')));
        });
      }}
    >
      {showRoleSelect ? (
        <label className="flex flex-col gap-1 text-xs">
          {t('assignRole')}
          <select
            value={role}
            onChange={(e) => onRoleChange?.(e.target.value as 'reviewer' | 'caseAgent')}
            className="rounded border border-[var(--admin-border-subtle)] px-2 py-1.5 text-sm"
          >
            <option value="reviewer">{t('roleReviewer')}</option>
            <option value="caseAgent">{t('roleCaseAgent')}</option>
          </select>
        </label>
      ) : null}
      <label className="flex min-w-[12rem] flex-col gap-1 text-xs">
        {t('staffMember')}
        <select
          value={staffId}
          onChange={(e) => setStaffId(e.target.value)}
          className="rounded border border-[var(--admin-border-subtle)] px-2 py-1.5 text-sm"
        >
          <option value="">{t('selectStaff')}</option>
          {staffOptions.map((o) => (
            <option key={o.userId} value={o.userId}>{o.label}</option>
          ))}
        </select>
      </label>
      <Button type="submit" disabled={pending || !staffId}>{t('assign')}</Button>
      {message ? <p className="text-xs text-[var(--admin-text-muted)] sm:basis-full">{message}</p> : null}
    </form>
  );
}
