'use server';

import { revalidatePath } from 'next/cache';
import { apiMutateAdmin } from '@/lib/admin/session.server';
import { isStaffActionDenied, requireAdminActionSession } from '@/lib/admin/staff-action-session';
import { routing } from '@/i18n/routing';
import type { ActionResult } from './platform';

function refreshAccounts() {
  for (const locale of routing.locales) revalidatePath(`/${locale}/admin`, 'layout');
}

export async function updateUserStatusAction(id: string, accountStatus: 'active' | 'suspended'): Promise<ActionResult> {
  const auth = await requireAdminActionSession();
  if (isStaffActionDenied(auth)) return auth;
  if (!/^\d+$/.test(id) || !['active', 'suspended'].includes(accountStatus))
    return { ok: false, message: 'Invalid account status' };
  const result = await apiMutateAdmin(`/staff/admin/users/${id}/status`, auth.session.accessToken, {
    method: 'PATCH',
    body: { accountStatus },
  });
  if (!result.ok) return { ok: false, message: result.message ?? 'Unable to update account' };
  refreshAccounts();
  return { ok: true };
}

export async function createAdministratorAction(body: {
  fullName: string;
  email: string;
  mobile: string;
  password: string;
  roles: string[];
}): Promise<ActionResult> {
  const auth = await requireAdminActionSession();
  if (isStaffActionDenied(auth)) return auth;
  const result = await apiMutateAdmin('/staff/admin/administrators', auth.session.accessToken, {
    method: 'POST',
    body,
  });
  if (!result.ok) return { ok: false, message: result.message ?? 'Unable to create administrator' };
  refreshAccounts();
  return { ok: true };
}
