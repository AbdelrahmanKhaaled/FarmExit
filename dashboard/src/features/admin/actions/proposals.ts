'use server';

import { revalidatePath } from 'next/cache';
import { apiMutateAdmin } from '@/lib/admin/session.server';
import { routing } from '@/i18n/routing';
import { isStaffActionDenied, requireAdminActionSession } from '@/lib/admin/staff-action-session';

function revalidateAdminPages(...segments: string[]) {
  for (const locale of routing.locales) {
    for (const segment of segments) {
      revalidatePath(`/${locale}${segment}`, 'page');
    }
  }
}

export type ActionResult = { ok: true } | { ok: false; message: string };

export async function assignProposalCaseAgentAction(
  proposalId: string,
  assignedStaffId: string,
): Promise<ActionResult> {
  const auth = await requireAdminActionSession();
  if (isStaffActionDenied(auth)) return auth;
  const session = auth.session;
  const res = await apiMutateAdmin(`/staff/purchase-proposals/${proposalId}/assignments`, session.accessToken, {
    method: 'PUT',
    body: { assignedStaffId },
  });
  if (!res.ok) return { ok: false, message: res.message ?? `Error ${res.status}` };
  revalidateAdminPages('/admin/proposals', `/admin/proposals/${proposalId}`);
  return { ok: true };
}
