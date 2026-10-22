'use server';

import { revalidatePath } from 'next/cache';
import { apiFetchAdminResult, apiMutateAdmin } from '@/lib/admin/session.server';
import type { CaseMessage } from '@/features/admin/communications/communications-types';
import { routing } from '@/i18n/routing';
import { StaffPermission } from '@/lib/admin/staff-permissions';
import { staffApiErrorMessage } from '@/lib/admin/staff-api-result';
import { isStaffActionDenied, requirePermissionActionSession } from '@/lib/admin/staff-action-session';

export type ActionResult = { ok: true } | { ok: false; message: string };
export type CreateEvaluationResult = { ok: true; evaluationId: string } | { ok: false; message: string };

function revalidate(paths: string[]) {
  for (const locale of routing.locales) {
    for (const p of paths) revalidatePath(`/${locale}${p}`, 'page');
  }
}

export async function reviewRequestDocumentAction(
  requestId: string,
  documentId: string,
  reviewStatus: string,
  reviewNote?: string,
): Promise<ActionResult> {
  const auth = await requirePermissionActionSession(StaffPermission.RequestsReview);
  if (isStaffActionDenied(auth)) return auth;
  const s = auth.session;
  const res = await apiMutateAdmin(`/staff/requests/${requestId}/documents/${documentId}`, s.accessToken, {
    method: 'PATCH',
    body: { reviewStatus, ...(reviewNote ? { reviewNote } : {}) },
  });
  if (!res.ok) return { ok: false, message: res.message ?? `Error ${res.status}` };
  revalidate([`/admin/requests/${requestId}`]);
  return { ok: true };
}

export async function forwardRequestAction(
  requestId: string,
  recipientUserId: string,
  internalNotes?: string,
): Promise<ActionResult> {
  const auth = await requirePermissionActionSession(StaffPermission.RequestsForward);
  if (isStaffActionDenied(auth)) return auth;
  const s = auth.session;
  const res = await apiMutateAdmin(`/staff/requests/${requestId}/forwardings`, s.accessToken, {
    method: 'POST',
    body: { recipientUserId, ...(internalNotes ? { internalNotes } : {}) },
  });
  if (!res.ok) return { ok: false, message: res.message ?? `Error ${res.status}` };
  revalidate([`/admin/requests/${requestId}`]);
  return { ok: true };
}

export async function recordForwardingDecisionAction(
  requestId: string,
  forwardingId: string,
  decision: string,
  reason?: string,
): Promise<ActionResult> {
  const auth = await requirePermissionActionSession(StaffPermission.RequestsForward);
  if (isStaffActionDenied(auth)) return auth;
  const s = auth.session;
  const body =
    decision === 'accepted' || decision === 'declined'
      ? { decision, ...(reason?.trim() ? { reason: reason.trim() } : {}) }
      : null;
  if (!body) return { ok: false, message: 'Invalid decision' };
  const res = await apiMutateAdmin(
    `/staff/requests/${requestId}/forwardings/${forwardingId}/decision`,
    s.accessToken,
    { method: 'POST', body },
  );
  if (!res.ok) return { ok: false, message: staffApiErrorMessage(res.status, res.message) };
  revalidate([`/admin/requests/${requestId}`]);
  return { ok: true };
}

export async function createEvaluationAction(
  farmId: string,
  body: Record<string, unknown>,
): Promise<CreateEvaluationResult> {
  const auth = await requirePermissionActionSession(StaffPermission.EvaluationsManage);
  if (isStaffActionDenied(auth)) return auth;
  const s = auth.session;
  const res = await apiMutateAdmin<{ id: string }>(`/farms/${farmId}/evaluations`, s.accessToken, {
    method: 'POST',
    body,
  });
  if (!res.ok) return { ok: false, message: staffApiErrorMessage(res.status, res.message) };
  revalidate(['/admin/evaluations', `/admin/farms/${farmId}`]);
  return { ok: true, evaluationId: res.data.id };
}

