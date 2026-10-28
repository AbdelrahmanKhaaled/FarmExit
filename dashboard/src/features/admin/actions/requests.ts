'use server';

import { revalidatePath } from 'next/cache';
import { apiMutateAdmin } from '@/lib/admin/session.server';
import { routing } from '@/i18n/routing';
import { StaffPermission } from '@/lib/admin/staff-permissions';
import { staffApiErrorMessage } from '@/lib/admin/staff-api-result';
import {
  isStaffActionDenied,
  requireAdminActionSession,
  requirePermissionActionSession,
} from '@/lib/admin/staff-action-session';

function revalidateAdminPages(...segments: string[]) {
  for (const locale of routing.locales) {
    for (const segment of segments) {
      revalidatePath(`/${locale}${segment}`, 'page');
    }
  }
}

export type ActionResult = { ok: true } | { ok: false; message: string };

export async function assignRequestStaffAction(
  requestId: string,
  assignmentType: 'reviewer' | 'caseAgent',
  assignedStaffId: string,
): Promise<ActionResult> {
  const auth = await requireAdminActionSession();
  if (isStaffActionDenied(auth)) return auth;
  const session = auth.session;
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
  const auth = await requirePermissionActionSession(StaffPermission.RequestsReview);
  if (isStaffActionDenied(auth)) return auth;
  const session = auth.session;
  const res = await apiMutateAdmin(`/staff/requests/${requestId}/reviews`, session.accessToken, {
    method: 'POST',
    body: { decision, ...(comment ? { comment } : {}) },
  });
  if (!res.ok) return { ok: false, message: res.message ?? `Error ${res.status}` };
  revalidateAdminPages('/admin/requests', `/admin/requests/${requestId}`);
  return { ok: true };
}

export async function transitionRequestStatusAction(
  requestId: string,
  status: string,
  reason?: string,
): Promise<ActionResult> {
  const auth = await requirePermissionActionSession(StaffPermission.RequestsReview);
  if (isStaffActionDenied(auth)) return auth;
  const session = auth.session;
  const res = await apiMutateAdmin(`/staff/requests/${requestId}/status`, session.accessToken, {
    method: 'POST',
    body: { status, ...(reason ? { reason } : {}) },
  });
  if (!res.ok) return { ok: false, message: staffApiErrorMessage(res.status, res.message) };
  revalidateAdminPages('/admin/requests', `/admin/requests/${requestId}`);
  return { ok: true };
}
