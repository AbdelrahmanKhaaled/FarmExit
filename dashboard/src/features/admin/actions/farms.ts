'use server';
import { revalidatePath } from 'next/cache';
import { getAdminSession, apiMutateAdmin } from '@/lib/admin/session.server';
import { routing } from '@/i18n/routing';

export async function saveFarmAction(id: string | null, body: Record<string, unknown>) {
  const session = await getAdminSession();
  if (!session?.staff.roles.includes('superAdmin')) return { ok: false as const, message: 'Access denied' };
  if (id && !/^[1-9]\d*$/.test(id)) return { ok: false as const, message: 'Invalid farm ID' };
  const result = await apiMutateAdmin<{ id: string }>(`/staff/admin/farms${id ? `/${id}` : ''}`, session.accessToken, {
    method: id ? 'PATCH' : 'POST',
    body,
  });
  if (!result.ok) return { ok: false as const, message: result.message ?? `HTTP ${result.status}` };
  for (const locale of routing.locales) {
    revalidatePath(`/${locale}/admin/farms`);
    revalidatePath(`/${locale}/admin/farms/${result.data.id}`);
  }
  return { ok: true as const, id: result.data.id };
}

export async function archiveFarmAction(id: string) {
  const session = await getAdminSession();
  if (!session?.staff.roles.includes('superAdmin')) return { ok: false as const, message: 'Access denied' };
  if (!/^[1-9]\d*$/.test(id)) return { ok: false as const, message: 'Invalid farm ID' };
  const result = await apiMutateAdmin(`/staff/admin/farms/${id}/archive`, session.accessToken, {
    method: 'POST',
    body: { confirmed: true },
  });
  if (!result.ok)
    return {
      ok: false as const,
      message: result.status === 409 ? 'ARCHIVE_LINKED' : (result.message ?? `HTTP ${result.status}`),
    };
  for (const locale of routing.locales) {
    revalidatePath(`/${locale}/admin/farms`);
    revalidatePath(`/${locale}/admin/farms/${id}`);
  }
  return { ok: true as const };
}
