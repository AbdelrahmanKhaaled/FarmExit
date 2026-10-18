'use server';

import { revalidatePath } from 'next/cache';
import { apiMutateAdmin, getAdminSession } from '@/lib/admin/session.server';
import { routing } from '@/i18n/routing';

export type ActionResult = { ok: true } | { ok: false; message: string };

function revalidate(paths: string[]) {
  for (const locale of routing.locales) {
    for (const p of paths) revalidatePath(`/${locale}${p}`, 'page');
  }
}

async function session() {
  const s = await getAdminSession();
  if (!s?.isAdmin) return null;
  return s;
}

export async function reviewRequestDocumentAction(
  requestId: string,
  documentId: string,
  reviewStatus: string,
  reviewNote?: string,
): Promise<ActionResult> {
  const s = await session();
  if (!s) return { ok: false, message: 'Unauthorized' };
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
  const s = await session();
  if (!s) return { ok: false, message: 'Unauthorized' };
  const res = await apiMutateAdmin(`/staff/requests/${requestId}/forwardings`, s.accessToken, {
    method: 'POST',
    body: { recipientUserId, ...(internalNotes ? { internalNotes } : {}) },
  });
  if (!res.ok) return { ok: false, message: res.message ?? `Error ${res.status}` };
  revalidate([`/admin/requests/${requestId}`]);
  return { ok: true };
}

export async function updateEvaluationAction(
  farmId: string,
  evaluationId: string,
  body: Record<string, unknown>,
): Promise<ActionResult> {
  const s = await session();
  if (!s) return { ok: false, message: 'Unauthorized' };
  const res = await apiMutateAdmin(`/farms/${farmId}/evaluations/${evaluationId}`, s.accessToken, {
    method: 'PATCH',
    body,
  });
  if (!res.ok) return { ok: false, message: res.message ?? `Error ${res.status}` };
  revalidate([`/admin/evaluations/${farmId}/${evaluationId}`, '/admin/evaluations']);
  return { ok: true };
}

export async function updateCaseStatusAction(caseId: string, status: string): Promise<ActionResult> {
  const s = await session();
  if (!s) return { ok: false, message: 'Unauthorized' };
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
  const s = await session();
  if (!s) return { ok: false, message: 'Unauthorized' };
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
  const s = await session();
  if (!s) return { ok: false, message: 'Unauthorized' };
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
