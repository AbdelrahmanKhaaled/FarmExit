'use server';

import { revalidatePath } from 'next/cache';
import { apiMutateAdmin, getAdminSession } from '@/lib/admin/session.server';
import { routing } from '@/i18n/routing';

function revalidateAdminPages(...segments: string[]) {
  for (const locale of routing.locales) {
    for (const segment of segments) {
      revalidatePath(`/${locale}${segment}`, 'page');
    }
  }
}

export type ActionResult = { ok: true } | { ok: false; message: string };

async function requireAdminSession() {
  const session = await getAdminSession();
  if (!session?.isAdmin) return null;
  return session;
}

export async function assignRequestStaffAction(
  requestId: string,
  assignmentType: 'reviewer' | 'caseAgent',
  assignedStaffId: string,
): Promise<ActionResult> {
  const session = await requireAdminSession();
  if (!session) return { ok: false, message: 'Unauthorized' };
  const res = await apiMutateAdmin(`/staff/requests/${requestId}/assignments`, session.accessToken, {
    method: 'PUT',
    body: { assignmentType, assignedStaffId },
  });
  if (!res.ok) return { ok: false, message: res.message ?? `Error ${res.status}` };
  revalidateAdminPages('/admin/requests', `/admin/requests/${requestId}`);
  return { ok: true };
}

export async function recordRequestReviewAction(
  requestId: string,
  decision: 'approved' | 'changesRequested' | 'rejected',
  comment?: string,
): Promise<ActionResult> {
  const session = await requireAdminSession();
  if (!session) return { ok: false, message: 'Unauthorized' };
  const res = await apiMutateAdmin(`/staff/requests/${requestId}/reviews`, session.accessToken, {
    method: 'POST',
    body: { decision, ...(comment ? { comment } : {}) },
  });
  if (!res.ok) return { ok: false, message: res.message ?? `Error ${res.status}` };
  revalidateAdminPages('/admin/requests', `/admin/requests/${requestId}`);
  return { ok: true };
}
