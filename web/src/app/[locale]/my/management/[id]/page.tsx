import type { ManagementFarmOption } from '@/features/my-management/ManagementWizard';
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { requireCompletedProfile } from '@/lib/auth/require-session';
import { apiFetchWebsite } from '@/lib/auth/session.server';
import { ManagementRequestDetail, type ManagementRequest } from '@/features/my-management/ManagementRequestDetail';

export const instant = false;

export default async function ManagementDetailPage({ params }: PageProps<'/[locale]/my/management/[id]'>) {
  const { locale, id } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const session = await requireCompletedProfile(locale, `/${locale}/my/management/${id}`);
  let req: ManagementRequest;
  try {
    req = await apiFetchWebsite<ManagementRequest>(`/farm-management-requests/${id}`, session.accessToken);
  } catch {
    notFound();
  }

  const tracking = await apiFetchWebsite<{
    statusHistory: { toStatus: string; reason: string | null; createdAt: string | null }[];
  }>(`/requests/${id}`, session.accessToken).catch(() => null);
  const farm = ['draft', 'changesRequested'].includes(req.status)
    ? await apiFetchWebsite<ManagementFarmOption>(`/farms/${req.farmId}`, session.accessToken).catch(() => undefined)
    : undefined;
  return <ManagementRequestDetail initial={req} farm={farm} history={tracking?.statusHistory} />;
}
