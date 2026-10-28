'use server';

import { revalidatePath } from 'next/cache';
import { apiMutateAdmin } from '@/lib/admin/session.server';
import { routing } from '@/i18n/routing';
import { StaffPermission } from '@/lib/admin/staff-permissions';
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

export async function assignListingStaffAction(
  listingId: string,
  assignmentType: 'reviewer' | 'caseAgent',
  assignedStaffId: string,
): Promise<ActionResult> {
  const auth = await requireAdminActionSession();
  if (isStaffActionDenied(auth)) return auth;
  const session = auth.session;
  const res = await apiMutateAdmin(`/staff/listing-requests/${listingId}/assignments`, session.accessToken, {
    method: 'PUT',
    body: { assignmentType, assignedStaffId },
  });
  if (!res.ok) return { ok: false, message: res.message ?? `Error ${res.status}` };
  revalidateAdminPages('/admin/listings', `/admin/listings/${listingId}`, `/admin/requests/${listingId}`);
  return { ok: true };
}

export async function decideListingReviewAction(
  listingId: string,
  decision: 'approved' | 'changesRequested' | 'rejected',
  comment?: string,
): Promise<ActionResult> {
  const auth = await requirePermissionActionSession(StaffPermission.RequestsReview);
  if (isStaffActionDenied(auth)) return auth;
  const session = auth.session;
  const res = await apiMutateAdmin(`/staff/listing-requests/${listingId}/decision`, session.accessToken, {
    method: 'POST',
    body: { decision, ...(comment ? { comment } : {}) },
  });
  if (!res.ok) return { ok: false, message: res.message ?? `Error ${res.status}` };
  revalidateAdminPages('/admin/listings', `/admin/listings/${listingId}`, '/admin/listing-pipeline');
  return { ok: true };
}

export async function publishListingAction(listingId: string): Promise<ActionResult> {
  const auth = await requireAdminActionSession();
  if (isStaffActionDenied(auth)) return auth;
  const session = auth.session;
  const res = await apiMutateAdmin<{ farmId: string }>(
    `/staff/listing-requests/${listingId}/publish`,
    session.accessToken,
    {
      method: 'POST',
      body: {},
    },
  );
  if (!res.ok) return { ok: false, message: res.message ?? `Error ${res.status}` };
  revalidateAdminPages(
    '/admin/listing-pipeline',
    '/admin/listings',
    `/admin/listings/${listingId}`,
    '/admin/farms',
    `/admin/farms/${res.data.farmId}`,
    `/admin/requests/${listingId}`,
    '/admin',
    '/admin/analytics',
  );
  return { ok: true };
}
