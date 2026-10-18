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

export async function createCoPurchaseGroupAction(body: {
  listingId: string;
  assignedStaffId: string;
  targetSharePercent?: number;
  notes?: string;
}): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session?.isAdmin) return { ok: false, message: 'Unauthorized' };
  const res = await apiMutateAdmin('/staff/co-purchase-groups', session.accessToken, { method: 'POST', body });
  if (!res.ok) return { ok: false, message: res.message ?? `Error ${res.status}` };
  revalidateAdminPages('/admin/co-purchase');
  return { ok: true };
}

export async function updateCoPurchaseGroupAction(
  groupId: string,
  body: { groupStatus?: string; notes?: string; assignedStaffId?: string },
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session?.isAdmin) return { ok: false, message: 'Unauthorized' };
  const res = await apiMutateAdmin(`/staff/co-purchase-groups/${groupId}`, session.accessToken, { method: 'PATCH', body });
  if (!res.ok) return { ok: false, message: res.message ?? `Error ${res.status}` };
  revalidateAdminPages('/admin/co-purchase', `/admin/co-purchase/${groupId}`);
  return { ok: true };
}

export async function addCoPurchaseMemberAction(
  groupId: string,
  body: { proposalId: string; proposedSharePercent?: number },
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session?.isAdmin) return { ok: false, message: 'Unauthorized' };
  const res = await apiMutateAdmin(`/staff/co-purchase-groups/${groupId}/members`, session.accessToken, {
    method: 'POST',
    body,
  });
  if (!res.ok) return { ok: false, message: res.message ?? `Error ${res.status}` };
  revalidateAdminPages(`/admin/co-purchase/${groupId}`);
  return { ok: true };
}
