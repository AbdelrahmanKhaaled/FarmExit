'use server';

import { revalidatePath } from 'next/cache';
import { apiMutateAdmin, getAdminSession } from '@/lib/admin/session.server';
import { routing } from '@/i18n/routing';

export type ActionResult = { ok: true } | { ok: false; message: string };

function revalidateAdminPages(...segments: string[]) {
  for (const locale of routing.locales) {
    for (const segment of segments) {
      revalidatePath(`/${locale}${segment}`, 'page');
    }
  }
}

async function session() {
  const s = await getAdminSession();
  if (!s?.isAdmin) return null;
  return s;
}

type Decision = 'approved' | 'changesRequested' | 'rejected';

async function postDecide(path: string, decision: Decision, comment?: string, revalidate: string[] = []): Promise<ActionResult> {
  const s = await session();
  if (!s) return { ok: false, message: 'Unauthorized' };
  const res = await apiMutateAdmin(path, s.accessToken, {
    method: 'POST',
    body: { decision, ...(comment ? { comment } : {}) },
  });
  if (!res.ok) return { ok: false, message: res.message ?? `Error ${res.status}` };
  revalidateAdminPages(...revalidate);
  return { ok: true };
}

export async function decideFarmManagementAction(id: string, decision: Decision, comment?: string) {
  return postDecide(`/staff/farm-management-requests/${id}/decide`, decision, comment, [
    '/admin/farm-management',
    `/admin/farm-management/${id}`,
    `/admin/requests/${id}`,
  ]);
}

export async function decideProfessionalVerificationAction(id: string, decision: Decision, comment?: string) {
  return postDecide(`/staff/professional-verification-requests/${id}/decide`, decision, comment, [
    '/admin/verification',
    `/admin/verification/${id}`,
    `/admin/requests/${id}`,
  ]);
}

export async function decidePartnershipRequestAction(id: string, decision: Decision, comment?: string) {
  return postDecide(`/staff/partnership-requests/${id}/decide`, decision, comment, [
    '/admin/partnerships',
    `/admin/partnerships/${id}`,
    `/admin/requests/${id}`,
  ]);
}

export async function decidePartnershipApplicationAction(id: string, decision: Decision, comment?: string) {
  return postDecide(`/staff/partnership-applications/${id}/decide`, decision, comment, [
    '/admin/partnerships/applications',
    `/admin/partnerships/applications/${id}`,
    `/admin/requests/${id}`,
  ]);
}

export async function decideFarmDetailsAction(id: string, decision: Decision, comment?: string) {
  return postDecide(`/staff/farm-details-requests/${id}/reviews`, decision, comment, [
    '/admin/farm-details',
    `/admin/farm-details/${id}`,
    `/admin/requests/${id}`,
  ]);
}
