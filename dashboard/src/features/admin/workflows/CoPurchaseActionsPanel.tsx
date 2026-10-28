'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui';
import {
  addCoPurchaseMemberAction,
  updateCoPurchaseGroupAction,
  updateCoPurchaseMemberAction,
} from '@/features/admin/actions/co-purchase';
import { StaffAssignmentForm, type StaffOption } from '@/features/admin/workspace/StaffAssignmentForm';

type MemberRow = { id: string; proposalId: string; proposedSharePercent: string; memberStatus: string };

export function CoPurchaseActionsPanel({
  groupId,
  staffOptions,
  members = [],
}: {
  groupId: string;
  staffOptions: StaffOption[];
  members?: MemberRow[];
}) {
  const t = useTranslations('admin.coPurchaseDetail');
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [proposalId, setProposalId] = useState('');
  const [share, setShare] = useState('');
  const [status, setStatus] = useState('collectingInterest');
  const [notes, setNotes] = useState('');

  return (
    <div className="admin-action-panel space-y-4">
      <h2 className="text-sm font-semibold">{t('actionsTitle')}</h2>
      <p className="text-xs text-[var(--admin-text-muted)]">{t('nonBinding')}</p>
      {message ? <p className="text-xs">{message}</p> : null}

      <form
        className="space-y-2 border-t border-[var(--admin-border-subtle)] pt-3"
        onSubmit={(e) => {
          e.preventDefault();
          setMessage(null);
          start(async () => {
            const res = await updateCoPurchaseGroupAction(groupId, {
              groupStatus: status,
              notes: notes.trim() || undefined,
            });
            setMessage(res.ok ? t('success') : (res.message ?? t('error')));
          });
        }}
      >
        <label className="flex flex-col gap-1 text-xs">
          {t('groupStatus')}
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded border px-2 py-1.5 text-sm">
            <option value="collectingInterest">{t('statusCollecting')}</option>
            <option value="underStaffFollowup">{t('statusFollowup')}</option>
            <option value="closed">{t('statusClosed')}</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs">
          {t('notes')}
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="rounded border px-2 py-1.5 text-sm" />
        </label>
        <Button type="submit" disabled={pending}>{t('saveGroup')}</Button>
      </form>

      <StaffAssignmentForm
        staffOptions={staffOptions}
        onAssign={(staffId) => updateCoPurchaseGroupAction(groupId, { assignedStaffId: staffId })}
      />

      <form
        className="space-y-2 border-t border-[var(--admin-border-subtle)] pt-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!proposalId.trim()) return;
          setMessage(null);
          start(async () => {
            const res = await addCoPurchaseMemberAction(groupId, {
              proposalId: proposalId.trim(),
              ...(share.trim() ? { proposedSharePercent: Number(share) } : {}),
            });
            setMessage(res.ok ? t('success') : (res.message ?? t('error')));
          });
        }}
      >
        <p className="text-xs font-medium">{t('addMember')}</p>
        <input
          value={proposalId}
          onChange={(e) => setProposalId(e.target.value)}
          placeholder={t('proposalId')}
          className="w-full rounded border px-2 py-1.5 text-sm"
        />
        <input
          value={share}
          onChange={(e) => setShare(e.target.value)}
          placeholder={t('sharePercent')}
          className="w-full rounded border px-2 py-1.5 text-sm"
        />
        <Button type="submit" disabled={pending}>{t('addMemberBtn')}</Button>
      </form>

      {members.length > 0 ? (
        <div className="space-y-2 border-t border-[var(--admin-border-subtle)] pt-3">
          <p className="text-xs font-medium">{t('updateMember')}</p>
          {members.map((m) => (
            <form
              key={m.id}
              className="grid gap-1 rounded border p-2 text-xs"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const memberStatus = String(fd.get('memberStatus') ?? '');
                const shareRaw = String(fd.get('share') ?? '').trim();
                setMessage(null);
                start(async () => {
                  const res = await updateCoPurchaseMemberAction(groupId, m.id, {
                    memberStatus,
                    ...(shareRaw ? { proposedSharePercent: Number(shareRaw) } : {}),
                  });
                  setMessage(res.ok ? t('success') : res.message ?? t('error'));
                });
              }}
            >
              <p className="font-mono">{m.proposalId}</p>
              <select name="memberStatus" defaultValue={m.memberStatus} className="rounded border px-2 py-1">
                <option value="candidate">{t('memberCandidate')}</option>
                <option value="shortlisted">{t('memberShortlisted')}</option>
                <option value="withdrawn">{t('memberWithdrawn')}</option>
                <option value="archived">{t('memberArchived')}</option>
              </select>
              <input name="share" defaultValue={m.proposedSharePercent} placeholder={t('sharePercent')} className="rounded border px-2 py-1" />
              <Button type="submit" disabled={pending} variant="secondary">{t('saveMember')}</Button>
            </form>
          ))}
        </div>
      ) : null}
    </div>
  );
}