export async function recordEvaluationCheckAction(
  farmId: string,
  evaluationId: string,
  body: {
    checkKey: string;
    checkStatus?: string;
    reviewerNotes?: string;
    evidenceDocumentId?: string;
  },
): Promise<ActionResult> {
  const auth = await requirePermissionActionSession(StaffPermission.EvaluationsManage);
  if (isStaffActionDenied(auth)) return auth;
  const s = auth.session;
  const res = await apiMutateAdmin(
    `/farms/${farmId}/evaluations/${evaluationId}/checks`,
    s.accessToken,
    { method: 'POST', body },
  );
  if (!res.ok) return { ok: false, message: staffApiErrorMessage(res.status, res.message) };
  revalidate([`/admin/evaluations/${farmId}/${evaluationId}`, '/admin/evaluations']);
  return { ok: true };
}

export async function updateEvaluationAction(
  farmId: string,
  evaluationId: string,
  body: Record<string, unknown>,
): Promise<ActionResult> {
  const auth = await requirePermissionActionSession(StaffPermission.EvaluationsManage);
  if (isStaffActionDenied(auth)) return auth;
  const s = auth.session;
  const res = await apiMutateAdmin(`/farms/${farmId}/evaluations/${evaluationId}`, s.accessToken, {
    method: 'PATCH',
    body,
  });
  if (!res.ok) return { ok: false, message: res.message ?? `Error ${res.status}` };
  revalidate([`/admin/evaluations/${farmId}/${evaluationId}`, '/admin/evaluations']);
  return { ok: true };
}

export async function fetchStaffConversationMessagesAction(
  caseId: string,
  conversationId: string,
  page = 1,
): Promise<
  | { ok: true; items: CaseMessage[]; page: number; pageSize: number; total: number }
  | { ok: false; message: string }
> {
  const auth = await requirePermissionActionSession(StaffPermission.CommunicationRelay);
  if (isStaffActionDenied(auth)) return auth;
  const s = auth.session;
  const qs = new URLSearchParams({ page: String(page), pageSize: '50', conversationId });
  const res = await apiFetchAdminResult<{ items: CaseMessage[]; page: number; pageSize: number; total: number }>(
    `/staff/communication/cases/${caseId}/messages?${qs}`,
    s.accessToken,
  );
  if (!res.ok) return { ok: false, message: staffApiErrorMessage(res.status, res.message) };
  return {
    ok: true,
    items: res.data.items,
    page: res.data.page,
    pageSize: res.data.pageSize,
    total: res.data.total,
  };
}

export async function updateCaseStatusAction(caseId: string, status: string): Promise<ActionResult> {
  const auth = await requirePermissionActionSession(StaffPermission.CommunicationRelay);
  if (isStaffActionDenied(auth)) return auth;
  const s = auth.session;
  const res = await apiMutateAdmin(`/staff/communication/cases/${caseId}/status`, s.accessToken, {
    method: 'PATCH',
    body: { status },
  });
  if (!res.ok) return { ok: false, message: res.message ?? `Error ${res.status}` };
  revalidate([`/admin/communications/${caseId}`]);
  return { ok: true };
}

export async function sendStaffMessageAction(
  caseId: string,
  externalUserId: string,
  body: string,
): Promise<ActionResult> {
  const auth = await requirePermissionActionSession(StaffPermission.CommunicationRelay);
  if (isStaffActionDenied(auth)) return auth;
  const s = auth.session;
  const res = await apiMutateAdmin(
    `/staff/communication/cases/${caseId}/messages?externalUserId=${externalUserId}`,
    s.accessToken,
    { method: 'POST', body: { body } },
  );
  if (!res.ok) return { ok: false, message: res.message ?? `Error ${res.status}` };
  revalidate([`/admin/communications/${caseId}`]);
  return { ok: true };
}

export async function relayMessageAction(
  caseId: string,
  sourceMessageId: string,
  targetExternalUserId: string,
  body: string,
  relayNote?: string,
): Promise<ActionResult> {
  const auth = await requirePermissionActionSession(StaffPermission.CommunicationRelay);
  if (isStaffActionDenied(auth)) return auth;
  const s = auth.session;
  const res = await apiMutateAdmin(`/staff/communication/cases/${caseId}/relay`, s.accessToken, {
    method: 'POST',
    body: {
      sourceMessageId,
      targetExternalUserId,
      body,
      ...(relayNote ? { relayNote } : {}),
    },
  });
  if (!res.ok) return { ok: false, message: res.message ?? `Error ${res.status}` };
  revalidate([`/admin/communications/${caseId}`]);
  return { ok: true };
}
