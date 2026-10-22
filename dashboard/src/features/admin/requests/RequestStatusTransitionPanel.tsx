'use client';

import { useMemo, useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Button } from '@/design-system';
import { transitionRequestStatusAction } from '@/features/admin/actions/requests';
import {
  allowedGenericStatusTransitions,
  supportsGenericStatusTransition,
  type StatusTransitionOption,
} from './request-status-transitions';

type Props = {
  requestId: string;
  requestType: string;
  status: string;
  isAdmin: boolean;
  canReview: boolean;
};

export function RequestStatusTransitionPanel({
  requestId,
  requestType,
  status,
  isAdmin,
  canReview,
}: Props) {
  const t = useTranslations('admin.requestStatus');
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [target, setTarget] = useState('');
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  const options = useMemo(() => {
    if (!canReview || !supportsGenericStatusTransition(requestType)) return [];
    return allowedGenericStatusTransitions(status, isAdmin);
  }, [canReview, requestType, status, isAdmin]);

  if (options.length === 0) return null;

  const defaultOption = options[0]!;
  const activeTarget = target || defaultOption.status;
  const selected: StatusTransitionOption = options.find((o) => o.status === activeTarget) ?? defaultOption;

  return (
    <form
      className="space-y-2 border-t border-[var(--admin-border-subtle)] pt-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (selected.confirm && !confirmed) return;
        if (selected.requiresReason && !reason.trim()) {
          setMessage(t('reasonRequired'));
          return;
        }
        setMessage(null);
        start(async () => {
          const res = await transitionRequestStatusAction(requestId, selected.status, reason.trim() || undefined);
          setMessage(res.ok ? t('success') : res.message ?? t('error'));
          if (res.ok) {
            setConfirmed(false);
            router.refresh();
          }
        });
      }}
    >
      <p className="text-xs font-medium">{t('title')}</p>
      <p className="text-xs text-[var(--admin-text-muted)]">{t('hint')}</p>
      {message ? <p className="text-xs" role="alert">{message}</p> : null}
      <select
        className="w-full rounded border px-2 py-1 text-sm"
        value={activeTarget}
        onChange={(e) => {
          setTarget(e.target.value);
          setConfirmed(false);
        }}
        disabled={pending}
      >
        {options.map((o) => (
          <option key={o.status} value={o.status}>{o.status}</option>
        ))}
      </select>
      <textarea
        className="w-full rounded border px-2 py-1 text-sm"
        rows={2}
        placeholder={t('reason')}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        disabled={pending}
      />
      {selected.confirm ? (
        <label className="flex items-start gap-2 text-xs">
          <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} disabled={pending} />
          <span>{t('confirm', { status: selected.status })}</span>
        </label>
      ) : null}
      <Button type="submit" disabled={pending || (selected.confirm && !confirmed)}>{t('submit')}</Button>
    </form>
  );
}
