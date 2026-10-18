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

export async function assignProposalCaseAgentAction(proposalId: string, assignedStaffId: string): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session?.isAdmin) return { ok: false, message: 'Unauthorized' };
  const res = await apiMutateAdmin(`/staff/purchase-proposals/${proposalId}/assignments`, session.accessToken, {
    method: 'PUT',
    body: { assignedStaffId },
  });
  if (!res.ok) return { ok: false, message: res.message ?? `Error ${res.status}` };
  revalidateAdminPages('/admin/proposals', `/admin/proposals/${proposalId}`);
  return { ok: true };
}
