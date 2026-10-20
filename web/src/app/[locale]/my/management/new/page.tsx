import type { ManagementFarmOption } from '@/features/my-management/ManagementWizard';
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { requireCompletedProfile } from '@/lib/auth/require-session';
import { apiFetchWebsite } from '@/lib/auth/session.server';
import { NewManagementRequestForm } from '@/features/my-management/NewManagementRequestForm';

export const instant = false;

type FarmItem = ManagementFarmOption & { myRoles: string[] };

export default async function NewManagementPage({ params, searchParams }: PageProps<'/[locale]/my/management/new'>) {
  const { locale } = await params;
  const sp = await searchParams;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const session = await requireCompletedProfile(locale, `/${locale}/my/management/new`);
  const data = await apiFetchWebsite<{ items: FarmItem[] }>('/farms/mine?page=1&pageSize=50', session.accessToken);
  const ownerFarms = data.items
    .filter((f) => f.myRoles.includes('owner'))
    .map((f) => ({
      id: f.id,
      name: f.name,
      governorate: f.governorate,
      areaName: f.areaName,
      areaFeddan: f.areaFeddan,
      farmType: f.farmType,
      waterSource: f.waterSource,
      irrigationMethod: f.irrigationMethod,
    }));
  const farmId = typeof sp.farmId === 'string' ? sp.farmId : undefined;

  return <NewManagementRequestForm farms={ownerFarms} initialFarmId={farmId} />;
}
