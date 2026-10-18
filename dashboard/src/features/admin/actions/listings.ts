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

export async function assignListingStaffAction(
  listingId: string,
  assignmentType: 'reviewer' | 'caseAgent',
  assignedStaffId: string,
): Promise<ActionResult> {
  const session = await requireAdminSession();
  if (!session) return { ok: false, message: 'Unauthorized' };
  const res = await apiMutateAdmin(`/staff/listing-requests/${listingId}/assignments`, session.accessToken, {
    method: 'PUT',
    body: { assignmentType, assignedStaffId },
  });
  if (!res.ok) return { ok: false, message: res.message ?? `Error ${res.status}` };
  revalidateAdminPages('/admin/listings', `/admin/listings/${listingId}`);
  return { ok: true };
}

export async function decideListingReviewAction(
  listingId: string,
  decision: 'approved' | 'changesRequested' | 'rejected',
  comment?: string,
): Promise<ActionResult> {
  const session = await requireAdminSession();
  if (!session) return { ok: false, message: 'Unauthorized' };
  const res = await apiMutateAdmin(`/staff/listing-requests/${listingId}/decision`, session.accessToken, {
    method: 'POST',
    body: { decision, ...(comment ? { comment } : {}) },
  });
  if (!res.ok) return { ok: false, message: res.message ?? `Error ${res.status}` };
  revalidateAdminPages('/admin/listings', `/admin/listings/${listingId}`, '/admin/listing-pipeline');
  return { ok: true };
}

export async function publishListingAction(listingId: string): Promise<ActionResult> {
  const session = await requireAdminSession();
  if (!session) return { ok: false, message: 'Unauthorized' };
  const res = await apiMutateAdmin(`/staff/listing-requests/${listingId}/publish`, session.accessToken, {
    method: 'POST',
    body: {},
  });
  if (!res.ok) return { ok: false, message: res.message ?? `Error ${res.status}` };
  revalidateAdminPages('/admin/listing-pipeline', '/admin/listings', `/admin/listings/${listingId}`);
  return { ok: true };
}
